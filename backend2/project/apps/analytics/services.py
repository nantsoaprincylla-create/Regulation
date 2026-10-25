"""Agrégations en lecture seule alimentant les tableaux de bord et les pages publiques.

Principes :
* aucun chiffre simulé : tout provient de la base ;
* l'isolation entre opérateurs est assurée ici (chaque fonction reçoit l'organisation concernée) ;
* la « notation » d'un opérateur est INDICATIVE : elle résume des prédictions probabilistes et
  des décisions déjà prises par une personne habilitée, elle ne déclenche aucune sanction.
"""
from collections import defaultdict
from datetime import datetime, timedelta

from django.conf import settings
from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone

from apps.complaints.models import Complaint
from apps.datasets.models import Dataset, DatasetSubmission
from apps.organizations.models import Organization
from apps.predictions.models import PredictionModel, PredictionRun
from apps.publications.models import Comment, Publication
from apps.qos.models import QoSMeasurement
from apps.regulation.models import CorrectiveAction, RegulatoryCase, RegulatoryDecision
from apps.surveys.models import Survey, SurveyAnswer, SurveyResponse

CLASSES = ("GOOD", "MEDIUM", "POOR")
MONTHS_BACK = 6


# ---------------------------------------------------------------- utilitaires
def _month_starts(n=MONTHS_BACK):
    """Premiers jours des n derniers mois (le plus ancien d'abord), en heure locale."""
    today = timezone.localdate()
    y, m = today.year, today.month
    out = []
    for _ in range(n):
        out.append((y, m))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return list(reversed(out))


def _since_months(n=MONTHS_BACK):
    y, m = _month_starts(n)[0]
    return timezone.make_aware(datetime(y, m, 1))


def _monthly(queryset, date_field):
    """Retourne [{month: 'YYYY-MM', count: n}] pour les n derniers mois, mois vides inclus."""
    since = _since_months()
    rows = (
        queryset.filter(**{f"{date_field}__gte": since})
        .annotate(m_start=TruncMonth(date_field))
        .values("m_start")
        .annotate(n=Count("id"))
    )
    by_key = {(r["m_start"].year, r["m_start"].month): r["n"] for r in rows if r["m_start"]}
    return [{"month": f"{y:04d}-{m:02d}", "count": by_key.get((y, m), 0)} for y, m in _month_starts()]


def _status_counts(queryset, field="status"):
    return {row[field]: row["n"] for row in queryset.values(field).annotate(n=Count("id"))}


def _operators():
    return Organization.objects.filter(organization_type=Organization.Type.OPERATOR, is_active=True).order_by("code")


# ---------------------------------------------------------------- tableaux de bord
def regulator_dashboard():
    subs = DatasetSubmission.objects.all()
    cases = RegulatoryCase.objects.exclude(status=RegulatoryCase.Status.CLOSED)
    runs = PredictionRun.objects.all()
    today = timezone.localdate()

    pending = (
        subs.filter(status__in=[DatasetSubmission.Status.SUBMITTED, DatasetSubmission.Status.UNDER_REVIEW])
        .select_related("dataset_version__dataset__owner_organization")
        .order_by("submitted_at")[:5]
    )
    deadlines = cases.filter(deadline__isnull=False, deadline__gte=today).select_related("operator").order_by("deadline")[:5]
    decisions_90d = RegulatoryDecision.objects.filter(decided_at__gte=timezone.now() - timedelta(days=90))

    # Évolution mensuelle de la répartition des classes prédites (somme des exécutions terminées du mois).
    since = _since_months()
    class_trend = {f"{y:04d}-{m:02d}": {c: 0 for c in CLASSES} for y, m in _month_starts()}
    for run in runs.filter(status=PredictionRun.Status.COMPLETED, completed_at__gte=since).only("completed_at", "summary"):
        local = timezone.localtime(run.completed_at)
        key = f"{local.year:04d}-{local.month:02d}"
        for c, n in (run.summary.get("class_counts") or {}).items():
            if key in class_trend and c in class_trend[key]:
                class_trend[key][c] += int(n)

    return {
        "kpis": {
            "submissions_total": subs.count(),
            "submissions_pending_review": subs.filter(
                status__in=[DatasetSubmission.Status.SUBMITTED, DatasetSubmission.Status.UNDER_REVIEW]
            ).count(),
            "predictions_completed": runs.filter(status=PredictionRun.Status.COMPLETED).count(),
            "models_ready": PredictionModel.objects.filter(status=PredictionModel.Status.READY).count(),
            "cases_open": cases.count(),
            "cases_awaiting_operator": cases.filter(status=RegulatoryCase.Status.AWAITING_OPERATOR_RESPONSE).count(),
            "complaints_open": Complaint.objects.filter(
                status__in=[Complaint.Status.NEW, Complaint.Status.IN_REVIEW, Complaint.Status.AWAITING_INFO]
            ).count(),
        },
        "submissions_by_status": _status_counts(subs),
        "decisions_90d": {
            row["category"]: row["n"] for row in decisions_90d.values("category").annotate(n=Count("id"))
        },
        "class_trend": [{"month": k, **v} for k, v in class_trend.items()],
        "pending_submissions": [
            {
                "id": s.pk,
                "reference": s.reference,
                "organization": s.dataset_version.dataset.owner_organization.code,
                "dataset_name": s.dataset_version.dataset.name,
                "status": s.status,
                "submitted_at": s.submitted_at,
            }
            for s in pending
        ],
        "upcoming_deadlines": [
            {"id": c.pk, "reference": c.reference_number, "operator": c.operator.code, "title": c.title, "deadline": c.deadline}
            for c in deadlines
        ],
    }


def operator_dashboard(org):
    surveys = Survey.objects.filter(organization=org)
    responses = SurveyResponse.objects.filter(survey__organization=org)
    datasets = Dataset.objects.filter(owner_organization=org)
    subs = DatasetSubmission.objects.filter(dataset_version__dataset__owner_organization=org)
    cases = RegulatoryCase.objects.filter(operator=org).exclude(status=RegulatoryCase.Status.CLOSED)
    actions = CorrectiveAction.objects.filter(case__operator=org).exclude(
        status__in=[CorrectiveAction.Status.VERIFIED, CorrectiveAction.Status.NOT_COMPLIED]
    )

    requests = []
    for c in cases.filter(status=RegulatoryCase.Status.AWAITING_OPERATOR_RESPONSE).order_by("deadline")[:5]:
        requests.append({"kind": "EXPLANATION", "case_id": c.pk, "reference": c.reference_number, "title": c.title, "deadline": c.deadline})
    for a in actions.select_related("case").order_by("due_date")[:5]:
        requests.append(
            {"kind": "CORRECTIVE_ACTION", "case_id": a.case_id, "reference": a.case.reference_number, "title": a.description[:120], "deadline": a.due_date}
        )
    for s in subs.filter(status=DatasetSubmission.Status.CORRECTION_REQUIRED).select_related("dataset_version__dataset")[:5]:
        requests.append(
            {"kind": "CORRECTION", "case_id": None, "reference": s.reference, "title": f"Correction du dataset « {s.dataset_version.dataset.name} »", "deadline": None}
        )

    recent_decisions = (
        RegulatoryDecision.objects.filter(case__operator=org, category__in=["WARNING", "CONGRATULATIONS", "NO_BREACH", "RECOMMENDATION"])
        .select_related("case")
        .order_by("-decided_at")[:5]
    )
    last_subs = subs.select_related("dataset_version__dataset").order_by("-submitted_at")[:5]

    return {
        "organization": org.code,
        "kpis": {
            "surveys_active": surveys.filter(status=Survey.Status.PUBLISHED).count(),
            "responses_total": responses.count(),
            "datasets_total": datasets.count(),
            "submissions_pending": subs.filter(
                status__in=[DatasetSubmission.Status.SUBMITTED, DatasetSubmission.Status.UNDER_REVIEW]
            ).count(),
            "cases_open": cases.count(),
            "complaints_open": Complaint.objects.filter(organization=org).exclude(
                status__in=[Complaint.Status.RESOLVED, Complaint.Status.REJECTED, Complaint.Status.CLOSED]
            ).count(),
        },
        "responses_monthly": _monthly(responses, "submitted_at"),
        "submissions_by_status": _status_counts(subs),
        "requests": requests,
        "recent_decisions": [
            {"id": d.pk, "category": d.category, "case_reference": d.case.reference_number, "case_title": d.case.title, "decided_at": d.decided_at}
            for d in recent_decisions
        ],
        "last_submissions": [
            {
                "id": s.pk,
                "reference": s.reference,
                "dataset_name": s.dataset_version.dataset.name,
                "status": s.status,
                "submitted_at": s.submitted_at,
            }
            for s in last_subs
        ],
    }


def publisher_dashboard(org):
    pubs = Publication.objects.filter(organization=org)
    surveys = Survey.objects.filter(organization=org)
    comments = Comment.objects.filter(publication__organization=org)
    return {
        "kpis": {
            "publications_published": pubs.filter(status=Publication.Status.PUBLISHED).count(),
            "publications_scheduled": pubs.filter(status=Publication.Status.SCHEDULED).count(),
            "publications_draft": pubs.filter(status=Publication.Status.DRAFT).count(),
            "surveys_open": surveys.filter(status=Survey.Status.PUBLISHED).count(),
            "surveys_pending_approval": Survey.objects.filter(status=Survey.Status.PENDING_APPROVAL).count(),
            "comments_pending": comments.filter(status=Comment.Status.PENDING).count(),
            "comments_reported": comments.filter(report_count__gt=0).exclude(status=Comment.Status.HIDDEN).count(),
        },
        "publications_by_status": _status_counts(pubs),
        "comments_by_status": _status_counts(comments),
        "publications_monthly": _monthly(pubs.filter(published_at__isnull=False), "published_at"),
        "responses_monthly": _monthly(SurveyResponse.objects.filter(survey__organization=org), "submitted_at"),
    }


# ---------------------------------------------------------------- notation indicative des opérateurs
def _indicative_class(distribution):
    """Classe majoritaire d'une répartition {GOOD, MEDIUM, POOR} (None si vide)."""
    total = sum(distribution.values())
    if not total:
        return None
    # En cas d'égalité, la classe la moins favorable l'emporte (lecture prudente pour le régulateur).
    return max(CLASSES, key=lambda c: (distribution.get(c, 0), CLASSES.index(c)))


def operator_ratings():
    """Vue comparative des opérateurs pour l'ARTEC Régulation.

    Pour chaque opérateur : répartition des classes de la dernière prédiction terminée, indicateurs
    QoS validés, satisfaction issue des sondages, et décisions (avertissements / félicitations) sur 12 mois.
    """
    since_12m = timezone.now() - timedelta(days=365)
    out = []
    for op in _operators():
        run = (
            PredictionRun.objects.filter(status=PredictionRun.Status.COMPLETED, input_dataset_version__dataset__owner_organization=op)
            .select_related("model_version")
            .order_by("-completed_at")
            .first()
        )
        dist = {c: 0 for c in CLASSES}
        if run:
            for c, n in (run.summary.get("class_counts") or {}).items():
                if c in dist:
                    dist[c] = int(n)
        total = sum(dist.values())

        measures = QoSMeasurement.objects.filter(operator=op, validation_status=QoSMeasurement.ValidationStatus.VALIDATED)
        metrics = {
            row["metric_name"]: {"average": round(row["avg"], 2), "unit": row["unit"], "n": row["n"]}
            for row in measures.values("metric_name", "unit").annotate(avg=Avg("metric_value"), n=Count("id"))
            if row["avg"] is not None
        }

        sat = SurveyAnswer.objects.filter(
            question__question_type="SATISFACTION", response__survey__target_operator=op, number_value__isnull=False
        ).aggregate(avg=Avg("number_value"), n=Count("id"))

        # Une décision remplacée par une modification ne compte plus : on exclut celles qui ont un successeur.
        decisions = RegulatoryDecision.objects.filter(case__operator=op, decided_at__gte=since_12m, superseded_by__isnull=True)
        dcount = {row["category"]: row["n"] for row in decisions.values("category").annotate(n=Count("id"))}

        out.append(
            {
                "operator": op.code,
                "name": op.name,
                "indicative_class": _indicative_class(dist),
                "distribution": dist,
                "distribution_pct": {c: round(100 * dist[c] / total, 1) if total else 0 for c in CLASSES},
                "observations": total,
                "last_run": (
                    {
                        "id": run.pk,
                        "completed_at": run.completed_at,
                        "model": f"{run.model_version.name} v{run.model_version.version}",
                        "mean_confidence": run.summary.get("mean_confidence"),
                    }
                    if run
                    else None
                ),
                "metrics": metrics,
                "survey_satisfaction": {"average": round(sat["avg"], 2) if sat["avg"] is not None else None, "n": sat["n"]},
                "warnings_12m": dcount.get("WARNING", 0),
                "congratulations_12m": dcount.get("CONGRATULATIONS", 0),
                "open_cases": RegulatoryCase.objects.filter(operator=op).exclude(status=RegulatoryCase.Status.CLOSED).count(),
            }
        )
    return {
        "disclaimer": "Notation indicative issue de prédictions probabilistes : elle ne constitue ni un constat de manquement ni une sanction.",
        "operators": out,
    }


# ---------------------------------------------------------------- données publiques
def public_overview():
    """Chiffres publics agrégés : aucune donnée individuelle, aucun détail confidentiel."""
    now = timezone.now()
    open_surveys = Survey.objects.filter(status=Survey.Status.PUBLISHED).filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now))
    return {
        "publications": Publication.objects.filter(status=Publication.Status.PUBLISHED, audience=Publication.Audience.PUBLIC).count(),
        "reports": Publication.objects.filter(
            status=Publication.Status.PUBLISHED, audience=Publication.Audience.PUBLIC, category=Publication.Category.REPORT
        ).count(),
        "surveys_open": open_surveys.count(),
        "responses_total": SurveyResponse.objects.filter(survey__status__in=[Survey.Status.PUBLISHED, Survey.Status.CLOSED]).count(),
        "regions_covered": QoSMeasurement.objects.filter(validation_status=QoSMeasurement.ValidationStatus.VALIDATED)
        .values("region")
        .distinct()
        .count(),
        "operators": list(_operators().values_list("code", flat=True)),
    }


def public_quality():
    """Qualité de service publiée : moyennes de mesures validées par opérateur et indicateur, et satisfaction des sondages.

    Les groupes sous le seuil `SURVEY_PUBLIC_MIN_RESPONDENTS` sont masqués. Les méthodes de mesure ne sont
    jamais mélangées : elles sont renvoyées séparément.
    """
    min_n = settings.SURVEY_PUBLIC_MIN_RESPONDENTS
    validated = QoSMeasurement.objects.filter(validation_status=QoSMeasurement.ValidationStatus.VALIDATED)
    grouped = (
        validated.values("operator__code", "metric_name", "unit", "measurement_method")
        .annotate(avg=Avg("metric_value"), n=Count("id"))
        .order_by("metric_name", "operator__code")
    )
    measures = [
        {
            "operator": r["operator__code"],
            "metric": r["metric_name"],
            "unit": r["unit"],
            "method": r["measurement_method"],
            "average": round(r["avg"], 2),
            "n": r["n"],
        }
        for r in grouped
        if r["n"] >= min_n and r["avg"] is not None
    ]

    satisfaction = []
    for op in _operators():
        agg = SurveyAnswer.objects.filter(
            question__question_type="SATISFACTION",
            response__survey__target_operator=op,
            response__survey__results_public=True,
            number_value__isnull=False,
        ).aggregate(avg=Avg("number_value"), n=Count("id"))
        if agg["n"] and agg["n"] >= min_n:
            satisfaction.append({"operator": op.code, "average": round(agg["avg"], 2), "n": agg["n"]})

    by_region = defaultdict(list)
    for r in (
        validated.filter(metric_name="download_speed")
        .values("region__name", "operator__code", "unit")
        .annotate(avg=Avg("metric_value"), n=Count("id"))
    ):
        if r["n"] >= min_n and r["avg"] is not None:
            by_region[r["region__name"]].append({"operator": r["operator__code"], "average": round(r["avg"], 2), "unit": r["unit"]})

    return {
        "min_sample": min_n,
        "measures": measures,
        "satisfaction": satisfaction,
        "download_speed_by_region": [{"region": k, "values": v} for k, v in sorted(by_region.items())],
        "note": "Données agrégées issues de datasets acceptés par l'ARTEC. Des méthodes de mesure différentes ne sont pas comparables entre elles.",
    }

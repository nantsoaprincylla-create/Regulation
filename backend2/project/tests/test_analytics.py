from django.utils import timezone

from apps.organizations.models import City, Organization, Region
from apps.qos.models import QoSMeasurement
from apps.surveys.models import Survey, SurveyAnswer, SurveyQuestion, SurveyResponse

from .conftest import client_for  # noqa: F401

API = "/api/v1/analytics"


def _measure(op_code, value, validated=True, method="speedtest-v1"):
    return QoSMeasurement.objects.create(
        operator=Organization.objects.get(code=op_code),
        region=Region.objects.get(code="analamanga"),
        service_type="DATA",
        technology="4G",
        metric_name="download_speed",
        metric_value=value,
        unit="Mbps",
        measurement_method=method,
        source_type="TECHNICAL",
        measured_at=timezone.now(),
        validation_status="VALIDATED" if validated else "PENDING",
    )


def _response(survey):
    region = Region.objects.get(code="analamanga")
    return SurveyResponse.objects.create(survey=survey, region=region, city=City.objects.get(region=region), location_context="USAGE")


def test_dashboard_requires_authentication(anon):
    assert anon.get(f"{API}/dashboard/").status_code == 401


def test_dashboard_is_role_aware(api, regulator, publisher, yas):
    reg = api(regulator).get(f"{API}/dashboard/").data
    pub = api(publisher).get(f"{API}/dashboard/").data
    op = api(yas).get(f"{API}/dashboard/").data
    assert reg["space"] == "regulation" and "submissions_pending_review" in reg["kpis"]
    assert pub["space"] == "publications" and "comments_pending" in pub["kpis"]
    assert op["space"] == "operator" and op["organization"] == "YAS"
    assert len(op["responses_monthly"]) == 6


def test_system_admin_has_no_dashboard(api, sysadmin):
    assert api(sysadmin).get(f"{API}/dashboard/").status_code == 403


def test_operator_dashboard_counts_only_own_responses(api, yas, airtel):
    def make(user, title):
        s = Survey.objects.create(title=title, creator=user, organization=user.organization, status="PUBLISHED")
        _response(s)
        return s

    make(yas, "Sondage YAS")
    make(airtel, "Sondage Airtel")
    make(airtel, "Autre sondage Airtel")
    assert api(yas).get(f"{API}/dashboard/").data["kpis"]["responses_total"] == 1
    assert api(airtel).get(f"{API}/dashboard/").data["kpis"]["responses_total"] == 2


def test_operator_ratings_reserved_to_regulator(api, regulator, publisher, yas, anon):
    assert api(regulator).get(f"{API}/operator-ratings/").status_code == 200
    assert api(publisher).get(f"{API}/operator-ratings/").status_code == 403
    assert api(yas).get(f"{API}/operator-ratings/").status_code == 403
    assert anon.get(f"{API}/operator-ratings/").status_code == 401


def test_operator_ratings_lists_all_operators_without_data(api, regulator):
    data = api(regulator).get(f"{API}/operator-ratings/").data
    assert {o["operator"] for o in data["operators"]} == {"YAS", "AIRTEL", "ORANGE"}
    assert all(o["indicative_class"] is None and o["observations"] == 0 for o in data["operators"])
    assert "indicative" in data["disclaimer"].lower()


def test_public_overview_is_open_and_anonymous(anon):
    r = anon.get(f"{API}/public/overview/")
    assert r.status_code == 200
    assert set(r.data["operators"]) == {"YAS", "AIRTEL", "ORANGE"}


def test_public_quality_hides_small_samples_and_pending_rows(anon):
    # seuil de test : SURVEY_PUBLIC_MIN_RESPONDENTS = 2
    _measure("YAS", 10)
    _measure("YAS", 20)
    _measure("ORANGE", 99)  # un seul échantillon : masqué
    _measure("AIRTEL", 50, validated=False)
    _measure("AIRTEL", 60, validated=False)  # non validées : jamais publiées
    data = anon.get(f"{API}/public/quality/").data
    ops = {m["operator"] for m in data["measures"]}
    assert ops == {"YAS"}
    assert data["measures"][0]["average"] == 15.0


def test_public_quality_never_mixes_measurement_methods(anon):
    _measure("YAS", 10, method="speedtest-v1")
    _measure("YAS", 12, method="speedtest-v1")
    _measure("YAS", 40, method="crowd-sourced")
    _measure("YAS", 44, method="crowd-sourced")
    methods = {(m["method"], m["average"]) for m in anon.get(f"{API}/public/quality/").data["measures"]}
    assert methods == {("speedtest-v1", 11.0), ("crowd-sourced", 42.0)}


def test_public_quality_satisfaction_only_for_public_results(anon, publisher):
    yas = Organization.objects.get(code="YAS")
    for public in (True, False):
        s = Survey.objects.create(
            title=f"S{public}", creator=publisher, organization=publisher.organization, target_operator=yas,
            status="PUBLISHED", results_public=public,
        )
        q = SurveyQuestion.objects.create(survey=s, text="Satisfaction", question_type="SATISFACTION")
        for v in (4, 5):
            r = _response(s)
            SurveyAnswer.objects.create(response=r, question=q, number_value=v)
    sat = anon.get(f"{API}/public/quality/").data["satisfaction"]
    assert len(sat) == 1 and sat[0]["operator"] == "YAS" and sat[0]["n"] == 2


def test_eligible_inputs_only_for_regulator(api, regulator, yas):
    assert api(regulator).get("/api/v1/predictions/runs/eligible-inputs/").status_code == 200
    assert api(yas).get("/api/v1/predictions/runs/eligible-inputs/").status_code == 403

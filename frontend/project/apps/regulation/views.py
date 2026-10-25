from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import ARTEC_REGULATOR, OPERATOR_USER, roles_required

from . import services
from .models import CaseEvent, CorrectiveAction, RegulatoryCase, RegulatoryDecision
from .serializers import (
    ActionUpdateSerializer,
    CaseSerializer,
    CloseSerializer,
    CorrectiveActionSerializer,
    DecisionInputSerializer,
    DecisionSerializer,
    EventSerializer,
    EvidenceSerializer,
    ExplanationSerializer,
    NoteSerializer,
    RespondSerializer,
    ResponseSerializer,
    VerifySerializer,
)

Participants = roles_required(OPERATOR_USER, ARTEC_REGULATOR)


def is_regulator(user):
    return user.role == ARTEC_REGULATOR


def require_regulator(request):
    if not is_regulator(request.user):
        raise PermissionDenied("Opération réservée à ARTEC Régulation et Prédiction.")


class CaseViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = CaseSerializer
    permission_classes = [Participants]
    filterset_fields = ["status", "case_type", "operator__code"]
    search_fields = ["reference_number", "title", "description"]
    ordering_fields = ["opened_at", "deadline"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = RegulatoryCase.objects.select_related("operator").prefetch_related("decisions__evidence")
        user = self.request.user
        if is_regulator(user):
            return qs
        return qs.filter(operator=user.organization)  # isolation stricte : 404 pour les dossiers d'un concurrent

    def perform_create(self, serializer):
        require_regulator(self.request)
        data = dict(serializer.validated_data)
        case = services.open_case(data, self.request.user, self.request)
        serializer.instance = case

    def perform_update(self, serializer):
        require_regulator(self.request)
        if serializer.instance.status == "CLOSED":
            from rest_framework.exceptions import ValidationError

            raise ValidationError("Dossier clos : modification impossible.")
        serializer.save()

    def _visible_events(self, case):
        qs = case.events.select_related("actor")
        return qs if is_regulator(self.request.user) else qs.filter(internal=False)

    @extend_schema(responses=EventSerializer(many=True))
    @action(detail=True, methods=["get"])
    def timeline(self, request, pk=None):
        return Response(EventSerializer(self._visible_events(self.get_object()), many=True).data)

    @extend_schema(request=NoteSerializer, responses=EventSerializer)
    @action(detail=True, methods=["post"])
    def note(self, request, pk=None):
        require_regulator(request)
        s = NoteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        ev = services.add_event(self.get_object(), CaseEvent.Kind.NOTE, request.user, s.validated_data["message"], internal=True)
        return Response(EventSerializer(ev).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=ExplanationSerializer, responses=CaseSerializer)
    @action(detail=True, methods=["post"], url_path="request-explanation")
    def request_explanation(self, request, pk=None):
        require_regulator(request)
        s = ExplanationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        case = services.request_explanation(self.get_object(), request.user, s.validated_data["message"], s.validated_data.get("deadline"), request)
        return Response(CaseSerializer(case).data)

    @extend_schema(request=RespondSerializer, responses=ResponseSerializer)
    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        if request.user.role != OPERATOR_USER:
            raise PermissionDenied("Seul l'opérateur concerné peut répondre.")
        s = RespondSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        resp = services.operator_respond(self.get_object(), request.user, s.validated_data["content"], request)
        return Response(ResponseSerializer(resp).data, status=status.HTTP_201_CREATED)

    @extend_schema(responses=ResponseSerializer(many=True))
    @action(detail=True, methods=["get"])
    def responses(self, request, pk=None):
        return Response(ResponseSerializer(self.get_object().responses.select_related("responder"), many=True).data)

    @extend_schema(request=EvidenceSerializer, responses=EvidenceSerializer(many=True))
    @action(detail=True, methods=["get", "post"])
    def evidence(self, request, pk=None):
        case = self.get_object()
        if request.method == "GET":
            qs = case.evidence.select_related("added_by")
            if not is_regulator(request.user):
                qs = qs.filter(visible_to_operator=True)
            return Response(EvidenceSerializer(qs, many=True).data)
        require_regulator(request)
        s = EvidenceSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        ev = services.add_evidence(case, request.user, dict(s.validated_data), request)
        return Response(EvidenceSerializer(ev).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=DecisionInputSerializer, responses=DecisionSerializer)
    @action(detail=True, methods=["post"])
    def decide(self, request, pk=None):
        require_regulator(request)
        s = DecisionInputSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = services.decide(self.get_object(), request.user, s.validated_data["category"], s.validated_data["justification"], s.validated_data["evidence"], request)
        return Response(DecisionSerializer(d).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=CorrectiveActionSerializer, responses=CorrectiveActionSerializer(many=True))
    @action(detail=True, methods=["get", "post"], url_path="corrective-actions")
    def corrective_actions(self, request, pk=None):
        case = self.get_object()
        if request.method == "GET":
            return Response(CorrectiveActionSerializer(case.corrective_actions.all(), many=True).data)
        require_regulator(request)
        s = CorrectiveActionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        decision = s.validated_data.get("decision")
        if decision is not None and decision.case_id != case.pk:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"decision": "Décision étrangère à ce dossier."})
        a = services.create_corrective_action(case, request.user, s.validated_data["description"], s.validated_data["due_date"], decision, request)
        return Response(CorrectiveActionSerializer(a).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=CloseSerializer, responses=CaseSerializer)
    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        require_regulator(request)
        s = CloseSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(CaseSerializer(services.close_case(self.get_object(), request.user, s.validated_data.get("comment", ""), request)).data)


class DecisionViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = DecisionSerializer
    permission_classes = [Participants]
    filterset_fields = ["case", "category"]

    def get_queryset(self):
        qs = RegulatoryDecision.objects.select_related("decided_by", "case").prefetch_related("evidence")
        user = self.request.user
        return qs if is_regulator(user) else qs.filter(case__operator=user.organization)

    @extend_schema(request=DecisionInputSerializer, responses=DecisionSerializer)
    @action(detail=True, methods=["post"])
    def amend(self, request, pk=None):
        require_regulator(request)
        s = DecisionInputSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        new = services.amend_decision(self.get_object(), request.user, d["category"], d["justification"], d.get("reason", ""), d["evidence"], request)
        return Response(DecisionSerializer(new).data, status=status.HTTP_201_CREATED)


class CorrectiveActionViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = CorrectiveActionSerializer
    permission_classes = [Participants]
    filterset_fields = ["status", "case"]

    def get_queryset(self):
        qs = CorrectiveAction.objects.select_related("case")
        user = self.request.user
        return qs if is_regulator(user) else qs.filter(case__operator=user.organization)

    @extend_schema(request=ActionUpdateSerializer, responses=CorrectiveActionSerializer)
    @action(detail=True, methods=["post"], url_path="update-progress")
    def update_progress(self, request, pk=None):
        if request.user.role != OPERATOR_USER:
            raise PermissionDenied("Réservé à l'opérateur concerné.")
        s = ActionUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(CorrectiveActionSerializer(services.operator_update_action(self.get_object(), request.user, s.validated_data["status"], s.validated_data.get("report", ""), request)).data)

    @extend_schema(request=VerifySerializer, responses=CorrectiveActionSerializer)
    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        require_regulator(request)
        s = VerifySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(CorrectiveActionSerializer(services.verify_action(self.get_object(), request.user, s.validated_data["compliant"], s.validated_data.get("comment", ""), request)).data)


class OverviewView(APIView):
    """Indicateurs synthétiques pour le tableau de bord de régulation (chiffres réels, non simulés)."""

    permission_classes = [roles_required(ARTEC_REGULATOR)]

    @extend_schema(responses={200: dict})
    def get(self, request):
        from apps.datasets.models import DatasetSubmission
        from apps.predictions.models import PredictionRun

        subs = DatasetSubmission.objects
        cases = RegulatoryCase.objects.exclude(status="CLOSED")
        return Response(
            {
                "submissions_total": subs.count(),
                "submissions_pending_review": subs.filter(status__in=["SUBMITTED", "UNDER_REVIEW"]).count(),
                "submissions_by_status": dict(subs.values_list("status").annotate(n=Count("id"))),
                "predictions_total": PredictionRun.objects.count(),
                "predictions_completed": PredictionRun.objects.filter(status="COMPLETED").count(),
                "cases_open": cases.count(),
                "cases_awaiting_operator": cases.filter(status="AWAITING_OPERATOR_RESPONSE").count(),
            }
        )

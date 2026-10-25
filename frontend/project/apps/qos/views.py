from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.response import Response

from apps.audit.services import log as audit_log
from apps.common.permissions import ARTEC_REGULATOR, OPERATOR_USER, roles_required

from . import services
from .models import QoSMeasurement, QoSThreshold
from .rules import METRICS
from .serializers import MeasurementSerializer, ThresholdSerializer


def measurements_for(user):
    qs = QoSMeasurement.objects.select_related("operator", "region", "city")
    if user.role == OPERATOR_USER:
        return qs.filter(operator=user.organization)
    if user.role == ARTEC_REGULATOR:
        return qs.filter(validation_status=QoSMeasurement.ValidationStatus.VALIDATED)
    return qs.none()


class MeasurementViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Mesures QoS en lecture seule (alimentées par les datasets acceptés)."""

    serializer_class = MeasurementSerializer
    permission_classes = [roles_required(OPERATOR_USER, ARTEC_REGULATOR)]
    filterset_fields = {
        "operator__code": ["exact"], "region": ["exact"], "city": ["exact"], "metric_name": ["exact"], "service_type": ["exact"],
        "technology": ["exact"], "source_type": ["exact"], "measured_at": ["gte", "lte"],
    }
    ordering_fields = ["measured_at", "metric_value"]

    def get_queryset(self):
        return measurements_for(self.request.user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Moyennes par opérateur/indicateur/méthode/technologie/source (jamais mélangées entre méthodes)."""
        qs = self.filter_queryset(self.get_queryset())
        return Response(services.summarize(qs))

    @action(detail=False, methods=["get"])
    def metrics(self, request):
        return Response({k: sorted(v) for k, v in METRICS.items()})


class ThresholdPermission(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not (u.is_authenticated and u.is_active):
            return False
        if request.method in SAFE_METHODS:
            return u.role in (ARTEC_REGULATOR, OPERATOR_USER)
        return u.role == ARTEC_REGULATOR


class ThresholdViewSet(viewsets.ModelViewSet):
    queryset = QoSThreshold.objects.all()
    serializer_class = ThresholdSerializer
    permission_classes = [ThresholdPermission]
    filterset_fields = ["metric_name", "technology", "service_type"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def perform_create(self, serializer):
        t = serializer.save(created_by=self.request.user)
        audit_log(self.request.user, "threshold.created", "QoSThreshold", t.pk, {"metric": t.metric_name, "origin": t.origin}, request=self.request)

    def perform_update(self, serializer):
        t = serializer.save()
        audit_log(self.request.user, "threshold.updated", "QoSThreshold", t.pk, {"metric": t.metric_name}, request=self.request)

import csv

from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.common.permissions import ARTEC_REGULATOR, roles_required
from apps.datasets.views import visible_datasets

from . import services, tasks
from .models import PredictionModel, PredictionResult, PredictionRun
from .serializers import (
    PredictionModelSerializer,
    PredictionRunSerializer,
    ResultSerializer,
    RunRequestSerializer,
    TrainRequestSerializer,
)

Regulator = roles_required(ARTEC_REGULATOR)


def _check_version_access(user, version):
    if not visible_datasets(user).filter(pk=version.dataset_id).exists():
        raise ValidationError({"dataset_version": "Version introuvable."})


class PredictionModelViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = PredictionModel.objects.all()
    serializer_class = PredictionModelSerializer
    permission_classes = [Regulator]
    filterset_fields = ["status", "name"]

    @extend_schema(request=TrainRequestSerializer, responses={201: PredictionModelSerializer})
    @action(detail=False, methods=["post"])
    def train(self, request):
        s = TrainRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        v = s.validated_data["training_dataset_version"]
        _check_version_access(request.user, v)
        model = services.request_training(request.user, s.validated_data["name"], v, s.validated_data.get("features"), request)
        tasks.train_model_task.delay(model.pk)
        model.refresh_from_db()
        return Response(PredictionModelSerializer(model).data, status=status.HTTP_201_CREATED)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"])
    def compare(self, request):
        try:
            a, b = (PredictionModel.objects.get(pk=request.query_params[k]) for k in ("a", "b"))
        except (KeyError, ValueError, PredictionModel.DoesNotExist):
            raise ValidationError("Paramètres `a` et `b` (identifiants de modèles existants) requis.")
        keys = ["accuracy", "macro_f1"]
        delta = {k: round(b.metrics.get(k, 0) - a.metrics.get(k, 0), 4) for k in keys if k in a.metrics and k in b.metrics}
        return Response({"a": PredictionModelSerializer(a).data, "b": PredictionModelSerializer(b).data, "delta_b_minus_a": delta})


class PredictionRunViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = PredictionRun.objects.select_related("model_version")
    serializer_class = PredictionRunSerializer
    permission_classes = [Regulator]
    filterset_fields = ["status", "model_version"]

    @extend_schema(request=RunRequestSerializer, responses={201: PredictionRunSerializer})
    def create(self, request):
        s = RunRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        v = s.validated_data["input_dataset_version"]
        _check_version_access(request.user, v)
        run = services.request_run(request.user, s.validated_data["model_version"], v, request)
        tasks.execute_run_task.delay(run.pk)
        run.refresh_from_db()
        return Response(PredictionRunSerializer(run).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def results(self, request, pk=None):
        run = self.get_object()
        qs = run.results.all()
        if cls := request.query_params.get("predicted_class"):
            qs = qs.filter(predicted_class=cls)
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(ResultSerializer(page, many=True).data)

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        run = self.get_object()
        resp = HttpResponse(content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="prediction_run_{run.pk}.csv"'
        w = csv.writer(resp)
        w.writerow([f"# {services.DISCLAIMER}"])
        w.writerow([f"# modèle={run.model_version.name} v{run.model_version.version} ; dataset_version={run.input_dataset_version_id}"])
        w.writerow(["observation_reference", "predicted_class", "probability_good", "probability_medium", "probability_poor", "confidence"])
        for r in run.results.all().iterator():
            w.writerow([r.observation_reference, r.predicted_class, r.probability_good, r.probability_medium, r.probability_poor, r.confidence])
        return resp

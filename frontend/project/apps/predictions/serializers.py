from rest_framework import serializers

from apps.datasets.models import DatasetVersion

from .models import PredictionModel, PredictionResult, PredictionRun


class PredictionModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredictionModel
        fields = [
            "id", "name", "version", "model_type", "target_variable", "feature_schema", "training_dataset_version", "metrics",
            "status", "status_reason", "created_at",
        ]
        read_only_fields = fields


class TrainRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    training_dataset_version = serializers.PrimaryKeyRelatedField(queryset=DatasetVersion.objects.all())
    features = serializers.ListField(child=serializers.CharField(), required=False)


class RunRequestSerializer(serializers.Serializer):
    model_version = serializers.PrimaryKeyRelatedField(queryset=PredictionModel.objects.all())
    input_dataset_version = serializers.PrimaryKeyRelatedField(queryset=DatasetVersion.objects.all())


class PredictionRunSerializer(serializers.ModelSerializer):
    model_name = serializers.CharField(source="model_version.name", read_only=True)
    model_number = serializers.IntegerField(source="model_version.version", read_only=True)

    class Meta:
        model = PredictionRun
        fields = ["id", "model_version", "model_name", "model_number", "input_dataset_version", "status", "started_at", "completed_at", "summary", "created_at"]
        read_only_fields = fields


class ResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredictionResult
        fields = ["id", "observation_reference", "predicted_class", "probability_good", "probability_medium", "probability_poor", "confidence", "created_at"]
        read_only_fields = fields

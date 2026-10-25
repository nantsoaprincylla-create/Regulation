from rest_framework import serializers

from apps.accounts.models import User
from apps.datasets.models import DatasetSubmission
from apps.organizations.models import Organization
from apps.predictions.models import PredictionRun

from .models import CaseEvent, CorrectiveAction, OperatorResponse, RegulatoryCase, RegulatoryDecision, RegulatoryEvidence


class EvidenceSerializer(serializers.ModelSerializer):
    added_by = serializers.CharField(source="added_by.email", read_only=True)

    class Meta:
        model = RegulatoryEvidence
        fields = ["id", "kind", "description", "dataset_submission", "prediction_run", "visible_to_operator", "added_by", "created_at"]
        read_only_fields = ["id", "added_by", "created_at"]


class DecisionSerializer(serializers.ModelSerializer):
    decided_by = serializers.CharField(source="decided_by.email", read_only=True)
    evidence = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    is_current = serializers.BooleanField(read_only=True)
    supersedes = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = RegulatoryDecision
        fields = ["id", "case", "category", "justification", "decided_by", "decided_at", "evidence", "supersedes", "amendment_reason", "is_current"]
        read_only_fields = fields


class DecisionInputSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=RegulatoryDecision.Category.choices)
    justification = serializers.CharField()
    evidence = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    reason = serializers.CharField(required=False, allow_blank=True)  # motif de modification


class CorrectiveActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrectiveAction
        fields = ["id", "case", "decision", "description", "due_date", "status", "operator_report", "verification_comment", "created_at", "updated_at"]
        read_only_fields = ["id", "case", "status", "operator_report", "verification_comment", "created_at", "updated_at"]


class ResponseSerializer(serializers.ModelSerializer):
    responder = serializers.CharField(source="responder.email", read_only=True)

    class Meta:
        model = OperatorResponse
        fields = ["id", "responder", "content", "created_at"]
        read_only_fields = fields


class EventSerializer(serializers.ModelSerializer):
    actor = serializers.CharField(source="actor.email", default=None, read_only=True)

    class Meta:
        model = CaseEvent
        fields = ["id", "kind", "actor", "message", "internal", "created_at"]
        read_only_fields = fields


class CaseSerializer(serializers.ModelSerializer):
    operator = serializers.SlugRelatedField(slug_field="code", queryset=Organization.objects.filter(organization_type="OPERATOR"))
    related_prediction = serializers.PrimaryKeyRelatedField(queryset=PredictionRun.objects.all(), required=False, allow_null=True)
    related_dataset_submission = serializers.PrimaryKeyRelatedField(queryset=DatasetSubmission.objects.all(), required=False, allow_null=True)
    assigned_to = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role="ARTEC_REGULATOR", is_active=True), required=False, allow_null=True)
    current_decision = serializers.SerializerMethodField()

    class Meta:
        model = RegulatoryCase
        fields = [
            "id", "reference_number", "operator", "case_type", "status", "title", "description", "related_prediction",
            "related_dataset_submission", "opened_by", "assigned_to", "opened_at", "deadline", "closed_at", "current_decision",
        ]
        read_only_fields = ["id", "reference_number", "status", "opened_by", "opened_at", "closed_at", "current_decision"]

    def get_current_decision(self, obj):
        for d in obj.decisions.all():
            if d.is_current:
                return {"id": d.id, "category": d.category, "decided_at": d.decided_at}
        return None


class RespondSerializer(serializers.Serializer):
    content = serializers.CharField()


class ExplanationSerializer(serializers.Serializer):
    message = serializers.CharField()
    deadline = serializers.DateField(required=False)


class CloseSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True)


class ActionUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["IN_PROGRESS", "SUBMITTED"])
    report = serializers.CharField(required=False, allow_blank=True)


class VerifySerializer(serializers.Serializer):
    compliant = serializers.BooleanField()
    comment = serializers.CharField(required=False, allow_blank=True)


class NoteSerializer(serializers.Serializer):
    message = serializers.CharField()

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import ARTEC_PUBLISHER, ARTEC_REGULATOR, OPERATOR_USER, roles_required

from . import services


class DashboardView(APIView):
    """Tableau de bord adapté au rôle de l'utilisateur connecté (le rôle est lu en base)."""

    permission_classes = [roles_required(OPERATOR_USER, ARTEC_PUBLISHER, ARTEC_REGULATOR)]

    @extend_schema(responses={200: dict})
    def get(self, request):
        user = request.user
        if user.role == ARTEC_REGULATOR:
            return Response({"space": "regulation", **services.regulator_dashboard()})
        if user.role == ARTEC_PUBLISHER:
            return Response({"space": "publications", **services.publisher_dashboard(user.organization)})
        return Response({"space": "operator", **services.operator_dashboard(user.organization)})


class OperatorRatingsView(APIView):
    """Comparaison indicative des opérateurs — réservée à ARTEC Régulation."""

    permission_classes = [roles_required(ARTEC_REGULATOR)]

    @extend_schema(responses={200: dict})
    def get(self, request):
        return Response(services.operator_ratings())


class PublicOverviewView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    @extend_schema(responses={200: dict})
    def get(self, request):
        return Response(services.public_overview())


class PublicQualityView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    @extend_schema(responses={200: dict})
    def get(self, request):
        return Response(services.public_quality())

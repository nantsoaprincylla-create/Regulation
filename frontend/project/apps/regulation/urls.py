from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CaseViewSet, CorrectiveActionViewSet, DecisionViewSet, OverviewView

router = DefaultRouter()
router.register("cases", CaseViewSet, basename="regulatory-case")
router.register("decisions", DecisionViewSet, basename="regulatory-decision")
router.register("corrective-actions", CorrectiveActionViewSet, basename="corrective-action")
urlpatterns = [path("overview/", OverviewView.as_view(), name="regulation-overview")] + router.urls

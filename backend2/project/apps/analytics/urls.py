from django.urls import path

from .views import DashboardView, OperatorRatingsView, PublicOverviewView, PublicQualityView

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="analytics-dashboard"),
    path("operator-ratings/", OperatorRatingsView.as_view(), name="analytics-operator-ratings"),
    path("public/overview/", PublicOverviewView.as_view(), name="analytics-public-overview"),
    path("public/quality/", PublicQualityView.as_view(), name="analytics-public-quality"),
]

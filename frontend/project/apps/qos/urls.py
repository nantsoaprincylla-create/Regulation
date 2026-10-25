from rest_framework.routers import DefaultRouter

from .views import MeasurementViewSet, ThresholdViewSet

router = DefaultRouter()
router.register("thresholds", ThresholdViewSet, basename="qos-threshold")
router.register("measurements", MeasurementViewSet, basename="qos-measurement")
urlpatterns = router.urls

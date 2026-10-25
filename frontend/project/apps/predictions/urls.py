from rest_framework.routers import DefaultRouter

from .views import PredictionModelViewSet, PredictionRunViewSet

router = DefaultRouter()
router.register("models", PredictionModelViewSet, basename="prediction-model")
router.register("runs", PredictionRunViewSet, basename="prediction-run")
urlpatterns = router.urls

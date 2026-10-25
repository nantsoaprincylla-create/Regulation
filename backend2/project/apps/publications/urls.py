from rest_framework.routers import DefaultRouter

from .views import PublicationViewSet, PublicPublicationViewSet

router = DefaultRouter()
router.register("public", PublicPublicationViewSet, basename="public-publication")
router.register("", PublicationViewSet, basename="publication")
urlpatterns = router.urls

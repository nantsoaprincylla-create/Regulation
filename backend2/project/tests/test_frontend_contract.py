"""Contrats minimaux attendus par le frontend public React."""
from django.urls import resolve

def test_public_survey_routes_resolve():
    assert resolve("/api/v1/surveys/").url_name == "survey-list"
    assert resolve("/api/v1/surveys/1/").url_name == "survey-detail"
    assert resolve("/api/v1/surveys/1/participation-token/").url_name == "survey-participation-token"
    assert resolve("/api/v1/surveys/1/responses/").url_name == "survey-responses"

def test_public_publication_routes_resolve():
    assert resolve("/api/v1/publications/public/").url_name == "public-publication-list"

"""Isolation des opérateurs et séparation des deux comptes ARTEC."""
from apps.datasets.models import Dataset

from .conftest import qos_csv, csv_file


def mk_dataset(client, name="Mesures 4G", data_type="QOS_MEASUREMENT"):
    r = client.post("/api/v1/datasets/", {"name": name, "data_type": data_type}, format="json")
    assert r.status_code == 201, r.data
    return r.data["id"]


def upload(client, ds_id, text=None):
    return client.post(f"/api/v1/datasets/{ds_id}/versions/", {"file": csv_file(text or qos_csv())}, format="multipart")


def test_operator_cannot_see_competitor_dataset_even_with_exact_id(api, yas, airtel):
    ds = mk_dataset(api(yas))
    v = upload(api(yas), ds).data["id"]
    c = api(airtel)
    assert c.get(f"/api/v1/datasets/{ds}/").status_code == 404
    assert c.get(f"/api/v1/datasets/versions/{v}/").status_code == 404
    assert c.get(f"/api/v1/datasets/versions/{v}/download/").status_code == 404
    assert c.get(f"/api/v1/datasets/versions/{v}/preview/").status_code == 404
    assert c.post(f"/api/v1/datasets/versions/{v}/submit/").status_code == 404
    assert c.patch(f"/api/v1/datasets/{ds}/", {"name": "pirate"}, format="json").status_code == 404
    assert c.post(f"/api/v1/datasets/{ds}/versions/", {"file": csv_file(qos_csv())}, format="multipart").status_code == 404
    assert Dataset.objects.get(pk=ds).name == "Mesures 4G"
    assert c.get("/api/v1/datasets/").data["count"] == 0


def test_operator_cannot_modify_competitor_submission_or_case(api, yas, airtel, orange, regulator):
    ds = mk_dataset(api(yas))
    v = upload(api(yas), ds).data["id"]
    sub = api(yas).post(f"/api/v1/datasets/versions/{v}/submit/").data["id"]
    for other in (airtel, orange):
        c = api(other)
        assert c.get(f"/api/v1/submissions/{sub}/").status_code == 404
        assert c.post(f"/api/v1/submissions/{sub}/accept/").status_code in (403, 404)
    case = api(regulator).post("/api/v1/regulation/cases/", {"operator": "YAS", "case_type": "QOS_ANOMALY", "title": "t", "description": "d"}, format="json")
    assert case.status_code == 201
    cid = case.data["id"]
    assert api(orange).get(f"/api/v1/regulation/cases/{cid}/").status_code == 404
    assert api(airtel).get(f"/api/v1/regulation/cases/{cid}/timeline/").status_code == 404
    assert api(airtel).post(f"/api/v1/regulation/cases/{cid}/respond/", {"content": "x"}, format="json").status_code == 404
    assert api(orange).get("/api/v1/regulation/cases/").data["count"] == 0


def test_operator_cannot_manage_other_operator_publications_and_scraping(api, yas, airtel):
    p = api(yas).post("/api/v1/publications/", {"title": "Info YAS", "content": "contenu", "category": "INFORMATION"}, format="json")
    assert p.status_code == 201
    pid = p.data["id"]
    assert api(airtel).get(f"/api/v1/publications/{pid}/").status_code == 404
    assert api(airtel).post(f"/api/v1/publications/{pid}/publish/").status_code == 404
    assert api(airtel).get("/api/v1/publications/").data["count"] == 0


def test_publisher_cannot_run_predictions_or_decide(api, publisher):
    c = api(publisher)
    assert c.post("/api/v1/predictions/runs/", {"model_version": 1, "input_dataset_version": 1}, format="json").status_code == 403
    assert c.post("/api/v1/predictions/models/train/", {"name": "m", "training_dataset_version": 1}, format="json").status_code == 403
    assert c.post("/api/v1/regulation/cases/", {"operator": "YAS", "case_type": "OTHER", "title": "t", "description": "d"}, format="json").status_code == 403
    assert c.get("/api/v1/regulation/cases/").status_code == 403
    assert c.get("/api/v1/submissions/").status_code == 403
    assert c.get("/api/v1/datasets/").status_code == 403
    assert c.get("/api/v1/qos/measurements/").status_code == 403
    assert c.get("/api/v1/complaints/").status_code == 403


def test_regulator_has_no_editorial_rights(api, regulator):
    c = api(regulator)
    assert c.post("/api/v1/publications/", {"title": "x", "content": "y"}, format="json").status_code == 403
    assert c.post("/api/v1/surveys/", {"title": "x"}, format="json").status_code == 403
    assert c.get("/api/v1/comments/?status=PENDING").status_code == 200  # liste publique seulement
    assert all(row.get("status") is None for row in c.get("/api/v1/comments/").data["results"])


def test_regulator_can_review_submissions(api, yas, regulator):
    ds = mk_dataset(api(yas))
    v = upload(api(yas), ds).data["id"]
    api(yas).post(f"/api/v1/datasets/versions/{v}/submit/")
    r = api(regulator).get("/api/v1/submissions/")
    assert r.status_code == 200 and r.data["count"] == 1
    assert api(regulator).get(f"/api/v1/datasets/versions/{v}/preview/").status_code == 200


def test_operator_cannot_review_own_submission(api, yas):
    ds = mk_dataset(api(yas))
    v = upload(api(yas), ds).data["id"]
    sub = api(yas).post(f"/api/v1/datasets/versions/{v}/submit/").data["id"]
    assert api(yas).post(f"/api/v1/submissions/{sub}/accept/").status_code == 403


def test_sysadmin_has_no_regulatory_competence(api, sysadmin):
    c = api(sysadmin)
    assert c.post("/api/v1/regulation/cases/", {"operator": "YAS", "case_type": "OTHER", "title": "t", "description": "d"}, format="json").status_code == 403
    assert c.get("/api/v1/submissions/").status_code == 403
    assert c.post("/api/v1/predictions/runs/", {}, format="json").status_code == 403


def test_audit_scoping(api, yas, airtel, regulator, sysadmin):
    from apps.audit.services import log

    log(yas, "x.test", "T", 1)
    log(airtel, "y.test", "T", 2)
    assert {r["action"] for r in api(yas).get("/api/v1/audit/?search=test").data["results"]} == {"x.test"}
    assert api(sysadmin).get("/api/v1/audit/?search=test").data["count"] == 2
    assert api(yas).post("/api/v1/audit/", {}, format="json").status_code == 405

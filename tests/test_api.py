import os
import copy
import importlib.util
from fastapi.testclient import TestClient

# Load the application module by file path so tests run without package imports
ROOT = os.path.dirname(os.path.dirname(__file__))
APP_PATH = os.path.join(ROOT, "src", "app.py")

spec = importlib.util.spec_from_file_location("app_module", APP_PATH)
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)

app = app_module.app
activities = app_module.activities

client = TestClient(app)


def _backup_activities():
    return copy.deepcopy(activities)


def _restore_activities(backup):
    activities.clear()
    activities.update(backup)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Basic sanity: some known activity present
    assert "Chess Club" in data


def test_signup_and_duplicate():
    backup = _backup_activities()
    try:
        activity = "Chess Club"
        email = "test_student@example.com"

        # Ensure not present initially
        assert email not in activities[activity]["participants"]

        # Signup should succeed
        resp = client.post(f"/activities/{activity}/signup", params={"email": email})
        assert resp.status_code == 200
        body = resp.json()
        assert "Signed up" in body.get("message", "")
        assert email in activities[activity]["participants"]

        # Duplicate signup should return 400
        resp2 = client.post(f"/activities/{activity}/signup", params={"email": email})
        assert resp2.status_code == 400
    finally:
        _restore_activities(backup)


def test_remove_participant():
    backup = _backup_activities()
    try:
        activity = "Chess Club"
        # Use an existing participant from sample data
        existing = activities[activity]["participants"][0]

        # Remove should succeed
        resp = client.delete(f"/activities/{activity}/participants", params={"email": existing})
        assert resp.status_code == 200
        assert existing not in activities[activity]["participants"]

        # Removing again should return 404
        resp2 = client.delete(f"/activities/{activity}/participants", params={"email": existing})
        assert resp2.status_code == 404
    finally:
        _restore_activities(backup)

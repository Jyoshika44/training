"""
Direct Mock Tests for RecommenderRequestHandler.
Verifies all API routes and responses without needing network sockets.
"""

import io
import json
import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
from app import RecommenderRequestHandler

class MockSocket:
    def makefile(self, *args, **kwargs):
        return io.BytesIO()

class DummyHandler(RecommenderRequestHandler):
    """Subclass that captures output in BytesIO without a real network socket."""
    def __init__(self, method, path, body=None):
        self.command = method
        self.path = path
        self.request_version = "HTTP/1.1"
        self.headers = {}
        
        body_bytes = b""
        if body is not None:
            if isinstance(body, dict):
                body_bytes = json.dumps(body).encode("utf-8")
            elif isinstance(body, str):
                body_bytes = body.encode("utf-8")
            self.headers["Content-Length"] = str(len(body_bytes))
            self.headers["Content-Type"] = "application/json"
        else:
            self.headers["Content-Length"] = "0"

        self.rfile = io.BytesIO(body_bytes)
        self.wfile = io.BytesIO()
        self.status_code = None
        self.response_headers = {}

    def send_response(self, code, message=None):
        self.status_code = code

    def send_header(self, keyword, value):
        self.response_headers[keyword] = value

    def end_headers(self):
        pass

    def log_message(self, format, *args):
        pass  # Suppress logging during tests

    def get_response_json(self):
        self.wfile.seek(0)
        content = self.wfile.read().decode("utf-8")
        if not content:
            return None
        return json.loads(content)

    def get_response_bytes(self):
        self.wfile.seek(0)
        return self.wfile.read()

class TestAPIHandlers(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database.init_db(force_reseed=True)

    def test_get_projects_all(self):
        handler = DummyHandler("GET", "/api/projects")
        handler.do_GET()
        self.assertEqual(handler.status_code, 200)
        res = handler.get_response_json()
        self.assertIn("projects", res)
        self.assertGreaterEqual(res["count"], 39)

    def test_get_projects_filter_category(self):
        handler = DummyHandler("GET", "/api/projects?category=Web+Development")
        handler.do_GET()
        self.assertEqual(handler.status_code, 200)
        res = handler.get_response_json()
        self.assertTrue(all(p["category"] == "Web Development" for p in res["projects"]))

    def test_get_project_detail(self):
        handler = DummyHandler("GET", "/api/projects")
        handler.do_GET()
        res = handler.get_response_json()
        pid = res["projects"][0]["project_id"]

        detail_handler = DummyHandler("GET", f"/api/projects/{pid}")
        detail_handler.do_GET()
        self.assertEqual(detail_handler.status_code, 200)
        detail_res = detail_handler.get_response_json()
        self.assertIn("project", detail_res)
        self.assertEqual(detail_res["project"]["project_id"], pid)

    def test_post_recommend(self):
        payload = {
            "name": "Snehal",
            "department": "Computer Science & Engineering",
            "skills": ["Python", "Machine Learning"],
            "technologies": ["Scikit-learn", "Pandas"],
            "interests": ["Machine Learning"],
            "preferred_domains": ["Machine Learning"],
            "difficulty": "intermediate",
            "duration": "1-2 months",
            "team_size": 1
        }
        handler = DummyHandler("POST", "/api/recommend", payload)
        handler.do_POST()
        self.assertEqual(handler.status_code, 200)
        res = handler.get_response_json()
        self.assertEqual(res["status"], "success")
        self.assertIn("recommendations", res)
        self.assertGreater(len(res["recommendations"]), 0)
        top = res["recommendations"][0]
        self.assertEqual(top["category"], "Machine Learning")
        self.assertGreater(top["match_percentage"], 60)

    def test_favorites_crud(self):
        handler = DummyHandler("GET", "/api/projects")
        handler.do_GET()
        res = handler.get_response_json()
        pid = res["projects"][0]["project_id"]

        # 1. Add to favorites
        fav_handler = DummyHandler("POST", "/api/favorites", {"project_id": pid})
        fav_handler.do_POST()
        self.assertEqual(fav_handler.status_code, 201)
        fav_res = fav_handler.get_response_json()
        self.assertEqual(fav_res["status"], "success")

        # 2. Get favorites
        get_fav = DummyHandler("GET", "/api/favorites")
        get_fav.do_GET()
        self.assertEqual(get_fav.status_code, 200)
        fav_list = get_fav.get_response_json()
        fav_ids = [f["project_id"] for f in fav_list["favorites"]]
        self.assertIn(pid, fav_ids)

        # 3. Delete favorite
        del_fav = DummyHandler("DELETE", f"/api/favorites/{pid}")
        del_fav.do_DELETE()
        self.assertEqual(del_fav.status_code, 200)

    def test_compare_projects(self):
        handler = DummyHandler("GET", "/api/projects")
        handler.do_GET()
        res = handler.get_response_json()
        pid1 = res["projects"][0]["project_id"]
        pid2 = res["projects"][1]["project_id"]

        compare_handler = DummyHandler("GET", f"/api/compare?ids={pid1},{pid2}")
        compare_handler.do_GET()
        self.assertEqual(compare_handler.status_code, 200)
        compare_res = compare_handler.get_response_json()
        self.assertEqual(compare_res["count"], 2)

    def test_admin_stats(self):
        handler = DummyHandler("GET", "/api/admin/stats")
        handler.do_GET()
        self.assertEqual(handler.status_code, 200)
        res = handler.get_response_json()
        self.assertGreaterEqual(res["total_projects"], 39)
        self.assertEqual(res["total_categories"], 13)

    def test_admin_create_edit_delete_project(self):
        # Create
        new_proj = {
            "title": "Custom Test Project",
            "category": "Web Development",
            "description": "Test description for custom project",
            "technologies": "React, Python",
            "required_skills": "Python, JavaScript",
            "difficulty": "Intermediate",
            "duration": "2-3 months",
            "team_size": "Team (2-3 members)"
        }
        handler = DummyHandler("POST", "/api/admin/projects", new_proj)
        handler.do_POST()
        self.assertEqual(handler.status_code, 201)
        created = handler.get_response_json()
        new_id = created["project_id"]

        # Edit
        update_data = {
            "title": "Updated Custom Test Project",
            "category": "Web Development",
            "description": "Updated description",
            "technologies": "React, Python, Docker",
            "required_skills": "Python, JavaScript, Docker",
            "difficulty": "Advanced",
            "duration": "3-4 months",
            "team_size": "Team (2-3 members)"
        }
        handler = DummyHandler("PUT", f"/api/admin/projects/{new_id}", update_data)
        handler.do_PUT()
        self.assertEqual(handler.status_code, 200)

        # Verify update
        handler = DummyHandler("GET", f"/api/projects/{new_id}")
        handler.do_GET()
        res = handler.get_response_json()
        self.assertEqual(res["project"]["title"], "Updated Custom Test Project")

        # Delete
        handler = DummyHandler("DELETE", f"/api/admin/projects/{new_id}")
        handler.do_DELETE()
        self.assertEqual(handler.status_code, 200)

    def test_admin_reset(self):
        handler = DummyHandler("POST", "/api/admin/reset")
        handler.do_POST()
        self.assertEqual(handler.status_code, 200)
        res = handler.get_response_json()
        self.assertEqual(res["status"], "success")

    def test_history_api(self):
        handler = DummyHandler("GET", "/api/history")
        handler.do_GET()
        self.assertEqual(handler.status_code, 200)
        res = handler.get_response_json()
        self.assertIn("history", res)

    def test_static_file_serving(self):
        handler = DummyHandler("GET", "/")
        handler.do_GET()
        self.assertEqual(handler.status_code, 200)
        content = handler.get_response_bytes().decode("utf-8")
        self.assertIn("ProjectSphere", content)
        self.assertIn("Student Project Preferences", content)

if __name__ == "__main__":
    unittest.main()

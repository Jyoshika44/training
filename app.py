"""
Web application backend for Student Project Idea Recommender System.
Uses Python's standard library http.server, urllib, and sqlite3.
Zero external package dependencies required.
"""

import http.server
import socketserver
import json
import urllib.parse
import os
import mimetypes
import traceback
from typing import Dict, Any, List

import database
from recommender import rank_projects_for_student, calculate_match

PORT = 8000
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

class RecommenderRequestHandler(http.server.BaseHTTPRequestHandler):
    """Handles HTTP requests for REST API endpoints and static assets."""

    def log_message(self, format, *args):
        """Custom clean logging to terminal."""
        print(f"[{self.log_date_time_string()}] {self.command} {self.path} - {format % args}")

    def send_cors_headers(self):
        """Adds CORS and standard response headers."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        """Handle CORS pre-flight requests."""
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def send_json(self, status_code: int, data: Any):
        """Helper to send a JSON response."""
        response_bytes = json.dumps(data, default=str).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(response_bytes)

    def send_error_json(self, status_code: int, message: str):
        """Helper to send an error JSON response."""
        self.send_json(status_code, {"error": message, "status": "error"})

    def get_parsed_body(self) -> Dict[str, Any]:
        """Reads and parses JSON body from request."""
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length).decode("utf-8")
        try:
            return json.loads(body)
        except Exception:
            return {}

    def do_GET(self):
        """Routes GET requests to API handlers or static file serving."""
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        try:
            if path == "/api/projects":
                self.handle_get_projects(query)
            elif path.startswith("/api/projects/"):
                proj_id = path.split("/")[-1]
                self.handle_get_project_detail(proj_id)
            elif path == "/api/categories":
                self.handle_get_categories()
            elif path == "/api/skills-and-tech":
                self.handle_get_skills_and_tech()
            elif path == "/api/favorites":
                self.handle_get_favorites()
            elif path == "/api/history":
                self.handle_get_history()
            elif path.startswith("/api/history/"):
                session_id = path.split("/")[-1]
                self.handle_get_history_detail(session_id)
            elif path == "/api/compare":
                self.handle_compare_projects(query)
            elif path == "/api/admin/stats":
                self.handle_get_admin_stats()
            else:
                self.serve_static_file(path)
        except Exception as e:
            traceback.print_exc()
            self.send_error_json(500, f"Server error: {str(e)}")

    def do_POST(self):
        """Routes POST requests to API handlers."""
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        body = self.get_parsed_body()

        try:
            if path == "/api/recommend":
                self.handle_post_recommend(body)
            elif path == "/api/favorites":
                self.handle_post_favorite(body)
            elif path == "/api/admin/projects":
                self.handle_post_admin_project(body)
            elif path == "/api/admin/reset":
                self.handle_post_admin_reset()
            else:
                self.send_error_json(404, "Endpoint not found")
        except Exception as e:
            traceback.print_exc()
            self.send_error_json(500, f"Server error: {str(e)}")

    def do_PUT(self):
        """Routes PUT requests to API handlers."""
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        body = self.get_parsed_body()

        try:
            if path.startswith("/api/admin/projects/"):
                proj_id = path.split("/")[-1]
                self.handle_put_admin_project(proj_id, body)
            else:
                self.send_error_json(404, "Endpoint not found")
        except Exception as e:
            traceback.print_exc()
            self.send_error_json(500, f"Server error: {str(e)}")

    def do_DELETE(self):
        """Routes DELETE requests to API handlers."""
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        try:
            if path.startswith("/api/favorites/"):
                proj_id = path.split("/")[-1]
                self.handle_delete_favorite(proj_id)
            elif path.startswith("/api/admin/projects/"):
                proj_id = path.split("/")[-1]
                self.handle_delete_admin_project(proj_id)
            else:
                self.send_error_json(404, "Endpoint not found")
        except Exception as e:
            traceback.print_exc()
            self.send_error_json(500, f"Server error: {str(e)}")

    # -------------------------------------------------------------
    # API HANDLERS
    # -------------------------------------------------------------

    def handle_get_projects(self, query: Dict[str, List[str]]):
        """Returns filtered list of projects."""
        conn = database.get_db_connection()
        cursor = conn.cursor()

        sql = "SELECT * FROM projects WHERE 1=1"
        params = []

        # Filter by category
        if "category" in query and query["category"][0] and query["category"][0] != "All":
            sql += " AND category = ?"
            params.append(query["category"][0])

        # Filter by difficulty
        if "difficulty" in query and query["difficulty"][0] and query["difficulty"][0] != "All":
            sql += " AND LOWER(difficulty) = LOWER(?)"
            params.append(query["difficulty"][0])

        # Filter by duration
        if "duration" in query and query["duration"][0] and query["duration"][0] != "All":
            sql += " AND duration = ?"
            params.append(query["duration"][0])

        # Search query across title, description, skills, and technologies
        if "search" in query and query["search"][0].strip():
            search_term = f"%{query['search'][0].strip()}%"
            sql += " AND (title LIKE ? OR description LIKE ? OR required_skills LIKE ? OR technologies LIKE ? OR category LIKE ?)"
            params.extend([search_term, search_term, search_term, search_term, search_term])

        sql += " ORDER BY title ASC"
        cursor.execute(sql, params)
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()

        self.send_json(200, {"projects": rows, "count": len(rows)})

    def handle_get_project_detail(self, proj_id: str):
        """Returns single project details by ID."""
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects WHERE project_id = ?", (proj_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            self.send_error_json(404, "Project not found")
            return

        self.send_json(200, {"project": dict(row)})

    def handle_get_categories(self):
        """Returns categories with project counts."""
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT category, COUNT(*) as count FROM projects GROUP BY category ORDER BY count DESC, category ASC")
        rows = [{"category": row["category"], "count": row["count"]} for row in cursor.fetchall()]
        conn.close()

        self.send_json(200, {"categories": rows})

    def handle_get_skills_and_tech(self):
        """Returns aggregated lists of skills, technologies, categories, and preset departments."""
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT required_skills, technologies, category FROM projects")
        rows = cursor.fetchall()
        conn.close()

        skills_set = set()
        tech_set = set()
        categories_set = set()

        for r in rows:
            categories_set.add(r["category"])
            for s in r["required_skills"].split(","):
                s_clean = s.strip()
                if s_clean:
                    skills_set.add(s_clean)
            for t in r["technologies"].split(","):
                t_clean = t.strip()
                if t_clean:
                    tech_set.add(t_clean)

        departments = [
            "Computer Science & Engineering",
            "Information Technology",
            "Artificial Intelligence & Machine Learning",
            "Data Science & Analytics",
            "Electronics & Communication Engineering",
            "Software Engineering",
            "Cybersecurity & Digital Forensics",
            "Electrical & Computer Engineering"
        ]

        preset_domains = [
            "Web Development",
            "Artificial Intelligence",
            "Machine Learning",
            "Data Science",
            "Computer Networks",
            "Cybersecurity",
            "Database Management",
            "Mobile Applications",
            "IoT",
            "Cloud Computing",
            "Computer Vision",
            "Java Applications",
            "Python Applications"
        ]

        self.send_json(200, {
            "skills": sorted(list(skills_set)),
            "technologies": sorted(list(tech_set)),
            "categories": sorted(list(categories_set)),
            "departments": departments,
            "preset_domains": preset_domains
        })

    def handle_post_recommend(self, body: Dict[str, Any]):
        """Runs the recommendation engine, stores student & session history, and returns ranked matches."""
        name = body.get("name", "Student").strip() or "Student"
        department = body.get("department", "Computer Science & Engineering").strip()
        skills = body.get("skills", "")
        technologies = body.get("technologies", "")
        interests = body.get("interests", "")
        preferred_type = body.get("preferred_type", "either")
        difficulty = body.get("difficulty", "intermediate")
        duration = body.get("duration", "2-3 months")
        team_size = body.get("team_size", 1)

        conn = database.get_db_connection()
        cursor = conn.cursor()

        # 1. Insert Student record
        cursor.execute("""
        INSERT INTO students (name, department, skills, technologies, interests, preferred_type, difficulty, duration, team_size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            name, department,
            ", ".join(skills) if isinstance(skills, list) else str(skills),
            ", ".join(technologies) if isinstance(technologies, list) else str(technologies),
            ", ".join(interests) if isinstance(interests, list) else str(interests),
            preferred_type, difficulty, duration, int(team_size)
        ))
        student_id = cursor.lastrowid

        # 2. Fetch all projects
        cursor.execute("SELECT * FROM projects")
        all_projects = [dict(row) for row in cursor.fetchall()]

        # 3. Calculate ranked recommendations
        ranked_projects = rank_projects_for_student(body, all_projects)

        top_score = ranked_projects[0]["match_percentage"] if ranked_projects else 0

        # 4. Save session record
        cursor.execute("""
        INSERT INTO recommendation_sessions (student_id, student_name, department, search_params, results_count, top_match_score)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            student_id, name, department, json.dumps(body), len(ranked_projects), top_score
        ))
        session_id = cursor.lastrowid

        # 5. Save top recommendations
        for rp in ranked_projects[:10]:
            cursor.execute("""
            INSERT INTO recommendations (student_id, project_id, match_score, why_matched)
            VALUES (?, ?, ?, ?)
            """, (
                student_id, rp["project_id"], rp["match_percentage"], rp["why_matched"]
            ))

        conn.commit()
        conn.close()

        self.send_json(200, {
            "status": "success",
            "student_id": student_id,
            "session_id": session_id,
            "student_profile": body,
            "top_match_score": top_score,
            "count": len(ranked_projects),
            "recommendations": ranked_projects
        })

    def handle_get_favorites(self):
        """Returns all saved favorite projects."""
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT f.favorite_id, f.created_at as favorited_at, f.notes, p.*
        FROM favorites f
        JOIN projects p ON f.project_id = p.project_id
        ORDER BY f.created_at DESC
        """)
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()

        self.send_json(200, {"favorites": rows, "count": len(rows)})

    def handle_post_favorite(self, body: Dict[str, Any]):
        """Adds a project to favorites."""
        project_id = body.get("project_id")
        student_id = body.get("student_id")
        notes = body.get("notes", "")

        if not project_id:
            self.send_error_json(400, "project_id is required")
            return

        conn = database.get_db_connection()
        cursor = conn.cursor()

        # Check if already favorited
        cursor.execute("SELECT favorite_id FROM favorites WHERE project_id = ?", (project_id,))
        existing = cursor.fetchone()
        if existing:
            conn.close()
            self.send_json(200, {"status": "exists", "favorite_id": existing["favorite_id"], "message": "Already favorited"})
            return

        cursor.execute("""
        INSERT INTO favorites (student_id, project_id, notes)
        VALUES (?, ?, ?)
        """, (student_id, project_id, notes))
        fav_id = cursor.lastrowid
        conn.commit()
        conn.close()

        self.send_json(201, {"status": "success", "favorite_id": fav_id, "project_id": project_id})

    def handle_delete_favorite(self, project_id: str):
        """Removes a project from favorites."""
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM favorites WHERE project_id = ?", (project_id,))
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()

        self.send_json(200, {"status": "success", "deleted": deleted_count})

    def handle_get_history(self):
        """Returns previous recommendation sessions."""
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT session_id, student_id, student_name, department, search_params, results_count, top_match_score, created_at
        FROM recommendation_sessions
        ORDER BY created_at DESC
        LIMIT 50
        """)
        rows = []
        for r in cursor.fetchall():
            row_dict = dict(r)
            try:
                row_dict["search_params"] = json.loads(row_dict["search_params"])
            except Exception:
                pass
            rows.append(row_dict)
        conn.close()

        self.send_json(200, {"history": rows, "count": len(rows)})

    def handle_get_history_detail(self, session_id: str):
        """Retrieves past session recommendations."""
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM recommendation_sessions WHERE session_id = ?", (session_id,))
        sess = cursor.fetchone()
        if not sess:
            conn.close()
            self.send_error_json(404, "Session not found")
            return

        session_dict = dict(sess)
        try:
            params = json.loads(session_dict["search_params"])
        except Exception:
            params = {}

        cursor.execute("SELECT * FROM projects")
        all_projects = [dict(row) for row in cursor.fetchall()]
        conn.close()

        ranked = rank_projects_for_student(params, all_projects)

        self.send_json(200, {
            "session": session_dict,
            "student_profile": params,
            "recommendations": ranked
        })

    def handle_compare_projects(self, query: Dict[str, List[str]]):
        """Returns side-by-side comparison data for 2 or 3 projects."""
        ids_str = query.get("ids", [""])[0]
        if not ids_str:
            self.send_error_json(400, "Missing 'ids' parameter (e.g. ?ids=1,2,3)")
            return

        ids = [int(i.strip()) for i in ids_str.split(",") if i.strip().isdigit()]
        if len(ids) < 2:
            self.send_error_json(400, "At least 2 project IDs are required for comparison")
            return

        conn = database.get_db_connection()
        cursor = conn.cursor()
        placeholders = ",".join("?" for _ in ids)
        cursor.execute(f"SELECT * FROM projects WHERE project_id IN ({placeholders})", ids)
        projects = [dict(row) for row in cursor.fetchall()]
        conn.close()

        # Sort projects to match order of requested IDs
        proj_map = {p["project_id"]: p for p in projects}
        ordered = [proj_map[pid] for pid in ids if pid in proj_map]

        self.send_json(200, {"projects": ordered, "count": len(ordered)})

    def handle_get_admin_stats(self):
        """Returns dashboard summary statistics for admin module."""
        conn = database.get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM projects")
        total_projects = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(DISTINCT category) FROM projects")
        total_categories = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM recommendation_sessions")
        total_recommendations = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM favorites")
        total_favorites = cursor.fetchone()[0]

        cursor.execute("SELECT category, COUNT(*) as count FROM projects GROUP BY category ORDER BY count DESC")
        category_counts = [{"category": r["category"], "count": r["count"]} for r in cursor.fetchall()]

        cursor.execute("SELECT difficulty, COUNT(*) as count FROM projects GROUP BY difficulty")
        difficulty_counts = [{"difficulty": r["difficulty"], "count": r["count"]} for r in cursor.fetchall()]

        cursor.execute("SELECT duration, COUNT(*) as count FROM projects GROUP BY duration")
        duration_counts = [{"duration": r["duration"], "count": r["count"]} for r in cursor.fetchall()]

        conn.close()

        self.send_json(200, {
            "total_projects": total_projects,
            "total_categories": total_categories,
            "total_recommendations": total_recommendations,
            "total_favorites": total_favorites,
            "category_counts": category_counts,
            "difficulty_counts": difficulty_counts,
            "duration_counts": duration_counts
        })

    def handle_post_admin_project(self, body: Dict[str, Any]):
        """Admin creates a new project."""
        title = body.get("title", "").strip()
        category = body.get("category", "").strip()
        description = body.get("description", "").strip()
        technologies = body.get("technologies", "").strip()
        required_skills = body.get("required_skills", "").strip()
        difficulty = body.get("difficulty", "Intermediate").strip()
        duration = body.get("duration", "2-3 months").strip()
        team_size = body.get("team_size", "Individual or Team").strip()
        problem_solved = body.get("problem_solved", "").strip()
        objectives = body.get("objectives", "").strip()
        modules = body.get("modules", "").strip()
        db_requirements = body.get("db_requirements", "").strip()
        future_enhancements = body.get("future_enhancements", "").strip()
        advantages = body.get("advantages", "").strip()
        expected_output = body.get("expected_output", "").strip()

        if not title or not category or not description:
            self.send_error_json(400, "Title, Category, and Description are required")
            return

        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO projects (
            title, category, description, technologies, required_skills, difficulty,
            duration, team_size, problem_solved, objectives, modules, db_requirements,
            future_enhancements, advantages, expected_output, is_custom
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            title, category, description, technologies, required_skills, difficulty,
            duration, team_size, problem_solved, objectives, modules, db_requirements,
            future_enhancements, advantages, expected_output
        ))
        proj_id = cursor.lastrowid
        conn.commit()
        conn.close()

        self.send_json(201, {"status": "success", "project_id": proj_id, "message": "Project created successfully"})

    def handle_put_admin_project(self, proj_id: str, body: Dict[str, Any]):
        """Admin updates an existing project."""
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT project_id FROM projects WHERE project_id = ?", (proj_id,))
        if not cursor.fetchone():
            conn.close()
            self.send_error_json(404, "Project not found")
            return

        cursor.execute("""
        UPDATE projects SET
            title = ?, category = ?, description = ?, technologies = ?, required_skills = ?,
            difficulty = ?, duration = ?, team_size = ?, problem_solved = ?, objectives = ?,
            modules = ?, db_requirements = ?, future_enhancements = ?, advantages = ?,
            expected_output = ?
        WHERE project_id = ?
        """, (
            body.get("title", ""), body.get("category", ""), body.get("description", ""),
            body.get("technologies", ""), body.get("required_skills", ""), body.get("difficulty", "Intermediate"),
            body.get("duration", "2-3 months"), body.get("team_size", "Individual or Team"),
            body.get("problem_solved", ""), body.get("objectives", ""), body.get("modules", ""),
            body.get("db_requirements", ""), body.get("future_enhancements", ""),
            body.get("advantages", ""), body.get("expected_output", ""),
            proj_id
        ))
        conn.commit()
        conn.close()

        self.send_json(200, {"status": "success", "project_id": proj_id, "message": "Project updated successfully"})

    def handle_delete_admin_project(self, proj_id: str):
        """Admin deletes a project."""
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM projects WHERE project_id = ?", (proj_id,))
        deleted = cursor.rowcount
        conn.commit()
        conn.close()

        if deleted == 0:
            self.send_error_json(404, "Project not found")
            return

        self.send_json(200, {"status": "success", "message": "Project deleted successfully"})

    def handle_post_admin_reset(self):
        """Resets the database back to default seed projects."""
        database.init_db(force_reseed=True)
        self.send_json(200, {"status": "success", "message": "Database reset to default seed data successfully"})

    # -------------------------------------------------------------
    # STATIC FILE SERVING
    # -------------------------------------------------------------

    def serve_static_file(self, req_path: str):
        """Serves static files (HTML, CSS, JS, icons) with security checks."""
        clean_path = req_path.lstrip("/")
        if not clean_path or clean_path == "/":
            clean_path = "index.html"

        file_path = os.path.join(STATIC_DIR, clean_path)

        # Ensure requested path stays within STATIC_DIR (prevent directory traversal)
        norm_file = os.path.abspath(file_path)
        norm_static = os.path.abspath(STATIC_DIR)
        if not norm_file.startswith(norm_static):
            self.send_error_json(403, "Access denied")
            return

        # If file does not exist, serve index.html for SPA client-side routing
        if not os.path.exists(norm_file) or os.path.isdir(norm_file):
            norm_file = os.path.join(STATIC_DIR, "index.html")

        if not os.path.exists(norm_file):
            self.send_error_json(404, "File not found")
            return

        mime_type, _ = mimetypes.guess_type(norm_file)
        if not mime_type:
            mime_type = "application/octet-stream"
        if norm_file.endswith(".js"):
            mime_type = "application/javascript"
        elif norm_file.endswith(".css"):
            mime_type = "text/css"
        elif norm_file.endswith(".html"):
            mime_type = "text/html; charset=utf-8"

        try:
            with open(norm_file, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error_json(500, f"Error reading file: {str(e)}")

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    """Multi-threaded HTTP server to handle concurrent client requests smoothly."""
    daemon_threads = True
    allow_reuse_address = True

def run_server(port=PORT):
    """Starts the application server."""
    database.init_db()
    server_address = ("", port)
    httpd = ThreadedHTTPServer(server_address, RecommenderRequestHandler)
    print(f"================================================================")
    print(f" Student Project Idea Recommender System Server Running")
    print(f" Access URL: http://localhost:{port}")
    print(f"================================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server gracefully...")
        httpd.shutdown()

if __name__ == "__main__":
    run_server()

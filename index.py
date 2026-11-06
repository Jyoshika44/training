"""
Vercel Serverless Function entrypoint for Student Project Recommender.
Dispatches requests to RecommenderRequestHandler with dynamic path routing.
"""

import sys
import os
import urllib.parse

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

import database
from app import RecommenderRequestHandler

# Ensure database is initialized in serverless environment
try:
    database.init_db()
except Exception as e:
    pass

class handler(RecommenderRequestHandler):
    """Vercel Python Serverless Handler with path normalization."""

    def parse_actual_path(self):
        """Restores the original request path from headers or query parameters."""
        matched_path = self.headers.get("x-matched-path") or self.headers.get("x-vercel-matched-path")
        if matched_path and matched_path.startswith("/api"):
            self.path = matched_path
            return

        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        if "__path__" in qs:
            sub = qs["__path__"][0]
            del qs["__path__"]
            new_query = urllib.parse.urlencode(qs, doseq=True)
            self.path = f"/api/{sub}" + (f"?{new_query}" if new_query else "")
            return

    def do_GET(self):
        self.parse_actual_path()
        super().do_GET()

    def do_POST(self):
        self.parse_actual_path()
        super().do_POST()

    def do_PUT(self):
        self.parse_actual_path()
        super().do_PUT()

    def do_DELETE(self):
        self.parse_actual_path()
        super().do_DELETE()

    def do_OPTIONS(self):
        super().do_OPTIONS()

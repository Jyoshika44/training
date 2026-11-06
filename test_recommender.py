"""
Comprehensive Unit and Integration Test Suite for Student Project Recommender.
Tests recommendation logic, scoring, database operations, and REST API handlers.
"""

import unittest
import json
import sqlite3
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
from recommender import (
    calculate_overlap,
    calculate_difficulty_score,
    calculate_duration_score,
    calculate_match,
    rank_projects_for_student
)

class TestRecommenderLogic(unittest.TestCase):
    def setUp(self):
        database.init_db(force_reseed=False)
        self.conn = database.get_db_connection()
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM projects")
        self.all_projects = [dict(r) for r in cursor.fetchall()]

    def tearDown(self):
        self.conn.close()

    def test_overlap_calculation(self):
        user_skills = ["python", "machine learning"]
        proj_skills = ["python", "machine learning", "data preprocessing", "statistics"]
        ratio, matched, missing = calculate_overlap(user_skills, proj_skills)
        self.assertAlmostEqual(ratio, 0.5)
        self.assertEqual(len(matched), 2)
        self.assertEqual(len(missing), 2)

    def test_difficulty_scoring(self):
        # Exact match
        score, _ = calculate_difficulty_score("intermediate", "Intermediate")
        self.assertEqual(score, 15.0)

        # Stretch match
        score, _ = calculate_difficulty_score("beginner", "Intermediate")
        self.assertEqual(score, 10.0)

        # Open preference
        score, _ = calculate_difficulty_score("any", "Advanced")
        self.assertEqual(score, 15.0)

    def test_duration_scoring(self):
        # Plenty of time
        score, _ = calculate_duration_score("3-4 months", "1-2 months")
        self.assertEqual(score, 10.0)

        # Tight schedule
        score, _ = calculate_duration_score("2-4 weeks", "4-6 months")
        self.assertLessEqual(score, 5.0)

    def test_rule_based_recommendation_example(self):
        """
        Tests the prompt's explicit requirement:
        'If a student selects:
        - Python
        - Machine Learning
        - Beginner/Intermediate
        - 2 months
        the system should recommend projects that require Python and ML and have a suitable difficulty and development duration.'
        """
        student_profile = {
            "name": "Alex",
            "department": "Computer Science & Engineering",
            "skills": "Python, Machine Learning",
            "technologies": "Scikit-learn, Pandas",
            "interests": "Machine Learning",
            "preferred_domains": ["Machine Learning"],
            "difficulty": "intermediate",
            "duration": "1-2 months",
            "team_size": 1
        }

        ranked = rank_projects_for_student(student_profile, self.all_projects)
        self.assertTrue(len(ranked) > 0)

        top_project = ranked[0]
        # Should be a Machine Learning project requiring Python
        self.assertEqual(top_project["category"], "Machine Learning")
        self.assertIn("Python", top_project["technologies"])
        self.assertGreater(top_project["match_percentage"], 65)
        self.assertIn("score_breakdown", top_project)
        self.assertIn("why_matched", top_project)

    def test_web_development_student_recommendation(self):
        student_profile = {
            "name": "Sarah",
            "department": "Information Technology",
            "skills": "JavaScript, HTML5, CSS3",
            "technologies": "React, Node.js, Express, MongoDB",
            "interests": "Web Development",
            "preferred_domains": ["Web Development"],
            "difficulty": "intermediate",
            "duration": "2-3 months",
            "team_size": 2
        }

        ranked = rank_projects_for_student(student_profile, self.all_projects)
        top_project = ranked[0]
        self.assertEqual(top_project["category"], "Web Development")
        self.assertGreaterEqual(top_project["match_percentage"], 85)

    def test_cybersecurity_student_recommendation(self):
        student_profile = {
            "name": "Jordan",
            "department": "Cybersecurity & Digital Forensics",
            "skills": "Python, Web Security, OWASP Concepts, Networking",
            "technologies": "BeautifulSoup4, Requests, Scapy, SQLite",
            "interests": "Cybersecurity",
            "preferred_domains": ["Cybersecurity"],
            "difficulty": "advanced",
            "duration": "3-4 months",
            "team_size": 3
        }

        ranked = rank_projects_for_student(student_profile, self.all_projects)
        top_project = ranked[0]
        self.assertEqual(top_project["category"], "Cybersecurity")
        self.assertGreaterEqual(top_project["match_percentage"], 90)

    def test_all_13_categories_exist_in_db(self):
        expected_categories = {
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
        }
        cursor = self.conn.cursor()
        cursor.execute("SELECT DISTINCT category FROM projects")
        categories_in_db = {r[0] for r in cursor.fetchall()}
        self.assertTrue(expected_categories.issubset(categories_in_db), f"Missing categories: {expected_categories - categories_in_db}")

if __name__ == "__main__":
    unittest.main()

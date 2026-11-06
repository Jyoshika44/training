# ProjectSphere: Student Project Idea Recommender System

A full-stack, web-based intelligent recommender system designed to guide engineering and college students in selecting suitable final year, capstone, and semester project ideas. The system matches students' technical competencies, domain interests, difficulty preferences, and available timelines using a 5-factor weighted content-based filtering algorithm.

---

## 🌟 Key Features

### 1. Student Profile & Input
- **Student Demographics**: Name, Department (CSE, IT, AI & ML, Data Science, Cyber, etc.).
- **Programming Competencies**: Interactive tag selectors for programming languages (Python, Java, C++, JavaScript, TypeScript, Go, etc.).
- **Technologies Known**: Frameworks and tools (React, Node.js, Spring Boot, Scikit-learn, TensorFlow, Docker, OpenCV, etc.).
- **Domain Specializations**: Multi-select pills across all 13 core computer science categories.
- **Difficulty & Duration Controls**: Beginner, Intermediate, or Advanced complexity levels mapped against available durations (2-4 weeks up to 6+ months).
- **Collaboration Context**: Team size counter (1 to 8 members) and individual vs. team suitability checks.
- **1-Click Profile Presets**: Pre-configured testing personas (ML Aspirant, Full-Stack Dev, Cybersecurity Analyst, Cloud DevOps, IoT Innovator, Python Beginner).

### 2. Multi-Factor Recommendation Engine
The system uses a rule-based and content-based recommendation algorithm with mathematical scoring:

$$\text{Match Score} = S_{\text{skills}} + S_{\text{tech}} + S_{\text{domain}} + S_{\text{difficulty}} + S_{\text{duration}} + S_{\text{team}}$$

- **Skills Match (25 points)**: Overlap and canonical Jaccard similarity between student skills and project prerequisites.
- **Technology Match (25 points)**: Coverage of required tools and framework ecosystems with cross-skill credit.
- **Domain / Interest Match (25 points)**: Alignment with primary and secondary engineering disciplines.
- **Difficulty Match (15 points)**: Experience level compatibility matrix ensuring an optimal learning curve without overwhelming the student.
- **Duration Match (10 points)**: Timeframe feasibility check against estimated development milestones.
- **Team Suitability (±2 points)**: Collaboration sizing and workload suitability.
- **Explainability Engine**: Transparently explains *why* the project was recommended with itemized checklists and progress bars.

### 3. Comprehensive Project Catalog (13 Specializations)
Over 39 pre-seeded, realistic academic projects spanning:
1. **Web Development**
2. **Artificial Intelligence**
3. **Machine Learning**
4. **Data Science**
5. **Computer Networks**
6. **Cybersecurity**
7. **Database Management**
8. **Mobile Applications**
9. **Internet of Things (IoT)**
10. **Cloud Computing**
11. **Computer Vision**
12. **Java Applications**
13. **Python Applications**

### 4. Interactive Card Results & Filters
- Radial SVG progress gauges displaying match percentages (e.g., **98%**, **85%**, **78%**).
- Tier indicators: **Top Match**, **Strong Match**, **Good Match**, and **Moderate Match**.
- Live instant search across titles, descriptions, and required skills.
- Multi-dimensional filters (Category, Difficulty, Duration, Sorting).
- Action buttons: **View Details**, **Save Project** (favorites), **Compare**, and **Try Another Recommendation**.

### 5. Detailed Project Specifications & Academic Export
- **Overview & Problem Statement**: Clear academic rationale and real-world significance.
- **Formal Objectives**: Step-by-step development goals.
- **System Architecture & Modules**: 4-module functional decomposition.
- **Database Schema**: Entity definitions and relational table layouts.
- **Expected Deliverables**: Code repositories, models, reports, and UI dashboards.
- **Advantages & Future Enhancements**: Academic novelty and future extensions.
- **Printable Proposal**: Built-in CSS print formatting for exporting project proposals.

### 6. Side-by-Side Project Comparison
- Compare up to 3 projects simultaneously.
- Contrast difficulty, estimated weeks, team sizing, stack differences, and database requirements.

### 7. Saved Favorites & Session History
- Bookmarking with persistence in SQLite database.
- Recommendation history archive to recall or re-run past student recommendation sessions with 1 click.

### 8. Administrator Management Console
- Dashboard analytics: Total projects, categories, sessions run, and favorites count.
- Add New Project modal with full CSE attribute validation.
- Edit and Delete existing project entries.
- One-click **Reset to Default Academic Seeds** button.

---

## 🗄️ Database Architecture (SQLite)

The system stores all state in SQLite (`recommender.db`):

```sql
-- Students Table
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    skills TEXT NOT NULL,
    technologies TEXT NOT NULL,
    interests TEXT NOT NULL,
    preferred_type TEXT DEFAULT 'either',
    difficulty TEXT DEFAULT 'intermediate',
    duration TEXT DEFAULT '2-3 months',
    team_size INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE projects (
    project_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    technologies TEXT NOT NULL,
    required_skills TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    duration TEXT NOT NULL,
    team_size TEXT NOT NULL,
    problem_solved TEXT,
    objectives TEXT,
    modules TEXT,
    db_requirements TEXT,
    future_enhancements TEXT,
    advantages TEXT,
    expected_output TEXT,
    is_custom INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Favorites Table
CREATE TABLE favorites (
    favorite_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    project_id INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE
);

-- Recommendations Table
CREATE TABLE recommendations (
    recommendation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    project_id INTEGER NOT NULL,
    match_score REAL NOT NULL,
    why_matched TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE
);

-- Recommendation Sessions (History)
CREATE TABLE recommendation_sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    student_name TEXT,
    department TEXT,
    search_params TEXT,
    results_count INTEGER,
    top_match_score REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+ (comes pre-installed on macOS and Linux).
- No external Python packages (`pip`) or Node packages (`npm`) are required. Everything runs entirely on standard library modules (`http.server`, `sqlite3`, `json`, `urllib`).

### Running the Application

You can run the application with **either Python 3 or Node.js** (both have zero external dependencies):

#### Option A: Using Python 3 (Default)
```bash
cd /Users/snehalpanchariya/.gemini/antigravity/scratch/student-project-recommender

# Launch script:
./run.sh

# Or directly:
python3 app.py
```

#### Option B: Using Node.js (Built-in node:sqlite)
```bash
cd /Users/snehalpanchariya/.gemini/antigravity/scratch/student-project-recommender

# Direct node launch:
node server.js

# Or using npm:
npm start
```

Open your browser and navigate to:
**[http://localhost:8000](http://localhost:8000)**

---

## 🧪 Testing

To run the automated test suites:

```bash
# 1. Test recommendation scoring and content-based filtering algorithms
python3 tests/test_recommender.py

# 2. Test all REST API handlers, database queries, and CRUD operations
python3 tests/test_api_handlers.py
```

Both test suites execute in milliseconds with 100% pass rates.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | Query projects with optional filters (`search`, `category`, `difficulty`, `duration`) |
| `GET` | `/api/projects/<id>` | Retrieve full project details by ID |
| `POST` | `/api/recommend` | Submit student profile; returns ranked matches with explainability |
| `GET` | `/api/categories` | Retrieve list of all categories and project counts |
| `GET` | `/api/skills-and-tech` | Retrieve unique skills, technologies, and preset categories |
| `GET` | `/api/favorites` | Retrieve saved favorite projects |
| `POST` | `/api/favorites` | Bookmark a project as favorite |
| `DELETE` | `/api/favorites/<id>` | Remove project from favorites |
| `GET` | `/api/compare?ids=1,2,3` | Side-by-side comparison matrix for 2-3 projects |
| `GET` | `/api/history` | List recommendation session history |
| `GET` | `/api/history/<id>` | Restore previous session recommendations |
| `GET` | `/api/admin/stats` | Summary metrics for the Admin dashboard |
| `POST` | `/api/admin/projects` | Admin: Add a new project idea |
| `PUT` | `/api/admin/projects/<id>` | Admin: Update an existing project idea |
| `DELETE` | `/api/admin/projects/<id>` | Admin: Delete a project idea |
| `POST` | `/api/admin/reset` | Admin: Reset database to default academic seed data |

"""
Recommendation Engine for Student Project Idea Recommender System.
Calculates transparent, rule-based and content-based match scores
based on Student Skills, Technologies, Interests, Difficulty, and Duration.
"""

import re
from typing import List, Dict, Any, Tuple

# Canonical mapping for skills and technologies to handle aliases
SKILL_ALIASES = {
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "python3": "python",
    "c++": "cpp",
    "c plus plus": "cpp",
    "c#": "csharp",
    "c sharp": "csharp",
    "golang": "go",
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "dl": "deep learning",
    "cv": "computer vision",
    "nlp": "natural language processing",
    "tf": "tensorflow",
    "sklearn": "scikit-learn",
    "postgres": "postgresql",
    "mongo": "mongodb",
    "reactjs": "react",
    "vuejs": "vue",
    "vue.js": "vue",
    "react.js": "react",
    "node": "node.js",
    "nodejs": "node.js",
    "fast-api": "fastapi",
    "rest": "rest apis",
    "restful": "rest apis",
    "rest api": "rest apis",
    "rest api development": "rest apis",
    "socket.io": "websockets",
    "socket programming": "networking",
    "tcp/ip": "networking"
}

DURATION_WEEKS = {
    "2-4 weeks": 3,
    "1-2 months": 6,
    "2-3 months": 10,
    "3-4 months": 14,
    "4-6 months": 20,
    "6+ months": 28,
}

DIFFICULTY_LEVELS = {
    "beginner": 1,
    "intermediate": 2,
    "advanced": 3
}

def normalize_token(token: str) -> str:
    """Normalizes string tokens for canonical matching."""
    cleaned = token.strip().lower()
    cleaned = re.sub(r'[\s\-_]+', ' ', cleaned).strip()
    return SKILL_ALIASES.get(cleaned, cleaned)

def parse_items(raw_input: Any) -> List[str]:
    """Splits comma/semicolon/newline-delimited strings or handles lists."""
    if isinstance(raw_input, list):
        items = raw_input
    elif isinstance(raw_input, str):
        items = re.split(r'[,;\n/]+', raw_input)
    else:
        return []
    
    result = []
    for item in items:
        norm = normalize_token(item)
        if norm and norm not in result:
            result.append(norm)
    return result

def calculate_overlap(user_items: List[str], project_items: List[str]) -> Tuple[float, List[str], List[str]]:
    """
    Computes overlap between user items and project required items.
    Returns (overlap_ratio, matched_items, missing_items).
    """
    if not project_items:
        return 1.0, [], []
    
    matched = []
    missing = []
    
    for p_item in project_items:
        # Check direct or partial substring match
        is_match = False
        for u_item in user_items:
            if u_item == p_item or u_item in p_item or p_item in u_item:
                matched.append(p_item)
                is_match = True
                break
        if not is_match:
            missing.append(p_item)
            
    overlap_ratio = len(matched) / len(project_items)
    return overlap_ratio, matched, missing

def calculate_difficulty_score(user_diff: str, proj_diff: str) -> Tuple[float, str]:
    """
    Computes difficulty match score out of 15 points.
    Returns (score, explanation).
    """
    u_d = user_diff.lower().strip()
    p_d = proj_diff.lower().strip()

    if u_d in ["any", "all", ""]:
        return 15.0, f"Compatible with your open difficulty preference ({proj_diff})."
    
    u_val = DIFFICULTY_LEVELS.get(u_d, 2)
    p_val = DIFFICULTY_LEVELS.get(p_d, 2)

    diff_gap = p_val - u_val

    if diff_gap == 0:
        return 15.0, f"Exact match for your {proj_diff} experience level."
    elif diff_gap == -1: # User is higher than project (e.g. Intermediate doing Beginner)
        return 12.0, f"{proj_diff} difficulty is well within your comfort zone."
    elif diff_gap == 1: # User is lower than project (e.g. Beginner doing Intermediate)
        return 10.0, f"{proj_diff} difficulty offers a rewarding learning curve."
    elif diff_gap == -2: # User Advanced doing Beginner
        return 8.0, f"{proj_diff} project may feel relatively basic for your level."
    else: # Beginner doing Advanced
        return 5.0, f"{proj_diff} project requires advanced mastery; might be challenging."

def calculate_duration_score(user_dur: str, proj_dur: str) -> Tuple[float, str]:
    """
    Computes duration match score out of 10 points.
    Returns (score, explanation).
    """
    u_norm = user_dur.lower().strip()
    p_norm = proj_dur.lower().strip()

    u_weeks = DURATION_WEEKS.get(u_norm, 10)
    p_weeks = DURATION_WEEKS.get(p_norm, 10)

    if u_weeks >= p_weeks:
        return 10.0, f"Estimated duration ({proj_dur}) fits comfortably within your {user_dur} timeline."
    elif (p_weeks - u_weeks) <= 4:
        return 7.5, f"Estimated duration ({proj_dur}) is slightly ambitious for {user_dur} but achievable."
    elif (p_weeks - u_weeks) <= 8:
        return 5.0, f"Estimated duration ({proj_dur}) exceeds your target timeline of {user_dur}."
    else:
        return 2.5, f"Estimated duration ({proj_dur}) is significantly longer than your available {user_dur}."

def calculate_team_score(user_size: int, user_pref_type: str, proj_team: str) -> Tuple[float, str]:
    """
    Checks team size compatibility.
    Returns (adjustment, explanation).
    """
    pt_lower = proj_team.lower()
    pref_lower = user_pref_type.lower()

    if "individual" in pt_lower and user_size == 1:
        return 2.0, "Tailored for individual solo completion."
    elif "team" in pt_lower and user_size > 1:
        return 2.0, f"Structured with multi-module collaboration suitable for your team of {user_size}."
    elif "individual or team" in pt_lower:
        return 2.0, f"Highly flexible for either solo or team ({user_size} members)."
    elif user_size == 1 and "team (3-4" in pt_lower:
        return -2.0, f"Large team project scope may be demanding for a solo student."
    return 1.0, f"Can be adapted for your team size ({user_size} members)."

def calculate_match(student_profile: Dict[str, Any], project: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculates detailed match score and explainability breakdown between student and project.
    Total Score = Skill Match (25) + Tech Match (25) + Interest Match (25) + Difficulty Match (15) + Duration Match (10)
    """
    # 1. Parse student inputs
    user_skills = parse_items(student_profile.get("skills", ""))
    user_tech = parse_items(student_profile.get("technologies", ""))
    user_interests = parse_items(student_profile.get("interests", ""))
    user_diff = student_profile.get("difficulty", "intermediate")
    user_dur = student_profile.get("duration", "2-3 months")
    user_pref_type = student_profile.get("preferred_type", "either")
    try:
        user_team_size = int(student_profile.get("team_size", 1))
    except (ValueError, TypeError):
        user_team_size = 1

    # Preferred domains
    pref_domains = student_profile.get("preferred_domains", [])
    if isinstance(pref_domains, str):
        pref_domains = parse_items(pref_domains)
    else:
        pref_domains = [normalize_token(d) for d in pref_domains]

    # Combine user interests and preferred domains
    all_user_interests = set(user_interests + pref_domains)

    # 2. Parse project requirements
    proj_skills = parse_items(project.get("required_skills", ""))
    proj_tech = parse_items(project.get("technologies", ""))
    proj_category = normalize_token(project.get("category", ""))
    proj_diff = project.get("difficulty", "Intermediate")
    proj_dur = project.get("duration", "2-3 months")
    proj_team = project.get("team_size", "Individual or Team")
    proj_desc = (project.get("description", "") + " " + project.get("title", "")).lower()

    # Combine user items for broader technical coverage
    user_all_tech_and_skills = set(user_tech + user_skills)

    # --- A. Skill Match (Max 25 pts) ---
    skill_ratio, matched_skills, missing_skills = calculate_overlap(user_all_tech_and_skills, proj_skills)
    skill_score = skill_ratio * 25.0
    if len(matched_skills) > 0 and skill_ratio >= 0.6:
        skill_score = min(25.0, skill_score + 2.0) # Bonus for strong coverage

    # --- B. Technology Match (Max 25 pts) ---
    tech_ratio, matched_tech, missing_tech = calculate_overlap(user_all_tech_and_skills, proj_tech)
    tech_score = tech_ratio * 25.0
    if len(matched_tech) > 0 and tech_ratio >= 0.6:
        tech_score = min(25.0, tech_score + 2.0)

    # --- C. Interest & Domain Match (Max 25 pts) ---
    interest_score = 0.0
    matched_interests = []
    
    # Check if project category directly matches user interest or domain
    for interest in all_user_interests:
        if interest in proj_category or proj_category in interest:
            matched_interests.append(project.get("category", ""))
            interest_score = max(interest_score, 25.0)
            break
        elif interest in proj_desc:
            matched_interests.append(interest.title())
            interest_score = max(interest_score, 18.0)
    
    if not matched_interests:
        # Check partial category keywords
        cat_words = proj_category.split()
        for cw in cat_words:
            if len(cw) > 3 and any(cw in ui for ui in all_user_interests):
                matched_interests.append(project.get("category", ""))
                interest_score = 15.0
                break

    if interest_score == 0.0:
        # Minimum baseline interest score if not explicitly ruled out
        interest_score = 8.0

    # --- D. Difficulty Match (Max 15 pts) ---
    diff_score, diff_explanation = calculate_difficulty_score(user_diff, proj_diff)

    # --- E. Duration Match (Max 10 pts) ---
    dur_score, dur_explanation = calculate_duration_score(user_dur, proj_dur)

    # --- F. Team Suitability Adjustment ---
    team_adj, team_explanation = calculate_team_score(user_team_size, user_pref_type, proj_team)

    # Total Raw Score
    total_raw = skill_score + tech_score + interest_score + diff_score + dur_score + team_adj

    # Normalize to percentage between 20% and 98%
    match_percentage = int(round(min(98.0, max(20.0, total_raw))))

    # Determine Match Tier
    if match_percentage >= 88:
        match_tier = "Top Match"
        tier_color = "emerald"
    elif match_percentage >= 75:
        match_tier = "Strong Match"
        tier_color = "blue"
    elif match_percentage >= 60:
        match_tier = "Good Match"
        tier_color = "amber"
    else:
        match_tier = "Moderate Match"
        tier_color = "slate"

    # Generate Explanations ("Why the project matches the student's profile")
    reasons = []
    
    if matched_skills:
        reasons.append(f"✓ Skills Match: You know {', '.join(s.title() for s in matched_skills[:3])} (Required: {project.get('required_skills')}).")
    elif skill_ratio > 0:
        reasons.append(f"✓ Skills Match: Partially aligns with your background.")
    else:
        reasons.append(f"ℹ Skills Note: Great project to pick up {project.get('required_skills')}.")

    if matched_tech:
        reasons.append(f"✓ Tech Stack: Covers your known tools: {', '.join(t.title() for t in matched_tech[:3])}.")
    else:
        reasons.append(f"ℹ Tech Stack: Employs industry-standard {project.get('technologies')}.")

    if matched_interests:
        reasons.append(f"✓ Domain Fit: Aligns directly with your interest in {matched_interests[0]}.")
    else:
        reasons.append(f"✓ Domain Fit: In demand CSE domain: {project.get('category')}.")

    reasons.append(f"✓ Difficulty: {diff_explanation}")
    reasons.append(f"✓ Timeline: {dur_explanation}")
    reasons.append(f"✓ Team Fit: {team_explanation}")

    why_matched_text = "\n".join(reasons)

    # Parse main features from objectives & modules
    raw_objectives = project.get("objectives", "")
    main_features = [line.strip().lstrip('1234567890.- ') for line in raw_objectives.split('\n') if line.strip()]
    if not main_features:
        main_features = [
            "Modular architecture with separation of concerns",
            "Secure authentication and data verification",
            "Interactive visualization and reporting",
            "Automated testing and deployment capability"
        ]

    return {
        "project_id": project.get("project_id"),
        "title": project.get("title"),
        "category": project.get("category"),
        "description": project.get("description"),
        "technologies": project.get("technologies"),
        "required_skills": project.get("required_skills"),
        "difficulty": project.get("difficulty"),
        "duration": project.get("duration"),
        "team_size": project.get("team_size"),
        "problem_solved": project.get("problem_solved"),
        "objectives": project.get("objectives"),
        "modules": project.get("modules"),
        "db_requirements": project.get("db_requirements"),
        "future_enhancements": project.get("future_enhancements"),
        "advantages": project.get("advantages"),
        "expected_output": project.get("expected_output"),
        "main_features": main_features,
        "match_percentage": match_percentage,
        "match_tier": match_tier,
        "tier_color": tier_color,
        "why_matched": why_matched_text,
        "score_breakdown": {
            "skills": round(skill_score, 1),
            "skills_max": 25,
            "technologies": round(tech_score, 1),
            "tech_max": 25,
            "interest": round(interest_score, 1),
            "interest_max": 25,
            "difficulty": round(diff_score, 1),
            "diff_max": 15,
            "duration": round(dur_score, 1),
            "dur_max": 10,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "matched_tech": matched_tech,
            "missing_tech": missing_tech
        }
    }

def rank_projects_for_student(student_profile: Dict[str, Any], all_projects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ranks all projects according to student profile and sorts by match percentage descending.
    """
    scored_projects = []
    for proj in all_projects:
        score_res = calculate_match(student_profile, proj)
        scored_projects.append(score_res)

    # Sort descending by match percentage, break ties by skill + tech score
    scored_projects.sort(
        key=lambda x: (
            x["match_percentage"],
            x["score_breakdown"]["skills"] + x["score_breakdown"]["technologies"]
        ),
        reverse=True
    )
    return scored_projects

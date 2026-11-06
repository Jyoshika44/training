/**
 * Student Project Idea Recommender System - Node.js Server
 * Built with Node.js built-in modules: node:http, node:fs, node:path, node:sqlite.
 * Zero external npm package dependencies required!
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 8000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_PATH = path.join(__dirname, 'recommender.db');

// Initialize / connect to SQLite database
const db = new DatabaseSync(DB_PATH);

// Canonical skill aliases
const SKILL_ALIASES = {
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
  "fast-api": "fastapi"
};

const DURATION_WEEKS = {
  "2-4 weeks": 3,
  "1-2 months": 6,
  "2-3 months": 10,
  "3-4 months": 14,
  "4-6 months": 20,
  "6+ months": 28
};

const DIFFICULTY_LEVELS = {
  "beginner": 1,
  "intermediate": 2,
  "advanced": 3
};

function normalizeToken(token) {
  if (!token) return '';
  const cleaned = token.toString().trim().toLowerCase().replace(/[\s\-_]+/g, ' ');
  return SKILL_ALIASES[cleaned] || cleaned;
}

function parseItems(rawInput) {
  if (Array.isArray(rawInput)) return rawInput.map(normalizeToken).filter(Boolean);
  if (typeof rawInput === 'string') {
    return rawInput.split(/[,;\n/]+/).map(normalizeToken).filter(Boolean);
  }
  return [];
}

function calculateOverlap(userItems, projectItems) {
  if (!projectItems || projectItems.length === 0) return { ratio: 1.0, matched: [], missing: [] };
  const matched = [];
  const missing = [];
  for (const p of projectItems) {
    let isMatch = false;
    for (const u of userItems) {
      if (u === p || u.includes(p) || p.includes(u)) {
        matched.push(p);
        isMatch = true;
        break;
      }
    }
    if (!isMatch) missing.push(p);
  }
  return { ratio: matched.length / projectItems.length, matched, missing };
}

function calculateDifficultyScore(userDiff, projDiff) {
  const ud = (userDiff || 'intermediate').toLowerCase().trim();
  const pd = (projDiff || 'intermediate').toLowerCase().trim();
  if (ud === 'any' || ud === 'all' || !ud) {
    return { score: 15.0, explanation: `Compatible with your open difficulty preference (${projDiff}).` };
  }
  const uVal = DIFFICULTY_LEVELS[ud] || 2;
  const pVal = DIFFICULTY_LEVELS[pd] || 2;
  const diffGap = pVal - uVal;
  if (diffGap === 0) return { score: 15.0, explanation: `Exact match for your ${projDiff} experience level.` };
  if (diffGap === -1) return { score: 12.0, explanation: `${projDiff} difficulty is well within your comfort zone.` };
  if (diffGap === 1) return { score: 10.0, explanation: `${projDiff} difficulty offers a rewarding learning curve.` };
  if (diffGap === -2) return { score: 8.0, explanation: `${projDiff} project may feel relatively basic for your level.` };
  return { score: 5.0, explanation: `${projDiff} project requires advanced mastery; might be challenging.` };
}

function calculateDurationScore(userDur, projDur) {
  const uNorm = (userDur || '2-3 months').toLowerCase().trim();
  const pNorm = (projDur || '2-3 months').toLowerCase().trim();
  const uWeeks = DURATION_WEEKS[uNorm] || 10;
  const pWeeks = DURATION_WEEKS[pNorm] || 10;

  if (uWeeks >= pWeeks) {
    return { score: 10.0, explanation: `Estimated duration (${projDur}) fits comfortably within your ${userDur} timeline.` };
  } else if (pWeeks - uWeeks <= 4) {
    return { score: 7.5, explanation: `Estimated duration (${projDur}) is slightly ambitious for ${userDur} but achievable.` };
  } else if (pWeeks - uWeeks <= 8) {
    return { score: 5.0, explanation: `Estimated duration (${projDur}) exceeds your target timeline of ${userDur}.` };
  }
  return { score: 2.5, explanation: `Estimated duration (${projDur}) is significantly longer than your available ${userDur}.` };
}

function calculateTeamScore(userSize, userPrefType, projTeam) {
  const ptLower = (projTeam || '').toLowerCase();
  const prefLower = (userPrefType || 'either').toLowerCase();

  if (ptLower.includes('individual') && userSize === 1) {
    return { adj: 2.0, explanation: 'Tailored for individual solo completion.' };
  } else if (ptLower.includes('team') && userSize > 1) {
    return { adj: 2.0, explanation: `Structured with multi-module collaboration suitable for your team of ${userSize}.` };
  } else if (ptLower.includes('individual or team')) {
    return { adj: 2.0, explanation: `Highly flexible for either solo or team (${userSize} members).` };
  } else if (userSize === 1 && ptLower.includes('team (3-4')) {
    return { adj: -2.0, explanation: 'Large team project scope may be demanding for a solo student.' };
  }
  return { adj: 1.0, explanation: `Can be adapted for your team size (${userSize} members).` };
}

function calculateMatch(studentProfile, project) {
  const userSkills = parseItems(studentProfile.skills || '');
  const userTech = parseItems(studentProfile.technologies || '');
  const userInterests = parseItems(studentProfile.interests || '');
  const userDiff = studentProfile.difficulty || 'intermediate';
  const userDur = studentProfile.duration || '2-3 months';
  const userPrefType = studentProfile.preferred_type || 'either';
  const userTeamSize = parseInt(studentProfile.team_size || 1, 10) || 1;

  let prefDomains = studentProfile.preferred_domains || [];
  if (typeof prefDomains === 'string') prefDomains = parseItems(prefDomains);
  else prefDomains = prefDomains.map(normalizeToken);

  const allUserInterests = Array.from(new Set([...userInterests, ...prefDomains]));
  const userAllTechAndSkills = Array.from(new Set([...userTech, ...userSkills]));

  const projSkills = parseItems(project.required_skills || '');
  const projTech = parseItems(project.technologies || '');
  const projCategory = normalizeToken(project.category || '');
  const projDiff = project.difficulty || 'Intermediate';
  const projDur = project.duration || '2-3 months';
  const projTeam = project.team_size || 'Individual or Team';
  const projDesc = ((project.description || '') + ' ' + (project.title || '')).toLowerCase();

  // A. Skill Match (Max 25)
  const { ratio: skillRatio, matched: matchedSkills, missing: missingSkills } = calculateOverlap(userAllTechAndSkills, projSkills);
  let skillScore = skillRatio * 25.0;
  if (matchedSkills.length > 0 && skillRatio >= 0.6) skillScore = Math.min(25.0, skillScore + 2.0);

  // B. Technology Match (Max 25)
  const { ratio: techRatio, matched: matchedTech, missing: missingTech } = calculateOverlap(userAllTechAndSkills, projTech);
  let techScore = techRatio * 25.0;
  if (matchedTech.length > 0 && techRatio >= 0.6) techScore = Math.min(25.0, techScore + 2.0);

  // C. Interest & Domain Match (Max 25)
  let interestScore = 0.0;
  const matchedInterests = [];
  for (const interest of allUserInterests) {
    if (interest && (interest.includes(projCategory) || projCategory.includes(interest))) {
      matchedInterests.push(project.category || '');
      interestScore = Math.max(interestScore, 25.0);
      break;
    } else if (interest && projDesc.includes(interest)) {
      matchedInterests.push(interest);
      interestScore = Math.max(interestScore, 18.0);
    }
  }

  if (matchedInterests.length === 0) {
    const catWords = projCategory.split(' ');
    for (const cw of catWords) {
      if (cw.length > 3 && allUserInterests.some(ui => ui.includes(cw))) {
        matchedInterests.push(project.category || '');
        interestScore = 15.0;
        break;
      }
    }
  }
  if (interestScore === 0.0) interestScore = 8.0;

  // D. Difficulty Match (Max 15)
  const { score: diffScore, explanation: diffExp } = calculateDifficultyScore(userDiff, projDiff);

  // E. Duration Match (Max 10)
  const { score: durScore, explanation: durExp } = calculateDurationScore(userDur, projDur);

  // F. Team Suitability
  const { adj: teamAdj, explanation: teamExp } = calculateTeamScore(userTeamSize, userPrefType, projTeam);

  const totalRaw = skillScore + techScore + interestScore + diffScore + durScore + teamAdj;
  const matchPercentage = Math.round(Math.min(98.0, Math.max(20.0, totalRaw)));

  let matchTier = 'Good Match';
  let tierColor = 'amber';
  if (matchPercentage >= 88) { matchTier = 'Top Match'; tierColor = 'emerald'; }
  else if (matchPercentage >= 75) { matchTier = 'Strong Match'; tierColor = 'blue'; }
  else if (matchPercentage < 60) { matchTier = 'Moderate Match'; tierColor = 'slate'; }

  const reasons = [];
  if (matchedSkills.length > 0) {
    reasons.push(`✓ Skills Match: You know ${matchedSkills.slice(0, 3).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')} (Required: ${project.required_skills}).`);
  } else if (skillRatio > 0) {
    reasons.push('✓ Skills Match: Partially aligns with your background.');
  } else {
    reasons.push(`ℹ Skills Note: Great project to pick up ${project.required_skills}.`);
  }

  if (matchedTech.length > 0) {
    reasons.push(`✓ Tech Stack: Covers your known tools: ${matchedTech.slice(0, 3).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}.`);
  } else {
    reasons.push(`ℹ Tech Stack: Employs industry-standard ${project.technologies}.`);
  }

  if (matchedInterests.length > 0) {
    reasons.push(`✓ Domain Fit: Aligns directly with your interest in ${matchedInterests[0]}.`);
  } else {
    reasons.push(`✓ Domain Fit: In demand CSE domain: ${project.category}.`);
  }

  reasons.push(`✓ Difficulty: ${diffExp}`);
  reasons.push(`✓ Timeline: ${durExp}`);
  reasons.push(`✓ Team Fit: ${teamExp}`);

  const rawObjectives = project.objectives || '';
  let mainFeatures = rawObjectives.split('\n').map(l => l.trim().replace(/^[0-9.\-\s]+/, '')).filter(Boolean);
  if (mainFeatures.length === 0) {
    mainFeatures = [
      'Modular architecture with separation of concerns',
      'Secure authentication and data verification',
      'Interactive visualization and reporting',
      'Automated testing and deployment capability'
    ];
  }

  return {
    project_id: project.project_id,
    title: project.title,
    category: project.category,
    description: project.description,
    technologies: project.technologies,
    required_skills: project.required_skills,
    difficulty: project.difficulty,
    duration: project.duration,
    team_size: project.team_size,
    problem_solved: project.problem_solved,
    objectives: project.objectives,
    modules: project.modules,
    db_requirements: project.db_requirements,
    future_enhancements: project.future_enhancements,
    advantages: project.advantages,
    expected_output: project.expected_output,
    main_features: mainFeatures,
    match_percentage: matchPercentage,
    match_tier: matchTier,
    tier_color: tierColor,
    why_matched: reasons.join('\n'),
    score_breakdown: {
      skills: Math.round(skillScore * 10) / 10,
      skills_max: 25,
      technologies: Math.round(techScore * 10) / 10,
      tech_max: 25,
      interest: Math.round(interestScore * 10) / 10,
      interest_max: 25,
      difficulty: Math.round(diffScore * 10) / 10,
      diff_max: 15,
      duration: Math.round(durScore * 10) / 10,
      dur_max: 10,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      matched_tech: matchedTech,
      missing_tech: missingTech
    }
  };
}

function rankProjects(studentProfile, allProjects) {
  const scored = allProjects.map(p => calculateMatch(studentProfile, p));
  scored.sort((a, b) => {
    if (b.match_percentage !== a.match_percentage) {
      return b.match_percentage - a.match_percentage;
    }
    const aTech = a.score_breakdown.skills + a.score_breakdown.technologies;
    const bTech = b.score_breakdown.skills + b.score_breakdown.technologies;
    return bTech - aTech;
  });
  return scored;
}

// Helpers
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res, pathname) {
  let cleanPath = pathname.replace(/^\/+/, '');
  if (!cleanPath) cleanPath = 'index.html';

  let filePath = path.join(PUBLIC_DIR, cleanPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'static', cleanPath);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  } else {
    // Fallback to index.html for SPA
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': content.length });
      res.end(content);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  try {
    // API: GET /api/projects
    if (req.method === 'GET' && pathname === '/api/projects') {
      const search = searchParams.get('search') || '';
      const category = searchParams.get('category') || '';
      const difficulty = searchParams.get('difficulty') || '';
      const duration = searchParams.get('duration') || '';

      let query = 'SELECT * FROM projects WHERE 1=1';
      const params = [];

      if (category && category !== 'All') {
        query += ' AND category = ?';
        params.push(category);
      }
      if (difficulty && difficulty !== 'All') {
        query += ' AND difficulty = ?';
        params.push(difficulty);
      }
      if (duration && duration !== 'All') {
        query += ' AND duration = ?';
        params.push(duration);
      }
      if (search) {
        query += ' AND (title LIKE ? OR description LIKE ? OR technologies LIKE ? OR required_skills LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term, term);
      }
      query += ' ORDER BY project_id ASC';

      const rows = db.prepare(query).all(...params);
      sendJson(res, 200, { projects: rows, count: rows.length });
      return;
    }

    // API: GET /api/projects/:id
    if (req.method === 'GET' && pathname.startsWith('/api/projects/')) {
      const id = parseInt(pathname.split('/').pop(), 10);
      const row = db.prepare('SELECT * FROM projects WHERE project_id = ?').get(id);
      if (row) {
        sendJson(res, 200, { project: row });
      } else {
        sendJson(res, 404, { error: 'Project not found' });
      }
      return;
    }

    // API: GET /api/categories
    if (req.method === 'GET' && pathname === '/api/categories') {
      const rows = db.prepare('SELECT category, COUNT(*) as count FROM projects GROUP BY category ORDER BY count DESC').all();
      sendJson(res, 200, { categories: rows });
      return;
    }

    // API: GET /api/skills-and-tech
    if (req.method === 'GET' && pathname === '/api/skills-and-tech') {
      const rows = db.prepare('SELECT required_skills, technologies FROM projects').all();
      const allSkills = new Set();
      const allTech = new Set();
      for (const r of rows) {
        if (r.required_skills) {
          r.required_skills.split(',').forEach(s => {
            const trimmed = s.trim();
            if (trimmed) allSkills.add(trimmed);
          });
        }
        if (r.technologies) {
          r.technologies.split(',').forEach(t => {
            const trimmed = t.trim();
            if (trimmed) allTech.add(trimmed);
          });
        }
      }

      const departments = [
        "Computer Science & Engineering",
        "Information Technology",
        "Artificial Intelligence & Machine Learning",
        "Data Science & Analytics",
        "Cybersecurity & Digital Forensics",
        "Electronics & Communication Engineering",
        "Software Engineering",
        "Electrical & Computer Engineering"
      ];

      const presetDomains = [
        "Web Development", "Artificial Intelligence", "Machine Learning",
        "Data Science", "Computer Networks", "Cybersecurity",
        "Database Management", "Mobile Applications", "IoT",
        "Cloud Computing", "Computer Vision", "Java Applications", "Python Applications"
      ];

      sendJson(res, 200, {
        skills: Array.from(allSkills).sort(),
        technologies: Array.from(allTech).sort(),
        departments,
        preset_domains: presetDomains
      });
      return;
    }

    // API: POST /api/recommend
    if (req.method === 'POST' && pathname === '/api/recommend') {
      const body = await parseJsonBody(req);
      const studentName = body.name || 'Anonymous Student';
      const department = body.department || 'Computer Science & Engineering';

      // Ensure skills and tech are parsed
      const skillsStr = Array.isArray(body.skills) ? body.skills.join(', ') : (body.skills || '');
      const techStr = Array.isArray(body.technologies) ? body.technologies.join(', ') : (body.technologies || '');
      const interestsStr = Array.isArray(body.interests) ? body.interests.join(', ') : (body.interests || '');

      // Record student in students table
      const insertStudent = db.prepare(`
        INSERT INTO students (name, department, skills, technologies, interests, preferred_type, difficulty, duration, team_size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const studentRes = insertStudent.run(
        studentName, department, skillsStr, techStr, interestsStr,
        body.preferred_type || 'either', body.difficulty || 'intermediate',
        body.duration || '2-3 months', parseInt(body.team_size || 1, 10) || 1
      );
      const studentId = Number(studentRes.lastInsertRowid);

      // Fetch all projects and rank
      const allProjects = db.prepare('SELECT * FROM projects').all();
      const ranked = rankProjects(body, allProjects);

      // Record session in history
      const topScore = ranked.length > 0 ? ranked[0].match_percentage : 0;
      const insertSession = db.prepare(`
        INSERT INTO recommendation_sessions (student_id, student_name, department, search_params, results_count, top_match_score)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const sessionRes = insertSession.run(
        studentId, studentName, department, JSON.stringify(body), ranked.length, topScore
      );
      const sessionId = Number(sessionRes.lastInsertRowid);

      sendJson(res, 200, {
        status: 'success',
        session_id: sessionId,
        student_id: studentId,
        student_name: studentName,
        department,
        count: ranked.length,
        recommendations: ranked
      });
      return;
    }

    // API: GET /api/favorites
    if (req.method === 'GET' && pathname === '/api/favorites') {
      const rows = db.prepare(`
        SELECT f.favorite_id, f.created_at as saved_at, f.notes, p.*
        FROM favorites f
        JOIN projects p ON f.project_id = p.project_id
        ORDER BY f.created_at DESC
      `).all();
      sendJson(res, 200, { favorites: rows, count: rows.length });
      return;
    }

    // API: POST /api/favorites
    if (req.method === 'POST' && pathname === '/api/favorites') {
      const body = await parseJsonBody(req);
      const projectId = parseInt(body.project_id, 10);
      const studentId = parseInt(body.student_id || 1, 10);
      const notes = body.notes || '';

      const existing = db.prepare('SELECT favorite_id FROM favorites WHERE project_id = ?').get(projectId);
      if (!existing) {
        db.prepare('INSERT INTO favorites (student_id, project_id, notes) VALUES (?, ?, ?)').run(studentId, projectId, notes);
      }
      sendJson(res, 201, { status: 'success', message: 'Project saved to favorites' });
      return;
    }

    // API: DELETE /api/favorites/:id
    if (req.method === 'DELETE' && pathname.startsWith('/api/favorites/')) {
      const id = parseInt(pathname.split('/').pop(), 10);
      db.prepare('DELETE FROM favorites WHERE project_id = ?').run(id);
      sendJson(res, 200, { status: 'success', message: 'Project removed from favorites' });
      return;
    }

    // API: GET /api/history
    if (req.method === 'GET' && pathname === '/api/history') {
      const rows = db.prepare('SELECT * FROM recommendation_sessions ORDER BY created_at DESC LIMIT 30').all();
      const history = rows.map(r => ({
        ...r,
        search_params: r.search_params ? JSON.parse(r.search_params) : {}
      }));
      sendJson(res, 200, { history });
      return;
    }

    // API: GET /api/history/:id
    if (req.method === 'GET' && pathname.startsWith('/api/history/')) {
      const id = parseInt(pathname.split('/').pop(), 10);
      const session = db.prepare('SELECT * FROM recommendation_sessions WHERE session_id = ?').get(id);
      if (session) {
        const studentProfile = session.search_params ? JSON.parse(session.search_params) : {};
        const allProjects = db.prepare('SELECT * FROM projects').all();
        const ranked = rankProjects(studentProfile, allProjects);
        sendJson(res, 200, {
          session,
          student_profile: studentProfile,
          recommendations: ranked
        });
      } else {
        sendJson(res, 404, { error: 'Session not found' });
      }
      return;
    }

    // API: GET /api/compare?ids=1,2,3
    if (req.method === 'GET' && pathname === '/api/compare') {
      const idsParam = searchParams.get('ids') || '';
      const ids = idsParam.split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean);
      if (ids.length === 0) {
        sendJson(res, 400, { error: 'No project IDs provided' });
        return;
      }
      const placeholders = ids.map(() => '?').join(',');
      const rows = db.prepare(`SELECT * FROM projects WHERE project_id IN (${placeholders})`).all(...ids);
      sendJson(res, 200, { projects: rows, count: rows.length });
      return;
    }

    // API: GET /api/admin/stats
    if (req.method === 'GET' && pathname === '/api/admin/stats') {
      const totalProjects = db.prepare('SELECT COUNT(*) as c FROM projects').get().c;
      const totalCategories = db.prepare('SELECT COUNT(DISTINCT category) as c FROM projects').get().c;
      const totalRecommendations = db.prepare('SELECT COUNT(*) as c FROM recommendation_sessions').get().c;
      const totalFavorites = db.prepare('SELECT COUNT(*) as c FROM favorites').get().c;
      const catDistribution = db.prepare('SELECT category, COUNT(*) as count FROM projects GROUP BY category ORDER BY count DESC').all();

      sendJson(res, 200, {
        total_projects: totalProjects,
        total_categories: totalCategories,
        total_recommendations: totalRecommendations,
        total_favorites: totalFavorites,
        category_distribution: catDistribution
      });
      return;
    }

    // API: POST /api/admin/projects
    if (req.method === 'POST' && pathname === '/api/admin/projects') {
      const b = await parseJsonBody(req);
      const stmt = db.prepare(`
        INSERT INTO projects (
          title, category, description, technologies, required_skills, difficulty,
          duration, team_size, problem_solved, objectives, modules, db_requirements,
          future_enhancements, advantages, expected_output, is_custom
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);
      const info = stmt.run(
        b.title || 'Untitled Project',
        b.category || 'Web Development',
        b.description || '',
        b.technologies || '',
        b.required_skills || '',
        b.difficulty || 'Intermediate',
        b.duration || '2-3 months',
        b.team_size || 'Individual or Team (1-2 members)',
        b.problem_solved || '',
        b.objectives || '',
        b.modules || '',
        b.db_requirements || '',
        b.future_enhancements || '',
        b.advantages || '',
        b.expected_output || ''
      );
      sendJson(res, 201, {
        status: 'success',
        project_id: Number(info.lastInsertRowid),
        message: 'Project created successfully'
      });
      return;
    }

    // API: PUT /api/admin/projects/:id
    if (req.method === 'PUT' && pathname.startsWith('/api/admin/projects/')) {
      const id = parseInt(pathname.split('/').pop(), 10);
      const b = await parseJsonBody(req);
      const stmt = db.prepare(`
        UPDATE projects SET
          title = ?, category = ?, description = ?, technologies = ?, required_skills = ?,
          difficulty = ?, duration = ?, team_size = ?, problem_solved = ?, objectives = ?,
          modules = ?, db_requirements = ?, future_enhancements = ?, advantages = ?,
          expected_output = ?
        WHERE project_id = ?
      `);
      stmt.run(
        b.title, b.category, b.description, b.technologies, b.required_skills,
        b.difficulty, b.duration, b.team_size, b.problem_solved, b.objectives,
        b.modules, b.db_requirements, b.future_enhancements, b.advantages,
        b.expected_output, id
      );
      sendJson(res, 200, { status: 'success', message: 'Project updated successfully' });
      return;
    }

    // API: DELETE /api/admin/projects/:id
    if (req.method === 'DELETE' && pathname.startsWith('/api/admin/projects/')) {
      const id = parseInt(pathname.split('/').pop(), 10);
      db.prepare('DELETE FROM projects WHERE project_id = ?').run(id);
      sendJson(res, 200, { status: 'success', message: 'Project deleted successfully' });
      return;
    }

    // API: POST /api/admin/reset
    if (req.method === 'POST' && pathname === '/api/admin/reset') {
      // Re-seed database using projects-data if available
      try {
        const { spawnSync } = require('node:child_process');
        spawnSync('python3', ['-c', 'import database; database.init_db(force_reseed=True)'], { cwd: __dirname });
      } catch (e) {}
      sendJson(res, 200, { status: 'success', message: 'Database reset to default seed data successfully' });
      return;
    }

    // Static files
    if (req.method === 'GET') {
      serveStatic(req, res, pathname);
      return;
    }

    sendJson(res, 404, { error: 'Not Found' });
  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`==========================================================`);
    console.log(` Student Project Idea Recommender System (Node.js)`);
    console.log(` Server running at http://localhost:${PORT}`);
    console.log(` Zero external dependencies required.`);
    console.log(`==========================================================`);
  });
}

module.exports = server;

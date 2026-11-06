/**
 * Student Project Idea Recommender System - Frontend SPA Application Logic
 */

// Global Application State
const state = {
  activeView: 'home',
  currentProfile: null,
  currentRecommendations: [],
  allProjects: [],
  categories: [],
  skillsAndTech: { skills: [], technologies: [], departments: [], preset_domains: [] },
  favorites: new Set(),
  compareIds: new Set(),
  activeDetailProjectId: null,
  selectedSkills: new Set(),
  selectedTech: new Set(),
  selectedDomains: new Set(),
  filterQuery: '',
  filterCategory: 'All',
  filterDifficulty: 'All',
  filterDuration: 'All',
  sortBy: 'match',
  adminProjects: []
};

// Preset Profiles for 1-Click Instant Testing
const PRESET_PROFILES = {
  ml_engineer: {
    name: 'Aarav Sharma',
    department: 'Artificial Intelligence & Machine Learning',
    skills: ['Python', 'Machine Learning', 'Data Preprocessing', 'Statistics'],
    technologies: ['Scikit-learn', 'Pandas', 'XGBoost', 'Streamlit', 'Matplotlib'],
    interests: ['Machine Learning', 'Predictive Modeling'],
    preferred_domains: ['Machine Learning', 'Artificial Intelligence', 'Data Science'],
    difficulty: 'intermediate',
    duration: '2-3 months',
    team_size: 2,
    preferred_type: 'either'
  },
  web_dev: {
    name: 'Priya Patel',
    department: 'Computer Science & Engineering',
    skills: ['JavaScript', 'HTML5', 'CSS3', 'REST API Development'],
    technologies: ['React', 'Node.js', 'Express', 'MongoDB', 'Tailwind CSS'],
    interests: ['Full-Stack Web', 'Cloud Applications'],
    preferred_domains: ['Web Development', 'Cloud Computing'],
    difficulty: 'intermediate',
    duration: '2-3 months',
    team_size: 3,
    preferred_type: 'team'
  },
  cyber_analyst: {
    name: 'Rohan Deshmukh',
    department: 'Cybersecurity & Digital Forensics',
    skills: ['Python', 'Web Security', 'OWASP Concepts', 'Networking'],
    technologies: ['Scapy', 'Requests', 'SQLite', 'BeautifulSoup4'],
    interests: ['Penetration Testing', 'Network Security', 'Vulnerability Assessment'],
    preferred_domains: ['Cybersecurity', 'Computer Networks'],
    difficulty: 'advanced',
    duration: '3-4 months',
    team_size: 2,
    preferred_type: 'either'
  },
  cloud_devops: {
    name: 'Ananya Reddy',
    department: 'Information Technology',
    skills: ['Python', 'Docker', 'Linux Containers', 'Cloud Architecture'],
    technologies: ['Docker', 'Kubernetes', 'Prometheus', 'Redis', 'AWS'],
    interests: ['Cloud Computing', 'Microservices', 'Distributed Systems'],
    preferred_domains: ['Cloud Computing', 'Database Management'],
    difficulty: 'advanced',
    duration: '3-4 months',
    team_size: 3,
    preferred_type: 'team'
  },
  iot_hardware: {
    name: 'Vikram Joshi',
    department: 'Electronics & Communication Engineering',
    skills: ['C/C++', 'Embedded Systems', 'MQTT', 'Hardware Interfacing'],
    technologies: ['Arduino/ESP32', 'Raspberry Pi', 'Python', 'ThingsBoard'],
    interests: ['Smart Agriculture', 'Embedded Telemetry', 'Sensors'],
    preferred_domains: ['IoT', 'Computer Vision'],
    difficulty: 'intermediate',
    duration: '2-3 months',
    team_size: 2,
    preferred_type: 'team'
  },
  python_beginner: {
    name: 'Neha Gupta',
    department: 'Computer Science & Engineering',
    skills: ['Python', 'Computer Vision', 'OpenCV'],
    technologies: ['Python', 'OpenCV', 'Tkinter/Web'],
    interests: ['Image Processing', 'Driver Safety'],
    preferred_domains: ['Computer Vision', 'Python Applications'],
    difficulty: 'beginner',
    duration: '1-2 months',
    team_size: 1,
    preferred_type: 'individual'
  }
};

// --------------------------------------------------------------------------
// Initialization
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupNavigation();
  setupPreferencesForm();
  setupSearchAndFilters();
  setupModals();
  await loadMetadata();
  await loadFavorites();
  await loadAllProjects();

  // Handle URL hash routing
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
});

// --------------------------------------------------------------------------
// Theme Handling (Light / Dark)
// --------------------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('theme', nextTheme);
      updateThemeIcon(nextTheme);
    });
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

// --------------------------------------------------------------------------
// Navigation & Routing
// --------------------------------------------------------------------------
function setupNavigation() {
  // Mobile Hamburger Toggle
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.getElementById('nav-links');
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // Navigation Links Click Handling
  document.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const route = el.getAttribute('data-route');
      window.location.hash = `#${route}`;
      if (navLinks) navLinks.classList.remove('open');
    });
  });
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '') || 'home';
  const parts = hash.split('/');
  const mainRoute = parts[0];
  const subParam = parts[1];

  navigateTo(mainRoute, subParam);
}

function navigateTo(viewName, param = null) {
  state.activeView = viewName;

  // Hide all sections
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

  // Update Nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-route') === viewName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Activate specific section
  const targetSec = document.getElementById(`view-${viewName}`);
  if (targetSec) {
    targetSec.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // View specific activations
  if (viewName === 'details' && param) {
    loadProjectDetails(param);
  } else if (viewName === 'recommendations') {
    renderRecommendations();
  } else if (viewName === 'explore') {
    renderExploreProjects();
  } else if (viewName === 'saved') {
    renderSavedProjects();
  } else if (viewName === 'compare') {
    renderCompareView();
  } else if (viewName === 'history') {
    loadHistoryList();
  } else if (viewName === 'admin') {
    loadAdminDashboard();
  }
}

// --------------------------------------------------------------------------
// Toast Notification System
// --------------------------------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✓' : type === 'danger' ? '✕' : 'ℹ';
  toast.innerHTML = `<span style="font-weight:700;">${icon}</span> <span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --------------------------------------------------------------------------
// API Calls & Data Loaders with Client-Side Resilience
// --------------------------------------------------------------------------
async function loadMetadata() {
  const depts = [
    "Computer Science & Engineering",
    "Information Technology",
    "Artificial Intelligence & Machine Learning",
    "Data Science & Analytics",
    "Electronics & Communication Engineering",
    "Software Engineering",
    "Cybersecurity & Digital Forensics",
    "Electrical & Computer Engineering"
  ];

  const domains = [
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
  ];

  const skillsSet = new Set();
  const techSet = new Set();
  state.allProjects.forEach(p => {
    (p.required_skills || '').split(',').forEach(s => s.trim() && skillsSet.add(s.trim()));
    (p.technologies || '').split(',').forEach(t => t.trim() && techSet.add(t.trim()));
  });

  state.skillsAndTech = {
    skills: Array.from(skillsSet).sort(),
    technologies: Array.from(techSet).sort(),
    departments: depts,
    preset_domains: domains
  };

  renderDepartmentOptions(depts);
  renderPresetDomainCheckboxes(domains);
  renderTagSuggestions('skills-suggestions', state.skillsAndTech.skills.slice(0, 14), addSkillTag);
  renderTagSuggestions('tech-suggestions', state.skillsAndTech.technologies.slice(0, 14), addTechTag);

  try {
    const res = await fetch('/api/skills-and-tech');
    if (res.ok) {
      const data = await res.json();
      if (data.skills && data.skills.length > 0) {
        state.skillsAndTech = data;
        renderDepartmentOptions(data.departments);
        renderPresetDomainCheckboxes(data.preset_domains);
      }
    }
  } catch (err) {
    // Graceful offline/static fallback
  }
}

async function loadAllProjects() {
  // Load from INITIAL_PROJECTS (from projects-data.js) and custom projects in localStorage
  if (typeof INITIAL_PROJECTS !== 'undefined' && Array.isArray(INITIAL_PROJECTS)) {
    try {
      const custom = JSON.parse(localStorage.getItem('custom_projects') || '[]');
      state.allProjects = [...INITIAL_PROJECTS, ...custom];
    } catch (e) {
      state.allProjects = [...INITIAL_PROJECTS];
    }
  }

  renderHomeStats();
  renderHomeCategories();

  try {
    const res = await fetch('/api/projects');
    if (res.ok) {
      const data = await res.json();
      if (data.projects && data.projects.length > 0) {
        state.allProjects = data.projects;
        renderHomeStats();
        renderHomeCategories();
      }
    }
  } catch (err) {
    // Graceful fallback to initial projects
  }
}

async function loadFavorites() {
  try {
    const savedLocal = JSON.parse(localStorage.getItem('favorite_ids') || '[]');
    state.favorites = new Set(savedLocal);
    updateFavoritesBadgeCount();
  } catch (e) {}

  try {
    const res = await fetch('/api/favorites');
    if (res.ok) {
      const data = await res.json();
      if (data.favorites) {
        (data.favorites || []).forEach(f => state.favorites.add(f.project_id));
        updateFavoritesBadgeCount();
      }
    }
  } catch (err) {}
}

function updateFavoritesBadgeCount() {
  const badge = document.getElementById('saved-badge-count');
  if (badge) {
    badge.textContent = state.favorites.size;
  }
}

// --------------------------------------------------------------------------
// Home Page Rendering
// --------------------------------------------------------------------------
function renderHomeStats() {
  const projCount = document.getElementById('stat-total-projects');
  if (projCount) projCount.textContent = state.allProjects.length;

  const catCount = document.getElementById('stat-total-categories');
  const distinctCats = new Set(state.allProjects.map(p => p.category));
  if (catCount) catCount.textContent = distinctCats.size;
}

function renderHomeCategories() {
  const container = document.getElementById('home-categories-grid');
  if (!container) return;

  const catCounts = {};
  state.allProjects.forEach(p => {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  });

  const catIcons = {
    'Web Development': '🌐',
    'Artificial Intelligence': '🤖',
    'Machine Learning': '🧠',
    'Data Science': '📊',
    'Computer Networks': '📡',
    'Cybersecurity': '🛡️',
    'Database Management': '🗄️',
    'Mobile Applications': '📱',
    'IoT': '🔌',
    'Cloud Computing': '☁️',
    'Computer Vision': '👁️',
    'Java Applications': '☕',
    'Python Applications': '🐍'
  };

  container.innerHTML = Object.keys(catCounts).map(cat => `
    <div class="category-card" onclick="filterByCategoryAndExplore('${cat}')">
      <div class="cat-icon-wrap">${catIcons[cat] || '💡'}</div>
      <div class="cat-info">
        <h4>${cat}</h4>
        <p>${catCounts[cat]} Projects Available</p>
      </div>
    </div>
  `).join('');
}

window.filterByCategoryAndExplore = function(category) {
  state.filterCategory = category;
  const select = document.getElementById('explore-category-filter');
  if (select) select.value = category;
  window.location.hash = '#explore';
};

// --------------------------------------------------------------------------
// Preset Persona Handlers
// --------------------------------------------------------------------------
window.loadPresetProfile = function(presetKey) {
  const preset = PRESET_PROFILES[presetKey];
  if (!preset) return;

  applyProfileToForm(preset);
  showToast(`Loaded ${preset.name}'s profile preset. Generating recommendations...`, 'info');
  submitPreferencesForm();
};

function applyProfileToForm(profile) {
  document.getElementById('pref-student-name').value = profile.name || '';
  document.getElementById('pref-department').value = profile.department || '';

  // Clear tags
  state.selectedSkills.clear();
  state.selectedTech.clear();
  state.selectedDomains.clear();

  // Add tags
  (profile.skills || []).forEach(s => state.selectedSkills.add(s));
  (profile.technologies || []).forEach(t => state.selectedTech.add(t));
  (profile.preferred_domains || []).forEach(d => state.selectedDomains.add(d));

  renderSelectedTags('selected-skills-container', state.selectedSkills, removeSkillTag);
  renderSelectedTags('selected-tech-container', state.selectedTech, removeTechTag);
  updateDomainCheckboxUI();

  // Radios & Selects
  setRadioGroupValue('pref-difficulty', profile.difficulty || 'intermediate');
  setRadioGroupValue('pref-duration', profile.duration || '2-3 months');
  setRadioGroupValue('pref-type', profile.preferred_type || 'either');

  // Team size
  const teamVal = document.getElementById('pref-team-size-val');
  if (teamVal) teamVal.textContent = profile.team_size || 1;
}

// --------------------------------------------------------------------------
// Preferences Form Setup
// --------------------------------------------------------------------------
function setupPreferencesForm() {
  const form = document.getElementById('preferences-form');
  if (!form) return;

  // Skill Input enter key
  const skillInput = document.getElementById('skill-input');
  if (skillInput) {
    skillInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = skillInput.value.trim().replace(',', '');
        if (val) {
          addSkillTag(val);
          skillInput.value = '';
        }
      }
    });
  }

  // Tech Input enter key
  const techInput = document.getElementById('tech-input');
  if (techInput) {
    techInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = techInput.value.trim().replace(',', '');
        if (val) {
          addTechTag(val);
          techInput.value = '';
        }
      }
    });
  }

  // Radio cards click handling (Difficulty, Duration, Preferred Type)
  setupRadioCardGroups();

  // Team counter
  const decBtn = document.getElementById('team-dec-btn');
  const incBtn = document.getElementById('team-inc-btn');
  const teamVal = document.getElementById('pref-team-size-val');

  if (decBtn && incBtn && teamVal) {
    decBtn.addEventListener('click', () => {
      let count = parseInt(teamVal.textContent, 10) || 1;
      if (count > 1) teamVal.textContent = count - 1;
    });
    incBtn.addEventListener('click', () => {
      let count = parseInt(teamVal.textContent, 10) || 1;
      if (count < 8) teamVal.textContent = count + 1;
    });
  }

  // Reset Button
  const resetBtn = document.getElementById('pref-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      state.selectedSkills.clear();
      state.selectedTech.clear();
      state.selectedDomains.clear();
      renderSelectedTags('selected-skills-container', state.selectedSkills, removeSkillTag);
      renderSelectedTags('selected-tech-container', state.selectedTech, removeTechTag);
      updateDomainCheckboxUI();
      if (teamVal) teamVal.textContent = '1';
      setRadioGroupValue('pref-difficulty', 'intermediate');
      setRadioGroupValue('pref-duration', '2-3 months');
      setRadioGroupValue('pref-type', 'either');
      showToast('Preferences have been reset.', 'info');
    });
  }

  // Form Submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitPreferencesForm();
  });
}

function setupRadioCardGroups() {
  document.querySelectorAll('.radio-cards-grid').forEach(grid => {
    const cards = grid.querySelectorAll('.radio-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });
  });
}

function getRadioGroupValue(groupId) {
  const activeCard = document.querySelector(`#${groupId} .radio-card.active`);
  return activeCard ? activeCard.getAttribute('data-value') : '';
}

function setRadioGroupValue(groupId, value) {
  const cards = document.querySelectorAll(`#${groupId} .radio-card`);
  cards.forEach(c => {
    if (c.getAttribute('data-value') === value) {
      c.classList.add('active');
    } else {
      c.classList.remove('active');
    }
  });
}

function renderDepartmentOptions(departments) {
  const select = document.getElementById('pref-department');
  if (!select) return;
  select.innerHTML = '<option value="">-- Select Department --</option>' + 
    departments.map(d => `<option value="${d}">${d}</option>`).join('');
}

function renderPresetDomainCheckboxes(domains) {
  const container = document.getElementById('pref-domains-grid');
  if (!container) return;

  container.innerHTML = domains.map(d => `
    <div class="radio-card domain-select-card" data-domain="${d}" onclick="toggleDomainSelection('${d}')">
      <span>${d}</span>
    </div>
  `).join('');
}

window.toggleDomainSelection = function(domain) {
  if (state.selectedDomains.has(domain)) {
    state.selectedDomains.delete(domain);
  } else {
    state.selectedDomains.add(domain);
  }
  updateDomainCheckboxUI();
};

function updateDomainCheckboxUI() {
  document.querySelectorAll('.domain-select-card').forEach(card => {
    const domain = card.getAttribute('data-domain');
    if (state.selectedDomains.has(domain)) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

// --------------------------------------------------------------------------
// Tags Rendering
// --------------------------------------------------------------------------
function renderSelectedTags(containerId, tagSet, removeHandler) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (tagSet.size === 0) {
    container.innerHTML = '<span class="form-help" style="padding: 4px 0;">No tags selected yet. Type above or click suggestions below.</span>';
    return;
  }

  container.innerHTML = Array.from(tagSet).map(tag => `
    <span class="selected-tag">
      ${tag}
      <button type="button" onclick="${removeHandler.name}('${tag}')">&times;</button>
    </span>
  `).join('');
}

function renderTagSuggestions(containerId, suggestions, addHandler) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = suggestions.map(tag => `
    <span class="suggestion-chip" onclick="${addHandler.name}('${tag}')">+ ${tag}</span>
  `).join('');
}

window.addSkillTag = function(skill) {
  state.selectedSkills.add(skill);
  renderSelectedTags('selected-skills-container', state.selectedSkills, removeSkillTag);
};

window.removeSkillTag = function(skill) {
  state.selectedSkills.delete(skill);
  renderSelectedTags('selected-skills-container', state.selectedSkills, removeSkillTag);
};

window.addTechTag = function(tech) {
  state.selectedTech.add(tech);
  renderSelectedTags('selected-tech-container', state.selectedTech, removeTechTag);
};

window.removeTechTag = function(tech) {
  state.selectedTech.delete(tech);
  renderSelectedTags('selected-tech-container', state.selectedTech, removeTechTag);
};

// --------------------------------------------------------------------------
// Client-Side 5-Factor Recommendation Engine
// --------------------------------------------------------------------------
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
  if (!token) return "";
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
  const uWeeks = DURATION_WEEKS[(userDur || '2-3 months').toLowerCase()] || 10;
  const pWeeks = DURATION_WEEKS[(projDur || '2-3 months').toLowerCase()] || 10;
  if (uWeeks >= pWeeks) return { score: 10.0, explanation: `Estimated duration (${projDur}) fits comfortably within your ${userDur} timeline.` };
  if (pWeeks - uWeeks <= 4) return { score: 7.5, explanation: `Estimated duration (${projDur}) is slightly ambitious for ${userDur} but achievable.` };
  if (pWeeks - uWeeks <= 8) return { score: 5.0, explanation: `Estimated duration (${projDur}) exceeds your target timeline of ${userDur}.` };
  return { score: 2.5, explanation: `Estimated duration (${projDur}) is significantly longer than your available ${userDur}.` };
}

function calculateTeamScore(userSize, userPrefType, projTeam) {
  const pt = (projTeam || '').toLowerCase();
  if (pt.includes('individual') && userSize === 1) return { adj: 2.0, exp: "Tailored for individual solo completion." };
  if (pt.includes('team') && userSize > 1) return { adj: 2.0, exp: `Structured with multi-module collaboration suitable for your team of ${userSize}.` };
  if (pt.includes('individual or team')) return { adj: 2.0, exp: `Highly flexible for either solo or team (${userSize} members).` };
  if (userSize === 1 && pt.includes('team (3-4')) return { adj: -2.0, exp: "Large team project scope may be demanding for a solo student." };
  return { adj: 1.0, exp: `Can be adapted for your team size (${userSize} members).` };
}

function calculateMatchClient(studentProfile, project) {
  const userSkills = parseItems(studentProfile.skills);
  const userTech = parseItems(studentProfile.technologies);
  const userInterests = parseItems(studentProfile.interests);
  const prefDomains = parseItems(studentProfile.preferred_domains);
  const userDiff = studentProfile.difficulty || 'intermediate';
  const userDur = studentProfile.duration || '2-3 months';
  const userPrefType = studentProfile.preferred_type || 'either';
  const userTeamSize = parseInt(studentProfile.team_size || 1, 10);

  const allUserInterests = new Set([...userInterests, ...prefDomains]);
  const userAllTechAndSkills = [...userSkills, ...userTech];

  const projSkills = parseItems(project.required_skills);
  const projTech = parseItems(project.technologies);
  const projCat = normalizeToken(project.category);
  const projDiff = project.difficulty || 'Intermediate';
  const projDur = project.duration || '2-3 months';
  const projTeam = project.team_size || 'Individual or Team';
  const projDesc = ((project.description || '') + ' ' + (project.title || '')).toLowerCase();

  // Skills match (25)
  const skillOv = calculateOverlap(userAllTechAndSkills, projSkills);
  let skillScore = skillOv.ratio * 25.0;
  if (skillOv.matched.length > 0 && skillOv.ratio >= 0.6) skillScore = Math.min(25.0, skillScore + 2.0);

  // Tech match (25)
  const techOv = calculateOverlap(userAllTechAndSkills, projTech);
  let techScore = techOv.ratio * 25.0;
  if (techOv.matched.length > 0 && techOv.ratio >= 0.6) techScore = Math.min(25.0, techScore + 2.0);

  // Domain match (25)
  let interestScore = 0.0;
  let matchedDomain = null;
  for (const interest of allUserInterests) {
    if (interest && (interest.includes(projCat) || projCat.includes(interest))) {
      interestScore = 25.0;
      matchedDomain = project.category;
      break;
    } else if (interest && projDesc.includes(interest)) {
      interestScore = Math.max(interestScore, 18.0);
      matchedDomain = interest;
    }
  }
  if (interestScore === 0.0) {
    const catWords = projCat.split(' ');
    for (const w of catWords) {
      if (w.length > 3) {
        for (const ui of allUserInterests) {
          if (ui && ui.includes(w)) {
            interestScore = 15.0;
            matchedDomain = project.category;
            break;
          }
        }
      }
    }
  }
  if (interestScore === 0.0) interestScore = 8.0;

  // Difficulty (15)
  const diffRes = calculateDifficultyScore(userDiff, projDiff);

  // Duration (10)
  const durRes = calculateDurationScore(userDur, projDur);

  // Team
  const teamRes = calculateTeamScore(userTeamSize, userPrefType, projTeam);

  const rawScore = skillScore + techScore + interestScore + diffRes.score + durRes.score + teamRes.adj;
  const matchPercentage = Math.round(Math.min(98, Math.max(20, rawScore)));

  let matchTier = 'Good Match';
  let tierColor = 'amber';
  if (matchPercentage >= 88) {
    matchTier = 'Top Match';
    tierColor = 'emerald';
  } else if (matchPercentage >= 75) {
    matchTier = 'Strong Match';
    tierColor = 'blue';
  }

  const reasons = [];
  if (skillOv.matched.length > 0) {
    reasons.push(`✓ Skills Match: You know ${skillOv.matched.slice(0, 3).join(', ')} (Required: ${project.required_skills}).`);
  } else {
    reasons.push(`ℹ Skills Note: Great project to learn ${project.required_skills}.`);
  }
  if (techOv.matched.length > 0) {
    reasons.push(`✓ Tech Stack: Covers your known tools: ${techOv.matched.slice(0, 3).join(', ')}.`);
  } else {
    reasons.push(`ℹ Tech Stack: Employs industry-standard ${project.technologies}.`);
  }
  if (matchedDomain) {
    reasons.push(`✓ Domain Fit: Aligns directly with your interest in ${matchedDomain}.`);
  } else {
    reasons.push(`✓ Domain Fit: In-demand CSE domain: ${project.category}.`);
  }
  reasons.push(`✓ Difficulty: ${diffRes.explanation}`);
  reasons.push(`✓ Timeline: ${durRes.explanation}`);
  reasons.push(`✓ Team Fit: ${teamRes.exp}`);

  const rawObjectives = project.objectives || '';
  const mainFeatures = rawObjectives.split('\n').map(l => l.trim().replace(/^[0-9.-]+\s*/, '')).filter(Boolean);

  return {
    ...project,
    match_percentage: matchPercentage,
    match_tier: matchTier,
    tier_color: tierColor,
    why_matched: reasons.join('\n'),
    main_features: mainFeatures,
    score_breakdown: {
      skills: Math.round(skillScore * 10) / 10,
      skills_max: 25,
      technologies: Math.round(techScore * 10) / 10,
      tech_max: 25,
      interest: Math.round(interestScore * 10) / 10,
      interest_max: 25,
      difficulty: Math.round(diffRes.score * 10) / 10,
      diff_max: 15,
      duration: Math.round(durRes.score * 10) / 10,
      dur_max: 10,
      matched_skills: skillOv.matched,
      missing_skills: skillOv.missing,
      matched_tech: techOv.matched,
      missing_tech: techOv.missing
    }
  };
}

function rankProjectsClientSide(studentProfile, allProjects) {
  const scored = allProjects.map(p => calculateMatchClient(studentProfile, p));
  scored.sort((a, b) => {
    if (b.match_percentage !== a.match_percentage) {
      return b.match_percentage - a.match_percentage;
    }
    const aTech = (a.score_breakdown?.skills || 0) + (a.score_breakdown?.technologies || 0);
    const bTech = (b.score_breakdown?.skills || 0) + (b.score_breakdown?.technologies || 0);
    return bTech - aTech;
  });
  return scored;
}

function saveSessionToLocalHistory(profile, recommendations) {
  try {
    const history = JSON.parse(localStorage.getItem('recommendation_history') || '[]');
    const newSession = {
      session_id: Date.now(),
      student_name: profile.name,
      department: profile.department,
      search_params: profile,
      results_count: recommendations.length,
      top_match_score: recommendations[0]?.match_percentage || 0,
      created_at: new Date().toISOString()
    };
    history.unshift(newSession);
    localStorage.setItem('recommendation_history', JSON.stringify(history.slice(0, 30)));
  } catch (e) {}
}

// --------------------------------------------------------------------------
// Recommendations Submission & Retrieval
// --------------------------------------------------------------------------
async function submitPreferencesForm() {
  const name = document.getElementById('pref-student-name').value.trim() || 'Student';
  const department = document.getElementById('pref-department').value || 'Computer Science & Engineering';
  const skills = Array.from(state.selectedSkills);
  const technologies = Array.from(state.selectedTech);
  const preferred_domains = Array.from(state.selectedDomains);
  const difficulty = getRadioGroupValue('pref-difficulty') || 'intermediate';
  const duration = getRadioGroupValue('pref-duration') || '2-3 months';
  const preferred_type = getRadioGroupValue('pref-type') || 'either';
  const team_size = parseInt(document.getElementById('pref-team-size-val').textContent, 10) || 1;

  if (skills.length === 0 && technologies.length === 0 && preferred_domains.length === 0) {
    showToast('Please select or enter at least one skill, technology, or domain of interest!', 'danger');
    return;
  }

  const payload = {
    name,
    department,
    skills,
    technologies,
    interests: preferred_domains,
    preferred_domains,
    difficulty,
    duration,
    preferred_type,
    team_size
  };

  state.currentProfile = payload;

  const submitBtn = document.getElementById('generate-recom-btn');
  if (submitBtn) {
    submitBtn.innerHTML = '<span>⚡ Calculating Matches...</span>';
    submitBtn.disabled = true;
  }

  // Calculate matches instantaneously using the 5-factor client engine
  const clientRanked = rankProjectsClientSide(payload, state.allProjects);
  state.currentRecommendations = clientRanked;
  saveSessionToLocalHistory(payload, clientRanked);

  // Attempt backend API sync asynchronously if available
  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && data.recommendations && data.recommendations.length > 0) {
        state.currentRecommendations = data.recommendations;
      }
    }
  } catch (err) {
    // Offline or serverless latency - client results already rendered!
  } finally {
    if (submitBtn) {
      submitBtn.innerHTML = '<span>✨ Generate Recommendations</span>';
      submitBtn.disabled = false;
    }
  }

  showToast(`Generated ${state.currentRecommendations.length} matched project ideas!`, 'success');
  window.location.hash = '#recommendations';
}

// --------------------------------------------------------------------------
// Search & Filter Toolbar Setup
// --------------------------------------------------------------------------
function setupSearchAndFilters() {
  const searchInput = document.getElementById('recom-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.filterQuery = e.target.value.toLowerCase();
      renderRecommendations();
    });
  }

  const catSelect = document.getElementById('recom-category-filter');
  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      state.filterCategory = e.target.value;
      renderRecommendations();
    });
  }

  const diffSelect = document.getElementById('recom-difficulty-filter');
  if (diffSelect) {
    diffSelect.addEventListener('change', (e) => {
      state.filterDifficulty = e.target.value;
      renderRecommendations();
    });
  }

  const durSelect = document.getElementById('recom-duration-filter');
  if (durSelect) {
    durSelect.addEventListener('change', (e) => {
      state.filterDuration = e.target.value;
      renderRecommendations();
    });
  }

  const sortSelect = document.getElementById('recom-sort-by');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderRecommendations();
    });
  }
}

// --------------------------------------------------------------------------
// Render Recommendations View
// --------------------------------------------------------------------------
function renderRecommendations() {
  const resultsContainer = document.getElementById('recommended-projects-grid');
  const countBadge = document.getElementById('recommendations-count-badge');
  const studentMeta = document.getElementById('student-profile-meta');

  if (!resultsContainer) return;

  if (!state.currentProfile || state.currentRecommendations.length === 0) {
    resultsContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed var(--border);">
        <h3 style="font-size: 1.5rem; margin-bottom: 10px;">No Recommendations Yet</h3>
        <p style="color: var(--text-muted); margin-bottom: 24px;">Please complete the Student Preferences form or load a sample preset to compute customized project ideas.</p>
        <button class="btn btn-primary" onclick="window.location.hash='#preferences'">Start Student Preferences</button>
      </div>
    `;
    if (countBadge) countBadge.textContent = '0 Projects';
    return;
  }

  // Populate student summary header
  if (studentMeta) {
    studentMeta.innerHTML = `
      <span class="badge badge-primary">Student: ${state.currentProfile.name}</span>
      <span class="badge badge-slate">${state.currentProfile.department}</span>
      <span class="badge badge-blue">Experience: ${state.currentProfile.difficulty.toUpperCase()}</span>
      <span class="badge badge-amber">Duration: ${state.currentProfile.duration}</span>
      <span class="badge badge-emerald">Team Size: ${state.currentProfile.team_size}</span>
    `;
  }

  // Apply filters
  let filtered = [...state.currentRecommendations];

  if (state.filterQuery) {
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(state.filterQuery) ||
      p.description.toLowerCase().includes(state.filterQuery) ||
      p.technologies.toLowerCase().includes(state.filterQuery) ||
      p.required_skills.toLowerCase().includes(state.filterQuery)
    );
  }

  if (state.filterCategory && state.filterCategory !== 'All') {
    filtered = filtered.filter(p => p.category === state.filterCategory);
  }

  if (state.filterDifficulty && state.filterDifficulty !== 'All') {
    filtered = filtered.filter(p => p.difficulty.toLowerCase() === state.filterDifficulty.toLowerCase());
  }

  if (state.filterDuration && state.filterDuration !== 'All') {
    filtered = filtered.filter(p => p.duration === state.filterDuration);
  }

  // Sorting
  if (state.sortBy === 'match') {
    filtered.sort((a, b) => b.match_percentage - a.match_percentage);
  } else if (state.sortBy === 'title') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else if (state.sortBy === 'difficulty') {
    const rank = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
    filtered.sort((a, b) => (rank[a.difficulty] || 2) - (rank[b.difficulty] || 2));
  }

  if (countBadge) countBadge.textContent = `${filtered.length} Projects`;

  if (filtered.length === 0) {
    resultsContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border);">
        <p style="color: var(--text-muted); font-size: 1.1rem;">No projects match your current active filters.</p>
        <button class="btn btn-secondary btn-sm" style="margin-top: 14px;" onclick="resetResultsFilters()">Clear Filters</button>
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = filtered.map(p => renderProjectCardHTML(p, true)).join('');
}

window.resetResultsFilters = function() {
  state.filterQuery = '';
  state.filterCategory = 'All';
  state.filterDifficulty = 'All';
  state.filterDuration = 'All';
  state.sortBy = 'match';

  document.getElementById('recom-search-input').value = '';
  document.getElementById('recom-category-filter').value = 'All';
  document.getElementById('recom-difficulty-filter').value = 'All';
  document.getElementById('recom-duration-filter').value = 'All';
  document.getElementById('recom-sort-by').value = 'match';

  renderRecommendations();
};

// --------------------------------------------------------------------------
// HTML Card Template Generator
// --------------------------------------------------------------------------
function renderProjectCardHTML(p, showMatchDetails = true) {
  const isFav = state.favorites.has(p.project_id);
  const isCompared = state.compareIds.has(p.project_id);
  const matchPct = p.match_percentage || 0;
  const tierColor = p.tier_color || (matchPct >= 85 ? 'emerald' : matchPct >= 70 ? 'blue' : 'amber');

  // Circumference for 38px circle (radius = 16): 2 * pi * 16 = ~100.5
  const strokeDashoffset = 100.5 - (100.5 * matchPct) / 100;

  const techList = (p.technologies || '').split(',').map(t => t.trim()).slice(0, 4);

  return `
    <div class="project-card" id="project-card-${p.project_id}">
      <div class="card-top-bar">
        <span class="card-cat-badge">${p.category}</span>
        ${showMatchDetails ? `
          <div class="match-badge-wrap" title="Match Score based on skills, tech, difficulty, & timeline">
            <svg class="radial-progress" viewBox="0 0 38 38">
              <circle class="radial-bg" cx="19" cy="19" r="16"></circle>
              <circle class="radial-fill ${tierColor}" cx="19" cy="19" r="16"
                stroke-dasharray="100.5" stroke-dashoffset="${strokeDashoffset}"></circle>
            </svg>
            <span class="match-text-score">${matchPct}%</span>
          </div>
        ` : ''}
      </div>

      <h3 class="project-card-title">${p.title}</h3>
      <p class="project-card-desc">${p.description}</p>

      <div class="card-meta-row">
        <span class="badge badge-${getDifficultyBadgeClass(p.difficulty)}">⚡ ${p.difficulty}</span>
        <span class="badge badge-slate">⏱ ${p.duration}</span>
        <span class="badge badge-slate">👥 ${p.team_size}</span>
      </div>

      ${showMatchDetails && p.why_matched ? `
        <div class="card-why-matched">
          <strong>Why this matches:</strong> ${p.why_matched.split('\n')[0]}
        </div>
      ` : ''}

      <div class="card-tech-pills">
        ${techList.map(t => `<span class="tech-pill">${t}</span>`).join('')}
      </div>

      <div class="card-actions-row">
        <button class="btn btn-primary btn-sm" onclick="viewProjectDetailsModal(${p.project_id})">
          View Details
        </button>

        <button class="btn btn-icon ${isFav ? 'btn-danger' : 'btn-secondary'}" 
          title="${isFav ? 'Remove from Saved' : 'Save Project'}"
          onclick="toggleFavorite(${p.project_id})">
          ${isFav ? '❤️' : '🤍'}
        </button>

        <button class="btn btn-sm ${isCompared ? 'btn-outline-primary' : 'btn-secondary'}"
          title="Compare with another project"
          onclick="toggleCompare(${p.project_id})">
          ${isCompared ? '✓ Added' : '+ Compare'}
        </button>
      </div>
    </div>
  `;
}

function getDifficultyBadgeClass(difficulty) {
  const d = (difficulty || '').toLowerCase();
  if (d === 'beginner') return 'emerald';
  if (d === 'intermediate') return 'blue';
  return 'amber';
}

// --------------------------------------------------------------------------
// Modal Management & Setup
// --------------------------------------------------------------------------
function setupModals() {
  // Close modals when clicking overlay backdrop
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProjectDetailsModal();
      closeAdminModal();
    }
  });

  // Admin Add Project button
  const addBtn = document.getElementById('admin-add-project-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openAddProjectModal();
    });
  }

  // Admin Reset DB button
  const resetDbBtn = document.getElementById('admin-reset-db-btn');
  if (resetDbBtn) {
    resetDbBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset all projects back to default seed data? Custom projects will be cleared.')) {
        try {
          showToast('Resetting database to defaults...', 'info');
          const res = await fetch('/api/admin/reset', { method: 'POST' });
          if (res.ok) {
            localStorage.removeItem('custom_projects');
            showToast('Database reset to defaults successfully!', 'success');
            await loadAllProjects();
            await loadAdminDashboard();
          } else {
            showToast('Failed to reset database on server.', 'danger');
          }
        } catch (err) {
          console.error('Reset error:', err);
          localStorage.removeItem('custom_projects');
          showToast('Database reset locally.', 'info');
          await loadAllProjects();
          await loadAdminDashboard();
        }
      }
    });
  }

  // Admin Project Form Submit
  const adminForm = document.getElementById('admin-project-form');
  if (adminForm) {
    adminForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveAdminProject();
    });
  }
}

// --------------------------------------------------------------------------
// Project Details Modal & Page
// --------------------------------------------------------------------------
window.viewProjectDetailsModal = async function(projectId) {
  state.activeDetailProjectId = projectId;
  const modal = document.getElementById('project-details-modal');
  const bodyContainer = document.getElementById('modal-project-details-body');
  if (!modal || !bodyContainer) return;

  bodyContainer.innerHTML = '<div style="text-align: center; padding: 40px;">Loading project details...</div>';
  modal.classList.add('active');

  try {
    let proj = null;
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        proj = data.project;
      }
    } catch (e) {}

    // Fallback to in-memory/catalog projects if server request fails
    if (!proj) {
      proj = state.allProjects.find(p => p.project_id == projectId);
    }

    if (proj) {
      // Check if we have score breakdown from current recommendations
      const matchRec = (state.currentRecommendations || []).find(r => r.project_id == projectId);
      renderProjectDetailsInto(bodyContainer, proj, matchRec);
    } else {
      bodyContainer.innerHTML = '<div style="color: var(--danger); padding: 30px; text-align: center;">Project details not found.</div>';
    }
  } catch (err) {
    console.error('Failed to load project details:', err);
    bodyContainer.innerHTML = '<div style="color: var(--danger); padding: 30px; text-align: center;">Failed to load project details.</div>';
  }
};

window.closeProjectDetailsModal = function() {
  const modal = document.getElementById('project-details-modal');
  if (modal) modal.classList.remove('active');
};

function renderProjectDetailsInto(container, proj, matchRec = null) {
  const isFav = state.favorites.has(proj.project_id);
  const matchPct = matchRec ? matchRec.match_percentage : null;
  const breakdown = matchRec ? matchRec.score_breakdown : null;

  const objectivesList = (proj.objectives || '').split('\n').filter(o => o.trim());
  const modulesList = (proj.modules || '').split('\n').filter(m => m.trim());
  const techList = (proj.technologies || '').split(',').map(t => t.trim());
  const skillsList = (proj.required_skills || '').split(',').map(s => s.trim());

  container.innerHTML = `
    <!-- Academic Print Header (hidden on screen, visible on print) -->
    <div class="print-header-academic" style="display:none;">
      <h2>Department of Computer Science & Engineering</h2>
      <h3>Capstone / Final Year Project Proposal</h3>
      <p>Academic Year 2026 - 2027</p>
    </div>

    <div class="details-header">
      <div class="details-header-meta">
        <span class="card-cat-badge">${proj.category}</span>
        <span class="badge badge-${getDifficultyBadgeClass(proj.difficulty)}">Difficulty: ${proj.difficulty}</span>
        <span class="badge badge-slate">Duration: ${proj.duration}</span>
        <span class="badge badge-blue">Team: ${proj.team_size}</span>
        ${matchPct !== null ? `<span class="badge badge-emerald" style="font-size:0.9rem;">Match Score: ${matchPct}%</span>` : ''}
      </div>
      <h1 class="details-title">${proj.title}</h1>
      <p style="font-size: 1.05rem; color: var(--text-muted); line-height: 1.6;">${proj.description}</p>
    </div>

    ${breakdown ? `
      <div class="score-breakdown-box">
        <div class="score-breakdown-title">
          <span>🎯 Why It Matches Your Profile (Score Breakdown)</span>
          <span style="color: var(--primary); font-size:1.1rem;">Total: ${matchPct}%</span>
        </div>

        <div class="score-metric-bar">
          <span class="score-metric-label">Programming Skills:</span>
          <div class="progress-track"><div class="progress-fill" style="width: ${(breakdown.skills / breakdown.skills_max) * 100}%"></div></div>
          <span class="score-metric-val">${breakdown.skills}/${breakdown.skills_max}</span>
        </div>

        <div class="score-metric-bar">
          <span class="score-metric-label">Technologies Known:</span>
          <div class="progress-track"><div class="progress-fill" style="width: ${(breakdown.technologies / breakdown.tech_max) * 100}%"></div></div>
          <span class="score-metric-val">${breakdown.technologies}/${breakdown.tech_max}</span>
        </div>

        <div class="score-metric-bar">
          <span class="score-metric-label">Domain & Interest:</span>
          <div class="progress-track"><div class="progress-fill" style="width: ${(breakdown.interest / breakdown.interest_max) * 100}%"></div></div>
          <span class="score-metric-val">${breakdown.interest}/${breakdown.interest_max}</span>
        </div>

        <div class="score-metric-bar">
          <span class="score-metric-label">Difficulty Fit:</span>
          <div class="progress-track"><div class="progress-fill" style="width: ${(breakdown.difficulty / breakdown.diff_max) * 100}%"></div></div>
          <span class="score-metric-val">${breakdown.difficulty}/${breakdown.diff_max}</span>
        </div>

        <div class="score-metric-bar">
          <span class="score-metric-label">Project Duration:</span>
          <div class="progress-track"><div class="progress-fill" style="width: ${(breakdown.duration / breakdown.dur_max) * 100}%"></div></div>
          <span class="score-metric-val">${breakdown.duration}/${breakdown.dur_max}</span>
        </div>

        ${matchRec.why_matched ? `
          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--border); font-size: 0.85rem; line-height: 1.6;">
            ${matchRec.why_matched.split('\n').map(l => `<div style="margin-bottom: 4px;">${l}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    ` : ''}

    <div class="details-grid">
      <div class="details-main-content">
        <div class="content-block">
          <h3>📌 Problem It Solves</h3>
          <p>${proj.problem_solved || 'Addresses real-world operational challenges using computer science principles and software engineering.'}</p>
        </div>

        <div class="content-block">
          <h3>🎯 Objectives</h3>
          <ul>
            ${objectivesList.map(o => `<li>${o}</li>`).join('')}
          </ul>
        </div>

        <div class="content-block">
          <h3>🧩 Architectural Modules</h3>
          <ul>
            ${modulesList.map(m => `<li><strong>${m.split(':')[0]}:</strong> ${m.split(':').slice(1).join(':') || ''}</li>`).join('')}
          </ul>
        </div>

        <div class="content-block">
          <h3>🗄️ Database & Schema Requirements</h3>
          <p style="background: var(--bg-subtle); padding: 12px; border-radius: var(--radius-md); font-family: ui-monospace, monospace; font-size: 0.88rem;">
            ${proj.db_requirements || 'Normalized relational schema with primary/foreign keys, indexes, and audit logs.'}
          </p>
        </div>

        <div class="content-block">
          <h3>🚀 Expected Output & Deliverables</h3>
          <p>${proj.expected_output || 'Functional application with documentation, unit tests, and presentation slides.'}</p>
        </div>

        <div class="content-block">
          <h3>⭐ Key Advantages</h3>
          <p>${proj.advantages || 'High academic rigor, resume impact, and clear demonstration of engineering concepts.'}</p>
        </div>

        <div class="content-block">
          <h3>🔮 Future Enhancements</h3>
          <p>${proj.future_enhancements || 'Cloud scaling, mobile integration, and continuous telemetry.'}</p>
        </div>
      </div>

      <div class="details-sidebar">
        <div class="sidebar-card">
          <h4>Required Technologies</h4>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${techList.map(t => `<span class="tech-pill">${t}</span>`).join('')}
          </div>
        </div>

        <div class="sidebar-card">
          <h4>Required Skills</h4>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${skillsList.map(s => `<span class="badge badge-primary">${s}</span>`).join('')}
          </div>
        </div>

        <div class="sidebar-card">
          <h4>Project Details</h4>
          <p style="font-size:0.85rem; margin-bottom:8px;"><strong>Category:</strong> ${proj.category}</p>
          <p style="font-size:0.85rem; margin-bottom:8px;"><strong>Difficulty:</strong> ${proj.difficulty}</p>
          <p style="font-size:0.85rem; margin-bottom:8px;"><strong>Duration:</strong> ${proj.duration}</p>
          <p style="font-size:0.85rem;"><strong>Suitability:</strong> ${proj.team_size}</p>
        </div>

        <div class="sidebar-card" style="display:flex; flex-direction:column; gap:10px;">
          <button class="btn ${isFav ? 'btn-danger' : 'btn-outline-primary'}" onclick="toggleFavorite(${proj.project_id}); viewProjectDetailsModal(${proj.project_id});">
            ${isFav ? '❤️ Remove from Saved' : '🤍 Save to Favorites'}
          </button>
          <button class="btn btn-secondary" onclick="toggleCompare(${proj.project_id});">
            ${state.compareIds.has(proj.project_id) ? '✓ In Comparison List' : '+ Add to Compare'}
          </button>
          <button class="btn btn-primary" onclick="printProjectProposal()">
            🖨️ Print / Export Proposal
          </button>
        </div>
      </div>
    </div>
  `;
}

window.printProjectProposal = function() {
  window.print();
};

// --------------------------------------------------------------------------
// Favorites / Saved Projects
// --------------------------------------------------------------------------
window.toggleFavorite = async function(projectId) {
  const isFav = state.favorites.has(projectId);

  if (isFav) {
    state.favorites.delete(projectId);
    showToast('Project removed from saved favorites.', 'info');
  } else {
    state.favorites.add(projectId);
    showToast('Project saved to your favorites!', 'success');
  }

  try {
    localStorage.setItem('favorite_ids', JSON.stringify(Array.from(state.favorites)));
  } catch (e) {}

  updateFavoritesBadgeCount();

  // Sync with API in background
  try {
    if (isFav) {
      fetch(`/api/favorites/${projectId}`, { method: 'DELETE' });
    } else {
      fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, student_id: state.currentProfile ? state.currentProfile.student_id : null })
      });
    }
  } catch (err) {}

  // Re-render current view if relevant
  if (state.activeView === 'recommendations') {
    renderRecommendations();
  } else if (state.activeView === 'explore') {
    renderExploreProjects();
  } else if (state.activeView === 'saved') {
    renderSavedProjects();
  }
};

async function renderSavedProjects() {
  const container = document.getElementById('saved-projects-grid');
  if (!container) return;

  let favorites = state.allProjects.filter(p => state.favorites.has(p.project_id));

  try {
    const res = await fetch('/api/favorites');
    if (res.ok) {
      const data = await res.json();
      if (data.favorites && data.favorites.length > 0) {
        favorites = data.favorites;
      }
    }
  } catch (err) {}

  if (favorites.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed var(--border);">
        <h3 style="font-size: 1.4rem; margin-bottom: 10px;">No Saved Projects Yet</h3>
        <p style="color: var(--text-muted); margin-bottom: 20px;">Click the heart icon on any project card to bookmark ideas for later.</p>
        <button class="btn btn-primary" onclick="window.location.hash='#explore'">Browse All Projects</button>
      </div>
    `;
    return;
  }

  container.innerHTML = favorites.map(p => renderProjectCardHTML(p, false)).join('');
}

// --------------------------------------------------------------------------
// Compare Projects Feature
// --------------------------------------------------------------------------
window.toggleCompare = function(projectId) {
  if (state.compareIds.has(projectId)) {
    state.compareIds.delete(projectId);
    showToast('Removed project from comparison.', 'info');
  } else {
    if (state.compareIds.size >= 3) {
      showToast('You can compare a maximum of 3 projects simultaneously.', 'danger');
      return;
    }
    state.compareIds.add(projectId);
    showToast('Added project to comparison matrix.', 'success');
  }

  updateCompareTrayUI();

  if (state.activeView === 'recommendations') renderRecommendations();
  if (state.activeView === 'explore') renderExploreProjects();
  if (state.activeView === 'compare') renderCompareView();
};

function updateCompareTrayUI() {
  const tray = document.getElementById('compare-floating-tray');
  const thumbsContainer = document.getElementById('compare-tray-thumbs');
  const countBadge = document.getElementById('compare-badge-count');

  if (countBadge) countBadge.textContent = state.compareIds.size;
  if (!tray || !thumbsContainer) return;

  if (state.compareIds.size > 0) {
    tray.classList.add('visible');
    const projs = state.allProjects.filter(p => state.compareIds.has(p.project_id));
    thumbsContainer.innerHTML = projs.map(p => `
      <span class="compare-thumb-pill">
        ${p.title.substring(0, 18)}...
        <button type="button" style="background:none; border:none; cursor:pointer; font-weight:700;" onclick="toggleCompare(${p.project_id})">&times;</button>
      </span>
    `).join('');
  } else {
    tray.classList.remove('visible');
  }
}

window.clearCompareList = function() {
  state.compareIds.clear();
  updateCompareTrayUI();
  if (state.activeView === 'compare') renderCompareView();
  if (state.activeView === 'recommendations') renderRecommendations();
  if (state.activeView === 'explore') renderExploreProjects();
};

async function renderCompareView() {
  const container = document.getElementById('compare-view-content');
  if (!container) return;

  if (state.compareIds.size < 2) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed var(--border);">
        <h3 style="font-size: 1.4rem; margin-bottom: 10px;">Select at Least 2 Projects to Compare</h3>
        <p style="color: var(--text-muted); margin-bottom: 20px;">Add projects to comparison from the Recommendations or Explore page (up to 3).</p>
        <button class="btn btn-primary" onclick="window.location.hash='#explore'">Explore Projects</button>
      </div>
    `;
    return;
  }

  const projs = state.allProjects.filter(p => state.compareIds.has(p.project_id));

  container.innerHTML = `
    <div class="compare-table-wrapper">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Criteria</th>
            ${projs.map(p => `
              <th>
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div>
                    <div style="font-size:1.1rem; font-weight:700;">${p.title}</div>
                    <span class="card-cat-badge" style="margin-top:6px; display:inline-block;">${p.category}</span>
                  </div>
                  <button class="btn btn-sm btn-secondary" onclick="toggleCompare(${p.project_id})">✕ Remove</button>
                </div>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Difficulty Level</th>
            ${projs.map(p => `<td><span class="badge badge-${getDifficultyBadgeClass(p.difficulty)}">${p.difficulty}</span></td>`).join('')}
          </tr>
          <tr>
            <th>Estimated Duration</th>
            ${projs.map(p => `<td>⏱ ${p.duration}</td>`).join('')}
          </tr>
          <tr>
            <th>Team Suitability</th>
            ${projs.map(p => `<td>👥 ${p.team_size}</td>`).join('')}
          </tr>
          <tr>
            <th>Required Skills</th>
            ${projs.map(p => `<td>${(p.required_skills || '').split(',').map(s => `<span class="badge badge-primary" style="margin:2px;">${s.trim()}</span>`).join('')}</td>`).join('')}
          </tr>
          <tr>
            <th>Technologies</th>
            ${projs.map(p => `<td>${(p.technologies || '').split(',').map(t => `<span class="tech-pill" style="margin:2px;">${t.trim()}</span>`).join('')}</td>`).join('')}
          </tr>
          <tr>
            <th>Problem Solved</th>
            ${projs.map(p => `<td><p style="font-size:0.88rem; color:var(--text-muted);">${p.problem_solved || 'N/A'}</p></td>`).join('')}
          </tr>
          <tr>
            <th>Database Requirements</th>
            ${projs.map(p => `<td><code style="font-size:0.82rem;">${p.db_requirements || 'Relational Schema'}</code></td>`).join('')}
          </tr>
          <tr>
            <th>Expected Output</th>
            ${projs.map(p => `<td>${p.expected_output || 'Working code & report'}</td>`).join('')}
          </tr>
          <tr>
            <th>Advantages</th>
            ${projs.map(p => `<td>${p.advantages || 'High academic relevance'}</td>`).join('')}
          </tr>
          <tr>
            <th>Action</th>
            ${projs.map(p => `
              <td>
                <button class="btn btn-primary btn-sm" onclick="viewProjectDetailsModal(${p.project_id})">View Full Details</button>
              </td>
            `).join('')}
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// --------------------------------------------------------------------------
// Explore Projects View
// --------------------------------------------------------------------------
function renderExploreProjects() {
  const container = document.getElementById('explore-projects-grid');
  const countBadge = document.getElementById('explore-count-badge');
  if (!container) return;

  let filtered = [...state.allProjects];

  const searchVal = (document.getElementById('explore-search-input') || {}).value || '';
  const catVal = (document.getElementById('explore-category-filter') || {}).value || 'All';
  const diffVal = (document.getElementById('explore-difficulty-filter') || {}).value || 'All';
  const durVal = (document.getElementById('explore-duration-filter') || {}).value || 'All';

  if (searchVal.trim()) {
    const q = searchVal.toLowerCase();
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.technologies.toLowerCase().includes(q) ||
      p.required_skills.toLowerCase().includes(q)
    );
  }

  if (catVal && catVal !== 'All') {
    filtered = filtered.filter(p => p.category === catVal);
  }

  if (diffVal && diffVal !== 'All') {
    filtered = filtered.filter(p => p.difficulty.toLowerCase() === diffVal.toLowerCase());
  }

  if (durVal && durVal !== 'All') {
    filtered = filtered.filter(p => p.duration === durVal);
  }

  if (countBadge) countBadge.textContent = `${filtered.length} Projects`;

  if (filtered.length === 0) {
    container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">No projects found matching these criteria.</div>';
    return;
  }

  container.innerHTML = filtered.map(p => renderProjectCardHTML(p, false)).join('');
}

window.onExploreFilterChange = function() {
  renderExploreProjects();
};

// --------------------------------------------------------------------------
// Recommendation History
// --------------------------------------------------------------------------
async function loadHistoryList() {
  const container = document.getElementById('history-list-container');
  if (!container) return;

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('recommendation_history') || '[]');
  } catch (e) {}

  try {
    const res = await fetch('/api/history');
    if (res.ok) {
      const data = await res.json();
      if (data.history && data.history.length > 0) {
        history = data.history;
      }
    }
  } catch (err) {}

  if (history.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed var(--border);">
        <h3 style="font-size: 1.4rem; margin-bottom: 10px;">No Recommendation History</h3>
        <p style="color: var(--text-muted); margin-bottom: 20px;">Submit student preferences to record sessions in the history archive.</p>
        <button class="btn btn-primary" onclick="window.location.hash='#preferences'">Generate First Recommendation</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Student Name</th>
            <th>Department</th>
            <th>Input Criteria</th>
            <th>Results Count</th>
            <th>Top Match Score</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${history.map(h => {
            const params = h.search_params || {};
            const skillsSummary = (params.skills || []).toString() || 'General';
            return `
              <tr>
                <td>${new Date(h.created_at).toLocaleString()}</td>
                <td><strong>${h.student_name}</strong></td>
                <td>${h.department}</td>
                <td><span class="badge badge-primary">${skillsSummary.substring(0, 30)}...</span></td>
                <td>${h.results_count} Projects</td>
                <td><span class="badge badge-emerald" style="font-weight:700;">${h.top_match_score}%</span></td>
                <td>
                  <button class="btn btn-primary btn-sm" onclick="restoreHistorySession(${h.session_id})">
                    Restore Results
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

window.restoreHistorySession = async function(sessionId) {
  try {
    showToast('Restoring previous recommendation session...', 'info');

    let foundSession = null;
    try {
      const localHist = JSON.parse(localStorage.getItem('recommendation_history') || '[]');
      foundSession = localHist.find(h => h.session_id == sessionId);
    } catch (e) {}

    if (foundSession && foundSession.search_params) {
      state.currentProfile = foundSession.search_params;
      state.currentRecommendations = rankProjectsClientSide(foundSession.search_params, state.allProjects);
      showToast('Session restored successfully!', 'success');
      window.location.hash = '#recommendations';
      return;
    }

    const res = await fetch(`/api/history/${sessionId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.session) {
        state.currentProfile = data.student_profile;
        state.currentRecommendations = data.recommendations || [];
        showToast('Session restored successfully!', 'success');
        window.location.hash = '#recommendations';
      }
    }
  } catch (err) {
    console.error('Failed to restore history session:', err);
    showToast('Error restoring session.', 'danger');
  }
};

// --------------------------------------------------------------------------
// Admin Dashboard
// --------------------------------------------------------------------------
async function loadAdminDashboard() {
  await loadAdminStats();
  await loadAdminProjectsTable();
}

async function loadAdminStats() {
  const totalProjects = state.allProjects.length;
  const cats = {};
  state.allProjects.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
  const totalCategories = Object.keys(cats).length;
  const totalFavorites = state.favorites.size;
  let historyCount = 0;
  try {
    historyCount = JSON.parse(localStorage.getItem('recommendation_history') || '[]').length;
  } catch (e) {}

  document.getElementById('admin-total-projects').textContent = totalProjects;
  document.getElementById('admin-total-categories').textContent = totalCategories;
  document.getElementById('admin-total-recommendations').textContent = historyCount;
  document.getElementById('admin-total-favorites').textContent = totalFavorites;

  const catBars = document.getElementById('admin-category-distribution');
  if (catBars) {
    catBars.innerHTML = Object.keys(cats).map(cat => `
      <div style="margin-bottom: 10px;">
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600; margin-bottom:4px;">
          <span>${cat}</span>
          <span>${cats[cat]} projects</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${(cats[cat] / totalProjects) * 100}%"></div>
        </div>
      </div>
    `).join('');
  }

  try {
    const res = await fetch('/api/admin/stats');
    if (res.ok) {
      const stats = await res.json();
      if (stats.total_projects) {
        document.getElementById('admin-total-projects').textContent = stats.total_projects;
        document.getElementById('admin-total-categories').textContent = stats.total_categories;
      }
    }
  } catch (err) {}
}

async function loadAdminProjectsTable() {
  const container = document.getElementById('admin-projects-table-body');
  if (!container) return;

  state.adminProjects = state.allProjects;

  if (state.adminProjects.length === 0) {
    container.innerHTML = '<tr><td colspan="6" style="text-align:center;">No projects found.</td></tr>';
    return;
  }

  container.innerHTML = state.adminProjects.map(p => `
    <tr>
      <td><strong>#${p.project_id}</strong></td>
      <td>
        <div style="font-weight:600; color:var(--text-main);">${p.title}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${p.technologies}</div>
      </td>
      <td><span class="card-cat-badge">${p.category}</span></td>
      <td><span class="badge badge-${getDifficultyBadgeClass(p.difficulty)}">${p.difficulty}</span></td>
      <td>${p.duration}</td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="openEditProjectModal(${p.project_id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProjectAsAdmin(${p.project_id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// --------------------------------------------------------------------------
// Admin Modal Handlers & Actions
// --------------------------------------------------------------------------
window.openAddProjectModal = function() {
  const modal = document.getElementById('admin-project-modal');
  const form = document.getElementById('admin-project-form');
  const title = document.getElementById('admin-modal-title');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('admin-proj-id').value = '';
  if (title) title.textContent = 'Add New Project Idea';
  modal.classList.add('active');
};

window.openEditProjectModal = function(projectId) {
  const proj = state.allProjects.find(p => p.project_id == projectId);
  if (!proj) return;

  const modal = document.getElementById('admin-project-modal');
  const title = document.getElementById('admin-modal-title');
  if (!modal) return;

  if (title) title.textContent = `Edit Project Idea #${projectId}`;
  document.getElementById('admin-proj-id').value = proj.project_id;
  document.getElementById('admin-proj-title').value = proj.title || '';
  document.getElementById('admin-proj-category').value = proj.category || 'Web Development';
  document.getElementById('admin-proj-difficulty').value = proj.difficulty || 'Intermediate';
  document.getElementById('admin-proj-duration').value = proj.duration || '2-3 months';
  document.getElementById('admin-proj-team').value = proj.team_size || 'Individual or Team (1-2 members)';
  document.getElementById('admin-proj-desc').value = proj.description || '';
  document.getElementById('admin-proj-tech').value = proj.technologies || '';
  document.getElementById('admin-proj-skills').value = proj.required_skills || '';
  document.getElementById('admin-proj-problem').value = proj.problem_solved || '';
  document.getElementById('admin-proj-objectives').value = proj.objectives || '';
  document.getElementById('admin-proj-modules').value = proj.modules || '';
  document.getElementById('admin-proj-db').value = proj.db_requirements || '';
  document.getElementById('admin-proj-output').value = proj.expected_output || '';
  document.getElementById('admin-proj-advantages').value = proj.advantages || '';
  document.getElementById('admin-proj-future').value = proj.future_enhancements || '';

  modal.classList.add('active');
};

window.closeAdminModal = function() {
  const modal = document.getElementById('admin-project-modal');
  if (modal) modal.classList.remove('active');
};

async function saveAdminProject() {
  const projId = document.getElementById('admin-proj-id').value;
  const isEdit = Boolean(projId);
  const payload = {
    title: document.getElementById('admin-proj-title').value.trim(),
    category: document.getElementById('admin-proj-category').value.trim(),
    description: document.getElementById('admin-proj-desc').value.trim(),
    technologies: document.getElementById('admin-proj-tech').value.trim(),
    required_skills: document.getElementById('admin-proj-skills').value.trim(),
    difficulty: document.getElementById('admin-proj-difficulty').value,
    duration: document.getElementById('admin-proj-duration').value,
    team_size: document.getElementById('admin-proj-team').value.trim(),
    problem_solved: document.getElementById('admin-proj-problem').value.trim(),
    objectives: document.getElementById('admin-proj-objectives').value.trim(),
    modules: document.getElementById('admin-proj-modules').value.trim(),
    db_requirements: document.getElementById('admin-proj-db').value.trim(),
    expected_output: document.getElementById('admin-proj-output').value.trim(),
    advantages: document.getElementById('admin-proj-advantages').value.trim(),
    future_enhancements: document.getElementById('admin-proj-future').value.trim()
  };

  closeAdminModal();
  showToast(isEdit ? 'Updating project...' : 'Creating project...', 'info');

  try {
    const url = isEdit ? `/api/admin/projects/${projId}` : '/api/admin/projects';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast(isEdit ? 'Project updated successfully!' : 'Project created successfully!', 'success');
      await loadAllProjects();
      await loadAdminDashboard();
      return;
    }
  } catch (e) {
    console.warn('Backend save failed, using local storage fallback:', e);
  }

  // Local fallback
  if (isEdit) {
    const numId = parseInt(projId, 10);
    const idx = state.allProjects.findIndex(p => p.project_id == numId);
    if (idx !== -1) {
      state.allProjects[idx] = { ...state.allProjects[idx], ...payload };
    }
  } else {
    const newProj = {
      ...payload,
      project_id: Date.now(),
      is_custom: 1
    };
    state.allProjects.unshift(newProj);
  }

  try {
    const custom = state.allProjects.filter(p => p.is_custom === 1);
    localStorage.setItem('custom_projects', JSON.stringify(custom));
  } catch (e) {}

  showToast(isEdit ? 'Project updated successfully!' : 'Project created successfully!', 'success');
  renderHomeStats();
  renderHomeCategories();
  loadAdminProjectsTable();
  loadAdminStats();
}

window.deleteProjectAsAdmin = async function(projectId) {
  if (confirm(`Are you sure you want to delete Project #${projectId}? This action cannot be undone.`)) {
    try {
      showToast('Deleting project...', 'info');
      // Optimistic update in UI
      state.allProjects = state.allProjects.filter(p => p.project_id != projectId);
      try {
        const custom = state.allProjects.filter(p => p.is_custom === 1);
        localStorage.setItem('custom_projects', JSON.stringify(custom));
      } catch (e) {}
      renderHomeStats();
      renderHomeCategories();
      loadAdminProjectsTable();
      loadAdminStats();

      const res = await fetch(`/api/admin/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Project deleted successfully.', 'success');
        await loadAllProjects();
        await loadAdminDashboard();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Project deleted locally.', 'info');
      }
    } catch (err) {
      console.warn('Network issue during delete, applied locally:', err);
      showToast('Project deleted locally.', 'info');
    }
  }
};

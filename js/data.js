/* =========================================================
   ODO Onboarding — Couche de données (localStorage)
   =========================================================
   Schéma:
   {
     employees: [{ id, name }],
     steps: [{
        id, title, description,
        documents: [{ id, name, url }]
     }],
     progress: {
        [employeeId]: { [docId]: true }
     },
     comments: {
        [employeeId]: {
          steps: { [stepId]: "texte du commentaire" },
          docs:  { [docId]:  "texte du commentaire" }
        }
     }
   }
   ========================================================= */

const STORAGE_KEY = 'odo_onboarding_v1';
const ADMIN_PASSWORD = 'odo2026';   // ← Changez ce mot de passe pour la mise en production
const ADMIN_SESSION_KEY = 'odo_admin_session';

const AVATAR_COLORS = ['#A3B0E0', '#FDCA44', '#F36C12', '#CEDD88', '#49ABA7', '#177FC4'];

/* ---------- Utilitaires ---------- */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map(p => p[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function colorFor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ---------- État ---------- */

function defaultData() {
  return {
    employees: [],
    steps: [
      {
        id: uid(),
        title: 'Bienvenue chez ODO Outaouais',
        description: 'Première étape : prends connaissance de notre mission et de nos axes de travail.',
        documents: [
          { id: uid(), name: 'Présentation de l\'organisation', url: 'https://example.com' },
          { id: uid(), name: 'Mini-guide de normes ODO', url: 'https://example.com' }
        ]
      },
      {
        id: uid(),
        title: 'Documents administratifs',
        description: 'Formulaires à remplir et à signer pour ton dossier RH.',
        documents: [
          { id: uid(), name: 'Formulaire d\'embauche', url: 'https://example.com' },
          { id: uid(), name: 'Politique de confidentialité', url: 'https://example.com' }
        ]
      },
      {
        id: uid(),
        title: 'Outils et accès',
        description: 'Configure tes outils de travail et tes accès aux plateformes.',
        documents: [
          { id: uid(), name: 'Guide de connexion', url: 'https://example.com' }
        ]
      }
    ],
    progress: {},
    comments: {}
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = defaultData();
      save(fresh);
      return fresh;
    }
    const data = JSON.parse(raw);
    // Migration douce: ajoute le champ comments si absent (versions antérieures)
    if (!data.comments) data.comments = {};
    return data;
  } catch (e) {
    console.error('Erreur de lecture localStorage', e);
    return defaultData();
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ---------- Employés ---------- */

const Data = {
  getAll() { return load(); },

  getEmployees() { return load().employees; },
  getEmployee(id) { return load().employees.find(e => e.id === id); },

  addEmployee(name) {
    const data = load();
    const employee = { id: uid(), name: name.trim() };
    data.employees.push(employee);
    save(data);
    return employee;
  },

  removeEmployee(id) {
    const data = load();
    data.employees = data.employees.filter(e => e.id !== id);
    delete data.progress[id];
    delete data.comments[id];
    save(data);
  },

  /* ---------- Étapes ---------- */

  getSteps() { return load().steps; },

  addStep({ title, description }) {
    const data = load();
    const step = { id: uid(), title: title.trim(), description: (description || '').trim(), documents: [] };
    data.steps.push(step);
    save(data);
    return step;
  },

  updateStep(id, { title, description }) {
    const data = load();
    const step = data.steps.find(s => s.id === id);
    if (!step) return;
    if (title !== undefined) step.title = title.trim();
    if (description !== undefined) step.description = description.trim();
    save(data);
  },

  removeStep(id) {
    const data = load();
    const removedDocs = data.steps.find(s => s.id === id)?.documents.map(d => d.id) || [];
    data.steps = data.steps.filter(s => s.id !== id);
    // Nettoyer la progression de tous les employés
    Object.keys(data.progress).forEach(empId => {
      removedDocs.forEach(docId => delete data.progress[empId][docId]);
    });
    save(data);
  },

  moveStep(id, direction) {
    const data = load();
    const idx = data.steps.findIndex(s => s.id === id);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= data.steps.length) return;
    [data.steps[idx], data.steps[target]] = [data.steps[target], data.steps[idx]];
    save(data);
  },

  /* ---------- Documents ---------- */

  addDocument(stepId, { name, url }) {
    const data = load();
    const step = data.steps.find(s => s.id === stepId);
    if (!step) return;
    step.documents.push({ id: uid(), name: name.trim(), url: url.trim() });
    save(data);
  },

  updateDocument(stepId, docId, { name, url }) {
    const data = load();
    const step = data.steps.find(s => s.id === stepId);
    const doc = step?.documents.find(d => d.id === docId);
    if (!doc) return;
    if (name !== undefined) doc.name = name.trim();
    if (url !== undefined) doc.url = url.trim();
    save(data);
  },

  removeDocument(stepId, docId) {
    const data = load();
    const step = data.steps.find(s => s.id === stepId);
    if (!step) return;
    step.documents = step.documents.filter(d => d.id !== docId);
    Object.keys(data.progress).forEach(empId => delete data.progress[empId][docId]);
    save(data);
  },

  /* ---------- Progression ---------- */

  getProgress(employeeId) {
    return load().progress[employeeId] || {};
  },

  setDocChecked(employeeId, docId, checked) {
    const data = load();
    if (!data.progress[employeeId]) data.progress[employeeId] = {};
    if (checked) data.progress[employeeId][docId] = true;
    else delete data.progress[employeeId][docId];
    save(data);
  },

  resetProgress(employeeId) {
    const data = load();
    data.progress[employeeId] = {};
    save(data);
  },

  /* ---------- Commentaires ---------- */

  getComments(employeeId) {
    const data = load();
    return data.comments[employeeId] || { steps: {}, docs: {} };
  },

  setStepComment(employeeId, stepId, text) {
    const data = load();
    if (!data.comments[employeeId]) data.comments[employeeId] = { steps: {}, docs: {} };
    if (!data.comments[employeeId].steps) data.comments[employeeId].steps = {};
    const trimmed = (text || '').trim();
    if (trimmed) data.comments[employeeId].steps[stepId] = trimmed;
    else delete data.comments[employeeId].steps[stepId];
    save(data);
  },

  setDocComment(employeeId, docId, text) {
    const data = load();
    if (!data.comments[employeeId]) data.comments[employeeId] = { steps: {}, docs: {} };
    if (!data.comments[employeeId].docs) data.comments[employeeId].docs = {};
    const trimmed = (text || '').trim();
    if (trimmed) data.comments[employeeId].docs[docId] = trimmed;
    else delete data.comments[employeeId].docs[docId];
    save(data);
  },

  /* ---------- Stats ---------- */

  getStats(employeeId) {
    const data = load();
    const progress = data.progress[employeeId] || {};
    let totalDocs = 0;
    let doneDocs = 0;
    let completeSteps = 0;
    data.steps.forEach(step => {
      totalDocs += step.documents.length;
      const stepDoneCount = step.documents.filter(d => progress[d.id]).length;
      doneDocs += stepDoneCount;
      if (step.documents.length > 0 && stepDoneCount === step.documents.length) completeSteps++;
    });
    return {
      totalDocs, doneDocs,
      totalSteps: data.steps.length,
      completeSteps,
      percent: totalDocs ? Math.round((doneDocs / totalDocs) * 100) : 0
    };
  },

  /* ---------- Admin (mot de passe partagé) ---------- */

  checkAdminPassword(pw) { return pw === ADMIN_PASSWORD; },

  setAdminSession(active) {
    if (active) sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    else sessionStorage.removeItem(ADMIN_SESSION_KEY);
  },

  isAdminAuthenticated() {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
  },

  /* ---------- Export / import (sauvegarde) ---------- */

  exportJSON() {
    return JSON.stringify(load(), null, 2);
  },

  importJSON(json) {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.employees || !parsed.steps) throw new Error('Format invalide');
      save(parsed);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    load(); // recharge les valeurs par défaut
  }
};

/* ---------- Toast helper (utilisable partout) ---------- */

function showToast(message) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- Helpers HTML ---------- */

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

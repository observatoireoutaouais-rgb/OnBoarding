/* =========================================================
   ODO Onboarding — Couche de données (Firebase Firestore)
   =========================================================
   Architecture :
   - Firestore stocke un seul document : /app/data
   - Au démarrage, on charge ce document dans un cache local
   - L'UI lit toujours depuis le cache (synchrone)
   - Toute modification est écrite en Firestore puis le cache
     se met à jour via le listener temps réel (onSnapshot)
   - Plusieurs utilisateurs voient les mêmes données en direct

   Schéma du document :
   {
     employees: [{ id, name }],
     steps: [{ id, title, description, documents: [{id, name, url}] }],
     progress: { [employeeId]: { [docId]: true } },
     comments: { [employeeId]: { steps: {...}, docs: {...} } }
   }
   ========================================================= */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

/* =========================================================
   ⚙️ CONFIGURATION FIREBASE
   ---------------------------------------------------------
   Remplace les valeurs ci-dessous par celles de TON projet
   Firebase. Tu trouveras ces infos dans la console Firebase :
   Project settings → General → "Your apps" → SDK setup
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyDAT4mXAU5gbQdEZ6oJMiIvkPIvpvWlYbQ",
  authDomain: "onboarding-4d099.firebaseapp.com",
  projectId: "onboarding-4d099",
  storageBucket: "onboarding-4d099.firebasestorage.app",
  messagingSenderId: "142033753111",
  appId: "1:142033753111:web:5e5ef83bff842d36097852"
};

const ADMIN_PASSWORD = 'odo2026';   // ← change-moi avant la mise en production
const ADMIN_SESSION_KEY = 'odo_admin_session';
const DOC_PATH = ['app', 'data'];   // collection "app", document "data"

const AVATAR_COLORS = ['#A3B0E0', '#FDCA44', '#F36C12', '#CEDD88', '#49ABA7', '#177FC4'];

/* ---------- Initialisation Firebase ---------- */

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const dataDocRef = doc(db, DOC_PATH[0], DOC_PATH[1]);

/* ---------- Cache local (synchrone) ---------- */

let cache = null;       // null = pas encore chargé
let isReady = false;
const readyCallbacks = [];
const changeCallbacks = [];

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
      }
    ],
    progress: {},
    comments: {}
  };
}

/* ---------- Utilitaires ---------- */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getInitials(name) {
  return name.trim().split(/\s+/).map(p => p[0] || '').slice(0, 2).join('').toUpperCase();
}

function colorFor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ---------- Sync Firestore ---------- */

async function persist() {
  if (!cache) return;
  try {
    await setDoc(dataDocRef, cache);
  } catch (e) {
    console.error('Erreur d\'écriture Firestore', e);
    showToast('⚠️ Erreur de sauvegarde. Vérifie ta connexion.');
  }
}

function ensureCommentsScaffold(data) {
  if (!data.comments) data.comments = {};
  return data;
}

// Écoute en temps réel : toute modification (depuis ce navigateur ou un autre)
// remplace le cache et notifie l'UI.
onSnapshot(dataDocRef, async (snap) => {
  if (snap.exists()) {
    cache = ensureCommentsScaffold(snap.data());
  } else {
    // Première utilisation : crée le document avec les valeurs par défaut
    cache = defaultData();
    await persist();
  }

  if (!isReady) {
    isReady = true;
    readyCallbacks.forEach(cb => cb());
    readyCallbacks.length = 0;
  }
  changeCallbacks.forEach(cb => cb());
}, (err) => {
  console.error('Erreur Firestore', err);
  showToast('⚠️ Connexion à la base de données impossible.');
});

/* ---------- API publique ---------- */

const Data = {
  /* Indique quand les données sont chargées pour la première fois */
  ready(callback) {
    if (isReady) callback();
    else readyCallbacks.push(callback);
  },

  /* Notifie l'UI quand les données changent (pour rafraîchir la page) */
  onChange(callback) {
    changeCallbacks.push(callback);
  },

  isReady() { return isReady; },

  getAll() { return cache; },

  /* ---------- Employés ---------- */

  getEmployees() { return cache?.employees || []; },
  getEmployee(id) { return cache?.employees.find(e => e.id === id); },

  async addEmployee(name) {
    const employee = { id: uid(), name: name.trim() };
    cache.employees.push(employee);
    await persist();
    return employee;
  },

  async removeEmployee(id) {
    cache.employees = cache.employees.filter(e => e.id !== id);
    delete cache.progress[id];
    delete cache.comments[id];
    await persist();
  },

  /* ---------- Étapes ---------- */

  getSteps() { return cache?.steps || []; },

  async addStep({ title, description }) {
    const step = { id: uid(), title: title.trim(), description: (description || '').trim(), documents: [] };
    cache.steps.push(step);
    await persist();
    return step;
  },

  async updateStep(id, { title, description }) {
    const step = cache.steps.find(s => s.id === id);
    if (!step) return;
    if (title !== undefined) step.title = title.trim();
    if (description !== undefined) step.description = description.trim();
    await persist();
  },

  async removeStep(id) {
    const removedDocs = cache.steps.find(s => s.id === id)?.documents.map(d => d.id) || [];
    cache.steps = cache.steps.filter(s => s.id !== id);
    Object.keys(cache.progress).forEach(empId => {
      removedDocs.forEach(docId => delete cache.progress[empId][docId]);
    });
    await persist();
  },

  async moveStep(id, direction) {
    const idx = cache.steps.findIndex(s => s.id === id);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= cache.steps.length) return;
    [cache.steps[idx], cache.steps[target]] = [cache.steps[target], cache.steps[idx]];
    await persist();
  },

  /* ---------- Documents ---------- */

  async addDocument(stepId, { name, url }) {
    const step = cache.steps.find(s => s.id === stepId);
    if (!step) return;
    step.documents.push({ id: uid(), name: name.trim(), url: url.trim() });
    await persist();
  },

  async updateDocument(stepId, docId, { name, url }) {
    const step = cache.steps.find(s => s.id === stepId);
    const docu = step?.documents.find(d => d.id === docId);
    if (!docu) return;
    if (name !== undefined) docu.name = name.trim();
    if (url !== undefined) docu.url = url.trim();
    await persist();
  },

  async removeDocument(stepId, docId) {
    const step = cache.steps.find(s => s.id === stepId);
    if (!step) return;
    step.documents = step.documents.filter(d => d.id !== docId);
    Object.keys(cache.progress).forEach(empId => delete cache.progress[empId][docId]);
    await persist();
  },

  /* ---------- Progression ---------- */

  getProgress(employeeId) { return cache?.progress[employeeId] || {}; },

  async setDocChecked(employeeId, docId, checked) {
    if (!cache.progress[employeeId]) cache.progress[employeeId] = {};
    if (checked) cache.progress[employeeId][docId] = true;
    else delete cache.progress[employeeId][docId];
    await persist();
  },

  async resetProgress(employeeId) {
    cache.progress[employeeId] = {};
    await persist();
  },

  /* ---------- Commentaires ---------- */

  getComments(employeeId) {
    return cache?.comments[employeeId] || { steps: {}, docs: {} };
  },

  async setStepComment(employeeId, stepId, text) {
    if (!cache.comments[employeeId]) cache.comments[employeeId] = { steps: {}, docs: {} };
    if (!cache.comments[employeeId].steps) cache.comments[employeeId].steps = {};
    const trimmed = (text || '').trim();
    if (trimmed) cache.comments[employeeId].steps[stepId] = trimmed;
    else delete cache.comments[employeeId].steps[stepId];
    await persist();
  },

  async setDocComment(employeeId, docId, text) {
    if (!cache.comments[employeeId]) cache.comments[employeeId] = { steps: {}, docs: {} };
    if (!cache.comments[employeeId].docs) cache.comments[employeeId].docs = {};
    const trimmed = (text || '').trim();
    if (trimmed) cache.comments[employeeId].docs[docId] = trimmed;
    else delete cache.comments[employeeId].docs[docId];
    await persist();
  },

  /* ---------- Stats ---------- */

  getStats(employeeId) {
    if (!cache) return { totalDocs: 0, doneDocs: 0, totalSteps: 0, completeSteps: 0, percent: 0 };
    const progress = cache.progress[employeeId] || {};
    let totalDocs = 0, doneDocs = 0, completeSteps = 0;
    cache.steps.forEach(step => {
      totalDocs += step.documents.length;
      const stepDoneCount = step.documents.filter(d => progress[d.id]).length;
      doneDocs += stepDoneCount;
      if (step.documents.length > 0 && stepDoneCount === step.documents.length) completeSteps++;
    });
    return {
      totalDocs, doneDocs,
      totalSteps: cache.steps.length,
      completeSteps,
      percent: totalDocs ? Math.round((doneDocs / totalDocs) * 100) : 0
    };
  },

  /* ---------- Admin ---------- */

  checkAdminPassword(pw) { return pw === ADMIN_PASSWORD; },

  setAdminSession(active) {
    if (active) sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    else sessionStorage.removeItem(ADMIN_SESSION_KEY);
  },

  isAdminAuthenticated() {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
  },

  /* ---------- Export / import ---------- */

  exportJSON() {
    return JSON.stringify(cache, null, 2);
  },

  async importJSON(json) {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.employees || !parsed.steps) throw new Error('Format invalide');
      if (!parsed.progress) parsed.progress = {};
      if (!parsed.comments) parsed.comments = {};
      cache = parsed;
      await persist();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  async resetAll() {
    cache = defaultData();
    await persist();
  }
};

/* ---------- Helpers globaux (utilisés par les pages) ---------- */

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

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

/* Exposer en global pour que les autres scripts (non-modules) y accèdent */
window.Data = Data;
window.showToast = showToast;
window.escapeHtml = escapeHtml;
window.getInitials = getInitials;
window.colorFor = colorFor;

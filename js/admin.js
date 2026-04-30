/* Admin — gestion complète (version Firebase) */

(function () {
  /* ---------- Auth ---------- */

  const loginView = document.getElementById('login-view');
  const adminView = document.getElementById('admin-view');
  const passwordInput = document.getElementById('password-input');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');

  function showAdmin() {
    loginView.style.display = 'none';
    adminView.style.display = 'block';
    logoutBtn.style.display = 'inline-flex';
    renderAll();
  }

  function showLogin() {
    loginView.style.display = 'block';
    adminView.style.display = 'none';
    logoutBtn.style.display = 'none';
  }

  function tryLogin() {
    const pw = passwordInput.value;
    if (Data.checkAdminPassword(pw)) {
      Data.setAdminSession(true);
      passwordInput.value = '';
      loginError.style.display = 'none';
      showAdmin();
    } else {
      loginError.style.display = 'block';
    }
  }

  loginBtn.addEventListener('click', tryLogin);
  passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
  logoutBtn.addEventListener('click', () => {
    Data.setAdminSession(false);
    showLogin();
  });

  /* ---------- Onglets ---------- */

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  /* ---------- Modale ---------- */

  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalEl = document.getElementById('modal');

  function openModal(html) {
    modalEl.innerHTML = html;
    modalBackdrop.classList.add('active');
  }

  function closeModal() {
    modalBackdrop.classList.remove('active');
    modalEl.innerHTML = '';
  }

  modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* ---------- Render employés ---------- */

  function renderEmployees() {
    const list = document.getElementById('employees-list');
    const employees = Data.getEmployees();

    if (employees.length === 0) {
      list.innerHTML = `<p class="empty-state">Aucun employé. Ajoute le premier !</p>`;
      return;
    }

    list.innerHTML = employees.map(emp => {
      const stats = Data.getStats(emp.id);
      const comments = Data.getComments(emp.id);
      const commentCount =
        Object.keys(comments.steps || {}).length +
        Object.keys(comments.docs  || {}).length;
      return `
        <div class="admin-row">
          <span class="employee-avatar" style="background:${colorFor(emp.id)};">${escapeHtml(getInitials(emp.name))}</span>
          <div class="admin-row-name">
            ${escapeHtml(emp.name)}
            <div class="admin-row-meta">${stats.percent} % complété — ${stats.doneDocs} / ${stats.totalDocs} docs${commentCount ? ` · ${commentCount} commentaire${commentCount > 1 ? 's' : ''}` : ''}</div>
          </div>
          <button class="icon-btn" data-action="comments" data-id="${escapeHtml(emp.id)}" title="Voir les commentaires" ${commentCount === 0 ? 'style="opacity:0.25;"' : ''}>💬</button>
          <button class="icon-btn" data-action="reset" data-id="${escapeHtml(emp.id)}" title="Réinitialiser sa progression">⟲</button>
          <button class="icon-btn" data-action="delete" data-id="${escapeHtml(emp.id)}" title="Supprimer">✕</button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const emp = Data.getEmployee(id);
        if (!emp) return;

        if (action === 'reset') {
          if (confirm(`Réinitialiser la progression de ${emp.name} ?`)) {
            await Data.resetProgress(id);
            showToast('Progression réinitialisée');
          }
        } else if (action === 'delete') {
          if (confirm(`Supprimer ${emp.name} ? Sa progression sera perdue.`)) {
            await Data.removeEmployee(id);
            showToast('Employé supprimé');
          }
        } else if (action === 'comments') {
          openCommentsModal(emp);
        }
      });
    });
  }

  function openCommentsModal(emp) {
    const comments = Data.getComments(emp.id);
    const steps = Data.getSteps();
    const stepCommentEntries = [];
    const docCommentEntries = [];

    steps.forEach(step => {
      const stepComment = comments.steps?.[step.id];
      if (stepComment) stepCommentEntries.push({ stepTitle: step.title, text: stepComment });
      step.documents.forEach(doc => {
        const docComment = comments.docs?.[doc.id];
        if (docComment) docCommentEntries.push({ stepTitle: step.title, docName: doc.name, text: docComment });
      });
    });

    const totalComments = stepCommentEntries.length + docCommentEntries.length;

    const stepHtml = stepCommentEntries.length === 0 ? '' : `
      <h4 style="font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--odo-ink); opacity: 0.6; margin: 1.25rem 0 0.75rem;">Commentaires sur les étapes</h4>
      ${stepCommentEntries.map(c => `
        <div class="admin-comment-block">
          <div class="admin-comment-meta">📋 ${escapeHtml(c.stepTitle)}</div>
          <div class="admin-comment-text">${escapeHtml(c.text)}</div>
        </div>
      `).join('')}
    `;

    const docHtml = docCommentEntries.length === 0 ? '' : `
      <h4 style="font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--odo-ink); opacity: 0.6; margin: 1.25rem 0 0.75rem;">Commentaires sur les documents</h4>
      ${docCommentEntries.map(c => `
        <div class="admin-comment-block">
          <div class="admin-comment-meta">📄 ${escapeHtml(c.docName)} <span style="opacity: 0.55;">— ${escapeHtml(c.stepTitle)}</span></div>
          <div class="admin-comment-text">${escapeHtml(c.text)}</div>
        </div>
      `).join('')}
    `;

    openModal(`
      <h3>Commentaires de ${escapeHtml(emp.name)}</h3>
      ${totalComments === 0
        ? `<p style="opacity: 0.65; font-style: italic;">Aucun commentaire pour l'instant.</p>`
        : stepHtml + docHtml}
      <div class="modal-actions">
        <button class="btn btn-primary btn-sm" id="close-comments">Fermer</button>
      </div>
    `);
    document.getElementById('close-comments').addEventListener('click', closeModal);
  }

  document.getElementById('add-employee-btn').addEventListener('click', () => {
    openModal(`
      <h3>Ajouter un employé</h3>
      <div class="field">
        <label for="emp-name">Nom complet</label>
        <input id="emp-name" class="input" placeholder="Ex. : Marie Tremblay" autofocus>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="cancel-emp">Annuler</button>
        <button class="btn btn-primary btn-sm" id="save-emp">Ajouter</button>
      </div>
    `);
    document.getElementById('cancel-emp').addEventListener('click', closeModal);
    const save = async () => {
      const name = document.getElementById('emp-name').value.trim();
      if (!name) return;
      await Data.addEmployee(name);
      closeModal();
      showToast('Employé ajouté');
    };
    document.getElementById('save-emp').addEventListener('click', save);
    document.getElementById('emp-name').addEventListener('keydown', e => {
      if (e.key === 'Enter') save();
    });
  });

  /* ---------- Render étapes ---------- */

  function renderSteps() {
    const host = document.getElementById('steps-list');
    const steps = Data.getSteps();

    if (steps.length === 0) {
      host.innerHTML = `<p class="empty-state">Aucune étape. Ajoute la première !</p>`;
      return;
    }

    host.innerHTML = steps.map((step, idx) => `
      <div class="step-admin">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
          <div style="flex: 1;">
            <h4>${escapeHtml(step.title)}</h4>
            ${step.description ? `<p style="font-size: 0.88rem; opacity: 0.7; margin: 0 0 0.5rem;">${escapeHtml(step.description)}</p>` : ''}
          </div>
          <div style="display: flex; gap: 0.25rem; flex-shrink: 0;">
            <button class="icon-btn" data-step-action="up" data-id="${escapeHtml(step.id)}" ${idx === 0 ? 'disabled style="opacity:0.2;cursor:not-allowed;"' : ''} title="Monter">▲</button>
            <button class="icon-btn" data-step-action="down" data-id="${escapeHtml(step.id)}" ${idx === steps.length - 1 ? 'disabled style="opacity:0.2;cursor:not-allowed;"' : ''} title="Descendre">▼</button>
            <button class="icon-btn" data-step-action="edit" data-id="${escapeHtml(step.id)}" title="Modifier">✎</button>
            <button class="icon-btn" data-step-action="delete" data-id="${escapeHtml(step.id)}" title="Supprimer">✕</button>
          </div>
        </div>

        <div style="margin-top: 0.75rem;">
          ${step.documents.length === 0
            ? `<p style="font-size: 0.85rem; opacity: 0.55; margin: 0;">Aucun document.</p>`
            : step.documents.map(doc => `
              <div class="doc-admin-row">
                <span class="doc-admin-name">${escapeHtml(doc.name)}</span>
                <span class="doc-admin-url">${escapeHtml(doc.url)}</span>
                <button class="icon-btn" data-doc-action="edit" data-step="${escapeHtml(step.id)}" data-doc="${escapeHtml(doc.id)}" title="Modifier">✎</button>
                <button class="icon-btn" data-doc-action="delete" data-step="${escapeHtml(step.id)}" data-doc="${escapeHtml(doc.id)}" title="Supprimer">✕</button>
              </div>
            `).join('')}
          <button class="btn btn-ghost btn-sm" data-add-doc="${escapeHtml(step.id)}" style="margin-top: 0.6rem;">+ Ajouter un document</button>
        </div>
      </div>
    `).join('');

    host.querySelectorAll('[data-step-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.stepAction;
        const id = btn.dataset.id;
        const step = Data.getSteps().find(s => s.id === id);
        if (!step) return;

        if (action === 'up')   { await Data.moveStep(id, -1); }
        else if (action === 'down') { await Data.moveStep(id, 1); }
        else if (action === 'delete') {
          if (confirm(`Supprimer l'étape "${step.title}" et tous ses documents ?`)) {
            await Data.removeStep(id);
            showToast('Étape supprimée');
          }
        }
        else if (action === 'edit') openStepModal(step);
      });
    });

    host.querySelectorAll('[data-doc-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.docAction;
        const stepId = btn.dataset.step;
        const docId = btn.dataset.doc;
        const step = Data.getSteps().find(s => s.id === stepId);
        const doc = step?.documents.find(d => d.id === docId);
        if (!doc) return;

        if (action === 'delete') {
          if (confirm(`Supprimer "${doc.name}" ?`)) {
            await Data.removeDocument(stepId, docId);
            showToast('Document supprimé');
          }
        } else if (action === 'edit') openDocModal(stepId, doc);
      });
    });

    host.querySelectorAll('[data-add-doc]').forEach(btn => {
      btn.addEventListener('click', () => openDocModal(btn.dataset.addDoc, null));
    });
  }

  function openStepModal(step) {
    const isEdit = !!step;
    openModal(`
      <h3>${isEdit ? 'Modifier l\'étape' : 'Nouvelle étape'}</h3>
      <div class="field">
        <label for="step-title">Titre</label>
        <input id="step-title" class="input" placeholder="Ex. : Documents administratifs" value="${escapeHtml(step?.title || '')}" autofocus>
      </div>
      <div class="field">
        <label for="step-desc">Description (optionnel)</label>
        <textarea id="step-desc" class="textarea" placeholder="Brève description de cette étape...">${escapeHtml(step?.description || '')}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="cancel-step">Annuler</button>
        <button class="btn btn-primary btn-sm" id="save-step">${isEdit ? 'Enregistrer' : 'Ajouter'}</button>
      </div>
    `);
    document.getElementById('cancel-step').addEventListener('click', closeModal);
    document.getElementById('save-step').addEventListener('click', async () => {
      const title = document.getElementById('step-title').value.trim();
      const desc = document.getElementById('step-desc').value.trim();
      if (!title) return;
      if (isEdit) await Data.updateStep(step.id, { title, description: desc });
      else await Data.addStep({ title, description: desc });
      closeModal();
      showToast(isEdit ? 'Étape modifiée' : 'Étape ajoutée');
    });
  }

  function openDocModal(stepId, doc) {
    const isEdit = !!doc;
    openModal(`
      <h3>${isEdit ? 'Modifier le document' : 'Nouveau document'}</h3>
      <div class="field">
        <label for="doc-name">Nom du document</label>
        <input id="doc-name" class="input" placeholder="Ex. : Politique de confidentialité" value="${escapeHtml(doc?.name || '')}" autofocus>
      </div>
      <div class="field">
        <label for="doc-url">Lien (URL)</label>
        <input id="doc-url" class="input" placeholder="https://drive.google.com/..." value="${escapeHtml(doc?.url || '')}">
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="cancel-doc">Annuler</button>
        <button class="btn btn-primary btn-sm" id="save-doc">${isEdit ? 'Enregistrer' : 'Ajouter'}</button>
      </div>
    `);
    document.getElementById('cancel-doc').addEventListener('click', closeModal);
    document.getElementById('save-doc').addEventListener('click', async () => {
      const name = document.getElementById('doc-name').value.trim();
      const url = document.getElementById('doc-url').value.trim();
      if (!name || !url) return;
      if (isEdit) await Data.updateDocument(stepId, doc.id, { name, url });
      else await Data.addDocument(stepId, { name, url });
      closeModal();
      showToast(isEdit ? 'Document modifié' : 'Document ajouté');
    });
  }

  document.getElementById('add-step-btn').addEventListener('click', () => openStepModal(null));

  /* ---------- Sauvegarde ---------- */

  document.getElementById('export-btn').addEventListener('click', () => {
    const json = Data.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = `odo-onboarding-${date}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Export téléchargé');
  });

  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (!confirm('Cela remplacera toutes les données actuelles dans Firebase. Continuer ?')) return;
      const ok = await Data.importJSON(reader.result);
      if (ok) showToast('Importation réussie');
      else alert('Fichier invalide.');
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('reset-btn').addEventListener('click', async () => {
    if (confirm('Effacer TOUTES les données dans Firebase (employés, étapes, progression, commentaires) ?\nCette action est irréversible.')) {
      await Data.resetAll();
      showToast('Données réinitialisées');
    }
  });

  function renderStats() {
    const data = Data.getAll();
    if (!data) return;
    const totalEmployees = data.employees.length;
    const totalSteps = data.steps.length;
    const totalDocs = data.steps.reduce((acc, s) => acc + s.documents.length, 0);

    document.getElementById('global-stats').innerHTML = `
      <div>Employés enregistrés : <strong>${totalEmployees}</strong></div>
      <div>Étapes du parcours : <strong>${totalSteps}</strong></div>
      <div>Documents au total : <strong>${totalDocs}</strong></div>
    `;
  }

  function renderAll() {
    renderEmployees();
    renderSteps();
    renderStats();
  }

  /* ---------- Démarrage ---------- */

  function start() {
    if (!window.Data) { setTimeout(start, 50); return; }
    Data.ready(() => {
      if (Data.isAdminAuthenticated()) showAdmin();
      else showLogin();

      Data.onChange(() => {
        if (Data.isAdminAuthenticated()) renderAll();
      });
    });
  }
  start();
})();

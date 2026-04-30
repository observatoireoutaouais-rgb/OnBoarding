/* Page parcours employé */

(function () {
  const employeeId = sessionStorage.getItem('odo_current_employee');

  if (!employeeId) {
    window.location.href = 'index.html';
    return;
  }

  const employee = Data.getEmployee(employeeId);
  if (!employee) {
    sessionStorage.removeItem('odo_current_employee');
    window.location.href = 'index.html';
    return;
  }

  const greeting   = document.getElementById('employee-greeting');
  const title      = document.getElementById('employee-title');
  const stepsHost  = document.getElementById('steps-container');
  const progressText    = document.getElementById('progress-text');
  const progressPercent = document.getElementById('progress-percent');
  const progressFill    = document.getElementById('progress-fill');
  const allDone   = document.getElementById('all-done');

  greeting.textContent = `Bonjour ${employee.name.split(' ')[0]}`;
  title.textContent = 'Ton parcours d\'intégration';

  // Petit utilitaire : debounce pour ne pas sauvegarder à chaque frappe
  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function render() {
    const steps = Data.getSteps();
    const progress = Data.getProgress(employeeId);
    const comments = Data.getComments(employeeId);
    const stats = Data.getStats(employeeId);

    progressText.textContent = `${stats.doneDocs} sur ${stats.totalDocs} documents complétés`;
    progressPercent.textContent = `${stats.percent} %`;
    progressFill.style.width = `${stats.percent}%`;

    if (steps.length === 0) {
      stepsHost.innerHTML = `
        <div class="card" style="text-align: center;">
          <p style="opacity: 0.7;">Aucune étape n'a encore été configurée.</p>
        </div>
      `;
      return;
    }

    stepsHost.innerHTML = steps.map(step => {
      const docs = step.documents;
      const doneCount = docs.filter(d => progress[d.id]).length;
      const totalCount = docs.length;
      const isComplete = totalCount > 0 && doneCount === totalCount;
      const stepPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
      const stepComment = comments.steps[step.id] || '';

      const stepProgressHtml = totalCount > 0 ? `
        <div class="step-progress">
          <div class="step-progress-meta">
            <span>${doneCount} / ${totalCount} documents</span>
            <span>${stepPercent} %</span>
          </div>
          <div class="step-progress-bar">
            <div class="step-progress-fill" style="width: ${stepPercent}%;"></div>
          </div>
        </div>
      ` : '';

      const docsHtml = docs.length === 0
        ? `<p style="opacity: 0.55; font-size: 0.9rem; font-style: italic; margin: 0;">Aucun document dans cette étape.</p>`
        : `<ul class="doc-list">${docs.map(doc => {
            const docComment = comments.docs[doc.id] || '';
            const hasComment = docComment.length > 0;
            return `
            <li class="doc-item-wrap">
              <div class="doc-item">
                <input type="checkbox"
                       class="doc-checkbox"
                       id="doc-${escapeHtml(doc.id)}"
                       data-doc-id="${escapeHtml(doc.id)}"
                       ${progress[doc.id] ? 'checked' : ''}>
                <a class="doc-link"
                   href="${escapeHtml(doc.url)}"
                   target="_blank"
                   rel="noopener noreferrer">${escapeHtml(doc.name)}</a>
                <button class="comment-toggle ${hasComment ? 'has-comment' : ''}"
                        data-toggle-doc="${escapeHtml(doc.id)}"
                        title="${hasComment ? 'Voir / modifier ton commentaire' : 'Ajouter un commentaire'}">
                  💬${hasComment ? '<span class="comment-dot"></span>' : ''}
                </button>
              </div>
              <div class="comment-box" id="comment-doc-${escapeHtml(doc.id)}" ${hasComment ? '' : 'hidden'}>
                <textarea class="comment-textarea"
                          data-doc-comment="${escapeHtml(doc.id)}"
                          placeholder="Ton commentaire sur ce document (visible par l'admin)…">${escapeHtml(docComment)}</textarea>
                <div class="comment-saved" data-saved-doc="${escapeHtml(doc.id)}"></div>
              </div>
            </li>
          `;}).join('')}</ul>`;

      const badge = totalCount > 0
        ? (isComplete
            ? `<span class="step-badge">✓ Complété</span>`
            : `<span class="step-badge" style="background: rgba(29,41,55,0.06); color: var(--odo-ink);">${doneCount} / ${totalCount}</span>`)
        : '';

      const stepCommentHasText = stepComment.length > 0;

      return `
        <article class="step ${isComplete ? 'complete' : ''}">
          <div class="step-header">
            <h2 class="step-title">${escapeHtml(step.title)}</h2>
            ${badge}
          </div>
          ${step.description ? `<p class="step-desc">${escapeHtml(step.description)}</p>` : ''}
          ${stepProgressHtml}
          ${docsHtml}

          <div class="step-comment-section">
            <button class="step-comment-toggle ${stepCommentHasText ? 'has-comment' : ''}"
                    data-toggle-step="${escapeHtml(step.id)}">
              💬 ${stepCommentHasText ? 'Modifier ton commentaire sur cette étape' : 'Ajouter un commentaire sur cette étape'}
            </button>
            <div class="comment-box" id="comment-step-${escapeHtml(step.id)}" ${stepCommentHasText ? '' : 'hidden'}>
              <textarea class="comment-textarea"
                        data-step-comment="${escapeHtml(step.id)}"
                        placeholder="Ton commentaire sur cette étape (visible par l'admin)…">${escapeHtml(stepComment)}</textarea>
              <div class="comment-saved" data-saved-step="${escapeHtml(step.id)}"></div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Brancher les checkboxes
    stepsHost.querySelectorAll('.doc-checkbox').forEach(box => {
      box.addEventListener('change', () => {
        Data.setDocChecked(employeeId, box.dataset.docId, box.checked);
        render();
      });
    });

    // Toggle des commentaires de document
    stepsHost.querySelectorAll('[data-toggle-doc]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.toggleDoc;
        const box = document.getElementById(`comment-doc-${id}`);
        if (!box) return;
        const wasHidden = box.hasAttribute('hidden');
        if (wasHidden) {
          box.removeAttribute('hidden');
          box.querySelector('textarea')?.focus();
        } else {
          box.setAttribute('hidden', '');
        }
      });
    });

    // Toggle des commentaires d'étape
    stepsHost.querySelectorAll('[data-toggle-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.toggleStep;
        const box = document.getElementById(`comment-step-${id}`);
        if (!box) return;
        const wasHidden = box.hasAttribute('hidden');
        if (wasHidden) {
          box.removeAttribute('hidden');
          box.querySelector('textarea')?.focus();
        } else {
          box.setAttribute('hidden', '');
        }
      });
    });

    // Sauvegarde auto des commentaires (debounced)
    const saveDocComment = debounce((docId, value, savedEl) => {
      Data.setDocComment(employeeId, docId, value);
      flashSaved(savedEl);
      const toggleBtn = document.querySelector(`[data-toggle-doc="${CSS.escape(docId)}"]`);
      if (toggleBtn) {
        if (value.trim()) toggleBtn.classList.add('has-comment');
        else toggleBtn.classList.remove('has-comment');
      }
    }, 400);

    const saveStepComment = debounce((stepId, value, savedEl) => {
      Data.setStepComment(employeeId, stepId, value);
      flashSaved(savedEl);
      const toggleBtn = document.querySelector(`[data-toggle-step="${CSS.escape(stepId)}"]`);
      if (toggleBtn) {
        if (value.trim()) toggleBtn.classList.add('has-comment');
        else toggleBtn.classList.remove('has-comment');
      }
    }, 400);

    stepsHost.querySelectorAll('[data-doc-comment]').forEach(ta => {
      const docId = ta.dataset.docComment;
      const savedEl = stepsHost.querySelector(`[data-saved-doc="${CSS.escape(docId)}"]`);
      ta.addEventListener('input', () => saveDocComment(docId, ta.value, savedEl));
    });

    stepsHost.querySelectorAll('[data-step-comment]').forEach(ta => {
      const stepId = ta.dataset.stepComment;
      const savedEl = stepsHost.querySelector(`[data-saved-step="${CSS.escape(stepId)}"]`);
      ta.addEventListener('input', () => saveStepComment(stepId, ta.value, savedEl));
    });

    // Message final
    if (stats.totalDocs > 0 && stats.doneDocs === stats.totalDocs) {
      allDone.style.display = 'block';
    } else {
      allDone.style.display = 'none';
    }
  }

  function flashSaved(el) {
    if (!el) return;
    el.textContent = '✓ Enregistré';
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 1500);
  }

  render();
})();

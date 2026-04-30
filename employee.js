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

  function render() {
    const steps = Data.getSteps();
    const progress = Data.getProgress(employeeId);
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
      const isComplete = docs.length > 0 && doneCount === docs.length;

      const docsHtml = docs.length === 0
        ? `<p style="opacity: 0.55; font-size: 0.9rem; font-style: italic; margin: 0;">Aucun document dans cette étape.</p>`
        : `<ul class="doc-list">${docs.map(doc => `
            <li class="doc-item">
              <input type="checkbox"
                     class="doc-checkbox"
                     id="doc-${escapeHtml(doc.id)}"
                     data-doc-id="${escapeHtml(doc.id)}"
                     ${progress[doc.id] ? 'checked' : ''}>
              <a class="doc-link"
                 href="${escapeHtml(doc.url)}"
                 target="_blank"
                 rel="noopener noreferrer">${escapeHtml(doc.name)}</a>
            </li>
          `).join('')}</ul>`;

      const badge = docs.length > 0
        ? (isComplete
            ? `<span class="step-badge">✓ Complété</span>`
            : `<span class="step-badge" style="background: rgba(29,41,55,0.06); color: var(--odo-ink);">${doneCount} / ${docs.length}</span>`)
        : '';

      return `
        <article class="step ${isComplete ? 'complete' : ''}">
          <div class="step-header">
            <h2 class="step-title">${escapeHtml(step.title)}</h2>
            ${badge}
          </div>
          ${step.description ? `<p class="step-desc">${escapeHtml(step.description)}</p>` : ''}
          ${docsHtml}
        </article>
      `;
    }).join('');

    // Brancher les checkboxes
    stepsHost.querySelectorAll('.doc-checkbox').forEach(box => {
      box.addEventListener('change', e => {
        Data.setDocChecked(employeeId, box.dataset.docId, box.checked);
        render();
      });
    });

    // Message final
    if (stats.totalDocs > 0 && stats.doneDocs === stats.totalDocs) {
      allDone.style.display = 'block';
    } else {
      allDone.style.display = 'none';
    }
  }

  render();
})();

/* Page d'accueil — sélection de l'employé */

(function () {
  const grid    = document.getElementById('employee-grid');
  const empty   = document.getElementById('empty-state');
  const loading = document.getElementById('loading-state');

  function render() {
    const employees = Data.getEmployees();

    loading.style.display = 'none';

    if (employees.length === 0) {
      grid.style.display = 'none';
      empty.style.display = 'block';
      return;
    }

    grid.style.display = 'grid';
    empty.style.display = 'none';

    grid.innerHTML = employees.map(emp => {
      const initials = getInitials(emp.name);
      const color = colorFor(emp.id);
      return `
        <button class="employee-card" data-id="${escapeHtml(emp.id)}">
          <span class="employee-avatar" style="background:${color};">${escapeHtml(initials)}</span>
          <span class="employee-name">${escapeHtml(emp.name)}</span>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.employee-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        sessionStorage.setItem('odo_current_employee', id);
        window.location.href = 'employee.html';
      });
    });
  }

  // Attend que Firebase ait chargé les données initiales
  function start() {
    if (!window.Data) { setTimeout(start, 50); return; }
    Data.ready(() => {
      render();
      Data.onChange(render);
    });
  }
  start();
})();

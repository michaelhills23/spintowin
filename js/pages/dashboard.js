/**
 * Dashboard Page Logic
 * Displays user's wheels with CRUD operations
 */
document.addEventListener('DOMContentLoaded', async () => {
  const authService = window.authService;
  const wheelService = window.wheelService;

  // DOM elements
  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  const wheelsGrid = document.getElementById('wheels-grid');
  const createWheelBtn = document.getElementById('create-wheel-btn');
  const createFirstBtn = document.getElementById('create-first-btn');
  const signoutBtn = document.getElementById('signout-btn');
  const userName = document.getElementById('user-name');
  const deleteModal = document.getElementById('delete-modal');
  const deleteWheelName = document.getElementById('delete-wheel-name');
  const cancelDelete = document.getElementById('cancel-delete');
  const confirmDelete = document.getElementById('confirm-delete');

  let currentUser = null;
  let wheelToDelete = null;

  // Require authentication
  try {
    currentUser = await authService.requireAuth();
    userName.textContent = currentUser.displayName || currentUser.email;
  } catch (e) {
    return; // Redirect handled by requireAuth
  }

  // Load wheels
  async function loadWheels() {
    loading.classList.remove('hidden');
    emptyState.classList.add('hidden');
    wheelsGrid.classList.add('hidden');

    try {
      const wheels = await wheelService.getUserWheels(currentUser.uid);

      loading.classList.add('hidden');

      if (wheels.length === 0) {
        emptyState.classList.remove('hidden');
      } else {
        wheelsGrid.classList.remove('hidden');
        renderWheels(wheels);
      }
    } catch (error) {
      console.error('Failed to load wheels:', error);
      loading.classList.add('hidden');
      window.toast.error('Failed to load wheels');
    }
  }

  // Render wheels grid
  function renderWheels(wheels) {
    wheelsGrid.innerHTML = wheels.map(wheel => `
      <div class="wheel-card" data-id="${wheel.id}">
        <div class="wheel-preview">
          <canvas class="wheel-thumb" width="180" height="180" data-segments='${JSON.stringify(wheel.segments)}'></canvas>
        </div>
        <div class="wheel-info">
          <h3>${escapeHtml(wheel.name)}</h3>
          <p>${wheel.segments.length} segments | ${wheel.stats?.totalSpins || 0} spins</p>
        </div>
        <div class="wheel-actions">
          <a href="wheel.html?id=${wheel.id}" class="btn btn-primary">Edit</a>
          <a href="spin.html?w=${wheel.shareId}" class="btn btn-secondary" target="_blank">Spin</a>
          <button class="btn btn-icon delete-wheel" data-id="${wheel.id}" data-name="${escapeHtml(wheel.name)}">X</button>
        </div>
      </div>
    `).join('');

    // Render wheel thumbnails
    wheelsGrid.querySelectorAll('.wheel-thumb').forEach(canvas => {
      try {
        const segments = JSON.parse(canvas.dataset.segments);
        const wheelCanvas = new WheelCanvas(canvas, { size: 180 });
        wheelCanvas.setSegments(segments).render();
      } catch (e) {
        console.warn('Failed to render wheel thumbnail:', e);
      }
    });

    // Attach delete handlers
    wheelsGrid.querySelectorAll('.delete-wheel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        wheelToDelete = {
          id: btn.dataset.id,
          name: btn.dataset.name
        };
        deleteWheelName.textContent = wheelToDelete.name;
        deleteModal.classList.remove('hidden');
      });
    });
  }

  // Escape HTML
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Create new wheel
  async function createWheel() {
    createWheelBtn.disabled = true;
    if (createFirstBtn) createFirstBtn.disabled = true;

    try {
      const wheel = await wheelService.createWheel({ name: 'New Wheel' });
      window.location.href = `wheel.html?id=${wheel.id}`;
    } catch (error) {
      console.error('Failed to create wheel:', error);
      window.toast.error('Failed to create wheel');
      createWheelBtn.disabled = false;
      if (createFirstBtn) createFirstBtn.disabled = false;
    }
  }

  // Delete wheel
  async function deleteWheel() {
    if (!wheelToDelete) return;

    confirmDelete.disabled = true;
    confirmDelete.textContent = 'Deleting...';

    try {
      await wheelService.deleteWheel(wheelToDelete.id);
      window.toast.success('Wheel deleted');
      closeDeleteModal();
      loadWheels();
    } catch (error) {
      console.error('Failed to delete wheel:', error);
      window.toast.error('Failed to delete wheel');
    } finally {
      confirmDelete.disabled = false;
      confirmDelete.textContent = 'Delete';
    }
  }

  // Close delete modal
  function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    wheelToDelete = null;
  }

  // Event listeners
  createWheelBtn.addEventListener('click', createWheel);
  if (createFirstBtn) {
    createFirstBtn.addEventListener('click', createWheel);
  }

  signoutBtn.addEventListener('click', async () => {
    await authService.signOut();
    window.location.href = 'index.html';
  });

  cancelDelete.addEventListener('click', closeDeleteModal);
  confirmDelete.addEventListener('click', deleteWheel);

  deleteModal.querySelector('.modal-backdrop').addEventListener('click', closeDeleteModal);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !deleteModal.classList.contains('hidden')) {
      closeDeleteModal();
    }
  });

  // Initialize
  loadWheels();
});

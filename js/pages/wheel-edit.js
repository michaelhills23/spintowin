/**
 * Wheel Edit Page Logic
 * Full wheel editor with segments, settings, sharing, and analytics
 */
document.addEventListener('DOMContentLoaded', async () => {
  const authService = window.authService;
  const wheelService = window.wheelService;
  const analyticsService = window.analyticsService;
  const shareService = window.shareService;

  // Get wheel ID from URL
  const params = new URLSearchParams(window.location.search);
  const wheelId = params.get('id');

  if (!wheelId) {
    window.location.href = 'app.html';
    return;
  }

  // Require authentication
  let currentUser;
  try {
    currentUser = await authService.requireAuth();
  } catch (e) {
    return;
  }

  // DOM elements
  const saveBtn = document.getElementById('save-btn');
  const wheelCanvas = document.getElementById('wheel-canvas');
  const testSpinBtn = document.getElementById('test-spin-btn');
  const wheelNameInput = document.getElementById('wheel-name');
  const segmentsList = document.getElementById('segments-list');
  const addSegmentBtn = document.getElementById('add-segment-btn');

  // Settings elements
  const spinDurationInput = document.getElementById('spin-duration');
  const minRotationsInput = document.getElementById('min-rotations');
  const maxRotationsInput = document.getElementById('max-rotations');
  const borderColorInput = document.getElementById('border-color');
  const fontSizeInput = document.getElementById('font-size');

  // Share elements
  const visibilitySelect = document.getElementById('visibility');
  const allowAnonymousCheckbox = document.getElementById('allow-anonymous');
  const shareUrlSection = document.getElementById('share-url-section');
  const shareUrlInput = document.getElementById('share-url');
  const copyUrlBtn = document.getElementById('copy-url-btn');
  const openSpinLink = document.getElementById('open-spin-link');

  // Analytics elements
  const totalSpinsEl = document.getElementById('total-spins');
  const uniqueSpinnersEl = document.getElementById('unique-spinners');
  const distributionChart = document.getElementById('distribution-chart');
  const recentSpinsEl = document.getElementById('recent-spins');

  // Modal elements
  const segmentModal = document.getElementById('segment-modal');
  const segmentModalTitle = document.getElementById('segment-modal-title');
  const segmentLabelInput = document.getElementById('segment-label');
  const segmentColorInput = document.getElementById('segment-color');
  const segmentWeightInput = document.getElementById('segment-weight');
  const cancelSegmentBtn = document.getElementById('cancel-segment');
  const saveSegmentBtn = document.getElementById('save-segment');

  // Tab elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // State
  let wheel = null;
  let wheelCanvasObj = null;
  let wheelSpinner = null;
  let isDirty = false;
  let editingSegmentId = null;

  // Initialize wheel canvas
  wheelCanvasObj = new WheelCanvas(wheelCanvas, { size: 500 });
  wheelSpinner = new WheelSpinner(wheelCanvasObj);

  // Load wheel data
  async function loadWheel() {
    try {
      wheel = await wheelService.getWheel(wheelId);

      // Check ownership
      if (wheel.ownerId !== currentUser.uid) {
        window.toast.error('You do not have permission to edit this wheel');
        window.location.href = 'app.html';
        return;
      }

      // Update UI
      wheelNameInput.value = wheel.name;
      renderWheel();
      renderSegmentsList();
      updateSettings();
      updateShareSection();

      // Load analytics
      loadAnalytics();

    } catch (error) {
      console.error('Failed to load wheel:', error);
      window.toast.error('Failed to load wheel');
      window.location.href = 'app.html';
    }
  }

  // Render wheel on canvas
  function renderWheel() {
    wheelCanvasObj
      .setSegments(wheel.segments)
      .setOptions({
        borderColor: wheel.appearance?.borderColor || '#333333',
        fontSize: wheel.appearance?.fontSize || 14
      })
      .render();
  }

  // Render segments list
  function renderSegmentsList() {
    segmentsList.innerHTML = wheel.segments.map((segment, index) => `
      <div class="segment-item" data-id="${segment.id}">
        <div class="segment-color" style="background: ${segment.color}"></div>
        <span class="segment-label">${escapeHtml(segment.label)}</span>
        <span class="segment-weight">${segment.weight}x</span>
        <div class="segment-actions">
          <button class="edit-btn" data-id="${segment.id}">Edit</button>
          <button class="delete-btn" data-id="${segment.id}" ${wheel.segments.length <= 2 ? 'disabled' : ''}>Del</button>
        </div>
      </div>
    `).join('');

    // Attach handlers
    segmentsList.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openSegmentModal(btn.dataset.id));
    });

    segmentsList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteSegment(btn.dataset.id));
    });
  }

  // Update settings UI
  function updateSettings() {
    spinDurationInput.value = (wheel.spinConfig?.duration || 5000) / 1000;
    minRotationsInput.value = wheel.spinConfig?.minRotations || 5;
    maxRotationsInput.value = wheel.spinConfig?.maxRotations || 10;
    borderColorInput.value = wheel.appearance?.borderColor || '#333333';
    fontSizeInput.value = wheel.appearance?.fontSize || 14;
  }

  // Update share section
  function updateShareSection() {
    visibilitySelect.value = wheel.visibility || 'private';
    allowAnonymousCheckbox.checked = wheel.allowAnonymousSpins !== false;

    if (wheel.visibility !== 'private') {
      shareUrlSection.classList.remove('hidden');
      const shareUrl = shareService.getShareUrl(wheel.shareId);
      shareUrlInput.value = shareUrl;
      openSpinLink.href = shareUrl;
    } else {
      shareUrlSection.classList.add('hidden');
    }
  }

  // Load analytics
  async function loadAnalytics() {
    try {
      // Get stats from wheel
      totalSpinsEl.textContent = wheel.stats?.totalSpins || 0;
      uniqueSpinnersEl.textContent = wheel.stats?.uniqueSpinners || 0;

      // Get analytics data
      const analytics = await analyticsService.getAnalytics(wheelId);
      const distribution = analyticsService.calculateDistribution(analytics, wheel.segments);

      // Render distribution chart
      renderDistributionChart(distribution);

      // Get recent spins
      const spins = await analyticsService.getSpinHistory(wheelId, { limit: 10 });
      renderRecentSpins(spins);

    } catch (error) {
      console.warn('Failed to load analytics:', error);
    }
  }

  // Render distribution chart
  function renderDistributionChart(distribution) {
    const maxCount = Math.max(...distribution.map(d => d.count), 1);

    distributionChart.innerHTML = distribution.map(item => `
      <div class="distribution-bar">
        <span class="bar-label">${escapeHtml(item.label)}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${(item.count / maxCount) * 100}%; background: ${item.color}"></div>
        </div>
        <span class="bar-value">${item.percentage}%</span>
      </div>
    `).join('');
  }

  // Render recent spins
  function renderRecentSpins(spins) {
    if (spins.length === 0) {
      recentSpinsEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.875rem;">No spins yet</p>';
      return;
    }

    recentSpinsEl.innerHTML = spins.map(spin => {
      const segment = wheel.segments.find(s => s.id === spin.resultSegmentId);
      return `
        <div class="recent-spin-item">
          <div class="recent-spin-result">
            <div class="recent-spin-color" style="background: ${segment?.color || '#666'}"></div>
            <span>${escapeHtml(spin.resultLabel)}</span>
          </div>
          <span class="recent-spin-time">${analyticsService.formatRelativeTime(spin.timestamp)}</span>
        </div>
      `;
    }).join('');
  }

  // Mark as dirty
  function markDirty() {
    isDirty = true;
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save*';
  }

  // Save wheel
  async function saveWheel() {
    if (!isDirty) return;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      // Collect settings
      wheel.name = wheelNameInput.value.trim() || 'Untitled Wheel';
      wheel.spinConfig = {
        duration: parseInt(spinDurationInput.value) * 1000,
        minRotations: parseInt(minRotationsInput.value),
        maxRotations: parseInt(maxRotationsInput.value),
        easing: 'easeOutCubic'
      };
      wheel.appearance = {
        ...wheel.appearance,
        borderColor: borderColorInput.value,
        fontSize: parseInt(fontSizeInput.value)
      };
      wheel.visibility = visibilitySelect.value;
      wheel.allowAnonymousSpins = allowAnonymousCheckbox.checked;

      await wheelService.updateWheel(wheelId, {
        name: wheel.name,
        segments: wheel.segments,
        spinConfig: wheel.spinConfig,
        appearance: wheel.appearance,
        visibility: wheel.visibility,
        allowAnonymousSpins: wheel.allowAnonymousSpins
      });

      isDirty = false;
      saveBtn.textContent = 'Saved!';
      setTimeout(() => {
        saveBtn.textContent = 'Save';
      }, 2000);

      updateShareSection();
      window.toast.success('Wheel saved');

    } catch (error) {
      console.error('Failed to save wheel:', error);
      window.toast.error('Failed to save wheel');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save*';
    }
  }

  // Open segment modal
  function openSegmentModal(segmentId = null) {
    editingSegmentId = segmentId;

    if (segmentId) {
      const segment = wheel.segments.find(s => s.id === segmentId);
      segmentModalTitle.textContent = 'Edit Segment';
      segmentLabelInput.value = segment.label;
      segmentColorInput.value = segment.color;
      segmentWeightInput.value = segment.weight;
    } else {
      segmentModalTitle.textContent = 'Add Segment';
      segmentLabelInput.value = '';
      segmentColorInput.value = getRandomColor();
      segmentWeightInput.value = 1;
    }

    segmentModal.classList.remove('hidden');
    segmentLabelInput.focus();
  }

  // Close segment modal
  function closeSegmentModal() {
    segmentModal.classList.add('hidden');
    editingSegmentId = null;
  }

  // Save segment
  function saveSegment() {
    const label = segmentLabelInput.value.trim();
    const color = segmentColorInput.value;
    const weight = parseInt(segmentWeightInput.value) || 1;

    if (!label) {
      window.toast.error('Label is required');
      segmentLabelInput.focus();
      return;
    }

    if (editingSegmentId) {
      // Update existing
      const index = wheel.segments.findIndex(s => s.id === editingSegmentId);
      if (index !== -1) {
        wheel.segments[index] = { ...wheel.segments[index], label, color, weight };
      }
    } else {
      // Add new
      wheel.segments.push({
        id: 'seg_' + Math.random().toString(36).substr(2, 9),
        label,
        color,
        weight
      });
    }

    renderWheel();
    renderSegmentsList();
    markDirty();
    closeSegmentModal();
  }

  // Delete segment
  function deleteSegment(segmentId) {
    if (wheel.segments.length <= 2) {
      window.toast.warning('Wheel must have at least 2 segments');
      return;
    }

    wheel.segments = wheel.segments.filter(s => s.id !== segmentId);
    renderWheel();
    renderSegmentsList();
    markDirty();
  }

  // Get random color
  function getRandomColor() {
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#7CFC00', '#FF6B6B'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Escape HTML
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.add('hidden'));

      btn.classList.add('active');
      document.getElementById(`${tab}-tab`).classList.remove('hidden');

      if (tab === 'analytics') {
        loadAnalytics();
      }
    });
  });

  // Event listeners
  saveBtn.addEventListener('click', saveWheel);

  wheelNameInput.addEventListener('input', markDirty);

  addSegmentBtn.addEventListener('click', () => openSegmentModal());

  cancelSegmentBtn.addEventListener('click', closeSegmentModal);
  saveSegmentBtn.addEventListener('click', saveSegment);
  segmentModal.querySelector('.modal-backdrop').addEventListener('click', closeSegmentModal);

  // Settings change handlers
  [spinDurationInput, minRotationsInput, maxRotationsInput, borderColorInput, fontSizeInput]
    .forEach(input => input.addEventListener('change', () => {
      markDirty();
      if (input === borderColorInput || input === fontSizeInput) {
        renderWheel();
      }
    }));

  // Share settings handlers
  visibilitySelect.addEventListener('change', markDirty);
  allowAnonymousCheckbox.addEventListener('change', markDirty);

  copyUrlBtn.addEventListener('click', async () => {
    const success = await shareService.copyToClipboard(shareUrlInput.value);
    if (success) {
      window.toast.success('URL copied!');
      copyUrlBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyUrlBtn.textContent = 'Copy';
      }, 2000);
    }
  });

  // Test spin
  testSpinBtn.addEventListener('click', async () => {
    if (wheelSpinner.isSpinning) return;

    testSpinBtn.disabled = true;
    testSpinBtn.textContent = '...';

    wheelSpinner.setOptions({
      duration: parseInt(spinDurationInput.value) * 1000,
      minRotations: parseInt(minRotationsInput.value),
      maxRotations: parseInt(maxRotationsInput.value)
    });

    const result = await wheelSpinner.spin();

    testSpinBtn.disabled = false;
    testSpinBtn.textContent = 'SPIN';

    if (result && result.segment) {
      window.toast.success(`Result: ${result.segment.label}`);
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !segmentModal.classList.contains('hidden')) {
      closeSegmentModal();
    }
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveWheel();
    }
  });

  // Warn before leaving with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Initialize
  loadWheel();
});

/**
 * Public Spin Page Logic
 * Handles the shareable public spin page
 */
document.addEventListener('DOMContentLoaded', async () => {
  const wheelService = window.wheelService;
  const analyticsService = window.analyticsService;

  // Get share ID from URL
  const params = new URLSearchParams(window.location.search);
  const shareId = params.get('w');
  const isEmbed = params.get('embed') === 'true';

  // DOM elements
  const loading = document.getElementById('loading');
  const errorState = document.getElementById('error-state');
  const spinContent = document.getElementById('spin-content');
  const wheelTitle = document.getElementById('wheel-title');
  const wheelCanvas = document.getElementById('wheel-canvas');
  const spinBtn = document.getElementById('spin-btn');
  const resultDisplay = document.getElementById('result-display');
  const resultText = document.getElementById('result-text');
  const spinAgainBtn = document.getElementById('spin-again-btn');
  const recentList = document.getElementById('recent-list');
  const resultModal = document.getElementById('result-modal');
  const modalResult = document.getElementById('modal-result');
  const closeResultBtn = document.getElementById('close-result');

  if (!shareId) {
    showError();
    return;
  }

  // Hide header in embed mode
  if (isEmbed) {
    document.querySelector('.header').style.display = 'none';
    document.body.style.paddingTop = '0';
  }

  let wheel = null;
  let wheelCanvasObj = null;
  let wheelSpinner = null;
  let recentResults = [];

  // Show error state
  function showError() {
    loading.classList.add('hidden');
    errorState.classList.remove('hidden');
    spinContent.classList.add('hidden');
  }

  // Load wheel
  async function loadWheel() {
    try {
      wheel = await wheelService.getWheelByShareId(shareId);

      // Check visibility
      if (wheel.visibility === 'private') {
        const user = firebase.auth().currentUser;
        if (!user || user.uid !== wheel.ownerId) {
          showError();
          return;
        }
      }

      // Initialize UI
      loading.classList.add('hidden');
      spinContent.classList.remove('hidden');

      wheelTitle.textContent = wheel.name;
      document.title = `${wheel.name} - SpinToWin`;

      // Initialize wheel
      wheelCanvasObj = new WheelCanvas(wheelCanvas, { size: 500 });
      wheelCanvasObj.setSegments(wheel.segments).render();

      wheelSpinner = new WheelSpinner(wheelCanvasObj, wheel.spinConfig || {});

      // Load recent spins
      await loadRecentSpins();

    } catch (error) {
      console.error('Failed to load wheel:', error);
      showError();
    }
  }

  // Load recent spins
  async function loadRecentSpins() {
    try {
      const spins = await analyticsService.getSpinHistory(wheel.id, { limit: 5 });

      recentResults = spins.map(spin => {
        const segment = wheel.segments.find(s => s.id === spin.resultSegmentId);
        return {
          label: spin.resultLabel,
          color: segment?.color || '#666',
          time: spin.timestamp
        };
      });

      renderRecentResults();
    } catch (error) {
      console.warn('Failed to load recent spins:', error);
    }
  }

  // Render recent results
  function renderRecentResults() {
    if (recentResults.length === 0) {
      recentList.innerHTML = '<div class="recent-item" style="color: var(--text-muted);">No spins yet. Be the first!</div>';
      return;
    }

    recentList.innerHTML = recentResults.map(result => `
      <div class="recent-item">
        <div class="recent-color" style="background: ${result.color}"></div>
        <span>${escapeHtml(result.label)}</span>
      </div>
    `).join('');
  }

  // Spin the wheel
  async function spin() {
    if (wheelSpinner.isSpinning) return;

    // Check if anonymous spins allowed
    const user = firebase.auth().currentUser;
    if (!wheel.allowAnonymousSpins && !user) {
      window.toast.warning('Sign in to spin this wheel');
      return;
    }

    spinBtn.disabled = true;
    spinBtn.textContent = '...';
    resultDisplay.classList.add('hidden');

    try {
      const result = await wheelSpinner.spin();

      if (result && result.segment) {
        // Record spin
        try {
          await analyticsService.recordSpin(wheel.id, {
            segmentId: result.segment.id,
            label: result.segment.label,
            duration: result.duration,
            angle: result.finalAngle,
            totalSegments: wheel.segments.length
          });
        } catch (e) {
          console.warn('Failed to record spin:', e);
        }

        // Show result
        showResult(result.segment);

        // Add to recent
        recentResults.unshift({
          label: result.segment.label,
          color: result.segment.color,
          time: new Date()
        });
        if (recentResults.length > 5) {
          recentResults.pop();
        }
        renderRecentResults();
      }

    } catch (error) {
      console.error('Spin failed:', error);
      window.toast.error('Spin failed');
    }

    spinBtn.disabled = false;
    spinBtn.textContent = 'SPIN';
  }

  // Show result
  function showResult(segment) {
    resultText.textContent = segment.label;
    resultText.style.color = segment.color;
    resultDisplay.classList.remove('hidden');

    // Show modal with confetti effect
    modalResult.textContent = segment.label;
    modalResult.style.color = segment.color;
    resultModal.classList.remove('hidden');

    // Simple confetti
    createConfetti();
  }

  // Hide result modal
  function hideResultModal() {
    resultModal.classList.add('hidden');
  }

  // Simple confetti effect
  function createConfetti() {
    const confettiContainer = document.getElementById('result-confetti');
    confettiContainer.innerHTML = '';

    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: absolute;
        width: 10px;
        height: 10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}%;
        top: -10px;
        transform: rotate(${Math.random() * 360}deg);
        animation: fall ${1 + Math.random() * 2}s linear forwards;
      `;
      confettiContainer.appendChild(confetti);
    }

    // Add animation keyframes if not exists
    if (!document.getElementById('confetti-styles')) {
      const style = document.createElement('style');
      style.id = 'confetti-styles';
      style.textContent = `
        @keyframes fall {
          to {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }
        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 300px;
          overflow: hidden;
          pointer-events: none;
        }
      `;
      document.head.appendChild(style);
    }

    // Clean up after animation
    setTimeout(() => {
      confettiContainer.innerHTML = '';
    }, 3000);
  }

  // Escape HTML
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Event listeners
  spinBtn.addEventListener('click', spin);
  spinAgainBtn.addEventListener('click', () => {
    resultDisplay.classList.add('hidden');
  });
  closeResultBtn.addEventListener('click', hideResultModal);
  resultModal.querySelector('.modal-backdrop').addEventListener('click', hideResultModal);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      if (!resultModal.classList.contains('hidden')) {
        hideResultModal();
      } else {
        spin();
      }
      e.preventDefault();
    }
    if (e.key === 'Escape' && !resultModal.classList.contains('hidden')) {
      hideResultModal();
    }
  });

  // Initialize
  loadWheel();
});

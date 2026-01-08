/**
 * Toast Notification Component
 * Shows temporary notifications to the user
 */
class Toast {
  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a toast message
   */
  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    this.container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);

    return toast;
  }

  /**
   * Show success toast
   */
  success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  /**
   * Show error toast
   */
  error(message, duration = 4000) {
    return this.show(message, 'error', duration);
  }

  /**
   * Show info toast
   */
  info(message, duration = 3000) {
    return this.show(message, 'info', duration);
  }

  /**
   * Show warning toast
   */
  warning(message, duration = 3500) {
    return this.show(message, 'warning', duration);
  }
}

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Export singleton
window.toast = new Toast();

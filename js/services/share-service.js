/**
 * Share Service
 * Handles URL generation and sharing functionality
 */
class ShareService {
  constructor() {
    this.db = window.firebaseDb || firebase.firestore();
  }

  /**
   * Get base URL for the application
   */
  getBaseUrl() {
    const { protocol, host, pathname } = window.location;
    // Remove the current page from pathname
    const basePath = pathname.substring(0, pathname.lastIndexOf('/'));
    return `${protocol}//${host}${basePath}`;
  }

  /**
   * Get share URL for a wheel
   */
  getShareUrl(shareId) {
    return `${this.getBaseUrl()}/spin.html?w=${shareId}`;
  }

  /**
   * Get edit URL for a wheel
   */
  getEditUrl(wheelId) {
    return `${this.getBaseUrl()}/wheel.html?id=${wheelId}`;
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        return true;
      } catch (e) {
        return false;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }

  /**
   * Generate embed code
   */
  getEmbedCode(shareId, options = {}) {
    const url = this.getShareUrl(shareId);
    const width = options.width || 500;
    const height = options.height || 600;

    return `<iframe
  src="${url}&embed=true"
  width="${width}"
  height="${height}"
  frameborder="0"
  allow="autoplay"
></iframe>`;
  }

  /**
   * Share using Web Share API (mobile)
   */
  async shareNative(title, text, url) {
    if (!navigator.share) {
      return false;
    }

    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
      return false;
    }
  }

  /**
   * Update wheel visibility settings
   */
  async updateVisibility(wheelId, visibility, allowAnonymousSpins) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Must be authenticated');

    await this.db.collection('wheels').doc(wheelId).update({
      visibility: visibility,
      allowAnonymousSpins: allowAnonymousSpins,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

// Export singleton
window.shareService = new ShareService();

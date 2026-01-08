/**
 * Authentication Service
 * Handles user authentication with Firebase Auth
 */
class AuthService {
  constructor() {
    this.auth = window.firebaseAuth || firebase.auth();
    this.db = window.firebaseDb || firebase.firestore();
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.auth.currentUser;
  }

  /**
   * Sign up with email/password
   */
  async signUp(email, password, displayName) {
    const credential = await this.auth.createUserWithEmailAndPassword(email, password);

    // Update profile with display name
    if (displayName) {
      await credential.user.updateProfile({ displayName });
    }

    // Create user document in Firestore
    await this.db.collection('users').doc(credential.user.uid).set({
      uid: credential.user.uid,
      email: email,
      displayName: displayName || null,
      photoURL: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      settings: {
        defaultSpinDuration: 5000,
        soundEnabled: true,
        theme: 'system'
      },
      stats: {
        totalWheels: 0,
        totalSpins: 0
      }
    });

    return credential.user;
  }

  /**
   * Sign in with email/password
   */
  async signIn(email, password) {
    const credential = await this.auth.signInWithEmailAndPassword(email, password);
    return credential.user;
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const credential = await this.auth.signInWithPopup(provider);

    // Check if new user, create document if so
    const userDoc = await this.db.collection('users').doc(credential.user.uid).get();
    if (!userDoc.exists) {
      await this.db.collection('users').doc(credential.user.uid).set({
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: credential.user.displayName,
        photoURL: credential.user.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        settings: {
          defaultSpinDuration: 5000,
          soundEnabled: true,
          theme: 'system'
        },
        stats: {
          totalWheels: 0,
          totalSpins: 0
        }
      });
    }

    return credential.user;
  }

  /**
   * Sign out
   */
  async signOut() {
    await this.auth.signOut();
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email) {
    await this.auth.sendPasswordResetEmail(email);
  }

  /**
   * Listen for auth state changes
   */
  onAuthStateChanged(callback) {
    return this.auth.onAuthStateChanged(callback);
  }

  /**
   * Require authentication - redirect to login if not authenticated
   */
  requireAuth(redirectUrl = 'login.html') {
    return new Promise((resolve) => {
      const unsubscribe = this.auth.onAuthStateChanged((user) => {
        unsubscribe();
        if (!user) {
          window.location.href = redirectUrl;
        } else {
          resolve(user);
        }
      });
    });
  }
}

// Export singleton
window.authService = new AuthService();

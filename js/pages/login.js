/**
 * Login Page Logic
 * Handles sign in, sign up, and password reset
 */
document.addEventListener('DOMContentLoaded', () => {
  const authService = window.authService;

  // DOM elements
  const authForm = document.getElementById('auth-form');
  const authTitle = document.getElementById('auth-title');
  const authSubmit = document.getElementById('auth-submit');
  const nameField = document.getElementById('name-field');
  const displayNameInput = document.getElementById('display-name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const googleSignIn = document.getElementById('google-signin');
  const switchMode = document.getElementById('switch-mode');
  const switchText = document.getElementById('switch-text');
  const forgotPassword = document.getElementById('forgot-password');
  const forgotLink = document.getElementById('forgot-link');
  const errorMessage = document.getElementById('error-message');

  // State
  let isSignUp = new URLSearchParams(window.location.search).get('signup') === 'true';

  // Check if already logged in
  authService.onAuthStateChanged(user => {
    if (user) {
      window.location.href = 'app.html';
    }
  });

  // Update UI based on mode
  function updateUI() {
    if (isSignUp) {
      authTitle.textContent = 'Sign Up';
      authSubmit.textContent = 'Create Account';
      nameField.classList.remove('hidden');
      displayNameInput.required = true;
      switchText.textContent = 'Already have an account?';
      switchMode.textContent = 'Sign in';
      forgotPassword.classList.add('hidden');
    } else {
      authTitle.textContent = 'Sign In';
      authSubmit.textContent = 'Sign In';
      nameField.classList.add('hidden');
      displayNameInput.required = false;
      switchText.textContent = "Don't have an account?";
      switchMode.textContent = 'Sign up';
      forgotPassword.classList.remove('hidden');
    }
    hideError();
  }

  // Show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
  }

  // Hide error message
  function hideError() {
    errorMessage.classList.add('hidden');
  }

  // Handle form submit
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const displayName = displayNameInput.value.trim();

    authSubmit.disabled = true;
    authSubmit.textContent = isSignUp ? 'Creating...' : 'Signing in...';

    try {
      if (isSignUp) {
        await authService.signUp(email, password, displayName);
      } else {
        await authService.signIn(email, password);
      }
      // Redirect happens automatically via onAuthStateChanged
    } catch (error) {
      let message = 'An error occurred. Please try again.';

      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'This email is already registered. Try signing in.';
          break;
        case 'auth/weak-password':
          message = 'Password must be at least 6 characters.';
          break;
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Invalid email or password.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many attempts. Please try again later.';
          break;
      }

      showError(message);
      authSubmit.disabled = false;
      updateUI();
    }
  });

  // Handle Google sign in
  googleSignIn.addEventListener('click', async () => {
    hideError();
    googleSignIn.disabled = true;

    try {
      await authService.signInWithGoogle();
      // Redirect happens automatically
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        showError('Google sign in failed. Please try again.');
      }
      googleSignIn.disabled = false;
    }
  });

  // Handle mode switch
  switchMode.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUp = !isSignUp;
    updateUI();

    // Update URL without reload
    const url = new URL(window.location);
    if (isSignUp) {
      url.searchParams.set('signup', 'true');
    } else {
      url.searchParams.delete('signup');
    }
    window.history.replaceState({}, '', url);
  });

  // Handle forgot password
  forgotLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    if (!email) {
      showError('Please enter your email address first.');
      emailInput.focus();
      return;
    }

    try {
      await authService.sendPasswordReset(email);
      showError('Password reset email sent! Check your inbox.');
      errorMessage.classList.remove('error');
      errorMessage.style.borderColor = '#22c55e';
      errorMessage.style.color = '#22c55e';
      errorMessage.style.background = 'rgba(34, 197, 94, 0.1)';
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        showError('No account found with this email.');
      } else {
        showError('Failed to send reset email. Please try again.');
      }
    }
  });

  // Initialize UI
  updateUI();
});

/**
 * Firebase Configuration
 *
 * IMPORTANT: Replace these placeholder values with your actual Firebase config.
 *
 * To get your config:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project or select existing
 * 3. Click "Add app" and choose Web (</>)
 * 4. Register your app and copy the config object
 * 5. Enable Authentication (Email/Password and Google)
 * 6. Create a Firestore database
 */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if Firebase is loaded
if (typeof firebase === 'undefined') {
  console.error('Firebase SDK not loaded. Make sure to include Firebase scripts before this file.');
} else {
  // Initialize Firebase
  try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } catch (error) {
    // App already initialized
    if (error.code !== 'app/duplicate-app') {
      console.error('Firebase initialization error:', error);
    }
  }

  // Get references
  const auth = firebase.auth();
  const db = firebase.firestore();

  // Enable offline persistence (optional but recommended)
  db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not supported in this browser');
      }
    });

  // Make available globally
  window.firebaseAuth = auth;
  window.firebaseDb = db;
}

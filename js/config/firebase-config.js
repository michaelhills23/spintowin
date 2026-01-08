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
  apiKey: "AIzaSyC_XpIE98F0uisHXBZS71nkWppTHp9on8c",
  authDomain: "spintowin-20c4e.firebaseapp.com",
  projectId: "spintowin-20c4e",
  storageBucket: "spintowin-20c4e.firebasestorage.app",
  messagingSenderId: "625209568446",
  appId: "1:625209568446:web:ddbd663683701c130042ef",
  measurementId: "G-PKXELYZ5Z6"
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

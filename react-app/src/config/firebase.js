import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC_XpIE98F0uisHXBZS71nkWppTHp9on8c",
  authDomain: "spintowin-20c4e.firebaseapp.com",
  projectId: "spintowin-20c4e",
  storageBucket: "spintowin-20c4e.firebasestorage.app",
  messagingSenderId: "625209568446",
  appId: "1:625209568446:web:ddbd663683701c130042ef",
  measurementId: "G-PKXELYZ5Z6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

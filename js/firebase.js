import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBSWgrVhsgBCpjYmWZOZNFcQSPBmwQfl9g",
  authDomain: "seba-gym-tracker.firebaseapp.com",
  projectId: "seba-gym-tracker",
  storageBucket: "seba-gym-tracker.firebasestorage.app",
  messagingSenderId: "262548489404",
  appId: "1:262548489404:web:4b4445e63113d0d73e7cb9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

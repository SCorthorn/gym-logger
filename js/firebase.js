import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBSWgrVhsgBCpjYmWZOZNFcQSPBmwQfl9g",
  authDomain: "seba-gym-tracker.firebaseapp.com",
  projectId: "seba-gym-tracker",
  storageBucket: "seba-gym-tracker.firebasestorage.app",
  messagingSenderId: "262548489404",
  appId: "1:262548489404:web:4b4445e63113d0d73e7cb9"
};

const app = initializeApp(firebaseConfig);

// Offline-first: writes go to IndexedDB immediately and sync when back online.
// This prevents "Failed to save" errors on slow/restricted gym WiFi.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

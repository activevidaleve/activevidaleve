import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAEy-uJ-NNmV1h5e5Eg-JEjBWCagBfnba0",
  authDomain: "active-vida-leve.firebaseapp.com",
  projectId: "active-vida-leve",
  storageBucket: "active-vida-leve.firebasestorage.app",
  messagingSenderId: "975168478939",
  appId: "1:975168478939:web:59c3fa9f1cff5b476176fe"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

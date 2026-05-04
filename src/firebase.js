import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, FieldPath } from "firebase/firestore";
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";

// ┌─────────────────────────────────────────────┐
// │  PASTE YOUR FIREBASE CONFIG HERE            │
// │  See README.md for instructions             │
// └─────────────────────────────────────────────┘
const firebaseConfig = {
  apiKey: "AIzaSyAWnGO06VC5UDGKFhpsR83tOpXJ_y2bUfI",
  authDomain: "tracker-rasi.firebaseapp.com",
  projectId: "tracker-rasi",
  storageBucket: "tracker-rasi.firebasestorage.app",
  messagingSenderId: "628765053636",
  appId: "1:628765053636:web:e410621f17d4efeea4ef91",
  measurementId: "G-QMCM3DJEW"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export { doc, getDoc, setDoc, serverTimestamp, FieldPath, signInWithPopup, signOut, onAuthStateChanged };

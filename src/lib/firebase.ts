import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDMeg7Ihc4L0oVqyFuB1Ebej4itBawH-lM",
  authDomain: "super-bull-32d3e.firebaseapp.com",
  projectId: "super-bull-32d3e",
  storageBucket: "super-bull-32d3e.firebasestorage.app",
  messagingSenderId: "118490098233",
  appId: "1:118490098233:web:34ce28f9be0a17210abbe8",
  measurementId: "G-N86TY53MB5"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

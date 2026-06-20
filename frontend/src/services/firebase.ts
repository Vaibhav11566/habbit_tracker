import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app;
let auth: any = null;
let firebaseConfigured = false;

// Check if we have at least apiKey and projectId to attempt initialization
if (firebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId)) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
  } catch (error) {
    console.error('Firebase Client initialization failed:', error);
    firebaseConfigured = false;
  }
} else {
  console.warn(
    'Firebase client environment variables are missing. Firebase Auth will not be active; only mock login is enabled.'
  );
}

export { auth, firebaseConfigured };

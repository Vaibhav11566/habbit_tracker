import admin from 'firebase-admin';

let firebaseReady = false;

if (admin.apps.length === 0) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin initialized with service account.');
      firebaseReady = true;
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp();
      console.log('Firebase Admin initialized via GOOGLE_APPLICATION_CREDENTIALS.');
      firebaseReady = true;
    } else {
      console.warn('Warning: FIREBASE_SERVICE_ACCOUNT is missing. Firebase verification will be skipped or mocked.');
      // Initialize with a mock environment check or default
      try {
        admin.initializeApp();
        firebaseReady = true;
      } catch (err) {
        console.warn('Firebase Admin could not auto-initialize. Only mock auth will be available in development.');
      }
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
  }
} else {
  firebaseReady = true;
}

export { admin as default, firebaseReady };

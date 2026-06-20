import admin, { firebaseReady } from '../config/firebase.js';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }

    // 1. Mock Authentication Bypass for Development/Testing
    const isMockToken = token.startsWith('mock-uid-');

    if (isMockToken) {
      const firebaseUid = token; // use the token itself as the UID
      const email = `${firebaseUid}@example.com`;
      const name = firebaseUid.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

      // Find or create User in MongoDB
      let user = await User.findOne({ firebaseUid });
      if (!user) {
        user = await User.create({
          firebaseUid,
          email,
          name,
        });
        console.log(`Mock user created: ${name} (${email})`);
      }

      req.user = user;
      return next();
    }

    // 2. Standard Firebase Admin Authentication
    if (!firebaseReady) {
      return res.status(500).json({
        success: false,
        message: 'Authentication service not configured and mock mode is inactive.',
      });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const { uid: firebaseUid, email, name: decodedName } = decodedToken;

      // Find or create User in MongoDB
      let user = await User.findOne({ firebaseUid });
      if (!user) {
        user = await User.create({
          firebaseUid,
          email: email || `${firebaseUid}@noemail.com`,
          name: decodedName || email?.split('@')[0] || 'Firebase User',
        });
        console.log(`New Firebase user synced to MongoDB: ${user.name}`);
      }

      req.user = user;
      next();
    } catch (authError) {
      console.error('Firebase token verification failed:', authError.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token verification failed' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(500).json({ success: false, message: 'Server authorization error' });
  }
};

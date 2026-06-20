'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, firebaseConfigured } from '../services/firebase';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isMock?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  loginWithMock: (uid: string) => void;
  loginWithFirebase: (email: string, password: string) => Promise<void>;
  signupWithFirebase: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('habit_tracker_user');
    const storedToken = localStorage.getItem('habit_tracker_token');

    if (storedUser && storedToken) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.isMock) {
        setUser(parsedUser);
        setToken(storedToken);
        setLoading(false);
        return;
      }
    }

    if (firebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const idToken = await fbUser.getIdToken();
          const authUser: AuthUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            isMock: false,
          };
          setUser(authUser);
          setToken(idToken);
          localStorage.setItem('habit_tracker_user', JSON.stringify(authUser));
          localStorage.setItem('habit_tracker_token', idToken);
        } else {
          setUser(null);
          setToken(null);
          localStorage.removeItem('habit_tracker_user');
          localStorage.removeItem('habit_tracker_token');
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const loginWithMock = (uid: string) => {
    setLoading(true);
    const mockUid = uid.startsWith('mock-uid-') ? uid : `mock-uid-${uid}`;
    const name = mockUid
      .replace('mock-uid-', '')
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Mock User';

    const mockUser: AuthUser = {
      uid: mockUid,
      email: `${mockUid}@example.com`,
      displayName: name,
      isMock: true,
    };

    setUser(mockUser);
    setToken(mockUid); // Mock token matches mock UID
    localStorage.setItem('habit_tracker_user', JSON.stringify(mockUser));
    localStorage.setItem('habit_tracker_token', mockUid);
    setLoading(false);
  };

  const loginWithFirebase = async (email: string, password: string) => {
    if (!firebaseConfigured || !auth) {
      throw new Error('Firebase Auth is not configured. Use Mock Login instead.');
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      const idToken = await fbUser.getIdToken();
      
      const authUser: AuthUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        isMock: false,
      };

      setUser(authUser);
      setToken(idToken);
      localStorage.setItem('habit_tracker_user', JSON.stringify(authUser));
      localStorage.setItem('habit_tracker_token', idToken);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signupWithFirebase = async (email: string, password: string, name: string) => {
    if (!firebaseConfigured || !auth) {
      throw new Error('Firebase Auth is not configured. Use Mock Login instead.');
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      await updateProfile(fbUser, { displayName: name });
      
      const idToken = await fbUser.getIdToken();
      const authUser: AuthUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: name,
        isMock: false,
      };

      setUser(authUser);
      setToken(idToken);
      localStorage.setItem('habit_tracker_user', JSON.stringify(authUser));
      localStorage.setItem('habit_tracker_token', idToken);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    if (firebaseConfigured && auth && user && !user.isMock) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Firebase SignOut error:', error);
      }
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('habit_tracker_user');
    localStorage.removeItem('habit_tracker_token');
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isFirebaseConfigured: firebaseConfigured,
        loginWithMock,
        loginWithFirebase,
        signupWithFirebase,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

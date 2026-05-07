'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, Auth } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { initFirebase, getAuthInstance } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Lazy GoogleAuthProvider — only instantiated on the client.
 * Stored in a module variable so it is reused across calls.
 */
let googleProvider: GoogleAuthProvider | null = null;
function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
  }
  return googleProvider;
}

/**
 * Helper to get the Firebase Auth instance.
 * All call-sites are inside useCallback / event handlers that run
 * exclusively in the browser, so initFirebase() is already resolved
 * by the time they execute.
 */
let cachedAuth: Auth | null = null;
function getAuth(): Auth {
  if (!cachedAuth) {
    cachedAuth = getAuthInstance();
  }
  if (!cachedAuth) {
    throw new Error('Firebase Auth not initialized. Call initFirebase() first.');
  }
  return cachedAuth;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    initFirebase()
      .then(({ auth }) => {
        cachedAuth = auth;
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          setUser(firebaseUser);
          setLoading(false);
        });
      })
      .catch(() => {
        // Firebase init failed (e.g. in an environment without browser APIs).
        // Treat as signed-out — the app remains fully functional.
        setLoading(false);
      });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getAuth(), email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    await createUserWithEmailAndPassword(getAuth(), email, password);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(getAuth(), getGoogleProvider());
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getAuth());
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

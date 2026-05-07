import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDMeg7Ihc4L0oVqyFuB1Ebej4itBawH-lM",
  authDomain: "super-bull-32d3e.firebaseapp.com",
  projectId: "super-bull-32d3e",
  storageBucket: "super-bull-32d3e.firebasestorage.app",
  messagingSenderId: "118490098233",
  appId: "1:118490098233:web:34ce28f9be0a17210abbe8",
  measurementId: "G-N86TY53MB5"
};

/**
 * Lazy-initializing Firebase singleton.
 *
 * Firebase SDK references browser-only APIs (IndexedDB, XMLHttpRequest,
 * WebSocket) that do not exist in Cloudflare Workers / edge SSR.
 * Even though every consumer of this module is a 'use client' component
 * or hook, the module is still *evaluated* server-side during SSR to
 * resolve exports — which crashes the Workers runtime.
 *
 * By guarding behind `typeof window` and lazily importing the SDK only
 * on the client, we prevent any Firebase code from executing during SSR
 * while preserving identical runtime behaviour in the browser.
 */

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

async function ensureFirebase() {
  if (_app) return;

  // Dynamic import — the SDK modules are only loaded in the browser.
  const { initializeApp, getApps } = await import('firebase/app');
  const { getAuth } = await import('firebase/auth');
  const { getFirestore } = await import('firebase/firestore');

  _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  _auth = getAuth(_app);
  _db = getFirestore(_app);
}

// Synchronous accessors for existing consumers.
// These will return null during SSR (which is fine — all call-sites
// are inside useEffect / event handlers that only run in the browser).
export function getApp(): FirebaseApp | null {
  return _app;
}

export function getAuthInstance(): Auth | null {
  return _auth;
}

export function getDb(): Firestore | null {
  return _db;
}

/**
 * Call this once early in client-side lifecycle (e.g. inside a useEffect
 * in AuthProvider) to trigger the lazy Firebase bootstrap.
 * Returns the instances for convenience.
 */
export async function initFirebase(): Promise<{
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}> {
  await ensureFirebase();
  return { app: _app!, auth: _auth!, db: _db! };
}

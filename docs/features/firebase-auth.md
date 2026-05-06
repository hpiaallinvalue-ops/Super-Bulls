# Firebase Authentication

Optional user accounts for cross-device watch history sync.

---

## Overview

Super Bulls uses Firebase Authentication for **optional** user accounts. The core principle:

> **Sign-in is NEVER required for browsing content.** All features (feed, categories, video player) work without an account. Sign-in only adds watch history persistence across devices.

---

## Features

| Feature | Anonymous | Signed In |
|---|---|---|
| Browse feed | Yes | Yes |
| Watch videos | Yes | Yes |
| Category filtering | Yes | Yes |
| Trending sort | Yes | Yes |
| Local watch history | Yes (IndexedDB) | Yes (IndexedDB) |
| Cross-device history sync | No | Yes (Firestore) |
| API key storage | No | Yes (Firestore) |

---

## Supported Sign-In Methods

| Method | Implementation | Configuration |
|---|---|---|
| **Email / Password** | `createUserWithEmailAndPassword` + `signInWithEmailAndPassword` | Enable in Firebase Console → Authentication → Sign-in method |
| **Google** | `signInWithPopup` + `GoogleAuthProvider` | Enable in Firebase Console + add OAuth consent screen |

---

## Files

| File | Role |
|---|---|
| `src/lib/firebase.ts` | Firebase client initialization (app, auth, db) |
| `src/contexts/auth-context.tsx` | React context provider for auth state |
| `src/components/auth/sign-in-dialog.tsx` | Sign-in / Sign-up modal dialog |
| `src/components/auth/user-menu.tsx` | Signed-in user dropdown menu |
| `src/lib/firestore-history.ts` | Watch history CRUD in Firestore |
| `src/lib/firestore-secrets.ts` | API key storage in Firestore |

---

## Firebase Configuration

```typescript
// src/lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyDMeg7Ihc4L0oVqyFuB1Ebej4itBawH-lM",
  authDomain: "super-bull-32d3e.firebaseapp.com",
  projectId: "super-bull-32d3e",
  storageBucket: "super-bull-32d3e.firebasestorage.app",
  messagingSenderId: "118490098233",
  appId: "1:118490098233:web:34ce28f9be0a17210abbe8",
  measurementId: "G-N86TY53MB5"
};
```

The Firebase SDK is initialized as a singleton — `getApps().length === 0` check prevents re-initialization.

---

## Auth Context Provider

`AuthProvider` wraps the entire app in `layout.tsx`:

```tsx
<ThemeProvider>
  <AuthProvider>
    {children}
  </AuthProvider>
</ThemeProvider>
```

It listens to `onAuthStateChanged` and exposes:

```typescript
interface AuthContextType {
  user: User | null;              // Current Firebase user (or null)
  loading: boolean;               // True during initial auth check
  signInWithEmail(email, pw);     // Sign in with email/password
  signUpWithEmail(email, pw);     // Create new account
  signInWithGoogle();             // Sign in with Google popup
  signOut();                      // Sign out
}
```

### Loading State

`loading` starts as `true` and becomes `false` once `onAuthStateChanged` fires. During this time, the app renders normally (no auth gate or spinner) because sign-in is optional.

---

## Sign-In Dialog

`SignInDialog` is a modal (`Dialog` from shadcn/ui) with three sign-in options:

1. **Google sign-in** — One-click button at the top
2. **Sign In** tab — Email + password form
3. **Sign Up** tab — Email + password + confirm password

### Error Handling

Firebase error codes are translated to user-friendly messages:

| Firebase Error | User Message |
|---|---|
| `auth/email-already-in-use` | This email is already registered. Try signing in instead. |
| `auth/invalid-email` | Please enter a valid email address. |
| `auth/weak-password` | Password must be at least 6 characters. |
| `auth/user-not-found` | No account found with this email. |
| `auth/wrong-password` | Incorrect password. Please try again. |
| `auth/invalid-credential` | Invalid email or password. Please try again. |
| `auth/too-many-requests` | Too many attempts. Please wait a moment and try again. |
| `auth/popup-closed-by-user` | Sign-in was cancelled. |

Toast notifications (Sonner) display success and error messages.

---

## User Menu

When signed in, the header shows a dropdown menu (`UserMenu`):

```
[Avatar Initial]
  ├── Account
  │   └── user@email.com
  ├── Profile (disabled — placeholder)
  ├── API Keys
  └── Sign Out
```

The avatar shows the first letter of the user's email, styled with the brand red color.

---

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/history/{videoId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/secrets/{secretId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Key rules:
- Users can only read/write their own data (scoped by `userId`)
- No client can access another user's history or API keys
- No server-side secrets collection (would need Admin SDK)

---

## Integration with Other Features

### Watch History Sync

When a user is signed in, `use-history.ts` checks `user.uid`:
- **On load**: Fetches history from Firestore, seeds local cache if empty
- **On watch**: Saves to both local cache AND Firestore
- **On sign out**: Local cache retains data for continued browsing
- **On sign in**: Merges Firestore data with local cache

### API Key Storage

The `ApiKeysDialog` (opened from User Menu → API Keys) lets users store their YouTube API key. This is per-user in Firestore and syncs across devices.

---

## Adding New Auth Providers

To add a new provider (e.g., GitHub, Apple):

1. **Firebase Console**: Enable the provider in Authentication → Sign-in method
2. **`auth-context.tsx`**: Import and create the provider:
   ```typescript
   import { GithubAuthProvider } from 'firebase/auth';
   const githubProvider = new GithubAuthProvider();
   ```
3. **`sign-in-dialog.tsx`**: Add a sign-in button and handler
4. **Update this doc**: Add the provider to the table above

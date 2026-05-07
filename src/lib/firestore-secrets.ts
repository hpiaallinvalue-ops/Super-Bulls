import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

const SECRETS_COLLECTION = 'secrets';

function getFirestoreDb() {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized. Ensure Firebase has been bootstrapped on the client.');
  return db;
}

export async function saveApiKey(
  userId: string,
  key: string,
  value: string
): Promise<void> {
  const db = getFirestoreDb();
  const secretsRef = collection(db, 'users', userId, SECRETS_COLLECTION);
  const keyDocRef = doc(secretsRef, key);

  await setDoc(keyDocRef, {
    key,
    value,
    updatedAt: serverTimestamp(),
  });
}

export async function getApiKeys(
  userId: string
): Promise<Record<string, string>> {
  const db = getFirestoreDb();
  const secretsRef = collection(db, 'users', userId, SECRETS_COLLECTION);
  const snapshot = await getDocs(secretsRef);

  const keys: Record<string, string> = {};
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    keys[data.key] = data.value;
  });
  return keys;
}

export async function deleteApiKey(
  userId: string,
  key: string
): Promise<void> {
  const db = getFirestoreDb();
  const secretsRef = collection(db, 'users', userId, SECRETS_COLLECTION);
  const keyDocRef = doc(secretsRef, key);
  await deleteDoc(keyDocRef);
}

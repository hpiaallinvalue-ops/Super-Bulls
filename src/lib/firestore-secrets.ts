import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const SECRETS_COLLECTION = 'secrets';

export async function saveApiKey(
  userId: string,
  key: string,
  value: string
): Promise<void> {
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
  const secretsRef = collection(db, 'users', userId, SECRETS_COLLECTION);
  const keyDocRef = doc(secretsRef, key);
  await deleteDoc(keyDocRef);
}

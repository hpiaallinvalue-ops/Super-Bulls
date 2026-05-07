import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

function getFirestoreDb() {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized. Ensure Firebase has been bootstrapped on the client.');
  return db;
}

interface WatchHistoryEntry {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  publishedAt: string;
  watchedAt: Timestamp;
}

const MAX_HISTORY_ENTRIES = 100;

export async function saveWatchHistory(
  userId: string,
  video: {
    videoId: string;
    title: string;
    channelName: string;
    thumbnailUrl: string;
    publishedAt: string;
  }
): Promise<void> {
  const userHistoryRef = collection(getFirestoreDb(), 'users', userId, 'history');
  const videoDocRef = doc(userHistoryRef, video.videoId);

  await setDoc(videoDocRef, {
    videoId: video.videoId,
    title: video.title,
    channelName: video.channelName,
    thumbnailUrl: video.thumbnailUrl,
    publishedAt: video.publishedAt,
    watchedAt: serverTimestamp(),
  });
}

export async function getWatchHistory(
  userId: string
): Promise<WatchHistoryEntry[]> {
  const userHistoryRef = collection(getFirestoreDb(), 'users', userId, 'history');
  const q = query(userHistoryRef, orderBy('watchedAt', 'desc'), limit(MAX_HISTORY_ENTRIES));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data() as WatchHistoryEntry);
}

export async function clearWatchHistory(userId: string): Promise<void> {
  const userHistoryRef = collection(getFirestoreDb(), 'users', userId, 'history');
  const snapshot = await getDocs(userHistoryRef);

  if (snapshot.empty) return;

  const batch = writeBatch(getFirestoreDb());
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

export async function getWatchHistoryCount(userId: string): Promise<number> {
  const userHistoryRef = collection(getFirestoreDb(), 'users', userId, 'history');
  const snapshot = await getDocs(userHistoryRef);
  return snapshot.size;
}

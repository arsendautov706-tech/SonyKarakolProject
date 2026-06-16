// Firebase client setup (modular SDK)
// Шаги: создайте проект в Firebase, включите Authentication (Email/Password) и Firestore.
// Затем вставьте конфиг вашего проекта в переменную `firebaseConfig` ниже.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Замените значения ниже на ваши из Firebase Console → Project settings
const firebaseConfig = {
  // apiKey: "YOUR_API_KEY",
  // authDomain: "YOUR_PROJECT.firebaseapp.com",
  // projectId: "YOUR_PROJECT_ID",
  // storageBucket: "YOUR_PROJECT.appspot.com",
  // messagingSenderId: "...",
  // appId: "..."
};

export let app = null;
export let auth = null;
export let db = null;
export let storage = null;

export function initFirebase(userConfig) {
  const cfg = userConfig || firebaseConfig;
  if (!cfg || !cfg.apiKey) {
    console.warn("Firebase config not provided. Fill js/firebase-config.js with your Firebase config.");
    return null;
  }

  app = initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  return { app, auth, db, storage };
}

export async function sendBookingToFirestore(booking) {
  if (!db) throw new Error("Firestore not initialized");
  const col = collection(db, "bookings");
  const ref = await addDoc(col, booking);
  return ref.id;
}

export async function fetchBookingsFromFirestore() {
  if (!db) throw new Error("Firestore not initialized");
  const col = collection(db, "bookings");
  const snapshot = await getDocs(col);
  const items = [];
  snapshot.forEach((d) => items.push({ id: d.id, ...d.data() }));
  // sort by createdAt desc if available
  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return items;
}

export async function deleteBookingInFirestore(id) {
  if (!db) throw new Error("Firestore not initialized");
  await deleteDoc(doc(db, "bookings", id));
}

export async function getAdminRole(uid) {
  if (!db) throw new Error("Firestore not initialized");
  const d = await getDoc(doc(db, "admins", uid));
  if (!d.exists()) return null;
  const data = d.data();
  return data.role || null;
}

export async function setAdminRole(uid, role) {
  if (!db) throw new Error("Firestore not initialized");
  await setDoc(doc(db, "admins", uid), { role }, { merge: true });
}

export function signIn(email, password) {
  if (!auth) throw new Error("Auth not initialized");
  return signInWithEmailAndPassword(auth, email, password);
}

export function createUser(email, password) {
  if (!auth) throw new Error("Auth not initialized");
  return createUserWithEmailAndPassword(auth, email, password);
}

export function onAuthState(cb) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, cb);
}

export function loginWithEmail(email, password) {
  if (!auth) throw new Error("Auth not initialized");
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  if (!auth) return Promise.resolve();
  return fbSignOut(auth);
}

export async function uploadFile(path, file) {
  if (!storage) throw new Error("Storage not initialized");
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

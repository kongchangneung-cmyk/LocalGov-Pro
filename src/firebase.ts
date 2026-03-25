import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
};
export type { FirebaseUser };

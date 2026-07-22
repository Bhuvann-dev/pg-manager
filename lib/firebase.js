import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBmXIUniCG_H_I9AVuW1KADxjfZBadWSBY",
  authDomain: "pg-manager-54ff9.firebaseapp.com",
  projectId: "pg-manager-54ff9",
  storageBucket: "pg-manager-54ff9.firebasestorage.app",
  messagingSenderId: "1018381103935",
  appId: "1:1018381103935:web:095bc98cda2bf27d0b998a"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDncr-S7e5gWujutS8MfyApgGPhiyhPk3U",
  authDomain: "kpi-dashboard-8c5ec.firebaseapp.com",
  projectId: "kpi-dashboard-8c5ec",
  storageBucket: "kpi-dashboard-8c5ec.firebasestorage.app",
  messagingSenderId: "256463381012",
  appId: "1:256463381012:web:c90f3a7c80b23795977d01"
};

const app = initializeApp(firebaseConfig);

// 🔐 Firebase Auth (Email/Password)
export const auth = getAuth(app);

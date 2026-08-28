import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";

// This config is not a secret — it's designed to ship in client bundles.
// The actual security boundary is Firestore security rules plus the
// Firebase Auth authorized-domains list, not this object.
const firebaseConfig = {
	apiKey: "AIzaSyDZoAWjHTFlOEfwxc3fc_WtTKrvE9Ma_Ww",
	authDomain: "tvtime-d058b.firebaseapp.com",
	projectId: "tvtime-d058b",
	storageBucket: "tvtime-d058b.firebasestorage.app",
	messagingSenderId: "150622237379",
	appId: "1:150622237379:web:0edf4910f54dfa82c62876",
	measurementId: "G-70PYHCT6EW",
};

export const firebaseApp: FirebaseApp =
	getApps()[0] ?? initializeApp(firebaseConfig);
export const firebaseAuth: Auth = getAuth(firebaseApp);
export const firestore: Firestore = getFirestore(firebaseApp);

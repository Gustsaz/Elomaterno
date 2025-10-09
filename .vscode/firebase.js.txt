import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBZ8eQdQl8PuFVfavplQsS0Va76rvh6lgQ",
  authDomain: "elo-materno.firebaseapp.com",
  projectId: "elo-materno",
  storageBucket: "elo-materno.appspot.com",
  messagingSenderId: "35948424669",
  appId: "1:35948424669:web:17903086027fab66f11a34",
  measurementId: "G-WKDY1NMWYN"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

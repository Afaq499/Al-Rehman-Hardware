import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyBD7dZaeZmpl9VcCGx13-ydtFDY_dL03vI",
    authDomain: "al-rehman-hardware.firebaseapp.com",
    projectId: "al-rehman-hardware",
    // storageBucket: "al-rehman-hardware.firebasestorage.app",
    // messagingSenderId: "653180591658",
    // appId: "1:653180591658:web:1d70c2f5e9076bbf482d53",
    // measurementId: "G-DHKM0FPVJN"
  };

// al-rehman-hardware

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);


// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyBD7dZaeZmpl9VcCGx13-ydtFDY_dL03vI",
//   authDomain: "al-rehman-hardware.firebaseapp.com",
//   projectId: "al-rehman-hardware",
//   storageBucket: "al-rehman-hardware.firebasestorage.app",
//   messagingSenderId: "653180591658",
//   appId: "1:653180591658:web:1d70c2f5e9076bbf482d53",
//   measurementId: "G-DHKM0FPVJN"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

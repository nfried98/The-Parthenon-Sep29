// Firebase Configuration - Using same config as ref folder
const firebaseConfig = {
    apiKey: "AIzaSyCdhL0E7UobxPOhW4yYPzdxB350cCDYoCM",
    authDomain: "drachma-62a89.firebaseapp.com",
    projectId: "drachma-62a89",
    storageBucket: "drachma-62a89.firebasestorage.app",
    messagingSenderId: "886975863054",
    appId: "1:886975863054:web:47a118342c559050ce9f5f"
};

// Global variables for Firebase services
let app, auth, db;

// Initialize Firebase when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Import Firebase modules from CDN
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    // Make auth and db globally available
    window.firebaseAuth = auth;
    window.firebaseDb = db;
    
    console.log('Firebase initialized successfully');
});

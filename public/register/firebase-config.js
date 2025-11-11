// firebase-config.js - VERSIÓN MEJORADA
console.log('=== FIREBASE CONFIG ===');

const firebaseConfig = {
    apiKey: "AIzaSyADVjTLT9HP1yE3zffAxPiTSnxaXSTAoPw",
    authDomain: "mollyfast-ed975.firebaseapp.com",
    projectId: "mollyfast-ed975",
    storageBucket: "mollyfast-ed975.firebasestorage.app",
    messagingSenderId: "576053874111",
    appId: "1:576053874111:web:e6df3319f2363a52e1e50a"
};

// Inicialización con manejo de CORS
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            const app = firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase inicializado');
            
            // Configurar Auth para desarrollo
            const auth = firebase.auth();
            auth.useDeviceLanguage(); // Para emails en el idioma correcto
            
            window.auth = auth;
            console.log('🎉 Auth configurado');
        } else {
            window.auth = firebase.auth();
            console.log('🔁 Firebase ya inicializado');
        }
    } else {
        console.error('❌ Firebase SDK no cargado');
    }
} catch (error) {
    console.error('💥 Error Firebase:', error);
}
const express = require('express');
const path = require('path');
const mysql = require('mysql2'); // ← CAMBIO: mysql2 en lugar de pg
const app = express();
const PORT = 3000;

// 📊 CONEXIÓN A MYSQL CON URL EXTERNA
const connection = mysql.createConnection({
    connectionString: 'mysql://ufywen8m7kyqrwjc:1kCrbPepW8X3ggZxkRWS@bwri3movw18oiln4pb5h-mysql.services.clever-cloud.com:3306/bwri3movw18oiln4pb5h', // ← TU URL DE MYSQL AQUÍ
    ssl: {
        rejectUnauthorized: false
    }
});

// 🔌 VERIFICAR LA CONEXIÓN
connection.connect((error) => {
    if (error) {
        console.log('❌ Error conectando a MySQL:', error.message);
    } else {
        console.log('✅ Conectado a la base de datos MySQL externa');
    }
});

// Servir archivos estáticos (CSS, JS, imágenes)
app.use(express.static('public'));

// Ruta para login.html
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Ruta por defecto (redirige a login)
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}/login`);
});
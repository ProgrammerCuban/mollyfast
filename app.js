const express = require('express');
const path = require('path');
const mysql = require('mysql2'); // ← CAMBIO: mysql2 en lugar de pg
const app = express();
const PORT = 3000;

// 📊 CONEXIÓN A MYSQL CON PARÁMETROS SEPARADOS
const connection = mysql.createConnection({
    host: 'bwri3movw18oiln4pb5h-mysql.services.clever-cloud.com', // ← Ejemplo: aws.connect.psdb.cloud
    user: 'ufywen8m7kyqrwjc',                       // ← Tu usuario de MySQL
    password: '1kCrbPepW8X3ggZxkRWS',                  // ← Tu contraseña
    database: 'bwri3movw18oiln4pb5h',   // ← Nombre de la BD
    port: 3306,                              // ← Puerto de MySQL (por defecto 3306)
    ssl: {
        rejectUnauthorized: false // ← IMPORTANTE para conexiones externas
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
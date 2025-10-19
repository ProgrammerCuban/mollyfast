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

app.use(express.static('public'));

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login/login.html'));
});

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/loginsecion', (req, res) => {
    const { user, pass } = req.body;

    console.log(`usuario ${user} se esta logueando`);

    const query = 'SELECT * FROM usuarios WHERE usuario = ? AND contrasena = ?';

    connection.query(query, [user, pass], (error, results) => {   
        
        if (error != null) console.error(error);
        
        if (results.length > 0) {
            console.log("usuario correcto");
            return res.json({
                success: true,
                message: 'Usuario correcto'
            });
        } else {
            console.log("usuario incorrecto");
            return res.json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
    });
});

app.post('/desencript', (req, res) => {
    const { code } = req.body;

     const user = desencriptarSimple(code);
     return res.json({ 
                users: user, 
            });
});

app.post('/encript', (req, res) => {
    const { user } = req.body;

     const code = encriptarSimple(user);
     console.log(code);

     return res.json({ 
                coder: code, 
            });
});

app.post('/obtenerid', (req, res) => {
    const { user } = req.body;
    const query = 'SELECT * FROM usuarios WHERE usuario = ?';

    console.log(user);
    
     connection.query(query, [user], (error, results) => {
        if (results.length > 0) {
          return  res.json({ success: true, id: results[0].id});
        } else {
          return  res.json({ success: false, message: 'usuario no encontrado' });
        }
    });
});

app.get('/viajes/:id', (req, res) => {
    const id = req.params.id;
    const query = 'SELECT * FROM viajes WHERE propietario = ?';
    
    connection.query(query, [id], (error, results) => {
        if (error) {
            return res.json({ success: false, message: 'Error' });
        }
        if (results.length > 0) {
            console.log("yeeeeeeeees");
           return res.json({ success: true, viaje: results });
        } else {
            console.log("nooooooooo");
           return res.json({ success: false, message: 'Viaje no encontrado' });
        }
    });
});

// Ruta para guardar/actualizar viajes
app.post('/guardar-viaje', (req, res) => {
    const { id, propietario, precio, detalles } = req.body;
    
    // Verificar si el viaje existe
    const checkQuery = 'SELECT * FROM viajes WHERE id = ?';
    
    connection.query(checkQuery, [id], (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.json({ success: false, message: 'Error del servidor' });
        }
        
        if (results.length > 0) {
            // Actualizar viaje existente
            const updateQuery = 'UPDATE viajes SET propietario = ?, precio = ?, detalles_adicionales = ? WHERE id = ?';
            connection.query(updateQuery, [propietario, precio, detalles, id], (error) => {
                if (error) {
                    return res.json({ success: false, message: 'Error al actualizar' });
                }
                res.json({ success: true, message: 'Viaje actualizado correctamente' });
            });
        } else {
            // Insertar nuevo viaje
            const insertQuery = 'INSERT INTO viajes (propietario, precio, detalles_adicionales) VALUES (?, ?, ?)';
            connection.query(insertQuery, [propietario, precio, detalles], (error) => {
                if (error) {
                    return res.json({ success: false, message: 'Error al guardar' });
                }
                res.json({ success: true, message: 'Viaje creado correctamente' });
            });
        }
    });
});

// Ruta para eliminar viaje
app.delete('/eliminar-viaje/:id', (req, res) => {
    const idViaje = req.params.id;
    
    console.log(`🗑️ Intentando eliminar viaje ID: ${idViaje}`);
    
    const query = 'DELETE FROM viajes WHERE id = ?';
    
    connection.query(query, [idViaje], (error, results) => {
        if (error) {
            console.error('Error al eliminar viaje:', error);
            return res.json({ 
                success: false, 
                message: 'Error del servidor al eliminar el viaje' 
            });
        }
        
        if (results.affectedRows > 0) {
            console.log(`✅ Viaje ${idViaje} eliminado correctamente`);
            res.json({ 
                success: true, 
                message: 'Viaje eliminado correctamente',
                affectedRows: results.affectedRows
            });
        } else {
            console.log(`❌ Viaje ${idViaje} no encontrado`);
            res.json({ 
                success: false, 
                message: 'Viaje no encontrado' 
            });
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}/login`);
});


function encriptarSimple(texto) {
    let resultado = '';
    for (let i = 0; i < texto.length; i++) {

        resultado += String.fromCharCode(texto.charCodeAt(i) + 3);
    }
    return btoa(resultado); // Lo convierte a Base64
}

function desencriptarSimple(textoEncriptado) {
    const textoBase64 = atob(textoEncriptado);
    let resultado = '';
    for (let i = 0; i < textoBase64.length; i++) {
        // Regresa cada carácter 3 posiciones en ASCII
        resultado += String.fromCharCode(textoBase64.charCodeAt(i) - 3);
    }
    return resultado;
}
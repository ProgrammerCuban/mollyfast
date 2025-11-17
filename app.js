const express = require('express');
const path = require('path');
const mysql = require('mysql2'); 
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// 📊 CONEXIÓN A MYSQL CON PARÁMETROS SEPARADOS
const connection = mysql.createConnection({
    host: 'bwri3movw18oiln4pb5h-mysql.services.clever-cloud.com',
    user: 'ufywen8m7kyqrwjc',                    
    password: '1kCrbPepW8X3ggZxkRWS',                  
    database: 'bwri3movw18oiln4pb5h',  
    port: 3306,                              
    ssl: {
        rejectUnauthorized: false // 
    }
});

// 🗄️ CONFIGURACIÓN DE ALMACENAMIENTO DE SESIONES EN MYSQL
const sessionStore = new MySQLStore({
    createDatabaseTable: true,
    schema: {
        tableName: 'user_sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
}, connection);

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

app.use(cookieParser());
app.use(session({
    secret: 'C27PZXMv.@', 
    resave: false,
    saveUninitialized: false,
    store: sessionStore, // ¡USAMOS EL STORE PERSISTENTE!
    cookie: {
        secure: false, 
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));

function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'No autorizado - Inicia sesión primero' 
        });
    }
}

// AGREGAR ESTE ENDPOINT A TU BACKEND
app.get('/check-session', (req, res) => {
    if (req.session.userId) {
        // El usuario tiene sesión activa
        res.json({
            success: true,
            id: req.session.userId,
            name: req.session.userName,
            delivery: req.session.delivery,
            sessionData: req.session
        });
    } else {
        // No hay sesión activa
        res.json({
            success: false,
            message: 'No hay sesión activa'
        });
    }
});

app.post('/loginsecion', (req, res) => {
    const { user, pass } = req.body;

    console.log(`usuario ${user} se esta logueando`);

    const query = 'SELECT * FROM usuarios WHERE usuario = ? AND contrasena = ?';

    connection.query(query, [user, pass], (error, results) => {   
        
        if (error != null) console.error(error);
        
        if (results.length > 0) {

            req.session.userId = results[0].id;
            req.session.userName = results[0].usuario;
            req.session.delivery = results[0].delivery;
            
            console.log("usuario correcto");
            return res.json({
                success: true,
                message: 'Usuario correcto',
                delivery: results[0].delivery
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

app.get('/viajes', async (req, res) => {
        // Consulta a la tabla viajes
        const query = `
            SELECT 
                id,
                propietario,
                precio,
                detalles_adicionales,
                desde,
                hasta,
                provincia_salida,
                municipio_salida,
                provincia_llegada,
                municipio_llegada,
                fecha_salida
            FROM viajes 
        `;
      connection.query(query, (error, results) => {
        if (error) {
            return res.json({ success: false, message: 'Error en la query' });
        }
        if (results.length > 0) {
            console.log("yeeeeeeeees");
           return res.json({ success: true, viajes: results });
        } else {
            console.log("nooooooooo");
           return res.json({ success: false, message: 'Viajes no encontrado' });
        }
    });
});

// Ruta para obtener diccionario de usuarios
app.get('/usuarios-id', async (req, res) => {
 const query = `
           SELECT id, usuario FROM usuarios
        `;
      connection.query(query, (error, results) => {
        if (error) {
            return res.json({ success: false, message: 'Error en la query' });
        }
        if (results.length > 0) {
            console.log("yeeeeeeeees");
           return res.json({ success: true, usuarios: results });
        } else {
            console.log("nooooooooo");
           return res.json({ success: false, message: 'Viajes no encontrado' });
        }
    });
});

app.get('/perfil/:id', (req, res) => {
    const id = req.params.id;
    const query = 'SELECT * FROM usuarios WHERE id = ?';
    
    connection.query(query, [id], (error, results) => {
        if (error) {
            return res.json({ success: false, message: 'error de la query' });
        }
        if (results.length > 0) {
            console.log("yeeeeeeeees");
           return res.json({ success: true, perfil: results });
        } else {
            console.log("nooooooooo");
           return res.json({ success: false, message: 'no se encontraro el perfil' });
        }
    });
});


app.put('/change-username', (req, res) => {
    const { id, username } = req.body;
    
    // Validaciones básicas
    if (!id || !username) {
        return res.json({ 
            success: false, 
            message: 'ID y username son requeridos' 
        });
    }

    console.log('📝 Cambiando username:', { id, username });

    // Query para verificar si el NUEVO username ya existe en OTRO usuario
    const queryVerificar = `
        SELECT id FROM usuarios 
        WHERE usuario = ? AND id != ?
    `;

    // Query para actualizar
    const queryActualizar = `
        UPDATE usuarios 
        SET usuario = ?
        WHERE id = ?
    `;

    // 1. Primero verificar si el nuevo username ya existe
    connection.query(queryVerificar, [username, id], (error, results) => {
        if (error) {
            console.error('❌ Error en query de verificación:', error);
            return res.json({ 
                success: false, 
                message: 'Error verificando disponibilidad del username' 
            });
        }

        // Si hay resultados, significa que el username ya está en uso
        if (results.length > 0) {
            console.log('❌ Username ya en uso:', username);
            return res.json({ 
                success: false, 
                message: 'Este nombre de usuario ya está en uso, por favor intenta con otro' 
            });
        }

        // 2. Si no está en uso, proceder con la actualización
        connection.query(queryActualizar, [username, id], (error, results) => {
            if (error) {
                console.error('❌ Error en query de actualización:', error);
                return res.json({ 
                    success: false, 
                    message: 'Error al cambiar el username' 
                });
            }

            // Verificar si se actualizó algún registro
            if (results.affectedRows === 0) {
                return res.json({ 
                    success: false, 
                    message: 'Usuario no encontrado' 
                });
            }

            console.log('✅ Username cambiado exitosamente');
            return res.json({ 
                success: true, 
                message: 'Tu username ha sido cambiado con éxito',
                newUsername: username
            });
        });
    });
});

app.put('/change-password', (req, res) => {
    const { id, pass } = req.body;
    
    // Validaciones básicas
    if (!id || !pass) {
        return res.json({ 
            success: false, 
            message: 'ID y password son requeridos' 
        });
    }

    console.log('📝 Cambiando de contrasena :', { id, pass });

    // Query para actualizar
    const queryActualizar = `
        UPDATE usuarios 
        SET contrasena = ?
        WHERE id = ?
    `;


        // 2. Si no está en uso, proceder con la actualización
        connection.query(queryActualizar, [pass, id], (error, results) => {
            if (error) {
                console.error('❌ Error en query de actualización de contrasena :', error);
                return res.json({ 
                    success: false, 
                    message: 'Error al cambiar la contrasena' 
                });
            }

            // Verificar si se actualizó algún registro
            if (results.affectedRows === 0) {
                return res.json({ 
                    success: false, 
                    message: 'Usuario no encontrado' 
                });
            }

            console.log('✅ pass cambiado exitosamente');
            return res.json({ 
                success: true, 
                message: 'Tu contrasena ha sido cambiado con éxito',
            });
        });
    });

// Endpoint para actualizar foto de perfil en tu BD
app.post('/change-profile-photo', async (req, res) => {
        const { id, fotoUrl } = req.body;
        
        // Aquí tu lógica para actualizar en la base de datos
        const query = 'UPDATE usuarios SET fotoperfil = ? WHERE id = ?';
         connection.query(query, [fotoUrl, id], (error, results) => {
        if (error) {
            console.error('❌ Error en query de verificación:', error);
            return res.json({ 
                success: false, 
                message: 'Error verificando disponibilidad del username' 
            });
        }

        return res.json({
            success: true
        });
});

});


app.get('/imagekit-auth', (req, res) => {
    const ImageKit = require('imagekit');
    
    const imagekit = new ImageKit({
        publicKey: "public_4yRUn/8HyM6NpBO2uluT5n374JY=",
        privateKey: "private_KrZVMBlNMU+KuDRUG6uX2tshYRk=",
        urlEndpoint: "https://ik.imagekit.io/yosvaC"
    });
    
    const authenticationParameters = imagekit.getAuthenticationParameters();
    res.send(authenticationParameters);
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto http://localhost:${PORT}`);
});
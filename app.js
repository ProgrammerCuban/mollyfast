const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const http = require('http');
const socketIo = require('socket.io');
const router = express.Router();
const app = express();
const PORT = process.env.PORT || 3000;


const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 📊 CONEXIÓN A MYSQL CON PARÁMETROS SEPARADOS
const connection = mysql.createConnection({
    host: 'bwri3movw18oiln4pb5h-mysql.services.clever-cloud.com',
    user: 'ufywen8m7kyqrwjc',
    password: '1kCrbPepW8X3ggZxkRWS',
    database: 'bwri3movw18oiln4pb5h',
    port: 3306,
    ssl: {
        rejectUnauthorized: false
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

// ✅ MIDDLEWARES PRIMERO
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'C27PZXMv.@',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        secure: false,
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));
app.use(express.static('public'));
app.use(express.static('public/admin'));
// 🎯 RUTAS DE LA APLICACIÓN
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login/login.html'));
});

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/login/login.html'));
});



function createTransporter() {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: 'mollyfast.delivery@gmail.com',
            pass: 'cslp ihak xl ow plnv'
        },
        tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
        },
        // ⚡ CONFIGURACIÓN DE CONEXIÓN MEJORADA
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 45000,
        debug: false,
        logger: false
    });
}


app.get('/api/email/test', async(req, res) => {
    try {
        console.log('🧪 Probando configuración de email...');

        const testEmail = 'test@example.com';
        const testName = 'Usuario Test';
        const testCode = '123456';

        const result = await sendVerificationCode(testEmail, testName, testCode, 1);

        res.json({
            success: true,
            message: 'Prueba de email exitosa',
            details: result
        });

    } catch (error) {
        console.error('❌ Prueba de email fallida:', error);
        res.status(500).json({
            success: false,
            message: 'Prueba de email fallida',
            error: error.message
        });
    }
});


app.post('/api/email/send-verification', async(req, res) => {
    console.log('📨 Solicitud recibida en /api/email/send-verification');

    try {
        const { userEmail, userName } = req.body;

        // Validaciones
        if (!userEmail || !userName) {
            console.log('❌ Datos incompletos:', { userEmail, userName });
            return res.status(400).json({
                success: false,
                message: 'Email y nombre son requeridos'
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido'
            });
        }

        console.log(`🎯 Generando código para: ${userEmail} (${userName})`);

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`🔐 Código generado: ${verificationCode}`);

        // Intentar enviar el email con reintentos
        const result = await sendVerificationCode(userEmail, userName, verificationCode, 3);

        console.log(`🎉 Email enviado exitosamente después de ${result.attempt} intento(s)`);

        res.json({
            success: true,
            message: 'Código enviado correctamente',
            code: verificationCode,
            attempt: result.attempt
        });

    } catch (error) {
        console.error('💥 Error crítico en endpoint:', error.message);

        // Enviar respuesta de error específica
        let errorMessage = 'Error al enviar el código. Por favor, intenta nuevamente.';
        let statusCode = 500;

        if (error.message.includes('Timeout')) {
            errorMessage = 'El servidor de email está respondiendo lentamente. Intenta nuevamente.';
        } else if (error.message.includes('EAUTH')) {
            errorMessage = 'Problema de autenticación con el servicio de email.';
        } else if (error.message.includes('ECONNECTION')) {
            errorMessage = 'No se pudo conectar al servicio de email. Verifica tu conexión.';
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            technicalError: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.post('/api/email/solicitud-aceptada', async(req, res) => {

    try {
        const { userEmail } = req.body;

        if (!userEmail) {
            console.log('❌ Datos incompletos:', { userEmail });
            return res.status(400).json({
                success: false,
                message: 'Email y estado son requeridos'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido'
            });
        }

        const result = await sendconfitmationaccount(userEmail, 3);

        return res.json({
            success: true,
            message: 'Código enviado correctamente',
            attempt: result.attempt
        });

    } catch (error) {
        console.error('💥 Error crítico en endpoint:', error.message);

        // Enviar respuesta de error específica
        let errorMessage = 'Error al enviar el código. Por favor, intenta nuevamente.';
        let statusCode = 500;

        if (error.message.includes('Timeout')) {
            errorMessage = 'El servidor de email está respondiendo lentamente. Intenta nuevamente.';
        } else if (error.message.includes('EAUTH')) {
            errorMessage = 'Problema de autenticación con el servicio de email.';
        } else if (error.message.includes('ECONNECTION')) {
            errorMessage = 'No se pudo conectar al servicio de email. Verifica tu conexión.';
        }

        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
            technicalError: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

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

app.get('/check-session', (req, res) => {
    if (req.session.userId) {
        res.json({
            success: true,
            id: req.session.userId,
            name: req.session.userName,
            delivery: req.session.delivery,
            sessionData: req.session
        });
    } else {
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

app.post('/api/pass-admin', (req, res) => {
    const { pass } = req.body;

    if (pass == "C27PZXMv") {
        return res.json({
            success: true,
            message: 'correct pass',
            code: "C27PZXMv."
        });
    } else {
        return res.json({
            success: false,
            message: 'fail pass',
        });
    }
});

app.post('/api/register', (req, res) => {
    const { username, email, password, delivery } = req.body;

    // Primero verificar si el usuario ya existe
    const checkQuery = 'SELECT id FROM usuarios WHERE usuario = ? OR gmail = ?';

    connection.query(checkQuery, [username, email], (error, results) => {
        if (error) {
            console.error('Error verificando usuario:', error);
            return res.json({ success: false, message: 'Error del servidor' });
        }

        if (results.length > 0) {
            return res.json({
                success: false,
                message: 'El usuario o email ya existen'
            });
        }


        const insertQuery = 'INSERT INTO usuarios (usuario, contrasena, gmail, estado, delivery) VALUES (?, ?, ?, ?, ?)';
        connection.query(insertQuery, [username, password, email, 4, delivery], (error, results) => {
            if (error) {
                console.error('Error registrando usuario:', error);
                return res.json({
                    success: false,
                    message: 'Error al registrar usuario'
                });
            }

            console.log(`✅ Usuario ${username} registrado correctamente`);
            res.json({
                success: true,
                message: 'Usuario creado correctamente',
                userId: results.insertId
            });
        });
    });
});

app.post('/api/subir-solicitud', (req, res) => {
    const { carnet, fotocarnet, selfie, fotomoto, idowner } = req.body;

    const insertQuery = 'INSERT INTO solicitudes (carnet, fotocarnet, selfie, foto_moto, idowner) VALUES (?, ?, ?, ?, ?)';
    connection.query(insertQuery, [carnet, fotocarnet, selfie, fotomoto, idowner], (error, results) => {
        if (error) {
            return res.json({
                success: false,
                message: 'Error al subir la solicitud'
            });
        }
        res.json({
            success: true,
            message: 'solicitud enviada correctamente',
        });
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

    connection.query(query, [user], (error, results) => {
        if (results.length > 0) {
            return res.json({ success: true, id: results[0] });
        } else {
            return res.json({ success: false, message: 'usuario no encontrado' });
        }
    });
});

app.post('/api/solicitud-idowner', (req, res) => {
    const { idowner } = req.body;
    const query = 'SELECT * FROM solicitudes WHERE idowner = ?';

    connection.query(query, [idowner], (error, results) => {
        if (results.length > 0) {
            return res.json({ success: false, message: 'espere a que su solicitud este lista, se le enviara un gmail' });
        } else {
            return res.json({ success: true, message: 'no tiene solicitud' });
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
            return res.json({ success: true, viaje: results });
        } else {
            return res.json({ success: false, message: 'Viaje no encontrado' });
        }
    });
});

app.get('/perfil/:id', (req, res) => {
    const id = req.params.id;
    const query = 'SELECT * FROM usuarios WHERE id = ?';

    connection.query(query, [id], (error, results) => {
        if (error) {
            return res.json({ success: false, message: 'Error' });
        }
        if (results.length > 0) {
            return res.json({ success: true, perfil: results });
        } else {
            return res.json({ success: false, message: 'perfil no encontrado' });
        }
    });
});

// Ruta para guardar/actualizar viajes
app.post('/guardar-viaje', (req, res) => {
    const { id, propietario, precio, detalles, provincia_salida, municipio_salida, desde, provincia_llegada, hasta, municipio_llegada, fecha_salida } = req.body;

    let fechaFormateada = fecha_salida;

    if (fecha_salida && typeof fecha_salida === 'string') {
        const fecha = new Date(fecha_salida);
        if (!isNaN(fecha.getTime())) {
            fechaFormateada = fecha.toISOString().split('T')[0];
        }
    }

    // Verificar si el viaje existe
    const checkQuery = 'SELECT * FROM viajes WHERE id = ?';

    connection.query(checkQuery, [id], (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.json({ success: false, message: 'Error del servidor' });
        }

        if (results.length > 0) {
            // Actualizar viaje existente
            const updateQuery = 'UPDATE viajes SET propietario = ?, precio = ?, detalles_adicionales = ?, provincia_salida = ?, municipio_salida = ?, desde= ?,provincia_llegada = ?, hasta = ?,municipio_llegada = ?, fecha_salida = ?     WHERE id = ?';
            connection.query(updateQuery, [propietario, precio, detalles, provincia_salida, municipio_salida, desde, provincia_llegada, hasta, fechaFormateada, id], (error) => {
                if (error) {
                    return res.json({ success: false, message: 'Error al actualizar' });
                }
                res.json({ success: true, message: 'Viaje actualizado correctamente' });
            });
        } else {
            // Insertar nuevo viaje
            const insertQuery = 'INSERT INTO viajes (propietario, precio, detalles_adicionales, desde, hasta, provincia_salida, municipio_salida, provincia_llegada, fecha_salida, municipio_llegada) VALUES (?, ?, ?, ? , ? , ? , ? , ? , ?, ?)';
            connection.query(insertQuery, [propietario, precio, detalles, desde, hasta, provincia_salida, municipio_salida, provincia_llegada, fechaFormateada, municipio_llegada], (error) => {
                if (error) {
                    return res.json({ success: false, message: 'Error al guardar' });
                }
                res.json({ success: true, message: 'Viaje creado correctamente' });
            });
        }
    });
});

app.post('/solicitud-aceptada', (req, res) => {
    const { idowner } = req.body;

    const checkQuery = 'SELECT * FROM usuarios WHERE id = ?';

    connection.query(checkQuery, [idowner], (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.json({ success: false, message: 'Error al chequear al usuario' });
        }

        if (results.length > 0) {
            const updateQuery = 'UPDATE usuarios SET estado = ?  WHERE id = ?';
            connection.query(updateQuery, [1, idowner], (error) => {
                if (error) {
                    return res.json({ success: false, message: 'Error en la query de cambiar de estado al usuario' });
                }
                return res.json({ success: true, message: 'solicitud aceptada correctamente' });
            });
        } else {
            return res.json({ success: false, message: 'no se encontro al usuario' });
        }
    });
});

// Ruta para eliminar viaje
app.delete('/eliminar-viaje/:id', (req, res) => {
    const idViaje = req.params.id;

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

app.delete('/eliminar-solicitud/:id', (req, res) => {
    const idowner = req.params.id;

    const query = 'DELETE FROM solicitudes WHERE idowner = ?';

    connection.query(query, [idowner], (error, results) => {
        if (error) {
            console.error('Error al eliminar la solicitud:', error);
            return res.json({
                success: false,
                message: 'Error del servidor al eliminar la solicitud'
            });
        }

        if (results.affectedRows > 0) {
            return res.json({
                success: true,
                message: 'solicitud eliminada correctamente',
            });
        } else {
            return res.json({
                success: false,
                message: 'solicitud no encontrado'
            });
        }
    });
});

app.get('/viajes', async(req, res) => {
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
            console.log("Viajes encontrados");
            return res.json({ success: true, viajes: results });
        } else {
            console.log("No hay viajes");
            return res.json({ success: false, message: 'Viajes no encontrados' });
        }
    });
});

// Ruta para obtener diccionario de usuarios
app.get('/usuarios-id', async(req, res) => {
    const query = 'SELECT id, usuario FROM usuarios';

    connection.query(query, (error, results) => {
        if (error) {
            return res.json({ success: false, message: 'Error en la query' });
        }
        if (results.length > 0) {
            console.log("Usuarios encontrados");
            return res.json({ success: true, usuarios: results });
        } else {
            console.log("No hay usuarios");
            return res.json({ success: false, message: 'Usuarios no encontrados' });
        }
    });
});

app.get('/api/get-solicitudes', async(req, res) => {
    const query = 'SELECT carnet, fotocarnet, selfie, idowner, foto_moto FROM solicitudes';

    connection.query(query, (error, results) => {
        if (error) {
            return res.json({ success: false, message: 'Error en la query' });
        }
        if (results.length > 0) {
            return res.json({ success: true, usuarios: results });
        } else {
            return res.json({ success: false, message: 'no hay solicitudes' });
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
    const queryVerificar = 'SELECT id FROM usuarios WHERE usuario = ? AND id != ?';

    // Query para actualizar
    const queryActualizar = 'UPDATE usuarios SET usuario = ? WHERE id = ?';

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

    console.log('📝 Cambiando contraseña:', { id });

    // Query para actualizar
    const queryActualizar = 'UPDATE usuarios SET contrasena = ? WHERE id = ?';

    connection.query(queryActualizar, [pass, id], (error, results) => {
        if (error) {
            console.error('❌ Error en query de actualización de contraseña:', error);
            return res.json({
                success: false,
                message: 'Error al cambiar la contraseña'
            });
        }

        // Verificar si se actualizó algún registro
        if (results.affectedRows === 0) {
            return res.json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        console.log('✅ Contraseña cambiada exitosamente');
        return res.json({
            success: true,
            message: 'Tu contraseña ha sido cambiada con éxito',
        });
    });
});

// Endpoint para actualizar foto de perfil
app.post('/change-profile-photo', async(req, res) => {
    const { id, fotoUrl } = req.body;

    const query = 'UPDATE usuarios SET fotoperfil = ? WHERE id = ?';
    connection.query(query, [fotoUrl, id], (error, results) => {
        if (error) {
            console.error('❌ Error actualizando foto:', error);
            return res.json({
                success: false,
                message: 'Error actualizando foto de perfil'
            });
        }

        return res.json({
            success: true,
            message: 'Foto de perfil actualizada correctamente'
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

// 🔐 FUNCIONES DE ENCRIPCIÓN
function encriptarSimple(texto) {
    let resultado = '';
    for (let i = 0; i < texto.length; i++) {
        resultado += String.fromCharCode(texto.charCodeAt(i) + 3);
    }
    return btoa(resultado);
}

function desencriptarSimple(textoEncriptado) {
    const textoBase64 = atob(textoEncriptado);
    let resultado = '';
    for (let i = 0; i < textoBase64.length; i++) {
        resultado += String.fromCharCode(textoBase64.charCodeAt(i) - 3);
    }
    return resultado;
}

// ==============================================
// 🚀 SISTEMA DE CHAT EN TIEMPO REAL - SOCKET.IO
// ==============================================

// Almacenar usuarios conectados
const activeUsers = new Map();

io.on('connection', (socket) => {
    console.log('✅ Usuario conectado al chat:', socket.id);

    // Unirse a una conversación específica
    socket.on('join_conversation', async(data) => {
        const { conversationId, userId } = data;

        socket.join(conversationId);
        activeUsers.set(userId, socket.id);

        console.log(`💬 Usuario ${userId} unido a conversación ${conversationId}`);
    });

    // Manejar envío de mensajes
    socket.on('send_message', async(data) => {
        const { conversationId, senderId, message } = data;

        try {
            // Guardar mensaje en la base de datos
            const [result] = await connection.promise().execute(
                'INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)', [conversationId, senderId, message]
            );

            // Obtener datos completos del mensaje
            const [messages] = await connection.promise().execute(
                `SELECT m.*, u.usuario as sender_name 
                 FROM messages m 
                 JOIN usuarios u ON m.sender_id = u.id 
                 WHERE m.id = ?`, [result.insertId]
            );

            // Emitir mensaje a todos en la conversación
            io.to(conversationId.toString()).emit('new_message', messages[0]);

            console.log(`📨 Mensaje enviado en conversación ${conversationId} por usuario ${senderId}`);

        } catch (error) {
            console.error('❌ Error enviando mensaje:', error);
            socket.emit('message_error', { error: 'No se pudo enviar el mensaje' });
        }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        console.log('❌ Usuario desconectado:', socket.id);

        // Eliminar de usuarios activos
        for (let [userId, socketId] of activeUsers.entries()) {
            if (socketId === socket.id) {
                activeUsers.delete(userId);
                break;
            }
        }
    });
});

// 🚀 INICIAR SERVIDOR
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto http://localhost:${PORT}`);
    console.log(`📧 Endpoint de email: http://localhost:${PORT}/api/email/send-verification`);
    console.log(`🧪 Endpoint de prueba: http://localhost:${PORT}/api/email/test`);

    // Verificar configuración de email al iniciar
    console.log('🔧 Verificando configuración de email...');
});

async function sendVerificationCode(userEmail, userName, verificationCode, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let transporter = null;

        try {
            console.log(`📧 Intento ${attempt}/${maxRetries} para ${userEmail}`);

            // Crear NUEVA instancia del transporter para cada intento
            transporter = createTransporter();

            // Verificar conexión con timeout
            const verifyPromise = transporter.verify();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout en verificación')), 10000)
            );

            await Promise.race([verifyPromise, timeoutPromise]);
            console.log('✅ Conexión SMTP verificada');

            // Configurar opciones del email
            const mailOptions = {
                from: '"MolyFats" <mollyfast.delivery@gmail.com>',
                to: userEmail,
                subject: 'Tu código de verificación - MolyFats',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <h2 style="color: #4CAF50; text-align: center;">✅ Verificación de Email</h2>
                        <p>Hola <strong>${userName}</strong>,</p>
                        <p>Tu código de verificación para <strong>MolyFats</strong> es:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 8px; padding: 15px; background: #f9f9f9; border: 2px dashed #4CAF50; border-radius: 8px; display: inline-block;">
                                ${verificationCode}
                            </div>
                        </div>
                        <p>🔒 <strong>Este código expirará en 10 minutos</strong></p>
                        <p style="color: #666; font-size: 12px; text-align: center;">
                            Si no solicitaste este código, ignora este mensaje.
                        </p>
                    </div>
                `
            };

            // Enviar email con timeout
            const sendPromise = transporter.sendMail(mailOptions);
            const sendTimeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout en envío')), 15000)
            );

            const result = await Promise.race([sendPromise, sendTimeoutPromise]);

            console.log(`✅ Email enviado exitosamente en intento ${attempt}`);

            // Cerrar conexión explícitamente
            if (transporter) {
                transporter.close();
            }

            return {
                success: true,
                messageId: result.messageId,
                attempt: attempt
            };

        } catch (error) {
            lastError = error;
            console.error(`❌ Intento ${attempt} fallido:`, error.message);

            // Cerrar conexión si existe
            if (transporter) {
                try {
                    transporter.close();
                } catch (closeError) {
                    console.log('⚠️ Error cerrando transporter:', closeError.message);
                }
            }

            // Si no es el último intento, esperar con backoff exponencial
            if (attempt < maxRetries) {
                const backoffTime = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Esperando ${backoffTime/1000} segundos antes del reintento...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
    }

    // Si llegamos aquí, todos los intentos fallaron
    throw new Error(`Todos los ${maxRetries} intentos fallaron. Último error: ${lastError.message}`);
}

async function sendconfitmationaccount(userEmail, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let transporter = null;

        try {

            // Crear NUEVA instancia del transporter para cada intento
            transporter = createTransporter();

            // Verificar conexión con timeout
            const verifyPromise = transporter.verify();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout en verificación')), 10000)
            );

            await Promise.race([verifyPromise, timeoutPromise]);
            console.log('✅ Conexión SMTP verificada');

            // Configurar opciones del email
            const mailOptions = {
                from: '"MolyFats" <mollyfast.delivery@gmail.com>',
                to: userEmail,
                subject: ' Cuenta creada exitosamente - MollyFast',
                html: `
                    <!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenido a MollyFast</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: #4A90E2;
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .content {
            padding: 30px;
            text-align: center;
        }
        .footer {
            background: #f5f5f5;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">MollyFast</div>
            <h1>¡Bienvenido!</h1>
        </div>
        
        <div class="content">
            <p>Su cuenta ha sido creada exitosamente.</p>
            <p>Estamos listos para atenderle cuando lo necesite.</p>
            <p>¡Lo esperamos pronto!</p>
        </div>
        
        <div class="footer">
            <p>Equipo MollyFast</p>
            <p>Este es un mensaje automático, por favor no responda a este correo.</p>
        </div>
    </div>
</body>
</html>
                `
            };

            // Enviar email con timeout
            const sendPromise = transporter.sendMail(mailOptions);
            const sendTimeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout en envío')), 15000)
            );

            const result = await Promise.race([sendPromise, sendTimeoutPromise]);

            console.log(`✅ Email enviado exitosamente en intento ${attempt}`);

            // Cerrar conexión explícitamente
            if (transporter) {
                transporter.close();
            }

            return {
                success: true,
                messageId: result.messageId,
                attempt: attempt
            };

        } catch (error) {
            lastError = error;
            console.error(`❌ Intento ${attempt} fallido:`, error.message);

            // Cerrar conexión si existe
            if (transporter) {
                try {
                    transporter.close();
                } catch (closeError) {
                    console.log('⚠️ Error cerrando transporter:', closeError.message);
                }
            }

            // Si no es el último intento, esperar con backoff exponencial
            if (attempt < maxRetries) {
                const backoffTime = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Esperando ${backoffTime/1000} segundos antes del reintento...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
    }

    // Si llegamos aquí, todos los intentos fallaron
    throw new Error(`Todos los ${maxRetries} intentos fallaron. Último error: ${lastError.message}`);
}
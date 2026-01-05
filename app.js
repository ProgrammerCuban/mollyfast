const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

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

connection.connect((error) => {
    if (error) {
        console.log('❌ Error conectando a MySQL:', error.message);
    } else {
        console.log('✅ Conectado a la base de datos MySQL externa');
    }
});

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

// ======================= RUTAS EXISTENTES =======================

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login/login.html'));
});

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/login/login.html'));
});

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

// api para obtener un viaje por el id 
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

// api para obtener un perfil por el id 
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

// api para obtener todos los viajes 
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

// api para obetener los nombres y los id de todos los uduarios 
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

// api para seleccionar el delivery que escogieron para el viaje y borrar las otras conversaciones ocn los otros deliverys 
app.get('/api/deliveryescogido-id/:viajeid/:conversationid', async(req, res) => {

    const {viajeid, conversationid} = req.params;

    const query = `DELETE FROM messages 
    WHERE conversation_id IN (
    SELECT id 
    FROM conversations 
    WHERE delivery_request_id = ? 
    AND id != ? );`;

    connection.query(query,[viajeid,conversationid], (error, results) => {
        if (error) {
            return res.json({ success: false, message: 'Error en la query1' });
        }
    });

       const query2 =`DELETE FROM conversations 
       WHERE delivery_request_id = ? 
       AND id != ?;`;
        
        connection.query(query2,[viajeid,conversationid], (error, results) => {
        if (error) {
            return res.json({ success: false, message: 'Error en la query2' });
        }

        return res.json({success:true});
    });


});

// api que devuelve todad las solicitudes disponiboles de inicio de sesion
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

//api para la autenticacion de imagekit que sirve para subir la foto 
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

//api para enviar el email de codigo de verificacion al usuario 
app.post('/api/email/send-verification', async(req, res) => {
    console.log('📨 Solicitud recibida en /api/email/send-verification');

    try {
        const { userEmail, userName } = req.body;

        if (!userEmail || !userName) {
            console.log('❌ Datos incompletos:', { userEmail, userName });
            return res.status(400).json({
                success: false,
                message: 'Email y nombre son requeridos'
            });
        }

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

// api para enviar gmail que su solicitud de inicio de sesion fue aceptada 
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

//api para verificar que el usuario y la contrasena son correctos 
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

// api para desenciptar el nombre de usuario
app.post('/desencript', (req, res) => {
    const { code } = req.body;
    const user = desencriptarSimple(code);
    return res.json({
        users: user,
    });
});

// api para verificar la contrasena del admin 
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

// api para guardar los datos del usuario que se registro 
app.post('/api/register', (req, res) => {
    const { username, email, password, delivery } = req.body;

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

// api para subir la solicitud de inicio de sesion 
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

// api para encriptar el nombre de usuario
app.post('/encript', (req, res) => {
    const { user } = req.body;
    const code = encriptarSimple(user);
    console.log(code);
    return res.json({
        coder: code,
    });
});

// api para obtener el id de un nombre de usuario 
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

// api que devuelve si hay solicitud de un usuario o no 
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

// api para guardar los viajes en la bd 
app.post('/guardar-viaje', (req, res) => {
    const { id, propietario, precio, detalles, provincia_salida, municipio_salida, desde, provincia_llegada, hasta, municipio_llegada, fecha_salida } = req.body;

    let fechaFormateada = fecha_salida;

    if (fecha_salida && typeof fecha_salida === 'string') {
        const fecha = new Date(fecha_salida);
        if (!isNaN(fecha.getTime())) {
            fechaFormateada = fecha.toISOString().split('T')[0];
        }
    }

    const checkQuery = 'SELECT * FROM viajes WHERE id = ?';

    connection.query(checkQuery, [id], (error, results) => {
        if (error) {
            console.error('Error:', error);
            return res.json({ success: false, message: 'Error del servidor' });
        }

        if (results.length > 0) {
            // FIX: incluir municipio_llegada y alinear orden de parámetros
            const updateQuery = `
                UPDATE viajes
                SET propietario = ?, precio = ?, detalles_adicionales = ?, provincia_salida = ?, municipio_salida = ?, desde = ?, provincia_llegada = ?, municipio_llegada = ?, hasta = ?, fecha_salida = ?
                WHERE id = ?
            `;
            connection.query(
                updateQuery,
                [propietario, precio, detalles, provincia_salida, municipio_salida, desde, provincia_llegada, municipio_llegada, hasta, fechaFormateada, id],
                (error) => {
                    if (error) {
                        return res.json({ success: false, message: 'Error al actualizar' });
                    }
                    res.json({ success: true, message: 'Viaje actualizado correctamente' });
                }
            );
        } else {
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

// api para aceptar la solicitud de un usuario 
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

// api para cambiar foto de un usuario 
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

// api para eliminar un viaje en especifico 
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

// api para eliminar una solicitud 
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

// api para cambiar un nombre de usuario 
app.put('/change-username', (req, res) => {
    const { id, username } = req.body;

    if (!id || !username) {
        return res.json({
            success: false,
            message: 'ID y username son requeridos'
        });
    }

    console.log('📝 Cambiando username:', { id, username });

    const queryVerificar = 'SELECT id FROM usuarios WHERE usuario = ? AND id != ?';
    const queryActualizar = 'UPDATE usuarios SET usuario = ? WHERE id = ?';

    connection.query(queryVerificar, [username, id], (error, results) => {
        if (error) {
            console.error('❌ Error en query de verificación:', error);
            return res.json({
                success: false,
                message: 'Error verificando disponibilidad del username'
            });
        }

        if (results.length > 0) {
            console.log('❌ Username ya en uso:', username);
            return res.json({
                success: false,
                message: 'Este nombre de usuario ya está en uso, por favor intenta con otro'
            });
        }

        connection.query(queryActualizar, [username, id], (error, results) => {
            if (error) {
                console.error('❌ Error en query de actualización:', error);
                return res.json({
                    success: false,
                    message: 'Error al cambiar el username'
                });
            }

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

// api para cambiar contrasena de un usuario
app.put('/change-password', (req, res) => {
    const { id, pass } = req.body;

    if (!id || !pass) {
        return res.json({
            success: false,
            message: 'ID y password son requeridos'
        });
    }

    console.log('📝 Cambiando contraseña:', { id });

    const queryActualizar = 'UPDATE usuarios SET contrasena = ? WHERE id = ?';

    connection.query(queryActualizar, [pass, id], (error, results) => {
        if (error) {
            console.error('❌ Error en query de actualización de contraseña:', error);
            return res.json({
                success: false,
                message: 'Error al cambiar la contraseña'
            });
        }

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

// funcion para encriptar
function encriptarSimple(texto) {
    let resultado = '';
    for (let i = 0; i < texto.length; i++) {
        resultado += String.fromCharCode(texto.charCodeAt(i) + 3);
    }
    return Buffer.from(resultado, 'binary').toString('base64');
}

//
function desencriptarSimple(textoEncriptado) {
    const textoBase64 = Buffer.from(textoEncriptado, 'base64').toString('binary');
    let resultado = '';
    for (let i = 0; i < textoBase64.length; i++) {
        resultado += String.fromCharCode(textoBase64.charCodeAt(i) - 3);
    }
    return resultado;
}

function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'No autorizado - Inicia sesión primero'
        });
    }
}

// ======================= CHAT: CONVERSACIONES Y MENSAJES =======================

// Crear/obtener conversación según (delivery_request_id, client_id, delivery_id)
async function getOrCreateConversation(deliveryRequestId, clientId, deliveryId) {
    const [rows] = await connection.promise().execute(
        'SELECT id FROM conversations WHERE delivery_request_id = ? AND client_id = ? AND delivery_id = ?',
        [deliveryRequestId, clientId, deliveryId]
    );
    if (rows.length > 0) {
        return rows[0].id;
    }
    const [result] = await connection.promise().execute(
        'INSERT INTO conversations (delivery_request_id, client_id, delivery_id) VALUES (?, ?, ?)',
        [deliveryRequestId, clientId, deliveryId]
    );
    return result.insertId;
}

// Endpoint: crear/obtener conversación (para abrir chat desde el botón del viaje)
app.post('/api/conversations/get-or-create', async (req, res) => {
    try {
        const { deliveryRequestId, clientId, deliveryId } = req.body;
        if (!deliveryRequestId || !clientId || !deliveryId) {
            return res.json({ success: false, message: 'Datos incompletos' });
        }
        const conversationId = await getOrCreateConversation(deliveryRequestId, clientId, deliveryId);
        return res.json({ success: true, conversationId });
    } catch (err) {
        console.error('❌ Error get-or-create:', err);
        return res.json({ success: false, message: 'No se pudo crear/obtener la conversación' });
    }
});

// Endpoint: historial de mensajes de una conversación
app.get('/api/conversations/:id/messages', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const [rows] = await connection.promise().execute(
            `SELECT m.id, m.conversation_id, m.sender_id, m.message, m.is_read , m.is_read, m.created_at,
             u.usuario AS sender_name
             FROM messages m
             JOIN usuarios u ON m.sender_id = u.id
             WHERE m.conversation_id = ?
             ORDER BY m.created_at ASC`,
            [conversationId]
        );
        return res.json({ success: true, messages: rows });
    } catch (err) {
        console.error('❌ Error cargando historial:', err);
        return res.json({ success: false, message: 'No se pudo cargar el historial' });
    }
});

// Endpoint: listar conversaciones de un usuario (client o delivery)
app.get('/api/conversations/by-user/:userId', async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const [rows] = await connection.promise().execute(
            `SELECT c.id AS conversation_id, c.delivery_request_id, c.client_id, c.delivery_id,
                    c.created_at, c.updated_at,
                    uc.usuario AS client_name, ud.usuario AS delivery_name
             FROM conversations c
             JOIN usuarios uc ON c.client_id = uc.id
             JOIN usuarios ud ON c.delivery_id = ud.id
             WHERE c.client_id = ? OR c.delivery_id = ?
             ORDER BY c.updated_at DESC`,
            [userId, userId]
        );
        return res.json({ success: true, conversations: rows });
    } catch (err) {
        console.error('❌ Error listando conversaciones:', err);
        return res.json({ success: false, message: 'No se pudieron listar las conversaciones' });
    }
});

// Endpoint: listar conversaciones por viaje (para negocio)
app.get('/api/conversations/by-trip/:tripId', async (req, res) => {
    try {
        const tripId = Number(req.params.tripId);
        const [rows] = await connection.promise().execute(
            `SELECT c.id AS conversation_id, c.delivery_id, u.usuario AS delivery_name,
                    c.client_id, c.delivery_request_id, c.updated_at,
                    (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS messages_count,
                    (SELECT MAX(m.created_at) FROM messages m WHERE m.conversation_id = c.id) AS last_message_at
             FROM conversations c
             JOIN usuarios u ON c.delivery_id = u.id
             WHERE c.delivery_request_id = ?
             ORDER BY last_message_at DESC`,
            [tripId]
        );
        return res.json({ success: true, deliveries: rows });
    } catch (err) {
        console.error('❌ Error listando deliveries por viaje:', err);
        return res.json({ success: false, message: 'No se pudieron listar las conversaciones' });
    }
});

// Endpoint: contador de mensajes por viaje para negocio
app.get('/api/messages/count/viaje/negocio/:idviaje', async (req, res) => {
  const idviaje = req.params.idviaje;

    const [rows] = await connection.execute(
      `SELECT SUM(cnl) AS total_cnl
       FROM conversations
       WHERE delivery_request_id = ?`,
      [idviaje]
    );

    const totalCnl = rows[0].total_cnl || 0;

    return res.json({ succes:true , data: totalCnl});
    
});

// cantidad de sms perdidos por viajes para lso negocios
app.get('/api/messages/count/chat/negocio/:idviaje', async (req, res) => {
  const idviaje = req.params.idviaje;

   const query = `SELECT 
    COUNT(*) as total
         FROM 
    conversations
      WHERE 
    delivery_request_id = ? 
    AND cnl > 0;`;

    connection.query(query, [idviaje], (error, results) => {
        if (error) {
            return res.json({ success: false, message: 'Error' });
        }
        if (results.length > 0) {
            return res.json({ success: true, total: results[0].total });
        } else {
            return res.json({ success: false, message: 'perfil no encontrado' });
        }
    });
  
});


// cantidad de sms por chat con el id de la conversacion para negocios
app.get('/api/messages/count/:conversationid', async (req, res) => {
  const conversationid = req.params.conversationid;

    const [rows] = await connection.execute(
      `SELECT cnl AS total_cnl
       FROM conversations
       WHERE id = ?`,
      [conversationid]
    );

    const totalCnl = rows[0].total_cnl || 0;

    return res.json({ succes:true , total: totalCnl});
    
});

// GET /api/conversations/:conversationId/unread-count
app.get('/api/conversations/:conversationId/unread-count', async (req, res) => {
        const conversationId = req.params.conversationId;
  
        const query = `SELECT * FROM  conversations WHERE id = ?`;

    connection.query(query, [conversationId], (error, results) => {
        if (error) {
            return res.json({ success: false, message: 'Error' });
        }
        if (results.length > 0) {
            return res.json({ success: true, unreadCount: results[0].cnl });
        } else {
            return res.json({ success: false, message: 'perfil no encontrado' });
        }
    });
  
});


// POST /api/conversations/:conversationId/mark-as-read
app.post('/api/conversations/:conversationId/mark-as-read', async (req, res) => {

        const conversationId = req.params.conversationId;
        const { userId } = req.body;
        
         const query =   `UPDATE conversations SET cnl = 0 WHERE id = ?`;

    connection.query(query, [conversationId], (error, results) => {
        if (error) {
            return res.json({ success: false, message: 'Error' });
        }
        if (results.length > 0) {
            return res.json({ success: true,  message: 'Mensajes marcados como leídos' });
        } else {
            return res.json({ success: false, message: 'perfil no encontrado' });
        }
    });
       
});


app.get('/api/messages/:id/:conversacionid/read', async (req, res) => {
  const id = Number(req.params.id);
  const conversacionid = Number(req.params.conversacionid);

    try{
     if(id == 1){
      await connection.promise().execute(
            `UPDATE conversations SET cnl = 0 WHERE id = ?`,
            [conversacionid]
        );
      
        return res.json({success: true});
      }
      else{
     await connection.promise().execute(
            `UPDATE conversations SET dnl = 0 WHERE id = ?`,
            [conversacionid]
        );
      
        return res.json({success: true});
    }
    
    }catch(error)
    {
            console.error(error);
            return res.json({success:false});
    }
});


app.get('/api/conversations/by-trip/:viajeId/unread-count/:userId',async(req,res)=>{
        const viajeId = req.params.viajeId;
        const userId = req.params.userId;
        
         const query =   `SELECT * FROM conversations WHERE delivery_request_id = ? AND delivery_id = ?`;

    connection.query(query, [viajeId,userId], (error, results) => {
        if (error) {
            return res.json({ success: false, error: 'Error' });
        }
        if (results.length > 0) {

            return res.json({ success: true,  unreadCount: results[0].dnl });
        } else {
            return res.json({ success: true, error: 'errorrrrrrrrrr' });
        }
    });
});

 //GET /api/conversations/by-user/:userId/unread-summary
// Devuelve: { success: boolean, viajesConMensajes: number }

app.get('/api/conversations/by-user/:userId/unread-summary', async (req, res) => {
  const userid = req.params.userId;

     const query = `SELECT 
    COUNT(*) as total
         FROM 
    conversations
      WHERE 
    delivery_id = ? 
    AND dnl > 0;`;

    connection.query(query, [userid], (error, results) => {
        if (error) {
            return res.json({ success: false, message: 'Error' });
        }
        if (results.length > 0) {
            return res.json({ success: true, viajesConMensajes: results[0].total });
        } else {
            return res.json({ success: false, message: 'error al buscar la cantidad de sms perdidos por viaje' });
        }
    });
  

});



// ======================= SOCKET.IO =======================

const activeUsers = new Map();

io.on('connection', (socket) => {
    console.log('✅ Usuario conectado al chat:', socket.id);

    // Unirse a una conversación específica (room)
    socket.on('join_conversation', async (data) => {
        const { conversationId, userId } = data;
        const room = String(conversationId);
        socket.join(room);
        if (userId) {
            activeUsers.set(userId, socket.id);
        }
        console.log(`💬 Usuario ${userId} unido a conversación ${room}`);
    });

    // Enviar mensaje dentro de una conversación
    socket.on('send_message', async (data) => {
        const { conversationId, senderId, message } = data;

        if (!conversationId || !senderId || !message || String(message).trim() === '') {
            socket.emit('message_error', { error: 'Datos de mensaje incompletos' });
            return;
        }

        try {
            // Guardar mensaje en DB
            const [result] = await connection.promise().execute(
                'INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)',
                [conversationId, senderId, message]
            );

            // Recuperar mensaje con metadatos y nombre del emisor
            const [messages] = await connection.promise().execute(
                `SELECT m.*, u.usuario as sender_name 
                 FROM messages m 
                 JOIN usuarios u ON m.sender_id = u.id 
                 WHERE m.id = ?`,
                [result.insertId]
            );

            // Emitir a todos en la sala
            io.to(String(conversationId)).emit('new_message', messages[0]);

            // Actualizar updated_at de la conversación
            await connection.promise().execute(
                'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [conversationId]
            );

            let isactive = false;

            const idrecibe = await obtenerIdOpuesto(senderId,conversationId);

            for (let [userId, socketId] of activeUsers.entries()) {
            if (socketId === idrecibe) {
               isactive = true;
                break;
            }
        }
   if (!isactive) {
    const [result] = await connection.promise().execute(
        `UPDATE conversations 
         SET 
             dnl = CASE 
                 WHEN ? = delivery_id THEN dnl 
                 ELSE dnl + 1 
             END,
             cnl = CASE 
                 WHEN ? = delivery_id THEN cnl + 1 
                 ELSE cnl 
             END
         WHERE id = ?`,
        [senderId, senderId, conversationId]
    );
   }
            console.log(`📨 Mensaje enviado en conversación ${conversationId} por usuario ${senderId}`);
        } catch (error) {
            console.error('❌ Error enviando mensaje:', error);
            socket.emit('message_error', { error: 'No se pudo enviar el mensaje' });
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ Usuario desconectado:', socket.id);

        for (let [userId, socketId] of activeUsers.entries()) {
            if (socketId === socket.id) {
                activeUsers.delete(userId);
                break;
            }
        }
    });
});

function smsperdido(id)
 {
    socket.emit(`sms/perdido/${id}`, true);
 }

// ======================== SERVIDOR ========================


server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto http://localhost:${PORT}`);
});

// ======================= EMAIL =======================

async function sendVerificationCode(userEmail, userName, verificationCode, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let transporter = null;

        try {
            console.log(`📧 Intento ${attempt}/${maxRetries} para ${userEmail}`);

            transporter = createTransporter();

            const verifyPromise = transporter.verify();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout en verificación')), 10000)
            );

            await Promise.race([verifyPromise, timeoutPromise]);
            console.log('✅ Conexión SMTP verificada');

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

            const sendPromise = transporter.sendMail(mailOptions);
            const sendTimeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout en envío')), 15000)
            );

            const result = await Promise.race([sendPromise, sendTimeoutPromise]);

            console.log(`✅ Email enviado exitosamente en intento ${attempt}`);

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

            if (transporter) {
                try {
                    transporter.close();
                } catch (closeError) {
                    console.log('⚠️ Error cerrando transporter:', closeError.message);
                }
            }

            if (attempt < maxRetries) {
                const backoffTime = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Esperando ${backoffTime/1000} segundos antes del reintento...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
    }

    throw new Error(`Todos los ${maxRetries} intentos fallaron. Último error: ${lastError.message}`);
}

async function sendconfitmationaccount(userEmail, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let transporter = null;

        try {
            transporter = createTransporter();

            const verifyPromise = transporter.verify();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout en verificación')), 10000)
            );

            await Promise.race([verifyPromise, timeoutPromise]);
            console.log('✅ Conexión SMTP verificada');

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
 < /head>
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

            const sendPromise = transporter.sendMail(mailOptions);
            const sendTimeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout en envío')), 15000)
            );

            const result = await Promise.race([sendPromise, sendTimeoutPromise]);

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

            if (transporter) {
                try {
                    transporter.close();
                } catch (closeError) {
                    console.log('⚠️ Error cerrando transporter:', closeError.message);
                }
            }

            if (attempt < maxRetries) {
                const backoffTime = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Esperando ${backoffTime/1000} segundos antes del reintento...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
    }
    throw new Error(`Todos los ${maxRetries} intentos fallaron. Último error: ${lastError.message}`);
}

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
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 45000,
        debug: false,
        logger: false
    });
}

async function obtenerIdOpuesto(idParametro, idconversacion) {
    try {
        const query = `
            SELECT 
                CASE 
                    WHEN ? = client_id THEN delivery_id
                    WHEN ? = delivery_id THEN client_id
                    ELSE NULL
                END AS id_opuesto
            FROM conversations 
            WHERE (id = ?)
            LIMIT 1
        `;
        
        // USAR connection.promise() para obtener la versión con promesas
        const [rows] = await connection.promise().query(query, [
            idParametro, idParametro, idconversacion
        ]);
        
        if (!rows || rows.length === 0 || rows[0].id_opuesto === null) {
            return null;
        }

        return rows[0].id_opuesto;
    } catch (error) {
        console.error('Error al obtener ID opuesto:', error);
        return null;
    }
}
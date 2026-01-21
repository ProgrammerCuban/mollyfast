//-- Active: 1764399716140@@bwri3movw18oiln4pb5h-mysql.services.clever-cloud.com@3306
const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const http = require('http');
const socketIo = require('socket.io');
const NodeCache = require('node-cache'); // AÑADIDO: Para caché
const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Inicializar caché (60 segundos TTL)
const cache = new NodeCache({ stdTTL: 60 });

const rateLimit = require('express-rate-limit');

// Configuración general para TODAS las rutas
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // límite de 100 peticiones por IP
    message: {
        success: false,
        message: 'Demasiadas peticiones, intenta de nuevo más tarde'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Límite ESPECÍFICO para login (más restrictivo)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // solo 5 intentos de login
    message: {
        success: false,
        message: 'Demasiados intentos de login. Espera 15 minutos.'
    }
});

// Límite ESPECÍFICO para emails (evitar spam)
const emailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // solo 3 emails por hora
    message: {
        success: false,
        message: 'Límite de emails alcanzado. Intenta más tarde.'
    }
});

// Límite para registro de usuarios
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 2, // solo 2 registros por hora por IP
    message: {
        success: false,
        message: 'Límite de registros alcanzado. Intenta más tarde.'
    }
});

// ======================= POOL DE CONEXIÓN CORREGIDO =======================
const pool = mysql.createPool({
    host: 'bwri3movw18oiln4pb5h-mysql.services.clever-cloud.com',
    user: 'ufywen8m7kyqrwjc',
    password: '1kCrbPepW8X3ggZxkRWS',
    database: 'bwri3movw18oiln4pb5h',
    port: 3306,
    ssl: {
        rejectUnauthorized: false
    },
    // CONFIGURACIÓN CRÍTICA PARA CLEVER CLOUD (5 conexiones máximo):
    connectionLimit: 3,            // ¡SÓLO 3! Clever Cloud limita a 5 por usuario
    waitForConnections: true,      // Poner en cola si todas ocupadas
    queueLimit: 50,                // Máximo 50 queries en cola
    idleTimeout: 10000,            // Cerrar conexiones idle después de 10s
    acquireTimeout: 10000,         // 10 segundos máximo para obtener conexión
    timeout: 8000,                 // 8 segundos timeout por operación
    enableKeepAlive: false,        // Desactivar keep-alive para Clever Cloud
    charset: 'utf8mb4'
});

// ======================= MONITOREO DE CONEXIONES =======================
pool.on('acquire', (connection) => {
    console.log(`🔗 Conexión adquirida. Activas: ${pool._allConnections.length}`);
});

pool.on('release', (connection) => {
    console.log(`🔄 Conexión liberada. Activas: ${pool._allConnections.length}`);
});

pool.on('enqueue', () => {
    console.log('⏳ Query en cola de espera');
});

// ======================= FUNCIÓN SEGURA PARA QUERIES =======================
function ejecutarQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error('❌ Error obteniendo conexión:', err.message);
                return reject(err);
            }
            
            connection.query(sql, params, (error, results) => {
                // ¡SIEMPRE liberar la conexión!
                connection.release();
                
                if (error) {
                    console.error('❌ Error en query:', error.message);
                    return reject(error);
                }
                
                resolve(results);
            });
        });
    });
}

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
}, pool);

// Verificar conexión inicial
pool.getConnection((err, connection) => {
    if (err) {
        console.log('❌ Error conectando a MySQL:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos MySQL externa');
        connection.release(); // IMPORTANTE: liberar conexión
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

// ======================= RUTAS EXISTENTES (OPTIMIZADAS) =======================

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
app.get('/viajes/:id', generalLimiter, (req, res) => {
    const id = req.params.id;
    const cacheKey = `viaje_${id}`;
    
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        return res.json({ success: true, viaje: cachedData, cached: true });
    }
    
    const query = 'SELECT * FROM viajes WHERE propietario = ?';

    ejecutarQuery(query, [id])
        .then(results => {
            if (results.length > 0) {
                cache.set(cacheKey, results);
                return res.json({ success: true, viaje: results, cached: false });
            } else {
                return res.json({ success: false, message: 'Viaje no encontrado' });
            }
        })
        .catch(error => {
            return res.json({ success: false, message: 'Error en la base de datos' });
        });
});

// api para obtener un perfil por el id 
app.get('/perfil/:id', generalLimiter, (req, res) => {
    const id = req.params.id;
    const cacheKey = `perfil_${id}`;
    
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        return res.json({ success: true, perfil: cachedData, cached: true });
    }
    
    const query = 'SELECT * FROM usuarios WHERE id = ?';

    ejecutarQuery(query, [id])
        .then(results => {
            if (results.length > 0) {
                cache.set(cacheKey, results);
                return res.json({ success: true, perfil: results, cached: false });
            } else {
                return res.json({ success: false, message: 'perfil no encontrado' });
            }
        })
        .catch(error => {
            return res.json({ success: false, message: 'Error en la base de datos' });
        });
});

// api para obtener todos los viajes 
app.get('/viajes', generalLimiter, (req, res) => {
    const cacheKey = 'viajes_todos';
    
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        console.log("✅ Viajes encontrados (caché)");
        return res.json({ success: true, viajes: cachedData, cached: true });
    }
    
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

    ejecutarQuery(query)
        .then(results => {
            if (results.length > 0) {
                cache.set(cacheKey, results);
                console.log("✅ Viajes encontrados");
                return res.json({ success: true, viajes: results, cached: false });
            } else {
                console.log("❌ No hay viajes");
                return res.json({ success: false, message: 'Viajes no encontrados' });
            }
        })
        .catch(error => {
            console.error("❌ Error en la query de viajes:", error);
            return res.json({ success: false, message: 'Error en la base de datos' });
        });
});

// api para obetener los nombres y los id de todos los usuarios 
app.get('/usuarios-id', generalLimiter, (req, res) => {
    const cacheKey = 'usuarios_ids';
    
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        console.log("✅ Usuarios encontrados (caché)");
        return res.json({ success: true, usuarios: cachedData, cached: true });
    }
    
    const query = 'SELECT id, usuario FROM usuarios';

    ejecutarQuery(query)
        .then(results => {
            if (results.length > 0) {
                cache.set(cacheKey, results);
                console.log("✅ Usuarios encontrados");
                return res.json({ success: true, usuarios: results, cached: false });
            } else {
                console.log("❌ No hay usuarios");
                return res.json({ success: false, message: 'Usuarios no encontrados' });
            }
        })
        .catch(error => {
            console.error("❌ Error en la query de usuarios:", error);
            return res.json({ success: false, message: 'Error en la base de datos' });
        });
});

// api para seleccionar el delivery que escogieron para el viaje y borrar las otras conversaciones con los otros deliverys 
app.get('/api/deliveryescogido-id/:viajeid/:conversationid', generalLimiter, async (req, res) => {
    const { viajeid, conversationid } = req.params;

    try {
        // Primera query
        const query1 = `DELETE FROM messages 
                       WHERE conversation_id IN (
                           SELECT id 
                           FROM conversations 
                           WHERE delivery_request_id = ? 
                           AND id != ? 
                       )`;
        
        await ejecutarQuery(query1, [viajeid, conversationid]);

        // Segunda query
        const query2 = `DELETE FROM conversations 
                       WHERE delivery_request_id = ? 
                       AND id != ?`;
        
        await ejecutarQuery(query2, [viajeid, conversationid]);

        // Invalidar caché relacionado
        cache.del(`viaje_${viajeid}`);
        cache.del('viajes_todos');

        return res.json({ success: true });
    } catch (error) {
        console.error("❌ Error eliminando conversaciones:", error);
        return res.json({ success: false, message: 'Error en la base de datos' });
    }
});

// api que devuelve todas las solicitudes disponibles de inicio de sesion
app.get('/api/get-solicitudes', generalLimiter, (req, res) => {
    const cacheKey = 'solicitudes';
    
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        return res.json({ success: true, usuarios: cachedData, cached: true });
    }
    
    const query = 'SELECT carnet, fotocarnet, selfie, idowner, foto_moto FROM solicitudes';

    ejecutarQuery(query)
        .then(results => {
            if (results.length > 0) {
                cache.set(cacheKey, results);
                return res.json({ success: true, usuarios: results, cached: false });
            } else {
                return res.json({ success: false, message: 'no hay solicitudes' });
            }
        })
        .catch(error => {
            return res.json({ success: false, message: 'Error en la base de datos' });
        });
});

//api para la autenticacion de imagekit que sirve para subir la foto 
app.get('/imagekit-auth', generalLimiter, (req, res) => {
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
app.post('/api/email/solicitud-aceptada', emailLimiter, async(req, res) => {
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
app.post('/loginsecion', loginLimiter, (req, res) => {
    const { user, pass } = req.body;

    console.log(`usuario ${user} se esta logueando`);

    const query = 'SELECT * FROM usuarios WHERE usuario = ? AND contrasena = ?';

    ejecutarQuery(query, [user, pass])
        .then(results => {
            if (results.length > 0) {
                req.session.userId = results[0].id;
                req.session.userName = results[0].usuario;
                req.session.delivery = results[0].delivery;

                console.log("✅ usuario correcto");
                return res.json({
                    success: true,
                    message: 'Usuario correcto',
                    delivery: results[0].delivery
                });
            } else {
                console.log("❌ usuario incorrecto");
                return res.json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }
        })
        .catch(error => {
            console.error("❌ Error en login:", error);
            return res.json({
                success: false,
                message: 'Error en el servidor'
            });
        });
});

// api para desencriptar el nombre de usuario
app.post('/desencript', generalLimiter, (req, res) => {
    const { code } = req.body;
    const user = desencriptarSimple(code);
    return res.json({
        users: user,
    });
});

// api para verificar la contrasena del admin 
app.post('/api/pass-admin', generalLimiter, (req, res) => {
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
app.post('/api/register', registerLimiter, (req, res) => {
    const { username, email, password, delivery } = req.body;

    const checkQuery = 'SELECT id FROM usuarios WHERE usuario = ? OR gmail = ?';

    ejecutarQuery(checkQuery, [username, email])
        .then(results => {
            if (results.length > 0) {
                return res.json({
                    success: false,
                    message: 'El usuario o email ya existen'
                });
            }

            const insertQuery = 'INSERT INTO usuarios (usuario, contrasena, gmail, estado, delivery) VALUES (?, ?, ?, ?, ?)';
            return ejecutarQuery(insertQuery, [username, password, email, 4, delivery]);
        })
        .then(results => {
            console.log(`✅ Usuario ${username} registrado correctamente`);
            
            // Invalidar caché de usuarios
            cache.del('usuarios_ids');
            
            res.json({
                success: true,
                message: 'Usuario creado correctamente',
                userId: results.insertId
            });
        })
        .catch(error => {
            console.error('❌ Error registrando usuario:', error);
            res.json({
                success: false,
                message: 'Error al registrar usuario'
            });
        });
});

// api para subir la solicitud de inicio de sesion 
app.post('/api/subir-solicitud', generalLimiter, (req, res) => {
    const { carnet, fotocarnet, selfie, fotomoto, idowner } = req.body;

    const insertQuery = 'INSERT INTO solicitudes (carnet, fotocarnet, selfie, foto_moto, idowner) VALUES (?, ?, ?, ?, ?)';
    
    ejecutarQuery(insertQuery, [carnet, fotocarnet, selfie, fotomoto, idowner])
        .then(() => {
            // Invalidar caché de solicitudes
            cache.del('solicitudes');
            
            res.json({
                success: true,
                message: 'solicitud enviada correctamente',
            });
        })
        .catch(error => {
            console.error('❌ Error subiendo solicitud:', error);
            res.json({
                success: false,
                message: 'Error al subir la solicitud'
            });
        });
});

// api para encriptar el nombre de usuario
app.post('/encript', generalLimiter, (req, res) => {
    const { user } = req.body;
    const code = encriptarSimple(user);
    console.log(code);
    return res.json({
        coder: code,
    });
});

// api para obtener el id de un nombre de usuario 
app.post('/obtenerid', generalLimiter, (req, res) => {
    const { user } = req.body;
    const cacheKey = `usuario_${user}`;
    
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        return res.json({ success: true, id: cachedData, cached: true });
    }
    
    const query = 'SELECT * FROM usuarios WHERE usuario = ?';

    ejecutarQuery(query, [user])
        .then(results => {
            if (results.length > 0) {
                cache.set(cacheKey, results[0]);
                return res.json({ success: true, id: results[0], cached: false });
            } else {
                return res.json({ success: false, message: 'usuario no encontrado' });
            }
        })
        .catch(error => {
            return res.json({ success: false, message: 'Error en la base de datos' });
        });
});

// api que devuelve si hay solicitud de un usuario o no 
app.post('/api/solicitud-idowner', generalLimiter, (req, res) => {
    const { idowner } = req.body;
    const query = 'SELECT * FROM solicitudes WHERE idowner = ?';

    ejecutarQuery(query, [idowner])
        .then(results => {
            if (results.length > 0) {
                return res.json({ success: false, message: 'espere a que su solicitud este lista, se le enviara un gmail' });
            } else {
                return res.json({ success: true, message: 'no tiene solicitud' });
            }
        })
        .catch(error => {
            return res.json({ success: false, message: 'Error en la base de datos' });
        });
});

// api para guardar los viajes en la bd 
app.post('/guardar-viaje', generalLimiter, (req, res) => {
    const { id, propietario, precio, detalles, provincia_salida, municipio_salida, desde, provincia_llegada, hasta, municipio_llegada, fecha_salida } = req.body;

    let fechaFormateada = fecha_salida;
    if (fecha_salida && typeof fecha_salida === 'string') {
        const fecha = new Date(fecha_salida);
        if (!isNaN(fecha.getTime())) {
            fechaFormateada = fecha.toISOString().split('T')[0];
        }
    }

    const checkQuery = 'SELECT * FROM viajes WHERE id = ?';

    ejecutarQuery(checkQuery, [id])
        .then(results => {
            if (results.length > 0) {
                // Actualizar viaje existente
                const updateQuery = `
                    UPDATE viajes
                    SET propietario = ?, precio = ?, detalles_adicionales = ?, provincia_salida = ?, 
                        municipio_salida = ?, desde = ?, provincia_llegada = ?, municipio_llegada = ?, 
                        hasta = ?, fecha_salida = ?
                    WHERE id = ?
                `;
                return ejecutarQuery(updateQuery, 
                    [propietario, precio, detalles, provincia_salida, municipio_salida, 
                     desde, provincia_llegada, municipio_llegada, hasta, fechaFormateada, id]
                ).then(() => {
                    // Invalidar caché relacionado
                    cache.del(`viaje_${propietario}`);
                    cache.del('viajes_todos');
                    cache.del(`viaje_${id}`);
                    
                    return res.json({ success: true, message: 'Viaje actualizado correctamente' });
                });
            } else {
                // Insertar nuevo viaje
                const insertQuery = 'INSERT INTO viajes (propietario, precio, detalles_adicionales, desde, hasta, provincia_salida, municipio_salida, provincia_llegada, fecha_salida, municipio_llegada) VALUES (?, ?, ?, ? , ? , ? , ? , ? , ?, ?)';
                return ejecutarQuery(insertQuery, 
                    [propietario, precio, detalles, desde, hasta, provincia_salida, 
                     municipio_salida, provincia_llegada, fechaFormateada, municipio_llegada]
                ).then(() => {
                    // Invalidar caché relacionado
                    cache.del(`viaje_${propietario}`);
                    cache.del('viajes_todos');
                    
                    return res.json({ success: true, message: 'Viaje creado correctamente' });
                });
            }
        })
        .catch(error => {
            console.error('❌ Error guardando viaje:', error);
            return res.json({ success: false, message: 'Error al guardar el viaje' });
        });
});

// api para aceptar la solicitud de un usuario 
app.post('/solicitud-aceptada', generalLimiter, (req, res) => {
    const { idowner } = req.body;

    const checkQuery = 'SELECT * FROM usuarios WHERE id = ?';

    ejecutarQuery(checkQuery, [idowner])
        .then(results => {
            if (results.length > 0) {
                const updateQuery = 'UPDATE usuarios SET estado = ? WHERE id = ?';
                return ejecutarQuery(updateQuery, [1, idowner]);
            } else {
                throw new Error('Usuario no encontrado');
            }
        })
        .then(() => {
            // Invalidar caché
            cache.del('solicitudes');
            cache.del(`perfil_${idowner}`);
            
            return res.json({ success: true, message: 'solicitud aceptada correctamente' });
        })
        .catch(error => {
            console.error('❌ Error aceptando solicitud:', error);
            return res.json({ success: false, message: error.message || 'Error al aceptar la solicitud' });
        });
});

// api para cambiar foto de un usuario 
app.post('/change-profile-photo', generalLimiter, (req, res) => {
    const { id, fotoUrl } = req.body;

    const query = 'UPDATE usuarios SET fotoperfil = ? WHERE id = ?';
    
    ejecutarQuery(query, [fotoUrl, id])
        .then(() => {
            // Invalidar caché
            cache.del(`perfil_${id}`);
            
            return res.json({
                success: true,
                message: 'Foto de perfil actualizada correctamente'
            });
        })
        .catch(error => {
            console.error('❌ Error actualizando foto:', error);
            return res.json({
                success: false,
                message: 'Error actualizando foto de perfil'
            });
        });
});

// api para eliminar un viaje en especifico 
app.delete('/eliminar-viaje/:id', generalLimiter, (req, res) => {
    const idViaje = req.params.id;
    const query = 'DELETE FROM viajes WHERE id = ?';

    ejecutarQuery(query, [idViaje])
        .then(results => {
            if (results.affectedRows > 0) {
                // Invalidar caché
                cache.del('viajes_todos');
                cache.del(`viaje_${idViaje}`);
                
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
        })
        .catch(error => {
            console.error('❌ Error al eliminar viaje:', error);
            return res.json({
                success: false,
                message: 'Error del servidor al eliminar el viaje'
            });
        });
});

// api para eliminar una solicitud 
app.delete('/eliminar-solicitud/:id', generalLimiter, (req, res) => {
    const idowner = req.params.id;
    const query = 'DELETE FROM solicitudes WHERE idowner = ?';

    ejecutarQuery(query, [idowner])
        .then(results => {
            if (results.affectedRows > 0) {
                // Invalidar caché
                cache.del('solicitudes');
                
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
        })
        .catch(error => {
            console.error('❌ Error al eliminar la solicitud:', error);
            return res.json({
                success: false,
                message: 'Error del servidor al eliminar la solicitud'
            });
        });
});

// api para cambiar un nombre de usuario 
app.put('/change-username', generalLimiter, (req, res) => {
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

    ejecutarQuery(queryVerificar, [username, id])
        .then(results => {
            if (results.length > 0) {
                console.log('❌ Username ya en uso:', username);
                return res.json({
                    success: false,
                    message: 'Este nombre de usuario ya está en uso, por favor intenta con otro'
                });
            }

            return ejecutarQuery(queryActualizar, [username, id]);
        })
        .then(results => {
            if (results.affectedRows === 0) {
                return res.json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            console.log('✅ Username cambiado exitosamente');
            
            // Invalidar caché
            cache.del(`perfil_${id}`);
            cache.del('usuarios_ids');
            cache.del(`usuario_${username}`);
            
            return res.json({
                success: true,
                message: 'Tu username ha sido cambiado con éxito',
                newUsername: username
            });
        })
        .catch(error => {
            console.error('❌ Error cambiando username:', error);
            return res.json({
                success: false,
                message: 'Error al cambiar el username'
            });
        });
});

// api para cambiar contrasena de un usuario
app.put('/change-password', generalLimiter, (req, res) => {
    const { id, pass } = req.body;

    if (!id || !pass) {
        return res.json({
            success: false,
            message: 'ID y password son requeridos'
        });
    }

    console.log('📝 Cambiando contraseña:', { id });

    const queryActualizar = 'UPDATE usuarios SET contrasena = ? WHERE id = ?';

    ejecutarQuery(queryActualizar, [pass, id])
        .then(results => {
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
        })
        .catch(error => {
            console.error('❌ Error cambiando contraseña:', error);
            return res.json({
                success: false,
                message: 'Error al cambiar la contraseña'
            });
        });
});

// ======================= FUNCIONES DE ENCRIPTACIÓN =======================
function encriptarSimple(texto) {
    let resultado = '';
    for (let i = 0; i < texto.length; i++) {
        resultado += String.fromCharCode(texto.charCodeAt(i) + 3);
    }
    return Buffer.from(resultado, 'binary').toString('base64');
}

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
    const rows = await ejecutarQuery(
        'SELECT id FROM conversations WHERE delivery_request_id = ? AND client_id = ? AND delivery_id = ?',
        [deliveryRequestId, clientId, deliveryId]
    );
    
    if (rows.length > 0) {
        return rows[0].id;
    }
    
    const result = await ejecutarQuery(
        'INSERT INTO conversations (delivery_request_id, client_id, delivery_id) VALUES (?, ?, ?)',
        [deliveryRequestId, clientId, deliveryId]
    );
    
    return result.insertId;
}

// ======================= COLA DE MENSAJES PARA SOCKET.IO =======================
const messageQueue = [];
let processingQueue = false;

async function processMessageQueue() {
    if (processingQueue) return;
    processingQueue = true;
    
    while (messageQueue.length > 0) {
        const data = messageQueue.shift();
        try {
            // Guardar mensaje en DB
            const result = await ejecutarQuery(
                'INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)',
                [data.conversationId, data.senderId, data.message]
            );

            // Recuperar mensaje con metadatos
            const messages = await ejecutarQuery(
                `SELECT m.*, u.usuario as sender_name 
                 FROM messages m 
                 JOIN usuarios u ON m.sender_id = u.id 
                 WHERE m.id = ?`,
                [result.insertId]
            );

            // Emitir a todos en la sala
            io.to(String(data.conversationId)).emit('new_message', messages[0]);

            // Actualizar updated_at de la conversación
            await ejecutarQuery(
                'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [data.conversationId]
            );

            let isactive = false;
            const idrecibe = await obtenerIdOpuesto(data.senderId, data.conversationId);

            for (let [userId, socketId] of activeUsers.entries()) {
                if (userId === idrecibe) {
                    isactive = true;
                    break;
                }
            }

            if (!isactive && idrecibe) {
                await ejecutarQuery(
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
                    [data.senderId, data.senderId, data.conversationId]
                );
            }

            console.log(`📨 Mensaje enviado en conversación ${data.conversationId} por usuario ${data.senderId}`);
        } catch (error) {
            console.error('❌ Error procesando mensaje:', error);
        }
        // Pequeña pausa para evitar saturar
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    processingQueue = false;
}

// ======================= SOCKET.IO (OPTIMIZADO) =======================
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

    // Enviar mensaje dentro de una conversación (usando cola)
    socket.on('send_message', async (data) => {
        const { conversationId, senderId, message } = data;

        if (!conversationId || !senderId || !message || String(message).trim() === '') {
            socket.emit('message_error', { error: 'Datos de mensaje incompletos' });
            return;
        }

        // Agregar a la cola en lugar de procesar inmediatamente
        messageQueue.push({
            conversationId,
            senderId,
            message,
            timestamp: Date.now()
        });
        
        // Iniciar procesamiento si no está en curso
        processMessageQueue();
    });

    socket.on('disconnect', () => {
        console.log('❌ Usuario desconectado:', socket.id);

        // Buscar y eliminar usuario de activeUsers
        for (let [userId, socketId] of activeUsers.entries()) {
            if (socketId === socket.id) {
                activeUsers.delete(userId);
                break;
            }
        }
    });
});

// ======================= SERVIDOR =======================
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto http://localhost:${PORT}`);
});

// ======================= FUNCIONES DE EMAIL =======================
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
        const rows = await ejecutarQuery(
            `SELECT 
                CASE 
                    WHEN ? = client_id THEN delivery_id
                    WHEN ? = delivery_id THEN client_id
                    ELSE NULL
                END AS id_opuesto
            FROM conversations 
            WHERE (id = ?)
            LIMIT 1`,
            [idParametro, idParametro, idconversacion]
        );
        
        if (!rows || rows.length === 0 || rows[0].id_opuesto === null) {
            return null;
        }

        return rows[0].id_opuesto;
    } catch (error) {
        console.error('Error al obtener ID opuesto:', error);
        return null;
    }
}

// ======================= RUTAS DE CHAT OPTIMIZADAS =======================
// (Se mantienen igual que en tu código original, pero usando ejecutarQuery)

// Endpoint: crear/obtener conversación
app.post('/api/conversations/get-or-create', generalLimiter, async (req, res) => {
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
app.get('/api/conversations/:id/messages', generalLimiter, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const rows = await ejecutarQuery(
            `SELECT m.id, m.conversation_id, m.sender_id, m.message, m.is_read, m.created_at,
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
app.get('/api/conversations/by-user/:userId', generalLimiter, async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const rows = await ejecutarQuery(
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
app.get('/api/conversations/by-trip/:tripId', generalLimiter, async (req, res) => {
    try {
        const tripId = Number(req.params.tripId);
        const rows = await ejecutarQuery(
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
app.get('/api/messages/count/viaje/negocio/:idviaje', generalLimiter, async (req, res) => {
    const idviaje = req.params.idviaje;
    
    const rows = await ejecutarQuery(
        `SELECT SUM(cnl) AS total_cnl
         FROM conversations
         WHERE delivery_request_id = ?`,
        [idviaje]
    );
    
    const totalCnl = rows[0].total_cnl || 0;
    return res.json({ success: true, data: totalCnl });
});

// cantidad de sms perdidos por viajes para los negocios
app.get('/api/messages/count/chat/negocio/:idviaje', generalLimiter, async (req, res) => {
    const idviaje = req.params.idviaje;
    
    const rows = await ejecutarQuery(
        `SELECT COUNT(*) as total
         FROM conversations
         WHERE delivery_request_id = ? 
         AND cnl > 0`,
        [idviaje]
    );
    
    const total = rows[0].total || 0;
    return res.json({ success: true, total: total });
});

// cantidad de sms por chat con el id de la conversacion para negocios
app.get('/api/messages/count/:conversationid', generalLimiter, async (req, res) => {
    const conversationid = req.params.conversationid;
    
    const rows = await ejecutarQuery(
        `SELECT cnl AS total_cnl
         FROM conversations
         WHERE id = ?`,
        [conversationid]
    );
    
    const totalCnl = rows[0].total_cnl || 0;
    return res.json({ success: true, total: totalCnl });
});

// GET /api/conversations/:conversationId/unread-count
app.get('/api/conversations/:conversationId/unread-count', generalLimiter, async (req, res) => {
    const conversationId = req.params.conversationId;
    
    const rows = await ejecutarQuery(
        `SELECT * FROM conversations WHERE id = ?`,
        [conversationId]
    );
    
    if (rows.length > 0) {
        return res.json({ success: true, unreadCount: rows[0].cnl });
    } else {
        return res.json({ success: false, message: 'Conversación no encontrada' });
    }
});

// POST /api/conversations/:conversationId/mark-as-read
app.post('/api/conversations/:conversationId/mark-as-read', generalLimiter, async (req, res) => {
    const conversationId = req.params.conversationId;
    const { userId } = req.body;
    
    await ejecutarQuery(
        `UPDATE conversations SET cnl = 0 WHERE id = ?`,
        [conversationId]
    );
    
    return res.json({ success: true, message: 'Mensajes marcados como leídos' });
});

// GET /api/messages/:id/:conversacionid/read
app.get('/api/messages/:id/:conversacionid/read', generalLimiter, async (req, res) => {
    const id = Number(req.params.id);
    const conversacionid = Number(req.params.conversacionid);
    
    try {
        if (id == 1) {
            await ejecutarQuery(
                `UPDATE conversations SET cnl = 0 WHERE id = ?`,
                [conversacionid]
            );
        } else {
            await ejecutarQuery(
                `UPDATE conversations SET dnl = 0 WHERE id = ?`,
                [conversacionid]
            );
        }
        return res.json({ success: true });
    } catch (error) {
        console.error(error);
        return res.json({ success: false });
    }
});

// GET /api/conversations/by-trip/:viajeId/unread-count/:userId
app.get('/api/conversations/by-trip/:viajeId/unread-count/:userId', generalLimiter, async (req, res) => {
    const viajeId = req.params.viajeId;
    const userId = req.params.userId;
    
    const rows = await ejecutarQuery(
        `SELECT * FROM conversations WHERE delivery_request_id = ? AND delivery_id = ?`,
        [viajeId, userId]
    );
    
    if (rows.length > 0) {
        return res.json({ success: true, unreadCount: rows[0].dnl });
    } else {
        return res.json({ success: false, error: 'Conversación no encontrada' });
    }
});

// GET /api/conversations/by-user/:userId/unread-summary
app.get('/api/conversations/by-user/:userId/unread-summary', generalLimiter, async (req, res) => {
    const userid = req.params.userId;
    
    const rows = await ejecutarQuery(
        `SELECT COUNT(*) as total
         FROM conversations
         WHERE delivery_id = ? 
         AND dnl > 0`,
        [userid]
    );
    
    if (rows.length > 0) {
        return res.json({ success: true, viajesConMensajes: rows[0].total });
    } else {
        return res.json({ success: false, message: 'Error al buscar mensajes perdidos' });
    }
});
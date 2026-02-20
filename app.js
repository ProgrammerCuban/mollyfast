// app.js - PUNTO DE ENTRADA PRINCIPAL
const express = require('express');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
const http = require('http');
const socketIo = require('socket.io');

// Importar configuración de base de datos
const { pool } = require('./backend/config/database');

// Importar rutas organizadas
const authRoutes = require('./backend/routes/authRoutes');
const usuarioRoutes = require('./backend/routes/usuarioRoutes');
const viajeRoutes = require('./backend/routes/viajeRoutes');
const chatRoutes = require('./backend/routes/chatRoutes');

// ===== NUEVAS IMPORTACIONES PARA SSE =====
const notificationRoutes = require('./backend/routes/notificationRoutes');
const smsNotificationService = require('./backend/services/smsNotificationService');
// =========================================

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Socket.io config
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Configurar session store
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
}, pool);  // Usar el pool compartido

// Middleware
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

// Servir archivos estáticos
app.use(express.static('public'));
app.use(express.static('public/admin'));

// ======================= RUTAS PRINCIPALES =======================

// Rutas de archivos HTML
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login/login.html'));
});

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/login/login.html'));
});

app.get('/image', (req, res) => {
    res.sendFile(path.join(__dirname, '1.png'));
});

// API Routes
app.use('/api/email', require('./backend/services/emailService').routes);
app.use('/', authRoutes);
app.use('/', usuarioRoutes);
app.use('/', viajeRoutes);
app.use('/', chatRoutes);

// ===== NUEVAS RUTAS PARA NOTIFICACIONES =====
app.use('/api/notifications', notificationRoutes);
// ============================================

// Ruta para ImageKit
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

// Middleware de autenticación
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

// ======================= SOCKET.IO =======================
const { setupSocketIO } = require('./backend/services/chatSocketService');
setupSocketIO(io, pool);

// ===== INICIAR SERVICIO DE NOTIFICACIONES =====
smsNotificationService.start();
// ==============================================

// ======================= INICIAR SERVIDOR =======================
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto http://localhost:${PORT}`);
    console.log(`📡 SSE endpoint: http://localhost:${PORT}/api/notifications/stream`);
});

// Manejar cierre graceful
process.on('SIGINT', () => {
    console.log('🛑 Cerrando servidor...');
    smsNotificationService.stop();
    process.exit();
});

process.on('SIGTERM', () => {
    console.log('🛑 Cerrando servidor...');
    smsNotificationService.stop();
    process.exit();
});

module.exports = { app, server };
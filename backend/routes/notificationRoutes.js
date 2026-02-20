// backend/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const Notificacion = require('../models/Notificacion');
const sseManager = require('../config/sseManager');

const checkSession = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
    }
    next();
};

// ENDPOINT SSE
router.get('/stream', checkSession, (req, res) => {
    const userId = req.session.userId;

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true'
    });

    res.write(': connected\n\n');
    res.write(`event: connected\ndata: ${JSON.stringify({ userId, timestamp: new Date().toISOString() })}\n\n`);

    sseManager.addClient(userId, res);

    // Enviar no leídas al conectar
    (async () => {
        try {
            const notificaciones = await Notificacion.getUnread(userId);
            const unreadCount = await Notificacion.countUnread(userId);

            if (notificaciones.length > 0) {
                res.write(`event: pending\ndata: ${JSON.stringify({ count: notificaciones.length, notifications: notificaciones })}\n\n`);
            }

            res.write(`event: count\ndata: ${JSON.stringify({ unread: unreadCount })}\n\n`);
        } catch (error) {
            console.error('Error enviando pendientes:', error);
        }
    })();

    const heartbeat = setInterval(() => {
        if (!res.writableEnded) {
            res.write(': heartbeat\n\n');
        }
    }, 15000);

    req.on('close', () => {
        clearInterval(heartbeat);
        sseManager.removeClient(userId);
    });
});

// Obtener notificaciones
router.get('/', checkSession, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { page = 1, limit = 20 } = req.query;

        const notificaciones = await Notificacion.getByUser(userId, page, limit);
        const unreadCount = await Notificacion.countUnread(userId);

        res.json({ success: true, data: notificaciones, unreadCount });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener notificaciones' });
    }
});

// Obtener solo no leídas
router.get('/unread', checkSession, async (req, res) => {
    try {
        const userId = req.session.userId;
        const notificaciones = await Notificacion.getUnread(userId);
        const count = await Notificacion.countUnread(userId);
        res.json({ success: true, data: notificaciones, count });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
});

// Contador
router.get('/count', checkSession, async (req, res) => {
    try {
        const userId = req.session.userId;
        const count = await Notificacion.countUnread(userId);
        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
});

// Marcar como leída
router.put('/:id/read', checkSession, async (req, res) => {
    try {
        const userId = req.session.userId;
        const notificationId = req.params.id;

        const success = await Notificacion.markAsRead(notificationId, userId);

        if (success) {
            const unreadCount = await Notificacion.countUnread(userId);
            sseManager.sendToUser(userId, 'count_update', { unread: unreadCount, notificationId });
            res.json({ success: true, unreadCount });
        } else {
            res.status(404).json({ success: false, message: 'No encontrada' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
});

// Marcar todas como leídas
router.put('/read-all', checkSession, async (req, res) => {
    try {
        const userId = req.session.userId;
        const markedCount = await Notificacion.markAllAsRead(userId);
        sseManager.sendToUser(userId, 'count_update', { unread: 0 });
        res.json({ success: true, markedCount });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error' });
    }
});

module.exports = router;
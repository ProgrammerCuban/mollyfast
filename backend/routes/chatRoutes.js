// backend/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const Conversacion = require('../models/Conversacion');

// Crear/obtener conversación
router.post('/api/conversations/get-or-create', async (req, res) => {
    try {
        const { deliveryRequestId, clientId, deliveryId } = req.body;
        
        if (!deliveryRequestId || !clientId || !deliveryId) {
            return res.json({ success: false, message: 'Datos incompletos' });
        }
        
        const conversationId = await Conversacion.getOrCreate(deliveryRequestId, clientId, deliveryId);
        return res.json({ success: true, conversationId });
    } catch (err) {
        console.error('❌ Error get-or-create:', err);
        return res.json({ success: false, message: 'No se pudo crear/obtener la conversación' });
    }
});

// Obtener mensajes de conversación
router.get('/api/conversations/:id/messages', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const messages = await Conversacion.getMessages(conversationId);
        return res.json({ success: true, messages });
    } catch (err) {
        console.error('❌ Error cargando historial:', err);
        return res.json({ success: false, message: 'No se pudo cargar el historial' });
    }
});

// Obtener conversaciones por usuario
router.get('/api/conversations/by-user/:userId', async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const conversations = await Conversacion.getByUser(userId);
        return res.json({ success: true, conversations });
    } catch (err) {
        console.error('❌ Error listando conversaciones:', err);
        return res.json({ success: false, message: 'No se pudieron listar las conversaciones' });
    }
});

// Obtener conversaciones por viaje
router.get('/api/conversations/by-trip/:tripId', async (req, res) => {
    try {
        const tripId = Number(req.params.tripId);
        const deliveries = await Conversacion.getByTrip(tripId);
        return res.json({ success: true, deliveries });
    } catch (err) {
        console.error('❌ Error listando deliveries por viaje:', err);
        return res.json({ success: false, message: 'No se pudieron listar las conversaciones' });
    }
});

// Contador de mensajes por viaje
router.get('/api/messages/count/viaje/negocio/:idviaje', async (req, res) => {
    const idviaje = req.params.idviaje;

    try {
        const conversations = await Conversacion.getByTrip(idviaje);
        const totalCnl = conversations.reduce((sum, conv) => sum + (conv.cnl || 0), 0);
        return res.json({ success: true, data: totalCnl });
    } catch (error) {
        console.error('Error contando mensajes:', error);
        return res.json({ success: false, message: 'Error' });
    }
});

// Cantidad de chats con mensajes perdidos por viaje
router.get('/api/messages/count/chat/negocio/:idviaje', async (req, res) => {
    const idviaje = req.params.idviaje;

    try {
        const conversations = await Conversacion.getByTrip(idviaje);
        const total = conversations.filter(conv => conv.cnl > 0).length;
        return res.json({ success: true, total });
    } catch (error) {
        console.error('Error contando chats:', error);
        return res.json({ success: false, message: 'Error' });
    }
});

// Cantidad de mensajes por conversación
router.get('/messages/count/:conversationid', async (req, res) => {
    const conversationid = req.params.conversationid;

    try {
        const conversations = await Conversacion.getByTrip(conversationid);
        const totalCnl = conversations.length > 0 ? conversations[0].cnl || 0 : 0;
        return res.json({ success: true, total: totalCnl });
    } catch (error) {
        console.error('Error contando mensajes:', error);
        return res.json({ success: false, message: 'Error' });
    }
});

// Obtener contador de no leídos
router.get('/api/conversations/:conversationId/unread-count', async (req, res) => {
    const conversationId = req.params.conversationId;

    try {
        const conversations = await Conversacion.getByTrip(conversationId);
        const unreadCount = conversations.length > 0 ? conversations[0].cnl || 0 : 0;
        return res.json({ success: true, unreadCount });
    } catch (error) {
        console.error('Error obteniendo contador:', error);
        return res.json({ success: false, message: 'Error' });
    }
});

// Marcar como leído
router.post('/api/conversations/:conversationId/mark-as-read', async (req, res) => {
    const conversationId = req.params.conversationId;
    const { userId } = req.body;

    try {
        // Determinar si es delivery o cliente (esto depende de tu lógica)
        const isDelivery = false; // Cambiar según tu lógica
        
        await Conversacion.markAsRead(conversationId, isDelivery);
        return res.json({ success: true, message: 'Mensajes marcados como leídos' });
    } catch (error) {
        console.error('Error marcando como leído:', error);
        return res.json({ success: false, message: 'Error' });
    }
});

// Marcar mensajes como leídos (alternativa)
router.get('/api/messages/:id/:conversacionid/read', async (req, res) => {
    const id = Number(req.params.id);
    const conversacionid = Number(req.params.conversacionid);

    try {
        if (id == 1) {
            await Conversacion.markAsRead(conversacionid, false); // Cliente
        } else {
            await Conversacion.markAsRead(conversacionid, true); // Delivery
        }
        return res.json({ success: true });
    } catch (error) {
        console.error(error);
        return res.json({ success: false });
    }
});

// Obtener contador de no leídos por viaje y usuario
router.get('/api/conversations/by-trip/:viajeId/unread-count/:userId', async (req, res) => {
    const viajeId = req.params.viajeId;
    const userId = req.params.userId;

    try {
        const conversations = await Conversacion.getByTrip(viajeId);
        const userConversation = conversations.find(conv => conv.delivery_id == userId);
        
        if (userConversation) {
            return res.json({ success: true, unreadCount: userConversation.dnl || 0 });
        } else {
            return res.json({ success: true, unreadCount: 0 });
        }
    } catch (error) {
        console.error('Error obteniendo contador:', error);
        return res.json({ success: false, error: 'Error' });
    }
});

// Resumen de mensajes no leídos por usuario
router.get('/api/conversations/by-user/:userId/unread-summary', async (req, res) => {
    const userid = req.params.userId;

    try {
        const conversations = await Conversacion.getByUser(userid);
        const viajesConMensajes = conversations.filter(conv => conv.dnl > 0).length;
        return res.json({ success: true, viajesConMensajes });
    } catch (error) {
        console.error('Error obteniendo resumen:', error);
        return res.json({ success: false, message: 'Error al buscar la cantidad de sms perdidos por viaje' });
    }
});

// Seleccionar delivery y eliminar otras conversaciones
router.get('/deliveryescogido-id/:viajeid/:conversationid', async (req, res) => {
    const { viajeid, conversationid } = req.params;

    try {
        const deletedCount = await Conversacion.deleteExcept(viajeid, conversationid);
        return res.json({ success: true, deletedCount });
    } catch (error) {
        console.error('Error eliminando conversaciones:', error);
        return res.json({ success: false, message: 'Error en la query' });
    }
});

module.exports = router;


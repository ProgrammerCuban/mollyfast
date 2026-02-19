// backend/models/Conversacion.js
const { query } = require('../config/database');

const Conversacion = {
    // Crear o obtener conversación
    async getOrCreate(deliveryRequestId, clientId, deliveryId) {
        const results = await query(
            'SELECT id FROM conversations WHERE delivery_request_id = ? AND client_id = ? AND delivery_id = ?',
            [deliveryRequestId, clientId, deliveryId]
        );
        
        if (results.length > 0) {
            return results[0].id;
        }
        
        const result = await query(
            'INSERT INTO conversations (delivery_request_id, client_id, delivery_id) VALUES (?, ?, ?)',
            [deliveryRequestId, clientId, deliveryId]
        );
        return result.insertId;
    },

    // Obtener mensajes de una conversación
    async getMessages(conversationId) {
        const results = await query(`
            SELECT m.id, m.conversation_id, m.sender_id, m.message, m.is_read, m.created_at,
                   u.usuario AS sender_name
            FROM messages m
            JOIN usuarios u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
        `, [conversationId]);
        return results;
    },

    // Obtener conversaciones de un usuario
    async getByUser(userId) {
        const results = await query(`
            SELECT c.id AS conversation_id, c.delivery_request_id, c.client_id, c.delivery_id,
                   c.created_at, c.updated_at, c.cnl, c.dnl,
                   uc.usuario AS client_name, ud.usuario AS delivery_name
            FROM conversations c
            JOIN usuarios uc ON c.client_id = uc.id
            JOIN usuarios ud ON c.delivery_id = ud.id
            WHERE c.client_id = ? OR c.delivery_id = ?
            ORDER BY c.updated_at DESC
        `, [userId, userId]);
        return results;
    },

    // Obtener conversaciones por viaje
    async getByTrip(tripId) {
        const results = await query(`
            SELECT c.id AS conversation_id, c.delivery_id, u.usuario AS delivery_name,
                   c.client_id, c.delivery_request_id, c.updated_at, c.cnl, c.dnl,
                   (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS messages_count,
                   (SELECT MAX(m.created_at) FROM messages m WHERE m.conversation_id = c.id) AS last_message_at
            FROM conversations c
            JOIN usuarios u ON c.delivery_id = u.id
            WHERE c.delivery_request_id = ?
            ORDER BY last_message_at DESC
        `, [tripId]);
        return results;
    },

    // Enviar mensaje
    async sendMessage(conversationId, senderId, message) {
        const result = await query(
            'INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)',
            [conversationId, senderId, message]
        );
        
        // Actualizar timestamp
        await query(
            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [conversationId]
        );
        
        return result.insertId;
    },

    // Obtener mensaje por ID
    async getMessageById(messageId) {
        const results = await query(`
            SELECT m.*, u.usuario as sender_name
            FROM messages m
            JOIN usuarios u ON m.sender_id = u.id
            WHERE m.id = ?
        `, [messageId]);
        return results.length > 0 ? results[0] : null;
    },

    // Actualizar contadores de mensajes no leídos
    async updateUnreadCounts(conversationId, senderId, isDelivery) {
        if (isDelivery) {
            await query(
                'UPDATE conversations SET dnl = dnl + 1 WHERE id = ?',
                [conversationId]
            );
        } else {
            await query(
                'UPDATE conversations SET cnl = cnl + 1 WHERE id = ?',
                [conversationId]
            );
        }
    },

    // Marcar como leído
    async markAsRead(conversationId, isDelivery) {
        if (isDelivery) {
            await query('UPDATE conversations SET dnl = 0 WHERE id = ?', [conversationId]);
        } else {
            await query('UPDATE conversations SET cnl = 0 WHERE id = ?', [conversationId]);
        }
    },

    // Obtener ID opuesto en conversación
    async getOppositeId(userId, conversationId) {
        const results = await query(`
            SELECT 
                CASE 
                    WHEN ? = client_id THEN delivery_id
                    WHEN ? = delivery_id THEN client_id
                    ELSE NULL
                END AS id_opuesto
            FROM conversations 
            WHERE id = ?
            LIMIT 1
        `, [userId, userId, conversationId]);
        
        return results.length > 0 ? results[0].id_opuesto : null;
    },

    // Eliminar conversaciones de un viaje (excepto una)
    async deleteExcept(viajeid, conversationid) {
        // Eliminar mensajes
        await query(`
            DELETE FROM messages 
            WHERE conversation_id IN (
                SELECT id 
                FROM conversations 
                WHERE delivery_request_id = ? 
                AND id != ?
            )
        `, [viajeid, conversationid]);

        // Eliminar conversaciones
        const result = await query(`
            DELETE FROM conversations 
            WHERE delivery_request_id = ? 
            AND id != ?
        `, [viajeid, conversationid]);
        
        return result.affectedRows;
    }
};

module.exports = Conversacion;
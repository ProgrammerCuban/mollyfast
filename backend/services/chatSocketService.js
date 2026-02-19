// backend/services/chatSocketService.js
const Conversacion = require('../models/Conversacion');

const activeUsers = new Map();

function setupSocketIO(io, pool) {
    io.on('connection', (socket) => {
        console.log('✅ Usuario conectado al chat:', socket.id);

        // Unirse a una conversación específica
        socket.on('join_conversation', async (data) => {
            const { conversationId, userId } = data;
            const room = String(conversationId);
            socket.join(room);
            if (userId) {
                activeUsers.set(userId, socket.id);
            }
            console.log(`💬 Usuario ${userId} unido a conversación ${room}`);
        });

        // Enviar mensaje
        socket.on('send_message', async (data) => {
            const { conversationId, senderId, message } = data;

            if (!conversationId || !senderId || !message || String(message).trim() === '') {
                socket.emit('message_error', { error: 'Datos de mensaje incompletos' });
                return;
            }

            try {
                // Guardar mensaje
                const messageId = await Conversacion.sendMessage(conversationId, senderId, message);
                
                // Obtener mensaje completo
                const savedMessage = await Conversacion.getMessageById(messageId);
                
                // Emitir a todos en la sala
                io.to(String(conversationId)).emit('new_message', savedMessage);

                // Verificar si el destinatario está activo
                const idrecibe = await Conversacion.getOppositeId(senderId, conversationId);
                let isActive = false;

                for (let [userId, socketId] of activeUsers.entries()) {
                    if (userId === idrecibe) {
                        isActive = true;
                        break;
                    }
                }

                // Si no está activo, incrementar contadores
                if (!isActive && idrecibe) {
                    // Determinar si el sender es delivery (1) o cliente (0)
                    // Esto depende de tu lógica de negocio
                    const isDelivery = false; // Cambiar según tu lógica
                    await Conversacion.updateUnreadCounts(conversationId, senderId, isDelivery);
                }

                console.log(`📨 Mensaje enviado en conversación ${conversationId} por usuario ${senderId}`);
            } catch (error) {
                console.error('❌ Error enviando mensaje:', error);
                socket.emit('message_error', { error: 'No se pudo enviar el mensaje' });
            }
        });

        // Desconexión
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
}

module.exports = { setupSocketIO };
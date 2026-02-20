// backend/services/smsNotificationService.js
const { query } = require('../config/database');
const Notificacion = require('../models/Notificacion');
const sseManager = require('../config/sseManager');

class SMSNotificationService {
    constructor() {
        this.isRunning = false;
        this.intervalTime = 5000;
        this.intervalId = null;
    }

    start() {
        if (this.isRunning) {
            console.log('⚠️ Servicio de notificaciones ya está corriendo');
            return;
        }

        console.log('🚀 Iniciando servicio de notificaciones...');
        this.isRunning = true;
        
        this.intervalId = setInterval(() => {
            this.checkMissedSMS();
        }, this.intervalTime);

        setInterval(() => {
            this.cleanOldNotifications();
        }, 86400000);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.isRunning = false;
            console.log('🛑 Servicio de notificaciones detenido');
        }
    }

    async checkMissedSMS() {
        try {
            const missedSMS = await query(`
                SELECT 
                    s.*,
                    u.id as usuario_id,
                    u.usuario as usuario_nombre
                FROM sms s
                INNER JOIN usuarios u ON s.telefono_destino = u.telefono
                WHERE s.estado = 'perdido' 
                AND s.notificado = 0
                LIMIT 20
            `);

            for (const sms of missedSMS) {
                await this.processMissedSMS(sms);
            }
        } catch (error) {
            console.error('Error verificando SMS:', error);
        }
    }

    async processMissedSMS(sms) {
        try {
            const titulo = '📱 SMS perdido recibido';
            const mensaje = `Tienes un mensaje de ${sms.remitente || 'desconocido'}`;
            const datos = {
                smsId: sms.id,
                remitente: sms.remitente,
                contenido: sms.contenido ? sms.contenido.substring(0, 100) : null,
                telefono_destino: sms.telefono_destino,
                fecha: sms.fecha
            };

            const notificacionId = await Notificacion.create(
                sms.usuario_id,
                'sms_perdido',
                titulo,
                mensaje,
                datos
            );

            await query('UPDATE sms SET notificado = 1 WHERE id = ?', [sms.id]);

            const unreadCount = await Notificacion.countUnread(sms.usuario_id);

            const notification = {
                id: notificacionId,
                type: 'sms_perdido',
                title: titulo,
                message: mensaje,
                data: datos,
                timestamp: new Date().toISOString(),
                unreadCount: unreadCount
            };

            sseManager.sendToUser(sms.usuario_id, 'notification', notification);
            
            console.log(`✅ Notificación SMS enviada a usuario ${sms.usuario_id}`);

        } catch (error) {
            console.error('Error procesando SMS:', error);
        }
    }

    async notifyDeliveryAccepted(usuarioId, usuarioNombre) {
        try {
            const titulo = '✅ Solicitud de delivery aceptada';
            const mensaje = `¡Felicidades ${usuarioNombre}! Tu solicitud ha sido aceptada.`;
            
            const notificacionId = await Notificacion.create(
                usuarioId,
                'delivery_aceptado',
                titulo,
                mensaje,
                { tipo: 'aceptacion_delivery' }
            );

            const unreadCount = await Notificacion.countUnread(usuarioId);

            const notification = {
                id: notificacionId,
                type: 'delivery_aceptado',
                title: titulo,
                message: mensaje,
                timestamp: new Date().toISOString(),
                unreadCount: unreadCount
            };

            sseManager.sendToUser(usuarioId, 'notification', notification);
            
        } catch (error) {
            console.error('Error notificando aceptación:', error);
        }
    }

    async cleanOldNotifications() {
        try {
            const deleted = await Notificacion.deleteOld();
            if (deleted > 0) {
                console.log(`🧹 Eliminadas ${deleted} notificaciones antiguas`);
            }
        } catch (error) {
            console.error('Error limpiando notificaciones:', error);
        }
    }
}

module.exports = new SMSNotificationService();
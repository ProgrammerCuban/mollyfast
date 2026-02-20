// backend/models/Notificacion.js
const { query } = require('../config/database');

const Notificacion = {
    async create(usuarioId, tipo, titulo, mensaje, datos = null) {
        const result = await query(
            `INSERT INTO notificaciones 
            (usuario_id, tipo, titulo, mensaje, datos, fecha_creacion, leida) 
            VALUES (?, ?, ?, ?, ?, NOW(), 0)`,
            [usuarioId, tipo, titulo, mensaje, datos ? JSON.stringify(datos) : null]
        );
        return result.insertId;
    },

    async getByUser(usuarioId, page = 1, limit = 20, tipo = null) {
        const offset = (page - 1) * limit;
        
        let sql = 'SELECT * FROM notificaciones WHERE usuario_id = ?';
        const params = [usuarioId];

        if (tipo) {
            sql += ' AND tipo = ?';
            params.push(tipo);
        }

        sql += ' ORDER BY fecha_creacion DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return await query(sql, params);
    },

    async getUnread(usuarioId) {
        return await query(
            'SELECT * FROM notificaciones WHERE usuario_id = ? AND leida = 0 ORDER BY fecha_creacion DESC',
            [usuarioId]
        );
    },

    async countUnread(usuarioId) {
        const result = await query(
            'SELECT COUNT(*) as total FROM notificaciones WHERE usuario_id = ? AND leida = 0',
            [usuarioId]
        );
        return result[0].total;
    },

    async markAsRead(id, usuarioId) {
        const result = await query(
            'UPDATE notificaciones SET leida = 1, fecha_lectura = NOW() WHERE id = ? AND usuario_id = ?',
            [id, usuarioId]
        );
        return result.affectedRows > 0;
    },

    async markAllAsRead(usuarioId) {
        const result = await query(
            'UPDATE notificaciones SET leida = 1, fecha_lectura = NOW() WHERE usuario_id = ? AND leida = 0',
            [usuarioId]
        );
        return result.affectedRows;
    },

    async delete(id, usuarioId) {
        const result = await query(
            'DELETE FROM notificaciones WHERE id = ? AND usuario_id = ?',
            [id, usuarioId]
        );
        return result.affectedRows > 0;
    },

    async deleteOld() {
        const result = await query(
            "DELETE FROM notificaciones WHERE fecha_creacion < DATE_SUB(NOW(), INTERVAL 30 DAY)"
        );
        return result.affectedRows;
    }
};

module.exports = Notificacion;
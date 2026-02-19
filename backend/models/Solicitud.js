// backend/models/Solicitud.js
const { query } = require('../config/database');

const Solicitud = {
    // Obtener todas las solicitudes
    async getAll() {
        const results = await query('SELECT carnet, fotocarnet, selfie, idowner, foto_moto FROM solicitudes');
        return results;
    },

    // Crear solicitud
    async create(carnet, fotocarnet, selfie, foto_moto, idowner) {
        const result = await query(
            'INSERT INTO solicitudes (carnet, fotocarnet, selfie, foto_moto, idowner) VALUES (?, ?, ?, ?, ?)',
            [carnet, fotocarnet, selfie, foto_moto, idowner]
        );
        return result.insertId;
    },

    // Eliminar solicitud por idowner
    async deleteByOwner(idowner) {
        const result = await query('DELETE FROM solicitudes WHERE idowner = ?', [idowner]);
        return result.affectedRows > 0;
    }
};

module.exports = Solicitud;
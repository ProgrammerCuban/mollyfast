// backend/models/Viaje.js
const { query } = require('../config/database');

const Viaje = {
    // Obtener todos los viajes
    async getAll() {
        const results = await query(`
            SELECT id, propietario, precio, detalles_adicionales,
                   desde, hasta, provincia_salida, municipio_salida,
                   provincia_llegada, municipio_llegada, fecha_salida
            FROM viajes
        `);
        return results;
    },

    // Obtener viajes por propietario
    async getByPropietario(propietarioId) {
        const results = await query('SELECT * FROM viajes WHERE propietario = ?', [propietarioId]);
        return results;
    },

    // Obtener viaje por ID
    async getById(id) {
        const results = await query('SELECT * FROM viajes WHERE id = ?', [id]);
        return results.length > 0 ? results[0] : null;
    },

    // Guardar o actualizar viaje
    async saveOrUpdate(viajeData) {
        const { id, propietario, precio, detalles, provincia_salida, municipio_salida, desde, 
                provincia_llegada, hasta, municipio_llegada, fecha_salida } = viajeData;

        let fechaFormateada = fecha_salida;
        if (fecha_salida && typeof fecha_salida === 'string') {
            const fecha = new Date(fecha_salida);
            if (!isNaN(fecha.getTime())) {
                fechaFormateada = fecha.toISOString().split('T')[0];
            }
        }

        // Verificar si existe
        const existe = await this.getById(id);
        
        if (existe) {
            // Actualizar
            const result = await query(`
                UPDATE viajes
                SET propietario = ?, precio = ?, detalles_adicionales = ?, 
                    provincia_salida = ?, municipio_salida = ?, desde = ?, 
                    provincia_llegada = ?, municipio_llegada = ?, hasta = ?, 
                    fecha_salida = ?
                WHERE id = ?
            `, [propietario, precio, detalles, provincia_salida, municipio_salida, 
                desde, provincia_llegada, municipio_llegada, hasta, fechaFormateada, id]);
            return { success: result.affectedRows > 0, action: 'updated' };
        } else {
            // Insertar
            const result = await query(`
                INSERT INTO viajes (propietario, precio, detalles_adicionales, desde, 
                                   hasta, provincia_salida, municipio_salida, 
                                   provincia_llegada, fecha_salida, municipio_llegada)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [propietario, precio, detalles, desde, hasta, provincia_salida, 
                municipio_salida, provincia_llegada, fechaFormateada, municipio_llegada]);
            return { success: true, insertId: result.insertId, action: 'created' };
        }
    },

    // Eliminar viaje
    async delete(id) {
        const result = await query('DELETE FROM viajes WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = Viaje;
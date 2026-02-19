// backend/models/Usuario.js
const { query } = require('../config/database');

const Usuario = {
    // Obtener todos los usuarios
    async getAll() {
        const results = await query('SELECT id, usuario FROM usuarios');
        return results;
    },

    // Obtener perfil por ID
    async getById(id) {
        const results = await query('SELECT * FROM usuarios WHERE id = ?', [id]);
        return results;
    },

    // Login
    async login(usuario, contrasena) {
        const results = await query(
            'SELECT * FROM usuarios WHERE usuario = ? AND contrasena = ?',
            [usuario, contrasena]
        );
        return results;
    },

    // Registrar usuario
    async register(usuario, gmail, contrasena, delivery = 0) {
        // Verificar si ya existe
        const existe = await query(
            'SELECT id FROM usuarios WHERE usuario = ? OR gmail = ?',
            [usuario, gmail]
        );
        
        if (existe.length > 0) {
            return { error: 'El usuario o email ya existen' };
        }

        const result = await query(
            'INSERT INTO usuarios (usuario, contrasena, gmail, estado, delivery) VALUES (?, ?, ?, ?, ?)',
            [usuario, contrasena, gmail, 4, delivery]
        );
        
        return { insertId: result.insertId };
    },

    // Obtener por nombre de usuario
    async getByUsername(username) {
        const results = await query('SELECT * FROM usuarios WHERE usuario = ?', [username]);
        return results.length > 0 ? results[0] : null;
    },

    // Cambiar foto de perfil
    async updatePhoto(id, fotoUrl) {
        const result = await query(
            'UPDATE usuarios SET fotoperfil = ? WHERE id = ?',
            [fotoUrl, id]
        );
        return result.affectedRows > 0;
    },

    // Cambiar username
    async updateUsername(id, username) {
        // Verificar si el username ya está en uso
        const existe = await query(
            'SELECT id FROM usuarios WHERE usuario = ? AND id != ?',
            [username, id]
        );
        
        if (existe.length > 0) {
            return { error: 'Username ya en uso' };
        }

        const result = await query(
            'UPDATE usuarios SET usuario = ? WHERE id = ?',
            [username, id]
        );
        return result.affectedRows > 0;
    },

    // Cambiar contraseña
    async updatePassword(id, newPassword) {
        const result = await query(
            'UPDATE usuarios SET contrasena = ? WHERE id = ?',
            [newPassword, id]
        );
        return result.affectedRows > 0;
    },

    // Verificar solicitud por idowner
    async checkSolicitud(idowner) {
        const results = await query('SELECT * FROM solicitudes WHERE idowner = ?', [idowner]);
        return results.length > 0;
    },

    // Aceptar solicitud
    async aceptarSolicitud(idowner) {
        const result = await query(
            'UPDATE usuarios SET estado = 1 WHERE id = ?',
            [idowner]
        );
        return result.affectedRows > 0;
    }
};

module.exports = Usuario;
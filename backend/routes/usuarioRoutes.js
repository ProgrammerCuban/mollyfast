// backend/routes/usuarioRoutes.js
const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Solicitud = require('../models/Solicitud');

// Obtener todos los usuarios
router.get('/usuarios-id', async (req, res) => {
    try {
        const usuarios = await Usuario.getAll();
        
        if (usuarios.length > 0) {
            console.log("Usuarios encontrados");
            return res.json({ success: true, usuarios });
        } else {
            console.log("No hay usuarios");
            return res.json({ success: false, message: 'Usuarios no encontrados' });
        }
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        return res.json({ success: false, message: 'Error en la query' });
    }
});

// Obtener perfil por ID
router.get('/perfil/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const perfil = await Usuario.getById(id);
        
        if (perfil) {
            return res.json({ success: true, perfil });
        } else {
            return res.json({ success: false, message: 'perfil no encontrado' });
        }
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        return res.json({ success: false, message: 'Error' });
    }
});

// Registrar usuario
router.post('/register', async (req, res) => {
    const { username, email, password, delivery } = req.body;

    try {
        const result = await Usuario.register(username, email, password, delivery);
        
        if (result.error) {
            return res.json({ success: false, message: result.error });
        }

        console.log(`✅ Usuario ${username} registrado correctamente`);
        res.json({
            success: true,
            message: 'Usuario creado correctamente',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Error registrando usuario:', error);
        return res.json({
            success: false,
            message: 'Error al registrar usuario'
        });
    }
});

// Cambiar foto de perfil
router.post('/change-profile-photo', async (req, res) => {
    const { id, fotoUrl } = req.body;

    try {
        const success = await Usuario.updatePhoto(id, fotoUrl);
        
        if (success) {
            return res.json({
                success: true,
                message: 'Foto de perfil actualizada correctamente'
            });
        } else {
            return res.json({
                success: false,
                message: 'Error actualizando foto de perfil'
            });
        }
    } catch (error) {
        console.error('❌ Error actualizando foto:', error);
        return res.json({
            success: false,
            message: 'Error actualizando foto de perfil'
        });
    }
});

// Cambiar username
router.put('/change-username', async (req, res) => {
    const { id, username } = req.body;

    if (!id || !username) {
        return res.json({
            success: false,
            message: 'ID y username son requeridos'
        });
    }

    console.log('📝 Cambiando username:', { id, username });

    try {
        const success = await Usuario.updateUsername(id, username);
        
        if (success) {
            console.log('✅ Username cambiado exitosamente');
            return res.json({
                success: true,
                message: 'Tu username ha sido cambiado con éxito',
                newUsername: username
            });
        } else {
            return res.json({
                success: false,
                message: 'Error al cambiar el username'
            });
        }
    } catch (error) {
        console.error('❌ Error en cambio de username:', error);
        return res.json({
            success: false,
            message: error.error || 'Error al cambiar el username'
        });
    }
});

// Cambiar contraseña
router.put('/change-password', async (req, res) => {
    const { id, pass } = req.body;

    if (!id || !pass) {
        return res.json({
            success: false,
            message: 'ID y password son requeridos'
        });
    }

    console.log('📝 Cambiando contraseña:', { id });

    try {
        const success = await Usuario.updatePassword(id, pass);
        
        if (success) {
            console.log('✅ Contraseña cambiada exitosamente');
            return res.json({
                success: true,
                message: 'Tu contraseña ha sido cambiada con éxito',
            });
        } else {
            return res.json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
    } catch (error) {
        console.error('❌ Error en query de actualización de contraseña:', error);
        return res.json({
            success: false,
            message: 'Error al cambiar la contraseña'
        });
    }
});

// Verificar solicitud por idowner
router.post('/solicitud-idowner', async (req, res) => {
    const { idowner } = req.body;

    try {
        const tieneSolicitud = await Usuario.checkSolicitud(idowner);
        
        if (tieneSolicitud) {
            return res.json({ success: false, message: 'espere a que su solicitud este lista, se le enviara un gmail' });
        } else {
            return res.json({ success: true, message: 'no tiene solicitud' });
        }
    } catch (error) {
        console.error('Error verificando solicitud:', error);
        return res.json({ success: false, message: 'Error del servidor' });
    }
});

// Aceptar solicitud
router.post('/solicitud-aceptada', async (req, res) => {
    const { idowner } = req.body;

    try {
        const success = await Usuario.aceptarSolicitud(idowner);
        
        if (success) {
            return res.json({ success: true, message: 'solicitud aceptada correctamente' });
        } else {
            return res.json({ success: false, message: 'no se encontro al usuario' });
        }
    } catch (error) {
        console.error('Error aceptando solicitud:', error);
        return res.json({ success: false, message: 'Error al chequear al usuario' });
    }
});

module.exports = router;
// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const { encriptarSimple, desencriptarSimple } = require('../utils/encryption');

// Login
router.post('/loginsecion', async (req, res) => {
    const { user, pass } = req.body;
    console.log(`usuario ${user} se esta logueando`);

    try {
        const usuario = await Usuario.login(user, pass);

     //console.log(usuario.length);

        if (usuario.length >= 1) {
            req.session.userId = usuario[0].id;
            req.session.userName = usuario[0].usuario;
            req.session.delivery = usuario[0].delivery;

            console.log("usuario correcto");
            console.log(`del ${usuario[0].delivery}`);
            return res.json({
                success: true,
                message: 'Usuario correcto',
                delivery: usuario[0].delivery
            });
        } else {
            console.log("usuario incorrecto");
            return res.json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
    } catch (error) {
        console.error('Error en login:', error);
        return res.json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// Check session
router.get('/check-session', (req, res) => {
    if (req.session.userId) {
        res.json({
            success: true,
            id: req.session.userId,
            name: req.session.userName,
            delivery: req.session.delivery,
            sessionData: req.session
        });
    } else {
        res.json({
            success: false,
            message: 'No hay sesión activa'
        });
    }
});

// Admin password check
router.post('/pass-admin', (req, res) => {
    const { pass } = req.body;

    if (pass == "C27PZXMv") {
        return res.json({
            success: true,
            message: 'correct pass',
            code: "C27PZXMv."
        });
    } else {
        return res.json({
            success: false,
            message: 'fail pass',
        });
    }
});

// Encriptar
router.post('/encript', (req, res) => {
    const { user } = req.body;
    const code = encriptarSimple(user);
    console.log(code);
    return res.json({
        coder: code,
    });
});

// Desencriptar
router.post('/desencript', (req, res) => {
    const { code } = req.body;
    const user = desencriptarSimple(code);
    return res.json({
        users: user,
    });
});

// Obtener ID por nombre de usuario
router.post('/obtenerid', async (req, res) => {
    const { user } = req.body;

    try {
        const usuario = await Usuario.getByUsername(user);
        
        if (usuario) {
            return res.json({ success: true, id: usuario });
        } else {
            return res.json({ success: false, message: 'usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error obteniendo ID:', error);
        return res.json({ success: false, message: 'Error del servidor' });
    }
});

module.exports = router;
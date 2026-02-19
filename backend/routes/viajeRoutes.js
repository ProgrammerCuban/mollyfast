// backend/routes/viajeRoutes.js
const express = require('express');
const router = express.Router();
const Viaje = require('../models/Viaje');
const Solicitud = require('../models/Solicitud');

// Obtener todos los viajes
router.get('/viajes', async (req, res) => {
    try {
        const viajes = await Viaje.getAll();
        
        if (viajes.length > 0) {
            console.log("Viajes encontrados");
            return res.json({ success: true, viajes });
        } else {
            console.log("No hay viajes");
            return res.json({ success: false, message: 'Viajes no encontrados' });
        }
    } catch (error) {
        console.error('Error obteniendo viajes:', error);
        return res.json({ success: false, message: 'Error en la query' });
    }
});

// Obtener viajes por propietario
router.get('/viajes/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const viajes = await Viaje.getByPropietario(id);
        
        if (viajes.length > 0) {
            return res.json({ success: true, viaje: viajes });
        } else {
            return res.json({ success: false, message: 'Viaje no encontrado' });
        }
    } catch (error) {
        console.error('Error obteniendo viaje:', error);
        return res.json({ success: false, message: 'Error' });
    }
});

// Guardar viaje
router.post('/guardar-viaje', async (req, res) => {
    const viajeData = req.body;

    try {
        const result = await Viaje.saveOrUpdate(viajeData);
        
        if (result.success) {
            const message = result.action === 'created' 
                ? 'Viaje creado correctamente' 
                : 'Viaje actualizado correctamente';
                
            return res.json({ 
                success: true, 
                message,
                insertId: result.insertId 
            });
        } else {
            return res.json({ success: false, message: 'Error al guardar' });
        }
    } catch (error) {
        console.error('Error guardando viaje:', error);
        return res.json({ success: false, message: 'Error del servidor' });
    }
});

// Eliminar viaje
router.delete('/eliminar-viaje/:id', async (req, res) => {
    const idViaje = req.params.id;

    try {
        const success = await Viaje.delete(idViaje);
        
        if (success) {
            return res.json({
                success: true,
                message: 'Viaje eliminado correctamente'
            });
        } else {
            console.log(`❌ Viaje ${idViaje} no encontrado`);
            return res.json({
                success: false,
                message: 'Viaje no encontrado'
            });
        }
    } catch (error) {
        console.error('Error al eliminar viaje:', error);
        return res.json({
            success: false,
            message: 'Error del servidor al eliminar el viaje'
        });
    }
});

// Obtener todas las solicitudes
router.get('/get-solicitudes', async (req, res) => {
    try {
        const solicitudes = await Solicitud.getAll();
        
        if (solicitudes.length > 0) {
            return res.json({ success: true, usuarios: solicitudes });
        } else {
            return res.json({ success: false, message: 'no hay solicitudes' });
        }
    } catch (error) {
        console.error('Error obteniendo solicitudes:', error);
        return res.json({ success: false, message: 'Error en la query' });
    }
});

// Subir solicitud
router.post('/subir-solicitud', async (req, res) => {
    const { carnet, fotocarnet, selfie, fotomoto, idowner } = req.body;

    try {
        const insertId = await Solicitud.create(carnet, fotocarnet, selfie, fotomoto, idowner);
        
        return res.json({
            success: true,
            message: 'solicitud enviada correctamente',
            insertId
        });
    } catch (error) {
        console.error('Error subiendo solicitud:', error);
        return res.json({
            success: false,
            message: 'Error al subir la solicitud'
        });
    }
});

// Eliminar solicitud
router.delete('/eliminar-solicitud/:id', async (req, res) => {
    const idowner = req.params.id;

    try {
        const success = await Solicitud.deleteByOwner(idowner);
        
        if (success) {
            return res.json({
                success: true,
                message: 'solicitud eliminada correctamente',
            });
        } else {
            return res.json({
                success: false,
                message: 'solicitud no encontrado'
            });
        }
    } catch (error) {
        console.error('Error al eliminar la solicitud:', error);
        return res.json({
            success: false,
            message: 'Error del servidor al eliminar la solicitud'
        });
    }
});

module.exports = router;
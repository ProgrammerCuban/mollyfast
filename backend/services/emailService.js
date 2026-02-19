// backend/services/emailService.js
const nodemailer = require('nodemailer');
const express = require('express');
const router = express.Router();

function createTransporter() {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: 'mollyfast.delivery@gmail.com',
            pass: 'cslp ihak xl ow plnv'
        },
        tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 45000
    });
}

async function sendVerificationCode(userEmail, userName, verificationCode, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let transporter = null;

        try {
            console.log(`📧 Intento ${attempt}/${maxRetries} para ${userEmail}`);

            transporter = createTransporter();

            const verifyPromise = transporter.verify();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout en verificación')), 10000)
            );

            await Promise.race([verifyPromise, timeoutPromise]);
            console.log('✅ Conexión SMTP verificada');

            const mailOptions = {
                from: '"MolyFats" <mollyfast.delivery@gmail.com>',
                to: userEmail,
                subject: 'Tu código de verificación - MolyFats',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <h2 style="color: #4CAF50; text-align: center;">✅ Verificación de Email</h2>
                        <p>Hola <strong>${userName}</strong>,</p>
                        <p>Tu código de verificación para <strong>MolyFats</strong> es:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 8px; padding: 15px; background: #f9f9f9; border: 2px dashed #4CAF50; border-radius: 8px; display: inline-block;">
                                ${verificationCode}
                            </div>
                        </div>
                        <p>🔒 <strong>Este código expirará en 10 minutos</strong></p>
                        <p style="color: #666; font-size: 12px; text-align: center;">
                            Si no solicitaste este código, ignora este mensaje.
                        </p>
                    </div>
                `
            };

            const sendPromise = transporter.sendMail(mailOptions);
            const sendTimeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout en envío')), 15000)
            );

            const result = await Promise.race([sendPromise, sendTimeoutPromise]);

            console.log(`✅ Email enviado exitosamente en intento ${attempt}`);

            if (transporter) {
                transporter.close();
            }

            return {
                success: true,
                messageId: result.messageId,
                attempt: attempt
            };

        } catch (error) {
            lastError = error;
            console.error(`❌ Intento ${attempt} fallido:`, error.message);

            if (transporter) {
                try {
                    transporter.close();
                } catch (closeError) {
                    console.log('⚠️ Error cerrando transporter:', closeError.message);
                }
            }

            if (attempt < maxRetries) {
                const backoffTime = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Esperando ${backoffTime/1000} segundos antes del reintento...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
    }

    throw new Error(`Todos los ${maxRetries} intentos fallaron. Último error: ${lastError.message}`);
}

async function sendConfirmationAccount(userEmail, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let transporter = null;

        try {
            transporter = createTransporter();

            const verifyPromise = transporter.verify();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout en verificación')), 10000)
            );

            await Promise.race([verifyPromise, timeoutPromise]);
            console.log('✅ Conexión SMTP verificada');

            const mailOptions = {
                from: '"MolyFats" <mollyfast.delivery@gmail.com>',
                to: userEmail,
                subject: 'Cuenta creada exitosamente - MollyFast',
                html: `
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Bienvenido a MollyFast</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                margin: 0;
                                padding: 0;
                                background-color: #f5f5f5;
                            }
                            .container {
                                max-width: 600px;
                                margin: 0 auto;
                                background: white;
                                border-radius: 8px;
                                overflow: hidden;
                                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            }
                            .header {
                                background: #4A90E2;
                                color: white;
                                padding: 30px 20px;
                                text-align: center;
                            }
                            .content {
                                padding: 30px;
                                text-align: center;
                            }
                            .footer {
                                background: #f5f5f5;
                                padding: 20px;
                                text-align: center;
                                color: #666;
                                font-size: 12px;
                            }
                            .logo {
                                font-size: 24px;
                                font-weight: bold;
                                margin-bottom: 10px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <div class="logo">MollyFast</div>
                                <h1>¡Bienvenido!</h1>
                            </div>
                            <div class="content">
                                <p>Su cuenta ha sido creada exitosamente.</p>
                                <p>Estamos listos para atenderle cuando lo necesite.</p>
                                <p>¡Lo esperamos pronto!</p>
                            </div>
                            <div class="footer">
                                <p>Equipo MollyFast</p>
                                <p>Este es un mensaje automático, por favor no responda a este correo.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };

            const sendPromise = transporter.sendMail(mailOptions);
            const sendTimeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout en envío')), 15000)
            );

            const result = await Promise.race([sendPromise, sendTimeoutPromise]);

            if (transporter) {
                transporter.close();
            }

            return {
                success: true,
                messageId: result.messageId,
                attempt: attempt
            };

        } catch (error) {
            lastError = error;
            console.error(`❌ Intento ${attempt} fallido:`, error.message);

            if (transporter) {
                try {
                    transporter.close();
                } catch (closeError) {
                    console.log('⚠️ Error cerrando transporter:', closeError.message);
                }
            }

            if (attempt < maxRetries) {
                const backoffTime = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Esperando ${backoffTime/1000} segundos antes del reintento...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
    }
    throw new Error(`Todos los ${maxRetries} intentos fallaron. Último error: ${lastError.message}`);
}

// Rutas del servicio de email
router.post('/send-verification', async (req, res) => {
    console.log('📨 Solicitud recibida en /api/email/send-verification');

    try {
        const { userEmail, userName } = req.body;

        if (!userEmail || !userName) {
            return res.status(400).json({
                success: false,
                message: 'Email y nombre son requeridos'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido'
            });
        }

        console.log(`🎯 Generando código para: ${userEmail} (${userName})`);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`🔐 Código generado: ${verificationCode}`);

        const result = await sendVerificationCode(userEmail, userName, verificationCode, 3);

        console.log(`🎉 Email enviado exitosamente después de ${result.attempt} intento(s)`);

        res.json({
            success: true,
            message: 'Código enviado correctamente',
            code: verificationCode,
            attempt: result.attempt
        });

    } catch (error) {
        console.error('💥 Error crítico en endpoint:', error.message);

        let errorMessage = 'Error al enviar el código. Por favor, intenta nuevamente.';
        let statusCode = 500;

        if (error.message.includes('Timeout')) {
            errorMessage = 'El servidor de email está respondiendo lentamente. Intenta nuevamente.';
        } else if (error.message.includes('EAUTH')) {
            errorMessage = 'Problema de autenticación con el servicio de email.';
        } else if (error.message.includes('ECONNECTION')) {
            errorMessage = 'No se pudo conectar al servicio de email. Verifica tu conexión.';
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            technicalError: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.post('/solicitud-aceptada', async (req, res) => {
    try {
        const { userEmail } = req.body;

        if (!userEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email es requerido'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido'
            });
        }

        const result = await sendConfirmationAccount(userEmail, 3);

        return res.json({
            success: true,
            message: 'Código enviado correctamente',
            attempt: result.attempt
        });

    } catch (error) {
        console.error('💥 Error crítico en endpoint:', error.message);

        let errorMessage = 'Error al enviar el código. Por favor, intenta nuevamente.';
        let statusCode = 500;

        if (error.message.includes('Timeout')) {
            errorMessage = 'El servidor de email está respondiendo lentamente. Intenta nuevamente.';
        } else if (error.message.includes('EAUTH')) {
            errorMessage = 'Problema de autenticación con el servicio de email.';
        } else if (error.message.includes('ECONNECTION')) {
            errorMessage = 'No se pudo conectar al servicio de email. Verifica tu conexión.';
        }

        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
            technicalError: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/test', async (req, res) => {
    try {
        console.log('🧪 Probando configuración de email...');

        const testEmail = 'test@example.com';
        const testName = 'Usuario Test';
        const testCode = '123456';

        const result = await sendVerificationCode(testEmail, testName, testCode, 1);

        res.json({
            success: true,
            message: 'Prueba de email exitosa',
            details: result
        });

    } catch (error) {
        console.error('❌ Prueba de email fallida:', error);
        res.status(500).json({
            success: false,
            message: 'Prueba de email fallida',
            error: error.message
        });
    }
});

module.exports = {
    sendVerificationCode,
    sendConfirmationAccount,
    routes: router
};

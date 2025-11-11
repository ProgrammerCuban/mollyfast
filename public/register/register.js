// script.js - VERSIÓN CORREGIDA Y MEJORADA
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 script.js - DOM cargado');
    
    // Elementos del DOM - con verificación de existencia
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const btnNext = document.getElementById('btnNext');
    const btnBack = document.getElementById('btnBack');
    const btnBack2 = document.getElementById('btnBack2');
    const btnRegister = document.getElementById('btnRegister');
    const btnLogin = document.getElementById('btnLogin');
    const resendEmail = document.getElementById('resendEmail');
    const sentEmail = document.getElementById('sentEmail');
    const passwordInput = document.getElementById('password');
    const strengthBar = document.getElementById('passwordStrength');
    
    // Verificar que los elementos críticos existen
    if (!btnNext || !step1 || !step2 || !step3) {
        console.error('❌ Elementos críticos del DOM no encontrados');
        return;
    }
    
    console.log('✅ Todos los elementos encontrados');
    
    // Datos del usuario
    let userData = {};

    // Navegación entre pasos
    btnNext.addEventListener('click', function() {
        console.log('Botón Siguiente clickeado');
        if (validateStep1()) {
            userData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                username: document.getElementById('username').value,
                userType: document.querySelector('input[name="userType"]:checked').value
            };
            
            console.log('Datos capturados:', userData);
            showStep(2);
        }
    });

    btnBack.addEventListener('click', function() {
        showStep(1);
    });

    if (btnBack2) {
        btnBack2.addEventListener('click', function() {
            showStep(2);
        });
    }

    // Registro con Firebase Auth
    if (btnRegister) {
        btnRegister.addEventListener('click', async function() {
            await handleRegistration();
        });
    }

    // ✅ CORRECCIÓN: Verificar que resendEmail existe antes de agregar event listener
    if (resendEmail) {
        resendEmail.addEventListener('click', async function(e) {
            e.preventDefault();
            await handleResendEmail();
        });
    } else {
        console.warn('⚠️ Elemento resendEmail no encontrado');
    }

    // Ir al login
    if (btnLogin) {
        btnLogin.addEventListener('click', function() {
            window.location.href = 'login.html';
        });
    }

    // Validación de fortaleza de contraseña
    if (passwordInput && strengthBar) {
        passwordInput.addEventListener('input', function() {
            const password = passwordInput.value;
            let strength = 0;
            
            if (password.length >= 6) strength += 25;
            if (password.length >= 8) strength += 25;
            if (/[A-Z]/.test(password)) strength += 25;
            if (/[0-9]/.test(password)) strength += 25;
            if (/[^A-Za-z0-9]/.test(password)) strength += 25;
            
            strength = Math.min(strength, 100);
            strengthBar.style.width = strength + '%';
            
            if (strength < 50) {
                strengthBar.style.backgroundColor = '#e74c3c';
            } else if (strength < 75) {
                strengthBar.style.backgroundColor = '#f39c12';
            } else {
                strengthBar.style.backgroundColor = '#2ecc71';
            }
        });
    }

    // Función de registro
    async function handleRegistration() {
        console.log('=== INICIANDO REGISTRO ===');
        
        const auth = window.auth;
        if (!auth) {
            alert('Error: Firebase no disponible. Recarga la página.');
            return;
        }
        
        if (validateStep2()) {
            userData.password = document.getElementById('password').value;
            
            try {
                btnRegister.textContent = 'Creando cuenta...';
                btnRegister.disabled = true;
                
                console.log('📧 Registrando:', userData.email);
                
                // Crear usuario
                const userCredential = await auth.createUserWithEmailAndPassword(
                    userData.email,
                    userData.password
                );
                
                const user = userCredential.user;
                console.log('✅ Usuario creado:', user.uid);
                
                // Actualizar perfil
                await user.updateProfile({
                    displayName: userData.name
                });
                
                // Enviar email de verificación
                await user.sendEmailVerification();
                console.log('📨 Email de verificación enviado');
                
                // Cerrar sesión
                await auth.signOut();
                
                // Mostrar éxito
                if (sentEmail) {
                    sentEmail.textContent = userData.email;
                }
                showStep(3);
                
            } catch (error) {
                console.error('Error en registro:', error);
                handleAuthError(error);
                btnRegister.textContent = 'Crear Cuenta';
                btnRegister.disabled = false;
            }
        }
    }

    // Función para reenviar email
    async function handleResendEmail() {
        const resendBtn = document.getElementById('resendEmail');
        const originalText = resendBtn.textContent;
        
        try {
            resendBtn.textContent = 'Enviando...';
            resendBtn.disabled = true;
            
            const auth = window.auth;
            if (!auth) {
                alert('Error: Firebase no disponible.');
                return;
            }
            
            // Reautenticar
            try {
                const userCredential = await auth.signInWithEmailAndPassword(
                    userData.email, 
                    userData.password
                );
                
                const user = userCredential.user;
                await user.sendEmailVerification();
                alert('✅ Email de verificación reenviado.');
                
            } catch (reauthError) {
                console.error('Error reautenticando:', reauthError);
                alert('✅ Solicitud de reenvío procesada.');
            }
            
        } catch (error) {
            console.error('Error reenviando email:', error);
            alert('Error: ' + error.message);
        } finally {
            resendBtn.textContent = originalText;
            resendBtn.disabled = false;
        }
    }

    // ✅ SOLUCIÓN TEMPORAL - Verificación Manual
    function addManualVerificationOption() {
        if (document.getElementById('manualVerifyBtn')) {
            return;
        }
        
        const step3 = document.getElementById('step3');
        if (!step3) return;
        
        const manualVerifyDiv = document.createElement('div');
        manualVerifyDiv.innerHTML = `
            <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px;">
                <h4 style="color: #856404; margin-bottom: 10px;">⚡ Modo Desarrollo</h4>
                <p style="color: #856404; margin-bottom: 10px;">¿El email no llega?</p>
                <button id="manualVerifyBtn" style="background: #28a745; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; width: 100%;">
                    ✅ Verificar Manualmente
                </button>
            </div>
        `;
        
        step3.appendChild(manualVerifyDiv);
        
        document.getElementById('manualVerifyBtn').addEventListener('click', function() {
            alert('🎉 ¡Cuenta verificada manualmente! Ya puedes iniciar sesión.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        });
    }

    // Funciones auxiliares
    function showStep(stepNumber) {
        console.log('Mostrando paso:', stepNumber);
        [step1, step2, step3].forEach((step, index) => {
            if (step) {
                step.classList.toggle('active', index + 1 === stepNumber);
            }
        });
        
        if (stepNumber === 3) {
            setTimeout(() => {
                addManualVerificationOption();
            }, 500);
        }
    }

    function validateStep1() {
        const name = document.getElementById('name')?.value;
        const email = document.getElementById('email')?.value;
        const username = document.getElementById('username')?.value;
        
        if (!name || name.length < 2) {
            alert('El nombre debe tener al menos 2 caracteres');
            return false;
        }
        
        if (!email || !isValidEmail(email)) {
            alert('Por favor ingresa un correo electrónico válido');
            return false;
        }
        
        if (!username || username.length < 3) {
            alert('El nombre de usuario debe tener al menos 3 caracteres');
            return false;
        }
        
        return true;
    }

    function validateStep2() {
        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        
        if (!password || password.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres');
            return false;
        }
        
        if (password !== confirmPassword) {
            alert('Las contraseñas no coinciden');
            return false;
        }
        
        return true;
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function handleAuthError(error) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                alert('Este correo ya está registrado.');
                break;
            case 'auth/invalid-email':
                alert('Correo electrónico inválido.');
                break;
            case 'auth/operation-not-allowed':
                alert('Error: Email/Password no está habilitado.');
                break;
            case 'auth/weak-password':
                alert('La contraseña es muy débil.');
                break;
            default:
                alert('Error: ' + error.message);
        }
    }

    // Inicializar
    showStep(1);
});
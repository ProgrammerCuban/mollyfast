document.addEventListener('DOMContentLoaded', function() {
    // ❌ ELIMINADO: Inicialización de EmailJS
    // (function() {
    //     emailjs.init("J9WF3KPIxRDxlheWG");
    // })();
    // Elementos del DOM
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const registerForm = document.getElementById('registerForm');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const verificationCode = document.getElementById('verificationCode');
const verifyBtn = document.getElementById('verifyBtn');
const resendBtn = document.getElementById('resendBtn');
const verificationMessage = document.getElementById('verificationMessage');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoading = submitBtn.querySelector('.btn-loading');

let userData = {};
let generatedCode = '';

    // Generar código de verificación
function generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
}

    

    // Envío del formulario de registro
registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validaciones
        if (password !== confirmPassword) {
            showMessage('Las contraseñas no coinciden', 'error');
            document.getElementById('password').classList.add('shake');
            document.getElementById('confirmPassword').classList.add('shake');
            setTimeout(() => {
                document.getElementById('password').classList.remove('shake');
                document.getElementById('confirmPassword').classList.remove('shake');
            }, 500);
            return;
        }

        if (password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        const valuetype = getSelectedUserType();

        console.log(valuetype);

        // Preparar datos del usuario
        userData = {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            password: password,
            delivery: (valuetype == 'delivery')
        };

      
        showLoading(true);

        try {
            // ✅ CAMBIO: El código ahora se genera en el backend
            const response = await sendVerificationCode(userData.email);
            generatedCode = response.code; // El código viene del backend
            
            // Mostrar paso de verificación
            userEmailDisplay.textContent = userData.email;
            step1.style.display = 'none';
            step2.style.display = 'block';
            
            // Focus en el input del código
            setTimeout(() => {
                verificationCode.focus();
            }, 300);
            
        } catch (error) {
            showMessage('Error al enviar el código de verificación: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
});

    // Verificar código
verifyBtn.addEventListener('click', async function() {
        const code = verificationCode.value.trim();
        
        if (!code || code.length !== 6) {
            showVerificationMessage('Ingresa un código válido de 6 dígitos', 'error');
            verificationCode.classList.add('shake');
            setTimeout(() => verificationCode.classList.remove('shake'), 500);
            return;
        }

        showVerificationLoading(true);

        try {
            // Verificar el código
            if (code === generatedCode) {
                // Código correcto - Registrar usuario en el backend
                await registerUserInBackend(userData);
                showVerificationMessage('¡Email verificado correctamente! Cuenta creada exitosamente.', 'success');
                
                // Redirigir después de 2 segundos
                setTimeout(() => {
                    window.location.href = '../login/login.html'; 
                }, 2000);
            } else {
                showVerificationMessage('Código incorrecto. Intenta nuevamente.', 'error');
                verificationCode.classList.add('shake');
                setTimeout(() => verificationCode.classList.remove('shake'), 500);
            }
        } catch (error) {
            showVerificationMessage('Error al verificar el código: ' + error.message, 'error');
        } finally {
            showVerificationLoading(false);
        }
});

    // Reenviar código
resendBtn.addEventListener('click', async function() {
        showVerificationMessage('Enviando nuevo código...', 'success');
        resendBtn.disabled = true;
        
        try {
            // ✅ CAMBIO: El código ahora se genera en el backend
            const response = await sendVerificationCode(userData.email);
            generatedCode = response.code; // El código viene del backend
            
            showVerificationMessage('Nuevo código enviado a tu email', 'success');
            
            // Rehabilitar el botón después de 30 segundos
            setTimeout(() => {
                resendBtn.disabled = false;
            }, 30000);
            
        } catch (error) {
            showVerificationMessage('Error al reenviar el código: ' + error.message, 'error');
            resendBtn.disabled = false;
        }
});

    // Permitir enviar con Enter en el código de verificación
verificationCode.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            verifyBtn.click();
        }
});
  

    // ✅ NUEVA FUNCIÓN: Enviar código usando tu backend
async function sendVerificationCode(userEmail) {
        try {
            const response = await fetch('/api/email/send-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userEmail: userEmail,
                    userName: userData.username,
                    // El código se genera en el backend por seguridad
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message);
            }

            console.log('✅ Código enviado via backend');
            return result;
            
        } catch (error) {
            console.error('❌ Error enviando código:', error);
            throw new Error('No se pudo enviar el código de verificación: ' + error.message);
        }
}

    // Función para registrar usuario en tu backend
async function registerUserInBackend(userData) {
            // Aquí va tu llamada REAL al backend para crear el usuario
            const response = await fetch('/api/register', { // Cambia por tu endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: userData.username,
                    email: userData.email,
                    password: userData.password,
                    delivery: userData.delivery
                })
            });

            const data = await response.json();

            alert(data.message);     
}

    // Funciones auxiliares de UI
function showLoading(loading) {
        if (loading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'block';
            submitBtn.disabled = true;
        } else {
            btnText.style.display = 'block';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        }
}

function showVerificationLoading(loading) {
        verifyBtn.disabled = loading;
        verifyBtn.textContent = loading ? 'Verificando...' : 'Verificar Código';
}

function showMessage(text, type) {
        const existingMessage = document.querySelector('.message-temp');
        if (existingMessage) existingMessage.remove();

        const message = document.createElement('div');
        message.className = `message ${type} message-temp`;
        message.textContent = text;
        message.style.marginTop = '20px';
        
        registerForm.appendChild(message);
        setTimeout(() => message.remove(), 5000);
    }

    function showVerificationMessage(text, type) {
        verificationMessage.textContent = text;
        verificationMessage.className = 'message ' + type;
    }

    // Focus automático en el primer input
    document.getElementById('username').focus();
});

function getUserType() {
    const userTypeInput = document.getElementById('userType');
    return userTypeInput ? userTypeInput.value : null;
}

 function obtenerTipoUsuario() {
    return new Promise((resolve) => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                configurarSeleccion(resolve);
            });
        } else {
            configurarSeleccion(resolve);
        }
    });
}

function configurarSeleccion(resolve) {
    document.querySelectorAll('.user-type-option').forEach(option => {
        option.addEventListener('click', function() {
            const userType = this.getAttribute('data-value');
            document.getElementById('userType').value = userType;
            
            document.querySelectorAll('.user-type-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
            
            resolve(userType);
        });
    });
}

// USO:

        function getSelectedUserType() {
     return document.querySelector('input[name="userType"]:checked')?.value;
}

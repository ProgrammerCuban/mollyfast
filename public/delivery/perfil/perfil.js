const codigo = window.location.hash.substring(1);
let namebussines = "";
let idbussines = "";
let usuario;

// REEMPLAZA tu configuración actual de ImageKit con esta:
const imagekit = new ImageKit({
    publicKey: "public_4yRUn/8HyM6NpBO2uluT5n374JY=",
    urlEndpoint: "https://ik.imagekit.io/yosvaC",
    authenticationEndpoint: "http://localhost:3000/imagekit-auth" // URL COMPLETA
});

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    inicial();
    configurarEventos();
});

// TU CÓDIGO ORIGINAL (NO MODIFICADO)
async function inicial(){
    setLoading(true);
    await obteneruser();
    await obtenerid();
    await cargarperfil();
    setLoading(false);
    await mostrarDatosEnPantalla(); // NUEVA FUNCIÓN
}

async function cargarperfil() {
    console.log(namebussines);
    console.log(idbussines);
    const respuesta = await fetch(`/perfil/${idbussines}`);
    const data = await respuesta.json();
    
    if (data.success) {
        usuario = data.perfil[0];
        console.log(usuario);
    } else {
        console.error(data.message);
        console.log("hubo un error al intentar hacer la query de cargar el perfils")
    }
}

async function obtenerid() {
    console.log(namebussines);
    const respuestaid = await fetch('/obtenerid',{
        method:'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body:JSON.stringify({
            user:namebussines
        })
    });

    const datosid = await respuestaid.json();
    idbussines = datosid.id.id;
    console.log(idbussines);
}

async function obteneruser(){
    const respuesta = await fetch('/desencript',{
        method:'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body:JSON.stringify({
            code:codigo
        })
    });
    const datos = await respuesta.json();
    namebussines = datos.users;
}

async function mostrarDatosEnPantalla() {
    if (!usuario || Object.keys(usuario).length === 0) {
        console.log('Esperando datos del usuario...');
        return;
    }

    // Mostrar datos en los elementos HTML
    document.getElementById('usernameDisplay').textContent = usuario.usuario || 'No disponible';
    document.getElementById('emailDisplay').textContent = usuario.gmail || 'No disponible';
    document.getElementById('phoneDisplay').textContent = usuario.numero_telefono || 'No disponible';
    
    // Foto de perfil
    if (usuario.fotoperfil) {
        document.getElementById('profileImage').src = usuario.fotoperfil;
    }

    // Tipo de usuario
    if (document.getElementById('userTypeDisplay')) {
        const userType = usuario.delivery ? "🚗 Repartidor" : "👤 Cliente";
        document.getElementById('userTypeDisplay').textContent = userType;
    }

    // Estado del usuario
    if (document.getElementById('statusDisplay')) {
        const estados = {
            1: "✅ Activo",
            2: "⏸️ Inactivo", 
            3: "❌ Suspendido",
            4: "⏳ Pendiente",
            5: "🗑️ Eliminado"
        };
        document.getElementById('statusDisplay').textContent = estados[usuario.estado] || "Desconocido";
    }

    console.log('✅ Datos mostrados en pantalla');
}

function configurarEventos() {
    // Evento para preview de imagen
    const fotoInput = document.getElementById('fotoInput');
    if (fotoInput) {
        fotoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('fotoPreview').innerHTML = 
                        `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; border-radius: 8px;">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function cerrarModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    const fotoPreview = document.getElementById('fotoPreview');
    if (fotoPreview) {
        fotoPreview.innerHTML = '';
    }
}

/// FUNCIONES DE ACTUALIZACIÓN
async function cambiarFoto() {
    const fileInput = document.getElementById('fotoInput');
    if (!fileInput || !fileInput.files[0]) {
        alert('Por favor selecciona una imagen');
        return;
    }

    // Guardar referencia del botón AL INICIO
    const btn = document.querySelector('#fotoModal .btn-primary');
    const originalText = btn.textContent;

        // Mostrar loading
        btn.textContent = '📤 Subiendo...';
        btn.disabled = true;

        const file = fileInput.files[0];
        
        console.log('📁 Archivo seleccionado:', file.name, file.size);

        setLoading(true);
        
        // SOLUCIÓN: Usar FileReader para convertir a base64
        const fileBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remover el prefijo data:image/...;base64,
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        console.log('✅ Archivo convertido a base64');

        // Subir a ImageKit con base64
        const result = await imagekit.upload({
            file: fileBase64, // Usar base64 en lugar del objeto File
            fileName: `perfil_${usuario.usuario}_${Date.now()}.jpg`,
            folder: "/mollyfast",
            useUniqueFileName: true
        });

        console.log('✅ Imagen subida a ImageKit:', result.url);



        // Actualizar en tu base de datos
        const updateResponse = await fetch('/change-profile-photo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: idbussines,
                fotoUrl: result.url
            })
        });

        const updateData = await updateResponse.json();

        setLoading(fale);
        
        if (updateData.success) {
            
            usuario.fotoperfil = result.url;
            document.getElementById('profileImage').src = result.url;
            alert('✅ Foto de perfil actualizada correctamente');
            cerrarModal('fotoModal');
            
            // Limpiar preview
            document.getElementById('fotoPreview').innerHTML = '';
            fileInput.value = '';
        } else {
            throw new Error(updateData.message || 'Error al guardar en base de datos');
        }

        // Restaurar botón - usa las variables definidas AL INICIO
        btn.textContent = originalText;
        btn.disabled = false;
}
// FUNCIONES AUXILIARES
function mostrarError(elementId, mensaje) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = mensaje;
        errorElement.style.display = 'block';
    } else {
        // Si no existe el elemento, crear uno
        const input = document.getElementById('newUsername');
        const errorDiv = document.createElement('div');
        errorDiv.id = 'usernameError';
        errorDiv.className = 'error-message';
        errorDiv.textContent = mensaje;
        errorDiv.style.color = 'red';
        errorDiv.style.fontSize = '14px';
        errorDiv.style.marginTop = '5px';
        
        input.parentNode.appendChild(errorDiv);
    }
}

function mostrarExito(elementId, mensaje) {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = mensaje;
        successElement.style.display = 'block';
        successElement.style.color = 'green';
    }
}

function limpiarErrores() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.style.display = 'none';
    });
}

// MODIFICAR EL MODAL PARA AGREGAR MENSAJES DE ERROR/ÉXITO
function abrirModal(modalId) {
    if (modalId === 'usernameModal') {
        document.getElementById('newUsername').value = usuario.usuario || '';
        // Limpiar mensajes anteriores
        limpiarErrores();
    }
    if (modalId === 'usernameModal') {
        document.getElementById('newUsername').value = usuario.usuario || '';
    } else if (modalId === 'phoneModal') {
        document.getElementById('newPhone').value = usuario.numero_telefono || '';
    } else if (modalId === 'addressModal') {
        document.getElementById('newAddress').value = usuario.direccion || '';
    }
    document.getElementById(modalId).style.display = 'block';
}
    

async function cambiarPassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    setLoading(true);

    try {
        // PETICIÓN AL BACKEND
        const response = await fetch('/change-password', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                id: idbussines, 
                pass: newPassword
            })
        });

        const data = await response.json();


        if(data.success) {
            alert("se ha cambiado la contrasena correctamente");
            cerrarModal("passwordModal");
        } else {
            alert("hubo un error intente de nuevo");
            console.error(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión');
    }

    setLoading(false);
}

async function cambiarUsername(){
    const newuser = document.getElementById('newUsername').value;

    setLoading(true);

   const response = await fetch('/change-username', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                id: idbussines, 
                username: newuser
            })
        });

        const data = await response.json();

        setLoading(false);

        if(!data.success) 
        {
            console.error(data.mensaje);
            alert("ha ocurrido un error por favor intente nuevamente");
            return;
        }
        else
        {
            alert("nombre cambiado correctamente");
            cerrarModal("usernameModal");
            document.getElementById('usernameDisplay').textContent  = newuser;
            usuario.usuario = newuser; 
        }

}

// FUNCIONES DE NAVEGACIÓN
async function irAtras() {
    const respuesta = await fetch('/encript',{
        method:'POST',
        headers:{
            'Content-Type': 'application/json',
        },
        body:JSON.stringify({
            user: usuario.usuario
        })
    });

    const datos = await respuesta.json();
    console.log(datos.coder);
    window.location.href = `../delivery.html#${datos.coder}`;
}

function cerrarSesion() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        window.location.href = 'login.html';
    }
}

// Cerrar modal al hacer click fuera
window.onclick = function(event) {
    const modals = document.getElementsByClassName('modal');
    for (let modal of modals) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
}

function setLoading(show) {
    if (show) {
        // Crear y mostrar loading
        const loadingHTML = `
            <div id="simpleLoading" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            ">
                <div style="
                    width: 50px;
                    height: 50px;
                    border: 3px solid rgba(255,255,255,0.3);
                    border-top: 3px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                "></div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
        document.body.style.overflow = 'hidden';
    } else {
        // Ocultar loading
        const loadingElement = document.getElementById('simpleLoading');
        if (loadingElement) {
            loadingElement.remove();
            document.body.style.overflow = '';
        }
    }
}
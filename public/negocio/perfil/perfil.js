const codigo = window.location.hash.substring(1);
let namebussines = "";
let idbussines = "";
let usuario;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    inicial();
    configurarEventos();
});

// TU CÓDIGO ORIGINAL (NO MODIFICADO)
async function inicial(){
    await obteneruser();
    await obtenerid();
    await cargarperfil();
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
    idbussines = datosid.id;
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

// FUNCIONES DE ACTUALIZACIÓN
async function cambiarFoto() {
    const fileInput = document.getElementById('fotoInput');
    if (!fileInput || !fileInput.files[0]) {
        alert('Por favor selecciona una imagen');
        return;
    }

   
}

// FUNCIÓN PARA CAMBIAR USERNAME (frontend)
async function cambiarUsername() {
    const newUsername = document.getElementById('newUsername').value.trim();
    
    if (!newUsername) {
        alert('Por favor ingresa un nombre de usuario');
        return;
    }

    if (newUsername.length < 3) {
        alert('El nombre de usuario debe tener al menos 3 caracteres');
        return;
    }
        // Mostrar loading
        const btn = document.querySelector('#usernameModal .btn-primary');
        const originalText = btn.textContent;
        btn.textContent = 'Guardando...';
        btn.disabled = true;

        // PETICIÓN AL BACKEND
        const response = await fetch('/change-username', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                id: idbussines, 
                username: newUsername 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {

            usuario.usuario = newUsername;
            
            document.getElementById('usernameDisplay').textContent = newUsername;
            
            alert('✅ Nombre de usuario actualizado correctamente');
            cerrarModal('usernameModal');
        } else {
            alert (data.message);
            throw new Error(data.message);
        }
     
         btn = document.querySelector('#usernameModal .btn-primary');
        if (btn) {
            btn.textContent = 'Guardar';
            btn.disabled = false;

    }
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
        document.getElementById('newUsername').value = usuario.username || '';
        // Limpiar mensajes anteriores
        limpiarErrores();
    }
    if (modalId === 'usernameModal') {
        document.getElementById('newUsername').value = usuario.username || '';
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

       if(data.success)
       {
        alert("se ha cambiado la contrasena correctamente");
        cerrarModal("passwordModal");
       }

       else 
       {
        alert("hubo un error intente de nuevo");
        console.error(data.message);
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

  window.location.href = `../negocio.html#${datos.coder}`;
   
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
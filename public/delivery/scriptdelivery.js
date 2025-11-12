// Variable global para el diccionario
let diccionarioUsuarios = {};
let idbussines;
let namebussines;
let codigo = window.location.hash.substring(1);


async function cargarDiccionarioUsuarios() {
    try {
        const response = await fetch('/usuarios-id');
        const data = await response.json();
        
        if (data.success) {
           
            data.usuarios.forEach(element => {
                diccionarioUsuarios[element.id] = element.usuario;
            });

            return diccionarioUsuarios;
        }
    } catch (error) {
        console.error('Error:', error);
        return {};
    }
}


const viajesGrid = document.getElementById('viajesGrid');
const loadingElement = document.getElementById('loading');
const noViajesElement = document.getElementById('noViajes');
const errorMessageElement = document.getElementById('errorMessage');
const errorTextElement = document.getElementById('errorText');
const filterPrice = document.getElementById('filterPrice');
const refreshBtn = document.getElementById('refreshBtn');

// Estado global
let viajes = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    cargarViajes();
    
    // Event listeners
    filterPrice.addEventListener('change', filtrarViajes);
    refreshBtn.addEventListener('click', cargarViajes);
});

// Cargar viajes desde el backend
async function cargarViajes() {
    mostrarLoading();
    ocultarError();
    ocultarNoViajes();
    cargarDiccionarioUsuarios();

    try {
        const response = await fetch(`/viajes`);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            viajes = data.viajes;
            mostrarViajes(viajes);
        } else {
            throw new Error(data.message || 'Error al cargar los viajes');
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError(error.message);
    }
}

// Mostrar viajes en el grid
function mostrarViajes(viajesArray) {
    ocultarLoading();
    
    if (viajesArray.length === 0) {
        mostrarNoViajes();
        return;
    }

    viajesGrid.innerHTML = '';

    viajesArray.forEach(viaje => {
        const viajeCard = crearTarjetaViaje(viaje);
        viajesGrid.appendChild(viajeCard);
    });
}

// Crear tarjeta individual de viaje
function crearTarjetaViaje(viaje) {
    const card = document.createElement('div');
    card.className = 'viaje-card';
    
    card.innerHTML = `
        <div class="viaje-header">
            <span class="viaje-id">ID: ${viaje.id}</span>
            <div class="viaje-precio">$${viaje.precio}</div>
        </div>
        
        <div class="viaje-propietario">
            <strong>Propietario:</strong> ${diccionarioUsuarios[viaje.propietario]}
        </div>
        
        <div class="viaje-detalles">
            <h4>📋 Detalles </h4>
            <p>${viaje.detalles_adicionales || 'Sin detalles adicionales'}</p>
        </div>
    `;
    
    return card;
}

// Filtrar viajes por precio
function filtrarViajes() {
    const filtro = filterPrice.value;
    let viajesFiltrados = [...viajes];

    switch (filtro) {
        case '0-50':
            viajesFiltrados = viajes.filter(v => v.precio <= 50);
            break;
        case '51-100':
            viajesFiltrados = viajes.filter(v => v.precio > 50 && v.precio <= 100);
            break;
        case '101-200':
            viajesFiltrados = viajes.filter(v => v.precio > 100 && v.precio <= 200);
            break;
        case '201+':
            viajesFiltrados = viajes.filter(v => v.precio > 200);
            break;
        default:
            // 'all' - mostrar todos
            break;
    }

    mostrarViajes(viajesFiltrados);
}

// Funciones para manejar estados de la UI
function mostrarLoading() {
    loadingElement.style.display = 'block';
    viajesGrid.style.display = 'none';
}

function ocultarLoading() {
    loadingElement.style.display = 'none';
    viajesGrid.style.display = 'grid';
}

function mostrarNoViajes() {
    noViajesElement.style.display = 'block';
    viajesGrid.style.display = 'none';
}

function ocultarNoViajes() {
    noViajesElement.style.display = 'none';
}

function mostrarError(mensaje) {
    errorTextElement.textContent = mensaje;
    errorMessageElement.style.display = 'block';
    viajesGrid.style.display = 'none';
    loadingElement.style.display = 'none';
}

function ocultarError() {
    errorMessageElement.style.display = 'none';
}

function irAlPerfil() {
    console.log('👤 Redirigiendo a perfil...');
    window.location.href = `perfil/perfil.html#${window.location.hash.substring(1)}`;
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

async function cargarFotoPerfil() {

    await obtenerid();
    await obteneruser();

    console.log(namebussines);
    console.log(idbussines);
    console.log(codigo);

    const respuesta = await fetch(`/perfil/${idbussines}`);
    
    const data = await respuesta.json();
    
    if (data.success)
    {
        document.getElementById('profileHeaderImage').src = data.perfil[0].fotoperfil;
        console.log(data.fotoperfil);
        console.log("se cargo la foto de perfil");
    }

    else
    {
        console.error(data.message);
    }

}


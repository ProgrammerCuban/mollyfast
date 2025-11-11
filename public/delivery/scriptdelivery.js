// Variable global para el diccionario
let diccionarioUsuarios = {};

async function cargarDiccionarioUsuarios() {
    try {
        const response = await fetch('/usuarios-id');
        const data = await response.json();
        
        if (data.success) {
           
            data.usuarios.forEach(element => {
                diccionarioUsuarios[element.id] = element.usuario;
                console.log(element.id);
                console.log(element.usuario);
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


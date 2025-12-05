// Variable global para el diccionario
let diccionarioUsuarios = {};
let idbussines;      // ID del delivery logueado (emisor potencial)
let namebussines;
let codigo = window.location.hash.substring(1);

// Socket.IO client
const socket = io(); // se conecta a tu backend

// Estado global
let viajes = [];
let currentConversationId = null;
let currentReceiverId = null;

// Referencias DOM
const viajesGrid = document.getElementById('viajesGrid');
const loadingElement = document.getElementById('loading');
const noViajesElement = document.getElementById('noViajes');
const errorMessageElement = document.getElementById('errorMessage');
const errorTextElement = document.getElementById('errorText');
const filterPrice = document.getElementById('filterPrice');
const refreshBtn = document.getElementById('refreshBtn');

// Modal chat refs
const chatModal = document.getElementById('chatModal');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatCloseBtn = document.getElementById('chatCloseBtn');
const chatSubtitle = document.getElementById('chatSubtitle');

document.addEventListener('DOMContentLoaded', function() {
    filterPrice.addEventListener('change', filtrarViajes);
    refreshBtn.addEventListener('click', cargarViajes);

    chatCloseBtn.addEventListener('click', closeChat);
    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });
});

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

async function cargarViajes() {
    mostrarLoading();
    ocultarError();
    ocultarNoViajes();
    await cargarDiccionarioUsuarios();

    try {
        const response = await fetch(`/viajes`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
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

function crearTarjetaViaje(viaje) {
    const card = document.createElement('div');
    card.className = 'viaje-card';

    card.innerHTML = `
        <div class="viaje-header">
            <span class="viaje-id">ID: ${viaje.id}</span>
            <div class="viaje-precio">$${viaje.precio}</div>
        </div>

        <div class="viaje-ruta">
            <div class="ruta-origen">
                <strong>Salida:</strong>
                <div class="ubicacion-detalle">${viaje.municipio_salida}, ${viaje.provincia_salida}</div>
            </div>
            <div class="ruta-destino">
                <strong>Llegada:</strong>
                <div class="ubicacion-detalle">${viaje.provincia_llegada}, ${viaje.municipio_llegada}</div>
            </div>
        </div>

        <div class="viaje-fecha">
            <strong>Fecha de salida:</strong> ${formatearFecha(viaje.fecha_salida)}
        </div>

        <div class="viaje-propietario">
            <strong>Propietario:</strong> ${diccionarioUsuarios[viaje.propietario] || viaje.propietario}
        </div>

        <div class="viaje-detalles">
            <h4>📋 Detalles </h4>
            <p>${viaje.detalles_adicionales || 'Sin detalles adicionales'}</p>
        </div>

        <button class="chat-btn" data-viaje-id="${viaje.id}">💬 SMS</button>
    `;

    const btn = card.querySelector('.chat-btn');
    btn.addEventListener('click', () => openChat(viaje));

    return card;
}

// Abrir chat: crea/obtiene conversación, une al socket y carga historial
async function openChat(viaje) {
    try {
        // deliveryRequestId = viaje.id, clientId = propietario del viaje, deliveryId = id del delivery logueado
        const deliveryRequestId = viaje.id;
        const clientId = viaje.propietario;
        const deliveryId = idbussines;

        // Crear/obtener conversación vía REST
        const resp = await fetch('/api/conversations/get-or-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deliveryRequestId, clientId, deliveryId })
        });
        const data = await resp.json();
        if (!data.success) throw new Error(data.message || 'No se pudo crear la conversación');

        currentConversationId = data.conversationId;
        currentReceiverId = clientId;

        // Unirse a la sala de la conversación en Socket.IO
        socket.emit('join_conversation', {
            conversationId: currentConversationId,
            userId: idbussines
        });

        // Cargar historial
        await loadConversationMessages(currentConversationId);

        // Pintar encabezado del modal
        chatSubtitle.textContent = `Con: ${diccionarioUsuarios[clientId] || clientId} • Viaje #${deliveryRequestId}`;

        // Abrir modal
        chatModal.setAttribute('aria-hidden', 'false');
        chatInput.focus();
    } catch (err) {
        console.error('Error abriendo chat:', err);
        alert('No se pudo abrir el chat, intenta de nuevo.');
    }
}

async function loadConversationMessages(conversationId) {
    const resp = await fetch(`/api/conversations/${conversationId}/messages`);
    const data = await resp.json();
    chatMessages.innerHTML = '';
    if (data.success && Array.isArray(data.messages)) {
        data.messages.forEach(m => renderMessage(m));
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Enviar mensaje
function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text || !currentConversationId) return;

    socket.emit('send_message', {
        conversationId: currentConversationId,
        senderId: idbussines,
        message: text
    });

    // Pinta optimista del mensaje
    renderMessage({
        sender_id: idbussines,
        message: text,
        created_at: new Date().toISOString()
    });

    chatInput.value = '';
    chatInput.focus();
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Renderizar mensaje en el UI
function renderMessage(m) {
    const isMe = Number(m.sender_id) === Number(idbussines);
    const wrapper = document.createElement('div');
    wrapper.className = `msg ${isMe ? 'me' : 'other'}`;
    wrapper.textContent = m.message;

    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    const date = m.created_at ? new Date(m.created_at) : new Date();
    meta.textContent = date.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' });

    chatMessages.appendChild(wrapper);
    chatMessages.appendChild(meta);
}

// Cerrar chat
function closeChat() {
    chatModal.setAttribute('aria-hidden', 'true');
    chatMessages.innerHTML = '';
    currentConversationId = null;
    currentReceiverId = null;
}

// Escuchar mensajes nuevos desde el servidor
socket.on('new_message', (msg) => {
    // Solo renderizamos si pertenece a la conversación actual
    if (Number(msg.conversation_id) === Number(currentConversationId)) {
        renderMessage(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

function filtrarViajes() {
    const filtro = filterPrice.value;
    let viajesFiltrados = [...viajes];
    switch (filtro) {
        case 'mayor-menor': viajesFiltrados = viajes.sort((a, b) => b.precio - a.precio); break;
        case 'menor-mayor': viajesFiltrados = viajes.sort((a, b) => a.precio - b.precio); break;
        case 'mas-rapido': viajesFiltrados = viajes.sort((a, b) => new Date(a.fecha_salida) - new Date(b.fecha_salida)); break;
        default: break;
    }
    mostrarViajes(viajesFiltrados);
}

// Estados UI
function mostrarLoading() { loadingElement.style.display = 'block'; viajesGrid.style.display = 'none'; }
function ocultarLoading() { loadingElement.style.display = 'none'; viajesGrid.style.display = 'grid'; }
function mostrarNoViajes() { noViajesElement.style.display = 'block'; viajesGrid.style.display = 'none'; }
function ocultarNoViajes() { noViajesElement.style.display = 'none'; }
function mostrarError(mensaje) {
    errorTextElement.textContent = mensaje;
    errorMessageElement.style.display = 'block';
    viajesGrid.style.display = 'none';
    loadingElement.style.display = 'none';
}
function ocultarError() { errorMessageElement.style.display = 'none'; }

function irAlPerfil() {
    window.location.href = `perfil/perfil.html#${window.location.hash.substring(1)}`;
}

async function obtenerid() {
    const respuestaid = await fetch('/obtenerid', {
        method:'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: namebussines })
    });
    const datosid = await respuestaid.json();
    idbussines = datosid.id.id;
}

async function obteneruser(){
    const respuesta = await fetch('/desencript', {
        method:'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codigo })
    });
    const datos = await respuesta.json();
    namebussines = datos.users;
}

async function cargarFotoPerfil() {
    await obteneruser();
    await obtenerid();
    await isactive();
    await cargarViajes();

    const respuesta = await fetch(`/perfil/${idbussines}`);
    const data = await respuesta.json();

    if (data.success) {
        document.getElementById('profileHeaderImage').src = data.perfil[0].fotoperfil || '';
    } else {
        console.error(data.message);
    }
}

async function isactive() {
    const respuestaid = await fetch('/obtenerid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: namebussines })
    });
    const datosid = await respuestaid.json();
    const estado = datosid.id.estado;

    if (estado == 4) {
        window.location.href = `active/active.html#${codigo}`;
    }
}

function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO);
    const opciones = {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
    };
    return fecha.toLocaleDateString('es-ES', opciones);
}

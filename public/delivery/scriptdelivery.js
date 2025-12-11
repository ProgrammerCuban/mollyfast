// Variable global para el diccionario
let diccionarioUsuarios = {};
let idbussines = null;      // ID del delivery logueado
let namebussines = null;
let codigo = window.location.hash.substring(1);

// Socket.IO client
const socket = io();

// Estado global
let viajes = [];
let currentConversationId = null;
let currentReceiverId = null;
let misViajesUnreadCount = 0;

// Referencias DOM
const viajesGrid = document.getElementById('viajesGrid');
const loadingElement = document.getElementById('loading');
const noViajesElement = document.getElementById('noViajes');
const errorMessageElement = document.getElementById('errorMessage');
const errorTextElement = document.getElementById('errorText');
const filterPrice = document.getElementById('filterPrice');
const refreshBtn = document.getElementById('refreshBtn');

// Referencias para MIS VIAJES
const misViajesGrid = document.getElementById('misViajesGrid');
const loadingMisViajesElement = document.getElementById('loadingMisViajes');
const noMisViajesElement = document.getElementById('noMisViajes');
const errorMisViajesElement = document.getElementById('errorMisViajes');
const errorMisViajesTextElement = document.getElementById('errorMisViajesText');
const misViajesBadgeElement = document.getElementById('misViajesBadge');

// Modal chat refs
const chatModal = document.getElementById('chatModal');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatCloseBtn = document.getElementById('chatCloseBtn');
const chatSubtitle = document.getElementById('chatSubtitle');

// Estado de pestañas
let currentTab = 'disponibles';

document.addEventListener('DOMContentLoaded', function() {
    filterPrice.addEventListener('change', filtrarViajes);
    refreshBtn.addEventListener('click', function() {
        if (currentTab === 'disponibles') {
            cargarViajes();
        } else {
            cargarMisViajes();
        }
    });

    chatCloseBtn.addEventListener('click', closeChat);
    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });
});

// FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
async function inicial() {
    try {
        await obteneruser();
        await obtenerid();
        await isactive();
        await cargarFotoPerfil();
        await cargarDiccionarioUsuarios();
        
        // Inicializar socket
        inicializarSocket();
        
        // Cargar viajes disponibles por defecto
        await cargarViajes();
        
        // Obtener conteo de mensajes perdidos
        await obtenerViajesConMensajesPerdidos();
        
    } catch (error) {
        console.error('Error en inicialización:', error);
        alert('Error al cargar la aplicación. Por favor, recarga la página.');
    }
}

function inicializarSocket() {
    socket.on('new_message', async (msg) => {
        if (Number(msg.conversation_id) === Number(currentConversationId)) {
            await renderMessage(msg);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Actualizar conteo cuando llega nuevo mensaje
        await obtenerViajesConMensajesPerdidos();
        
        // Si el mensaje es para el viaje actual, refrescar
        if (currentTab === 'misViajes') {
            setTimeout(() => cargarMisViajes(), 500);
        }
    });
}

async function cargarDiccionarioUsuarios() {
    try {
        const response = await fetch('/usuarios-id');
        const data = await response.json();
        if (data.success) {
            diccionarioUsuarios = {};
            data.usuarios.forEach(element => {
                diccionarioUsuarios[element.id] = element.usuario;
            });
        }
    } catch (error) {
        console.error('Error cargando diccionario:', error);
    }
}

async function cargarViajes() {
    mostrarLoading();
    ocultarError();
    ocultarNoViajes();
    
    // Verificar que idbussines esté disponible
    if (!idbussines) {
        console.error('idbussines no está definido');
        mostrarError('Error de usuario. Por favor, recarga la página.');
        return;
    }

    try {
        const response = await fetch(`/viajes`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();

        if (data.success) {
            viajes = data.viajes;
        } else {
            throw new Error(data.message || 'Error al cargar los viajes');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError(error.message);
        return;
    }

    try {
        const misviajes = await obtenermisviajes();
        let filtroviajes = viajes.filter(element => !misviajes.includes(element.id));
        await mostrarViajes(filtroviajes);
    } catch (error) {
        console.error('Error filtrando viajes:', error);
        mostrarError('Error al procesar los viajes');
    }
}

async function mostrarViajes(viajesArray) {
    ocultarLoading();

    if (viajesArray.length === 0) {
        mostrarNoViajes();
        return;
    }

    viajesGrid.innerHTML = '';

    // Procesar viajes en paralelo para mejor rendimiento
    const viajesPromises = viajesArray.map(async (viaje) => {
        return await crearTarjetaViaje(viaje);
    });

    const viajesCards = await Promise.all(viajesPromises);
    
    viajesCards.forEach(card => {
        viajesGrid.appendChild(card);
    });
}

async function crearTarjetaViaje(viaje) {
    const card = document.createElement('div');
    card.className = 'viaje-card';

    // Obtener mensajes perdidos para este viaje
    let unreadCount = 0;
    try {
        unreadCount = await obtenerMensajesPerdidosPorViaje(viaje.id);
    } catch (error) {
        console.error(`Error obteniendo mensajes perdidos para viaje ${viaje.id}:`, error);
    }
    
    const hasUnread = unreadCount > 0;
    
    if (hasUnread) {
        card.classList.add('unread');
    }

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

        <button class="chat-btn ${hasUnread ? 'unread' : ''}" data-viaje-id="${viaje.id}">
            💬 SMS 
            ${hasUnread ? `<span class="chat-badge">${unreadCount > 9 ? '9+' : unreadCount}</span>` : ''}
        </button>
    `;

    const btn = card.querySelector('.chat-btn');
    btn.addEventListener('click', () => openChat(viaje));

    return card;
}

// Obtener mensajes perdidos por viaje
async function obtenerMensajesPerdidosPorViaje(viajeId) {
    try {
        // IMPORTANTE: Esta es la petición que necesitas programar en el backend
        // GET /api/conversations/by-trip/:viajeId/unread-count/:userId
        const res = await fetch(`/api/conversations/by-trip/${viajeId}/unread-count/${idbussines}`);
        
        if (!res.ok) {
            throw new Error(`Error HTTP ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.success) {
            return data.unreadCount || 0;
        } else {
            console.error('Backend error:', data.error);
            return 0;
        }
    } catch (err) {
        console.error('Error obteniendo mensajes perdidos por viaje:', err);
        return 0;
    }
}

// Obtener conteo total de viajes con mensajes perdidos
async function obtenerViajesConMensajesPerdidos() {
    try {
        // IMPORTANTE: Esta es la petición que necesitas programar en el backend
        // GET /api/conversations/by-user/:userId/unread-summary
        const res = await fetch(`/api/conversations/by-user/${idbussines}/unread-summary`);
        
        if (!res.ok) {
            throw new Error(`Error HTTP ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.success) {
            misViajesUnreadCount = data.viajesConMensajes || 0;
            
            // Actualizar badge en pestaña
            actualizarBadgePestana();
            
            return misViajesUnreadCount;
        } else {
            console.error('Backend error:', data.error);
            return 0;
        }
    } catch (err) {
        console.error('Error obteniendo resumen de mensajes perdidos:', err);
        return 0;
    }
}

function actualizarBadgePestana() {
    if (misViajesUnreadCount > 0) {
        misViajesBadgeElement.textContent = misViajesUnreadCount > 9 ? '9+' : misViajesUnreadCount;
        misViajesBadgeElement.style.display = 'flex';
    } else {
        misViajesBadgeElement.style.display = 'none';
    }
}

async function openChat(viaje) {
    try {
        const deliveryRequestId = viaje.id;
        const clientId = viaje.propietario;
        const deliveryId = idbussines;

        // Crear/obtener conversación
        const resp = await fetch('/api/conversations/get-or-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deliveryRequestId, clientId, deliveryId })
        });
        
        if (!resp.ok) throw new Error('Error de red');
        
        const data = await resp.json();
        if (!data.success) throw new Error(data.message || 'No se pudo crear la conversación');

        currentConversationId = data.conversationId;
        currentReceiverId = clientId;

        // Marcar mensajes como leídos
        const answerbackend = await fetch(`/api/messages/${2}/${currentConversationId}/read`);
        const dataaux = await answerbackend.json();

        if (!dataaux.success) {
            console.warn("No se pudieron marcar los mensajes como leídos");
        }

        // Unirse a la sala de la conversación
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
        
        // Actualizar badge inmediatamente
        await obtenerViajesConMensajesPerdidos();
        
    } catch (err) {
        console.error('Error abriendo chat:', err);
        alert('No se pudo abrir el chat. Intenta de nuevo.');
    }
}

async function loadConversationMessages(conversationId) {
    try {
        const resp = await fetch(`/api/conversations/${conversationId}/messages`);
        if (!resp.ok) throw new Error('Error cargando mensajes');
        
        const data = await resp.json();
        chatMessages.innerHTML = '';
        
        if (data.success && Array.isArray(data.messages)) {
            data.messages.forEach(m => renderMessage(m));
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } catch (err) {
        console.error('Error cargando mensajes:', err);
        chatMessages.innerHTML = '<div class="error-msg">Error cargando mensajes</div>';
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const text = String(input.value || '').trim();
    if (!text) return;
    
    if (!currentConversationId) {
        alert('No hay conversación activa');
        return;
    }
    
    socket.emit('send_message', {
        conversationId: currentConversationId,
        senderId: idbussines,
        message: text
    });
    
    // Renderizar mensaje localmente inmediatamente
    const message = {
        message: text,
        created_at: new Date().toISOString(),
        conversation_id: currentConversationId,
        sender_id: idbussines,
        is_read: true
    };
    
    renderMessage(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    input.value = '';
}

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

// Cerrar chat y refrescar
function closeChat() {
    chatModal.setAttribute('aria-hidden', 'true');
    chatMessages.innerHTML = '';
    currentConversationId = null;
    currentReceiverId = null;
    
    // Actualizar badge
    obtenerViajesConMensajesPerdidos();
    
    // Refrescar la vista actual después de un breve delay
    setTimeout(() => {
        if (currentTab === 'disponibles') {
            cargarViajes();
        } else {
            cargarMisViajes();
        }
    }, 300);
}

function filtrarViajes() {
    const filtro = filterPrice.value;
    let viajesFiltrados = [...viajes];
    
    switch (filtro) {
        case 'mayor-menor': 
            viajesFiltrados.sort((a, b) => b.precio - a.precio); 
            break;
        case 'menor-mayor': 
            viajesFiltrados.sort((a, b) => a.precio - b.precio); 
            break;
        case 'mas-rapido': 
            viajesFiltrados.sort((a, b) => new Date(a.fecha_salida) - new Date(b.fecha_salida)); 
            break;
        default: 
            break;
    }
    
    mostrarViajes(viajesFiltrados);
}

// Estados UI para VIAJES DISPONIBLES
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

// Estados UI para MIS VIAJES
function mostrarLoadingMisViajes() { 
    loadingMisViajesElement.style.display = 'block'; 
    misViajesGrid.style.display = 'none'; 
    noMisViajesElement.style.display = 'none';
    errorMisViajesElement.style.display = 'none';
}
function ocultarLoadingMisViajes() { 
    loadingMisViajesElement.style.display = 'none'; 
}
function mostrarNoMisViajes() { 
    noMisViajesElement.style.display = 'block'; 
    misViajesGrid.style.display = 'none'; 
}
function ocultarNoMisViajes() { 
    noMisViajesElement.style.display = 'none'; 
}
function mostrarErrorMisViajes(mensaje) {
    errorMisViajesTextElement.textContent = mensaje;
    errorMisViajesElement.style.display = 'block';
    misViajesGrid.style.display = 'none';
    loadingMisViajesElement.style.display = 'none';
}
function ocultarErrorMisViajes() { 
    errorMisViajesElement.style.display = 'none'; 
}

// Perfil y usuario
function irAlPerfil() {
    window.location.href = `perfil/perfil.html#${window.location.hash.substring(1)}`;
}

async function obtenerid() {
    try {
        const respuestaid = await fetch('/obtenerid', {
            method:'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: namebussines })
        });
        const datosid = await respuestaid.json();
        idbussines = datosid.id?.id;
        
        if (!idbussines) {
            throw new Error('No se pudo obtener el ID del usuario');
        }
    } catch (error) {
        console.error('Error obteniendo ID:', error);
        throw error;
    }
}

async function obteneruser(){
    try {
        const respuesta = await fetch('/desencript', {
            method:'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: codigo })
        });
        const datos = await respuesta.json();
        namebussines = datos.users;
        
        if (!namebussines) {
            throw new Error('No se pudo obtener el nombre de usuario');
        }
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        throw error;
    }
}

async function cargarFotoPerfil() {
    try {
        const respuesta = await fetch(`/perfil/${idbussines}`);
        const data = await respuesta.json();

        if (data.success) {
            const img = document.getElementById('profileHeaderImage');
            if (img) {
                img.src = data.perfil[0]?.fotoperfil || '';
            }
        }
    } catch (error) {
        console.error('Error cargando foto de perfil:', error);
    }
}

async function isactive() {
    try {
        const respuestaid = await fetch('/obtenerid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: namebussines })
        });
        const datosid = await respuestaid.json();
        const estado = datosid.id?.estado;

        if (estado == 4) {
            window.location.href = `active/active.html#${codigo}`;
        }
    } catch (error) {
        console.error('Error verificando estado:', error);
    }
}

function formatearFecha(fechaISO) {
    try {
        const fecha = new Date(fechaISO);
        const opciones = {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        };
        return fecha.toLocaleDateString('es-ES', opciones);
    } catch (error) {
        return 'Fecha no disponible';
    }
}

// Pestañas
function cambiarTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const filtersSection = document.getElementById('filtersSection');
    
    if (tab === 'disponibles') {
        document.getElementById('tabViajesDisponibles').classList.add('active');
        document.getElementById('viajesDisponiblesContent').classList.add('active');
        filtersSection.style.display = 'grid';
        cargarViajes();
    } 
    else if (tab === 'misViajes') {
        document.getElementById('tabMisViajes').classList.add('active');
        document.getElementById('misViajesContent').classList.add('active');
        filtersSection.style.display = 'none';
        cargarMisViajes();
    }
}

// Mis viajes
async function cargarMisViajes() {
    mostrarLoadingMisViajes();
    
    try {
        const idmisviajes = await obtenermisviajes();
        
        if (!idmisviajes || idmisviajes.length === 0) {
            mostrarNoMisViajes();
            ocultarLoadingMisViajes();
            return;
        }
        
        const response = await fetch(`/viajes`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();

        if (data.success) {
            let viajesmostrar = data.viajes.filter(element => 
                idmisviajes.includes(element.id)
            );
            
            await mostrarMisViajes(viajesmostrar);
        } else {
            throw new Error(data.message || 'Error al cargar los viajes');
        }
    } catch (error) {
        console.error('Error cargando mis viajes:', error);
        mostrarErrorMisViajes(error.message);
    } finally {
        ocultarLoadingMisViajes();
    }
}

async function mostrarMisViajes(viajesArray) {
    if (viajesArray.length === 0) {
        mostrarNoMisViajes();
        return;
    }

    misViajesGrid.innerHTML = '';

    const viajesPromises = viajesArray.map(async (viaje) => {
        return await crearTarjetaMisViajes(viaje);
    });

    const viajesCards = await Promise.all(viajesPromises);
    
    viajesCards.forEach(card => {
        misViajesGrid.appendChild(card);
    });
    
    misViajesGrid.style.display = 'grid';
    ocultarNoMisViajes();
    ocultarErrorMisViajes();
}

async function crearTarjetaMisViajes(viaje) {
    const card = document.createElement('div');
    card.className = 'viaje-card';

    let unreadCount = 0;
    try {
        unreadCount = await obtenerMensajesPerdidosPorViaje(viaje.id);
    } catch (error) {
        console.error(`Error obteniendo mensajes perdidos para viaje ${viaje.id}:`, error);
    }
    
    const hasUnread = unreadCount > 0;
    
    if (hasUnread) {
        card.classList.add('unread');
    }

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

        <button class="chat-btn ${hasUnread ? 'unread' : ''}" data-viaje-id="${viaje.id}">
            💬 SMS 
            ${hasUnread ? `<span class="chat-badge">${unreadCount > 9 ? '9+' : unreadCount}</span>` : ''}
        </button>
    `;

    const btn = card.querySelector('.chat-btn');
    btn.addEventListener('click', () => openChat(viaje));

    return card;
}

async function obtenermisviajes() {
    try {
        const answer = await fetch(`/api/conversations/by-user/${idbussines}`);
        
        if (!answer.ok) {
            throw new Error(`Error HTTP ${answer.status}`);
        }
        
        const data = await answer.json();

        if (!data.success) {
            console.error('Backend error:', data.message);
            return [];
        }

        const idsUnicos = [...new Set(
            data.conversations.map(element => element.delivery_request_id)
        )];

        return idsUnicos;
    } catch (error) {
        console.error('Error obteniendo mis viajes:', error);
        return [];
    }
}
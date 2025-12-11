const codigo = window.location.hash.substring(1);
let namebussines = "";
let idbussines = "";
let usuariocompleto;
let active = true;
let socket = null;
let currentTripId = null;
let currentConversationId = null;
let currentChatDeliveryId = null;

async function inicial() {
    await obteneruser();
    await obtenerid();
    await cargarviajes();
    await cargarFotoPerfil();
    initializeSocket();
}

async function initializeSocket() {
    if (socket) return;
    try {
        socket = io();
        
        socket.on('new_message', async (msg) => {
            if (Number(msg.conversation_id) === Number(currentConversationId)) {
                await renderMessage(msg);
                scrollToBottom();
            }
            
            if (currentTripId) {
                actualizarContadorTrip(currentTripId);
                // Actualizar contador de mensajes perdidos para la conversación activa
                if (currentConversationId) {
                    await actualizarContadorPerdidos(currentConversationId);
                }
            }
        });
        
        socket.on('message_error', (payload) => {
            console.error('Error de mensaje:', payload);
        });
    } catch (err) {
        console.error('Socket init error:', err);
    }
}

async function cargarFotoPerfil() {
    const respuesta = await fetch(`/perfil/${idbussines}`);
    const data = await respuesta.json();
    if (data.success) {
        document.getElementById('profileHeaderImage').src = data.perfil[0].fotoperfil || '';
    }
}

function irAlPerfil() {
    window.location.href = `perfil/perfil.html#${codigo}`;
}

async function obteneruser() {
    const respuesta = await fetch('/desencript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codigo })
    });
    const datos = await respuesta.json();
    namebussines = datos.users;
}

async function obtenerid() {
    const respuestaid = await fetch('/obtenerid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: namebussines })
    });
    const datosid = await respuestaid.json();
    idbussines = datosid.id.id;
    usuariocompleto = datosid;
}

async function cargarviajes() {
    setLoading(true);
    const respuesta = await fetch(`/viajes/${idbussines}`);
    const viajes = await respuesta.json();
    if (viajes.success) {
        await carga(viajes.viaje);
    } else {
        alert(viajes.message);
    }
    setLoading(false);
}

async function carga(viajes) {
    const contenedor = document.getElementById('viajes-lista');
    contenedor.innerHTML = '';

    for (const viaje of viajes) {
        const count = await obtenerConteoMensajesPorViaje(viaje.id);
        const viajeHTML = `
            <div class="viaje-card ${count > 0 ? 'green' : ''}" id="viaje-card-${viaje.id}">
                <div class="viaje-header">
                    <h2>Viaje #${viaje.id}</h2>
                    <span class="precio">$${viaje.precio}</span>
                </div>

                <div class="viaje-ruta">
                    <div class="ruta-origen">
                        <strong>Salida</strong>
                        <div class="ubicacion-detalle">${viaje.municipio_salida}, ${viaje.provincia_salida}</div>
                        <div class="ubicacion-detalle">${viaje.desde}</div>
                    </div>
                    <div class="ruta-destino">
                        <strong>Llegada</strong>
                        <div class="ubicacion-detalle">${viaje.municipio_llegada}, ${viaje.provincia_llegada}</div>
                        <div class="ubicacion-detalle">${viaje.hasta}</div>
                    </div>
                </div>

                <div class="viaje-fecha">
                    <strong>Fecha de salida:</strong> ${viaje.fecha_salida || ''}
                </div>

                <div class="viaje-detalles">
                    <p class="propietario"><strong>Propietario:</strong> #${viaje.propietario}</p>
                    <p class="descripcion">${viaje.detalles_adicionales || ''}</p>
                </div>

                <div class="viaje-acciones">
                    <button class="btn-chat-counter" onclick="abrirListaDeliverys(${viaje.id})" title="Ver interesados y chats">
                        💬 Mensajes: <span id="msg-count-${viaje.id}">${count}</span>
                    </button>
                    <button class="btn-eliminar" onclick="eliminarViaje(${viaje.id})" title="Eliminar este viaje">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;
        contenedor.insertAdjacentHTML('beforeend', viajeHTML);
    }
}

async function obtenerConteoMensajesPorViaje(tripId) {
    try {
        const res = await fetch(`/api/messages/count/chat/negocio/${tripId}`);
        const data = await res.json();
        return data.success ? (data.total || 0) : 0;
    } catch (err) {
        console.error('count error:', err);
        return 0;
    }
}

async function obtenerMensajesPerdidosPorConversacion(conversationId) {
    try {
        // NUEVA PETICIÓN: Obtener cantidad de mensajes perdidos
        const res = await fetch(`/api/conversations/${conversationId}/unread-count`);
        const data = await res.json();
        return data.success ? (data.unreadCount || 0) : 0;
    } catch (err) {
        console.error('Error obteniendo mensajes perdidos:', err);
        return 0;
    }
}

async function actualizarContadorPerdidos(conversationId) {
    try {
        const unreadCount = await obtenerMensajesPerdidosPorConversacion(conversationId);
        // Buscar y actualizar la fila correspondiente en el modal
        const deliveryRow = document.querySelector(`.delivery-row[data-conversation-id="${conversationId}"]`);
        if (deliveryRow) {
            const unreadBadge = deliveryRow.querySelector('.unread-badge');
            if (unreadCount > 0) {
                if (!unreadBadge) {
                    // Crear badge si no existe
                    const badge = document.createElement('span');
                    badge.className = 'unread-badge';
                    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                    badge.title = `${unreadCount} mensaje(s) no leído(s)`;
                    
                    const openButton = deliveryRow.querySelector('.delivery-open');
                    if (openButton) {
                        openButton.parentNode.insertBefore(badge, openButton.nextSibling);
                    }
                } else {
                    // Actualizar badge existente
                    unreadBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                    unreadBadge.title = `${unreadCount} mensaje(s) no leído(s)`;
                }
                // Agregar clase para resaltar
                deliveryRow.classList.add('has-unread');
            } else {
                // Remover badge si existe
                if (unreadBadge) {
                    unreadBadge.remove();
                }
                // Remover clase de resaltado
                deliveryRow.classList.remove('has-unread');
            }
        }
    } catch (err) {
        console.error('Error actualizando contador perdidos:', err);
    }
}

async function actualizarContadorTrip(tripId) {
    const count = await obtenerConteoMensajesPorViaje(tripId);
    const el = document.getElementById(`msg-count-${tripId}`);
    if (el) el.textContent = count;
    
    const card = document.getElementById(`viaje-card-${tripId}`);
    if (card) {
        if (count > 0) {
            card.classList.add('green');
        } else {
            card.classList.remove('green');
        }
    }
}

async function abrirListaDeliverys(tripId) {
    currentTripId = tripId;
    try {
        setLoading(true);
        const res = await fetch(`/api/conversations/by-trip/${tripId}`);
        const data = await res.json();
        setLoading(false);
        if (data.success) {
            await renderModalDeliverys(data.deliveries || []);
            await actualizarContadorTrip(tripId);
        } else {
            alert(data.message || 'No se pudo cargar la lista de interesados');
        }
    } catch (err) {
        setLoading(false);
        console.error(err);
        alert('Error de conexión al cargar interesados');
    }
}

async function renderModalDeliverys(deliveries) {
    let modal = document.getElementById('deliveryListModal');
    if (!modal) {
        const html = `
            <div id="deliveryListModal" class="modal-overlay">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3>Interesados en el viaje #${currentTripId}</h3>
                        <button class="modal-close" onclick="cerrarDeliveryModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="deliveryList" class="delivery-list"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        modal = document.getElementById('deliveryListModal');
    }

    const list = modal.querySelector('#deliveryList');
    list.innerHTML = '';

    if (deliveries.length === 0) {
        list.innerHTML = `<div class="empty-row">No hay mensajes aún para este viaje.</div>`;
    } else {
        for (const d of deliveries) {
            const respuesta = await fetch('/encript', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user: d.delivery_name
                })
            });

            const datacode = await respuesta.json();
            const profileUrl = `../ver-perfil/ver-perfil.html#${d.delivery_id}`;
            const answerfoto = await fetch(`/perfil/${d.delivery_id}`);
            const datafoto = await answerfoto.json();
            let fotop = "";

            if (datafoto.success) {
                fotop = datafoto.perfil[0].fotoperfil;
            }

            // Obtener mensajes perdidos para esta conversación
            const unreadCount = await obtenerMensajesPerdidosPorConversacion(d.conversation_id);
            const hasUnread = unreadCount > 0 ? 'has-unread' : '';
            const unreadBadgeHTML = unreadCount > 0 ? 
                `<span class="unread-badge" title="${unreadCount} mensaje(s) no leído(s)">${unreadCount > 9 ? '9+' : unreadCount}</span>` : 
                '';

            const row = `
                <div class="delivery-row ${hasUnread}" data-conversation-id="${d.conversation_id}">
                    <div class="delivery-info" style="display: flex; align-items: center; gap: 12px;">
                        <div class="delivery-avatar">
                            <a href="${profileUrl}" title="Ver perfil de ${escapeHtml(d.delivery_name)}">
                                <img src="${fotop || 'default-avatar.png'}" alt="${escapeHtml(d.delivery_name)}">
                            </a>
                        </div>
                        <div>
                            <div class="delivery-name">🚚 ${escapeHtml(d.delivery_name)}</div>
                            <div class="delivery-meta">Mensajes: ${d.messages_count} • Último: ${d.last_message_at ? new Date(d.last_message_at).toLocaleString() : '—'}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button class="delivery-open" onclick="abrirChatConDelivery(${d.conversation_id}, ${d.delivery_id}, '${escapeHtml(d.delivery_name)}')">Abrir chat</button>
                        ${unreadBadgeHTML}
                    </div>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', row);
        }
    }

    modal.style.display = 'flex';
}

function cerrarDeliveryModal() {
    const modal = document.getElementById('deliveryListModal');
    if (modal) modal.style.display = 'none';
}

async function abrirChatConDelivery(conversationId, deliveryId, deliveryName) {
    currentConversationId = conversationId;
    currentChatDeliveryId = deliveryId;

    socket.emit('join_conversation', { conversationId, userId: idbussines });

    let modal = document.getElementById('chatModal');
    if (!modal) {
        const html = `
            <div id="chatModal" class="modal-overlay">
                <div class="modal-dialog chat-dialog">
                    <div class="modal-header">
                        <h3>Chat con ${escapeHtml(deliveryName)}</h3>
                        <button class="modal-close" onclick="cerrarChatModal()">×</button>
                    </div>
                    <div class="modal-body chat-body">
                        <div id="chatMessages" class="chat-messages"></div>
                    </div>
                    <div class="modal-footer chat-footer">
                        <input id="chatInput" type="text" class="chat-input" placeholder="Escribe un mensaje..." />
                        <button class="chat-send" onclick="sendChatMessage()">Enviar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        modal = document.getElementById('chatModal');
    } else {
        modal.querySelector('.modal-header h3').textContent = `Chat con ${deliveryName}`;
    }

    await cargarHistorialConversacion(conversationId);
    
    // Marcar como leídos después de abrir el chat
    await marcarComoLeido(conversationId);
    
    modal.style.display = 'flex';
    
    // Scroll al final después de que se renderice todo
    setTimeout(() => {
        scrollToBottom();
    }, 150);
    
    cerrarDeliveryModal();
}

async function marcarComoLeido(conversationId) {
    try {
        // NUEVA PETICIÓN: Marcar mensajes como leídos
        const res = await fetch(`/api/conversations/${conversationId}/mark-as-read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: idbussines })
        });
        
        const data = await res.json();
        if (data.success) {
            // Actualizar visualmente la fila en el modal
            await actualizarContadorPerdidos(conversationId);
        }
    } catch (err) {
        console.error('Error marcando como leído:', err);
    }
}

function cerrarChatModal() {
    const modal = document.getElementById('chatModal');
    if (modal) modal.style.display = 'none';
}

async function cargarHistorialConversacion(conversationId) {
    const answerbackend = await fetch(`/api/messages/${1}/${conversationId}/read`);
    const dataaux = await answerbackend.json();

    if (!dataaux.success) {
        alert("hubo un error al marcar el sms como leido");
    }

    const cont = document.getElementById('chatMessages');
    cont.innerHTML = '';
    try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`);
        const data = await res.json();
        if (data.success) {
            for (const m of data.messages) {
                await renderMessage(m);
            }
            // Scroll al final después de cargar todos los mensajes
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        } else {
            cont.innerHTML = `<div class="empty-row">No hay mensajes aún.</div>`;
        }
    } catch (err) {
        console.error('historial error:', err);
        cont.innerHTML = `<div class="empty-row">Error cargando historial.</div>`;
    }
}

async function renderMessage(m) {
    const isMe = Number(m.sender_id) === Number(idbussines);
    const wrapper = document.createElement('div');
    wrapper.className = `msg ${isMe ? 'me' : 'other'}`;
    wrapper.textContent = m.message;

    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    const date = m.created_at ? new Date(m.created_at) : new Date();
    meta.textContent = date.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.appendChild(wrapper);
        chatMessages.appendChild(meta);
    }
}

function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        // Usar diferentes métodos para asegurar compatibilidad
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // También puedes usar esto para mayor compatibilidad
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 10);
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const text = String(input.value || '').trim();
    if (!text) return;
    socket.emit('send_message', {
        conversationId: currentConversationId,
        senderId: idbussines,
        message: text
    });
    const message = {
        message: text,
        created_at: new Date().toISOString(),
        sender_name: namebussines,
        conversation_id: currentConversationId,
        sender_id: idbussines,
        is_read: true,
        profile_picture: usuariocompleto.fotoperfil || ''
    };
    input.value = '';
    scrollToBottom();
    actualizarContadorTrip(currentTripId);
}

async function eliminarViaje(idViaje) {
    if (!confirm('¿Estás seguro de que quieres eliminar este viaje? Esta acción no se puede deshacer.')) return;
    try {
        const respuesta = await fetch(`/eliminar-viaje/${idViaje}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
        const datos = await respuesta.json();
        if (datos.success) {
            alert('✅ Viaje eliminado correctamente');
            await cargarviajes();
        } else {
            alert('❌ Error: ' + datos.message);
        }
    } catch (error) {
        console.error('Error al eliminar viaje:', error);
        alert('🚨 Error de conexión al eliminar el viaje');
    }
}

function irAFormulario() {
    document.getElementById('viajes-lista').style.display = 'none';
    document.querySelector('.btn-agregar').style.display = 'none';
    const formularioHTML = `
        <div class="formulario-container">
            <h2>➕ Agregar Nuevo Viaje - Cuba</h2>
            <form id="formNuevoViaje" class="formulario-viaje">
                <div class="form-section section-origen">
                    <h3>Lugar de Salida</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="provincia_salida">Provincia de Salida:</label>
                            <select id="provincia_salida" required>
                                <option value="">Selecciona una provincia</option>
                            </select>
                            <div class="error-message">Por favor selecciona una provincia</div>
                        </div>
                        <div class="form-group">
                            <label for="municipio_salida">Municipio de Salida:</label>
                            <select id="municipio_salida" disabled required>
                                <option value="">Primero selecciona una provincia</option>
                            </select>
                            <div class="error-message">Por favor selecciona un municipio</div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="desde">Dirección Exacta de Salida:</label>
                        <input type="text" id="desde" placeholder="Ej: Calle 23 #456, Vedado" required>
                        <div class="error-message">Por favor ingresa la dirección de salida</div>
                    </div>
                </div>
                <div class="form-section section-destino">
                    <h3>Lugar de Llegada</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="provincia_llegada">Provincia de Llegada:</label>
                            <select id="provincia_llegada" required>
                                <option value="">Selecciona una provincia</option>
                            </select>
                            <div class="error-message">Por favor selecciona una provincia</div>
                        </div>
                        <div class="form-group">
                            <label for="municipio_llegada">Municipio de Llegada:</label>
                            <select id="municipio_llegada" disabled required>
                                <option value="">Primero selecciona una provincia</option>
                            </select>
                            <div class="error-message">Por favor selecciona un municipio</div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="hasta">Dirección Exacta de Llegada:</label>
                        <input type="text" id="hasta" placeholder="Ej: Avenida de los Presidentes, Centro Habana" required>
                        <div class="error-message">Por favor ingresa la dirección de llegada</div>
                    </div>
                </div>
                <div class="form-section section-datos">
                    <h3>Información del Viaje</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="fecha_salida">Fecha de Salida:</label>
                            <input type="date" id="fecha_salida" required>
                            <div class="error-message">Por favor selecciona una fecha</div>
                        </div>
                        <div class="form-group">
                            <label for="precio">Precio (CUP):</label>
                            <input type="number" id="precio" step="0.01" min="0" placeholder="Ej: 150.00" required>
                            <div class="error-message">Por favor ingresa un precio válido</div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="detalles">Detalles Adicionales del Viaje:</label>
                        <textarea id="detalles" placeholder="Describe los detalles..." required></textarea>
                        <div class="error-message">Por favor ingresa los detalles del viaje</div>
                    </div>
                </div>
                <div class="botones-form">
                    <button type="submit" class="btn btn-primary" id="btnGuardar"><span>💾 Guardar Viaje</span></button>
                    <button type="button" class="btn btn-secondary" onclick="volverAViajes()"><span>❌ Cancelar</span></button>
                </div>
            </form>
        </div>
    `;
    const header = document.querySelector('.header');
    header.insertAdjacentHTML('afterend', formularioHTML);
    inicializarFormulario();
}

function inicializarFormulario() {
    const provinciasCuba = {
        "Pinar del Río": ["Pinar del Río","Consolación del Sur","Viñales","San Luis","Minas de Matahambre","Guane","Sandino","Los Palacios","San Juan y Martínez","La Palma","Mantua"],
        "Artemisa": ["Artemisa","Guanajay","Mariel","Bauta","San Antonio de los Baños","Güira de Melena","Alquízar","Caimito","Bahía Honda","Candelaria","San Cristóbal"],
        "La Habana": ["Playa","Plaza de la Revolución","Centro Habana","La Habana Vieja","Regla","La Habana del Este","Guanabacoa","San Miguel del Padrón","Diez de Octubre","Cerro","Marianao","La Lisa","Boyeros","Arroyo Naranjo","Cotorro"],
        "Mayabeque": ["San José de las Lajas","Güines","Jaruco","Santa Cruz del Norte","Madruga","Nueva Paz","San Nicolás","Güira de Melena","Melena del Sur","Batabanó","Quivicán"],
        "Matanzas": ["Matanzas","Cárdenas","Colón","Jovellanos","Pedro Betancourt","Limonar","Unión de Reyes","Ciénaga de Zapata","Jagüey Grande","Calimete","Los Arabos","Martí","Perico"],
        "Cienfuegos": ["Cienfuegos","Aguada de Pasajeros","Rodas","Palmira","Cruces","Cumanayagua","Lajas","Abreus"],
        "Villa Clara": ["Santa Clara","Placetas","Sagua la Grande","Camajuaní","Caibarién","Remedios","Encrucijada","Cifuentes","Santo Domingo","Ranchuelo","Manicaragua","Quemado de Güines","Corralillo"],
        "Sancti Spíritus": ["Sancti Spíritus","Trinidad","Cabaiguán","Yaguajay","Fomento","Jatibonico","Taguasco","La Sierpe"],
        "Ciego de Ávila": ["Ciego de Ávila","Morón","Chambas","Majagua","Ciro Redondo","Venezuela","Baraguá","Primero de Enero","Bolivia","Florencia"],
        "Camagüey": ["Camagüey","Florida","Vertientes","Esmeralda","Sibanicú","Minas","Nuevitas","Guáimaro","Santa Cruz del Sur","Jimaguayú","Najasa","Sierra de Cubitas","Carlos Manuel de Céspedes"],
        "Las Tunas": ["Las Tunas","Puerto Padre","Majibacoa","Amancio","Colombia","Jesús Menéndez","Jobabo","Manatí"],
        "Holguín": ["Holguín","Banes","Gibara","Moa","Rafael Freyre","Antilla","Báguanos","Cacocum","Calixto García","Cueto","Frank País","Mayarí","Sagua de Tánamo","Urbano Noris"],
        "Granma": ["Bayamo","Manzanillo","Yara","Jiguaní","Media Luna","Niquero","Pilón","Bartolomé Masó","Buey Arriba","Campechuela","Cauto Cristo","Guisa","Río Cauto"],
        "Santiago de Cuba": ["Santiago de Cuba","Contramaestre","Palma Soriano","San Luis","Songo-La Maya","Tercer Frente","Guamá","Mella","Segundo Frente"],
        "Guantánamo": ["Guantánamo","Baracoa","El Salvador","Imías","Maisí","San Antonio del Sur","Yateras","Manuel Tames","Caimanera","Niceto Pérez"],
        "Isla de la Juventud": ["Nueva Gerona","Santa Fe","La Demajagua"]
    };

    const provinciaSalidaSelect = document.getElementById('provincia_salida');
    const municipioSalidaSelect = document.getElementById('municipio_salida');
    const provinciaLlegadaSelect = document.getElementById('provincia_llegada');
    const municipioLlegadaSelect = document.getElementById('municipio_llegada');
    const form = document.getElementById('formNuevoViaje');

    function cargarProvincias() {
        for (const provincia in provinciasCuba) {
            const optionSalida = document.createElement('option');
            optionSalida.value = provincia;
            optionSalida.textContent = provincia;
            provinciaSalidaSelect.appendChild(optionSalida);

            const optionLlegada = document.createElement('option');
            optionLlegada.value = provincia;
            optionLlegada.textContent = provincia;
            provinciaLlegadaSelect.appendChild(optionLlegada);
        }
    }

    function cargarMunicipios(provinciaSelect, municipioSelect) {
        const provincia = provinciaSelect.value;
        municipioSelect.innerHTML = '';
        if (provincia) {
            municipioSelect.disabled = false;
            const municipios = provinciasCuba[provincia];
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Selecciona un municipio';
            municipioSelect.appendChild(defaultOption);
            municipios.forEach(municipio => {
                const option = document.createElement('option');
                option.value = municipio;
                option.textContent = municipio;
                municipioSelect.appendChild(option);
            });
        } else {
            municipioSelect.disabled = true;
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Primero selecciona una provincia';
            municipioSelect.appendChild(defaultOption);
        }
    }

    provinciaSalidaSelect.addEventListener('change', () => cargarMunicipios(provinciaSalidaSelect, municipioSalidaSelect));
    provinciaLlegadaSelect.addEventListener('change', () => cargarMunicipios(provinciaLlegadaSelect, municipioLlegadaSelect));

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        guardarNuevoViaje(e);
    });

    const fechaInput = document.getElementById('fecha_salida');
    const hoy = new Date().toISOString().split('T')[0];
    fechaInput.min = hoy;

    cargarProvincias();
}

function volverAViajes() {
    const formularioContainer = document.querySelector('.formulario-container');
    if (formularioContainer) formularioContainer.remove();
    document.getElementById('viajes-lista').style.display = 'block';
    document.querySelector('.btn-agregar').style.display = 'block';
    cargarviajes();
}

async function guardarNuevoViaje(event) {
    event.preventDefault();
    const precio = document.getElementById('precio').value;
    const detalles = document.getElementById('detalles').value;
    const provincia_salida = document.getElementById('provincia_salida').value;
    const municipio_salida = document.getElementById('municipio_salida').value;
    const desde = document.getElementById('desde').value;
    const provincia_llegada = document.getElementById('provincia_llegada').value;
    const municipio_llegada = document.getElementById('municipio_llegada').value;
    const hasta = document.getElementById('hasta').value;
    const fecha_salida = document.getElementById('fecha_salida').value;

    if (!precio || !detalles || !provincia_salida || !municipio_salida || !desde || !provincia_llegada || !municipio_llegada || !hasta || !fecha_salida) {
        alert('⚠️ Por favor completa todos los campos');
        return;
    }

    const nuevoViaje = {
        propietario: idbussines,
        precio: parseFloat(precio),
        detalles,
        provincia_salida,
        municipio_salida,
        desde,
        provincia_llegada,
        municipio_llegada,
        hasta,
        fecha_salida
    };

    setLoading(true);
    try {
        const btnGuardar = document.getElementById('btnGuardar');
        btnGuardar.classList.add('btn-loading');
        btnGuardar.disabled = true;

        const respuesta = await fetch('/guardar-viaje', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoViaje)
        });

        const resultado = await respuesta.json();
        if (resultado.success) {
            alert('✅ Viaje agregado correctamente');
            volverAViajes();
        } else {
            alert('❌ Error: ' + resultado.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('🚨 Error de conexión con el servidor');
    } finally {
        const btnGuardar = document.getElementById('btnGuardar');
        if (btnGuardar) {
            btnGuardar.classList.remove('btn-loading');
            btnGuardar.disabled = false;
        }
    }
    setLoading(false);
}

function setLoading(show) {
    if (show) {
        const loadingHTML = `
            <div id="simpleLoading" style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.8); display: flex; justify-content: center; align-items: center; z-index: 9999;
            ">
                <div style="
                    width: 50px; height: 50px; border: 3px solid rgba(255,255,255,0.3);
                    border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;
                "></div>
            </div>
            <style>
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
        document.body.style.overflow = 'hidden';
    } else {
        const loadingElement = document.getElementById('simpleLoading');
        if (loadingElement) {
            loadingElement.remove();
            document.body.style.overflow = '';
        }
    }
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"'`]/g, (c) => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'
    }[c]));
}
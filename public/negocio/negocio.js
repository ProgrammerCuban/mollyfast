const codigo = window.location.hash.substring(1);
let namebussines = "";
let idbussines = "";


async function inicial() {
  await  obteneruser();
   await obtenerid();
   await cargarviajes();
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

async function cargarviajes() {

    const respuesta = await fetch(`/viajes/${idbussines}`);
   
    const viajes = await respuesta.json();
    

    console.log(viajes.viaje.length);
 
    await  carga(viajes.viaje);
}

  async function carga(viajes) {
    const contenedor = document.getElementById('viajes-lista');
    contenedor.innerHTML = '';

     viajes.forEach(viaje => {
        const viajeHTML = `
            <div class="viaje-card">
                <div class="viaje-header">
                    <h2>Viaje #${viaje.id}</h2>
                    <span class="precio">$${viaje.precio}</span>
                </div>
                <div class="viaje-detalles">
                    <p class="propietario"><strong>Propietario:</strong> #${viaje.propietario}</p>
                    <p class="descripcion">${viaje.detalles_adicionales}</p>
                </div>
                <div class="viaje-acciones">
                    <button class="btn-eliminar" onclick="eliminarViaje(${viaje.id})" 
                            title="Eliminar este viaje">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;
        
        contenedor.innerHTML += viajeHTML;
    });
}

async function eliminarViaje(idViaje) {
    // Confirmar antes de eliminar
    if (!confirm('¿Estás seguro de que quieres eliminar este viaje? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const respuesta = await fetch(`/eliminar-viaje/${idViaje}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const datos = await respuesta.json();
        
        if (datos.success) {
            alert('✅ Viaje eliminado correctamente');
            // Recargar la lista de viajes
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
    // Ocultar lista de viajes
    document.getElementById('viajes-lista').style.display = 'none';
    
    // Crear y mostrar formulario dinámicamente con CSS integrado
    const formularioHTML = `
        <style>
            .formulario-container {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 15px;
                padding: 30px;
                box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(10px);
                max-width: 600px;
                margin: 0 auto;
            }
            
            .formulario-container h2 {
                color: #2c3e50;
                margin-bottom: 25px;
                text-align: center;
                font-size: 1.8rem;
            }
            
            .formulario-viaje {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .form-group {
                display: flex;
                flex-direction: column;
            }
            
            .form-group label {
                font-weight: 600;
                margin-bottom: 8px;
                color: #2c3e50;
                font-size: 1rem;
            }
            
            .form-group input,
            .form-group textarea {
                padding: 15px;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-size: 1rem;
                transition: all 0.3s ease;
                background: #fff;
                font-family: inherit;
            }
            
            .form-group input:focus,
            .form-group textarea:focus {
                outline: none;
                border-color: #3498db;
                box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
            }
            
            .form-group textarea {
                resize: vertical;
                min-height: 120px;
            }
            
            .botones-form {
                display: flex;
                gap: 15px;
                margin-top: 10px;
                flex-wrap: wrap;
            }
            
            .btn {
                padding: 15px 25px;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                flex: 1;
                min-width: 120px;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #27ae60, #2ecc71);
                color: white;
            }
            
            .btn-primary:hover {
                background: linear-gradient(135deg, #219a52, #27ae60);
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(39, 174, 96, 0.3);
            }
            
            .btn-secondary {
                background: linear-gradient(135deg, #95a5a6, #bdc3c7);
                color: white;
            }
            
            .btn-secondary:hover {
                background: linear-gradient(135deg, #7f8c8d, #95a5a6);
                transform: translateY(-2px);
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .formulario-container {
                    padding: 25px;
                    margin: 10px;
                }
                
                .botones-form {
                    flex-direction: column;
                }
                
                .btn {
                    width: 100%;
                }
            }
            
            @media (max-width: 480px) {
                .formulario-container {
                    padding: 20px;
                }
                
                .formulario-container h2 {
                    font-size: 1.5rem;
                }
                
                .form-group input,
                .form-group textarea {
                    padding: 12px;
                }
            }
        </style>

        <div class="formulario-container">
            <h2>➕ Agregar Nuevo Viaje</h2>
            <form id="formNuevoViaje" class="formulario-viaje">
                <div class="form-group">
                    <label for="precio">Precio ($):</label>
                    <input type="number" id="precio" step="0.01" min="0" placeholder="Ej: 150.00" required>
                </div>
                <div class="form-group">
                    <label for="detalles">Detalles del Viaje:</label>
                    <textarea id="detalles" placeholder="Describe los detalles, lugares a visitar, servicios incluidos..." required></textarea>
                </div>
                <div class="botones-form">
                    <button type="submit" class="btn btn-primary">💾 Guardar Viaje</button>
                    <button type="button" class="btn btn-secondary" onclick="volverAViajes()">❌ Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    // Insertar el formulario después del header
    const header = document.querySelector('.header');
    header.insertAdjacentHTML('afterend', formularioHTML);
    
    // Configurar el evento del formulario
    document.getElementById('formNuevoViaje').addEventListener('submit', guardarNuevoViaje);
}

function volverAViajes() {
    // Remover el formulario
    const formularioContainer = document.querySelector('.formulario-container');
    if (formularioContainer) {
        formularioContainer.remove();
    }
    
    // Remover el style tag que creamos
    const styleTag = document.querySelector('style');
    if (styleTag && styleTag.innerHTML.includes('formulario-container')) {
        styleTag.remove();
    }
    
    // Mostrar la lista de viajes nuevamente
    document.getElementById('viajes-lista').style.display = 'block';
    
    // Recargar los viajes por si se agregó uno nuevo
    cargarviajes();
}

async function guardarNuevoViaje(event) {
    event.preventDefault();
    
    const precio = document.getElementById('precio').value;
    const detalles = document.getElementById('detalles').value;
    
    if (!precio || !detalles) {
        alert('⚠️ Por favor completa todos los campos');
        return;
    }
    
    const nuevoViaje = {
        propietario: idbussines, // Usar el ID del usuario logueado
        precio: parseFloat(precio),
        detalles: detalles
    };
    
    try {
        const respuesta = await fetch('/guardar-viaje', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(nuevoViaje)
        });
        
        const resultado = await respuesta.json();
        
        if (resultado.success) {
            alert('✅ Viaje agregado correctamente');
            volverAViajes(); // Volver a la lista
        } else {
            alert('❌ Error: ' + resultado.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('🚨 Error de conexión con el servidor');
    }
}
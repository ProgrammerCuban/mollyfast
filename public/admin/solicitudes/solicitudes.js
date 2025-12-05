class SolicitudesManager {
    constructor() {
        this.solicitudes = [];
        this.init();
    }

    init() {
        this.cargarSolicitudes();
    }

    async cargarSolicitudes() {
        this.mostrarLoading();
        this.ocultarError();
        this.ocultarEmptyState();

        try {
            const response = await fetch('/api/get-solicitudes');
            const data = await response.json();

            if (data.success) {
                this.solicitudes = data.usuarios || [];
                this.mostrarSolicitudes();
            } else {
                this.mostrarError(data.message || 'Error al cargar las solicitudes');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarError('Error de conexión con el servidor');
        }
    }

    mostrarSolicitudes() {
        const container = document.getElementById('solicitudesContainer');
        const totalElement = document.getElementById('totalSolicitudes');

        // Actualizar contador
        totalElement.textContent = `${this.solicitudes.length} solicitud(es)`;

        if (this.solicitudes.length === 0) {
            this.mostrarEmptyState();
            return;
        }

        container.innerHTML = this.solicitudes.map(solicitud => this.crearCardSolicitud(solicitud)).join('');
        this.ocultarLoading();
    }

    crearCardSolicitud(solicitud) {
        return `
            <div class="solicitud-card" data-carnet="${solicitud.carnet}">
                <div class="solicitud-header">
                    <h3>Solicitud de:</h3>
                    <span class="carnet-number">${solicitud.carnet}</span>
                </div>
                
                <div class="fotos-grid">
                    <div class="foto-item">
                        <h4>Documento de Identidad</h4>
                        <img src="${solicitud.fotocarnet}" alt="Documento de identidad" class="foto-preview" 
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBlbmNvbnRyYWRhPC90ZXh0Pjwvc3ZnPg=='">
                    </div>
                    
                    <div class="foto-item">
                        <h4>Selfie con Documento</h4>
                        <img src="${solicitud.selfie}" alt="Selfie con documento" class="foto-preview"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBlbmNvbnRyYWRhPC90ZXh0Pjwvc3ZnPg=='">
                    </div>
                    
                    <div class="foto-item">
                        <h4>Foto de la Moto</h4>
                        <img src="${solicitud.foto_moto}" alt="Foto de la moto" class="foto-preview"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBlbmNvbnRyYWRhPC90ZXh0Pjwvc3ZnPg=='">
                    </div>
                </div>
                
                <div class="acciones">
                    <button class="btn btn-aceptar" onclick="aceptarSolicitud('${solicitud.idowner}')">
                        Aceptar
                    </button>
                    <button class="btn btn-declinar" onclick="declinarSolicitud('${solicitud.idowner}')">
                        Declinar
                    </button>
                </div>
            </div>
        `;
    }

    mostrarLoading() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('solicitudesContainer').style.display = 'none';
    }

    ocultarLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('solicitudesContainer').style.display = 'grid';
    }

    mostrarError(mensaje) {
        document.getElementById('errorText').textContent = mensaje;
        document.getElementById('errorMessage').style.display = 'block';
        document.getElementById('loading').style.display = 'none';
        document.getElementById('solicitudesContainer').style.display = 'none';
    }

    ocultarError() {
        document.getElementById('errorMessage').style.display = 'none';
    }

    mostrarEmptyState() {
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('loading').style.display = 'none';
        document.getElementById('solicitudesContainer').style.display = 'none';
    }

    ocultarEmptyState() {
        document.getElementById('emptyState').style.display = 'none';
    }
}

// Instanciar el manager
const solicitudesManager = new SolicitudesManager();

// Funciones para los botones (dejadas para que las implementes después)
async function aceptarSolicitud(idowner) {
   
    setLoading(true);

     const answer = await fetch('/solicitud-aceptada',{
        method:'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body:JSON.stringify({
            idowner:idowner
        })
    });

        const data = await answer.json();

        if(!data.success)
        {
            console.error(data.message);
            alert(data.message);
            setLoading(false);
            return;
        }

      const si = await enviaremail(idowner);

      if(!si)
      {
        alert("no se pudo ni pinga");
      }

       await eliminarsolicitud(idowner);

       setLoading(false);

       window.location.reload()
}

async function enviaremail(idowner)
{

    
     const answergmail = await fetch(`/perfil/${idowner}`)
        
     const data = await answergmail.json();

     if(!data.success)
     {
        alert("error al obtener el gmail");
        return;
     }

     const gmailowner = data.perfil[0].gmail;

     const answer = await fetch('/api/email/solicitud-aceptada',{
        method:'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body:JSON.stringify({
            userEmail:gmailowner
        })
    });

    const data2 = await answer.json();

    if(data2.success)
    {
        alert("gmail enviado correctamente");
        return true;
    }
    else return false;
}

function declinarSolicitud(carnet) {
    console.log('Declinando solicitud del carnet:', carnet);
    // TODO: Implementar lógica de declinación
    // Ejemplo:
    // fetch('/api/declinar-solicitud', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ carnet: carnet })
    // })
    // .then(response => response.json())
    // .then(data => {
    //     if (data.success) {
    //         solicitudesManager.cargarSolicitudes();
    //     }
    // });
}

async function eliminarsolicitud(idowner) {
    
const answer = await fetch(`/eliminar-solicitud/${idowner}`, {
    method: 'DELETE'
});

    const data = await answer.json();
    if(!data.success)
    {
        console.error(data.message);
        alert(data.message);
    }

}

// Función global para recargar desde HTML
function cargarSolicitudes() {
    solicitudesManager.cargarSolicitudes();
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
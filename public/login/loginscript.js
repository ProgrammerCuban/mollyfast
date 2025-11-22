
async function comprueba()
{
const usuario = document.getElementById('usuario').value;
const contrasena = document.getElementById('password').value;
    console.log("entro en la funcion");

  setLoading(true);

  const respuesta = await fetch('/loginsecion',{
        method:'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body:JSON.stringify({
            user: usuario,
            pass: contrasena
        })
    });

    const datos = await respuesta.json();

    if (datos.success) {
        
     if(datos.delivery == false) 
      cargarpaginabussines(usuario);
     else 
     {
       cargarpaginadelivery(usuario);
     }
    }

    else 
    {
      setLoading(false);
      alert("usuario o contrasena incorrectos");
    }
}

function redirectToRegister() {
    window.location.href = "../register/register.html";
}

async function cargarpaginabussines(usuario) {

  const respuesta = await fetch('/encript',{
    method:'POST',
    headers:{
        'Content-Type': 'application/json',
    },
    body:JSON.stringify({
        user: usuario
    })
  });

  const datos = await respuesta.json();

  setLoading(false);

  window.location.href = `../negocio/negocio.html#${datos.coder}`;
    
}

async function cargarpaginadelivery(usuario) {

  const respuesta = await fetch('/encript',{
    method:'POST',
    headers:{
        'Content-Type': 'application/json',
    },
    body:JSON.stringify({
        user: usuario
    })
  });

  const datos = await respuesta.json();

  setLoading(false);

  window.location.href = `../delivery/delivery.html#${datos.coder}`;
    
}

async function cookies() {
  
  // const response = await fetch("/check-session");

  // const data = await response.json();

  // if(data.success)
  // {
  //   if(data.delivery == true) cargarpaginadelivery(data.name);
  //   else cargarpaginabussines(data.name);
  // }

  // else 
  // {
  //    console.log("no hay sesion activa");
  // }

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
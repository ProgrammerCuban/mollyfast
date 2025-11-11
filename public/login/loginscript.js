



async function comprueba()
{
const usuario = document.getElementById('usuario').value;
const contrasena = document.getElementById('password').value;
    console.log("entro en la funcion");

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

    if (datos.success) cargarpaginabussines(usuario);
    
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

  console.log(datos.coder);

  window.location.href = `../negocio/negocio.html#${datos.coder}`;
    
}

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

    if (datos.success) {
        console.log(datos.delivery);
     if(datos.delivery == false) 
      cargarpaginabussines(usuario);
     else 
     {
       cargarpaginadelivery(usuario);
     }
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

  console.log(datos.coder);

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

  console.log(datos.coder);

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
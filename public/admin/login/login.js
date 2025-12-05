async function confirmpass()
{
    setLoading(true);
   const pass = document.getElementById('password').value;

   const respuesta = await fetch('/api/pass-admin',{
    method:'POST',
    headers:{
        'Content-Type': 'application/json',
    },
    body:JSON.stringify({
        pass: pass
    })
  });

  const data = await respuesta.json();

  setLoading(false);

  if(data.success)
  {
    window.location.href = `/solicitudes/solicitudes.html#${data.code}` ;
  }

  else {
    alert(data.message);
  }

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
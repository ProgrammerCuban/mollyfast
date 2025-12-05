document.addEventListener('DOMContentLoaded', function() {

    let idbussines;
    let namebussines;
    let codigo = window.location.hash.substring(1);


    const form = document.getElementById('activationForm');
    const loading = document.getElementById('loading');
    const successMessage = document.getElementById('successMessage');
    const imagekit = new ImageKit({
    publicKey: "public_4yRUn/8HyM6NpBO2uluT5n374JY=",
    urlEndpoint: "https://ik.imagekit.io/yosvaC",
    authenticationEndpoint: "http://localhost:3000/imagekit-auth" // URL COMPLETA
});
    
    // Elementos de upload areas
    const idDocumentArea = document.getElementById('idDocumentArea');
    const selfieArea = document.getElementById('selfieArea');
    const motoArea = document.getElementById('motoArea');
    
    // Inputs de archivos
    const idDocumentInput = document.getElementById('idDocument');
    const selfieInput = document.getElementById('selfieWithId');
    const motoInput = document.getElementById('motoPhoto');

    // Configurar drag and drop para cada área
    setupDragAndDrop(idDocumentArea, idDocumentInput);
    setupDragAndDrop(selfieArea, selfieInput);
    setupDragAndDrop(motoArea, motoInput);

    // Configurar preview de imágenes
    setupImagePreview(idDocumentInput, idDocumentArea);
    setupImagePreview(selfieInput, selfieArea);
    setupImagePreview(motoInput, motoArea);
    

    // Validación del formulario
    form.addEventListener('submit',async function(e) {
        e.preventDefault();
        
        if (validateForm()) {
           await submitForm();
        }
    });

    // Validación en tiempo real del número de identidad
    document.getElementById('identityNumber').addEventListener('input', function(e) {
        const value = e.target.value.replace(/\D/g, '');
        e.target.value = value;
    });

    function setupDragAndDrop(area, input) {
        // Prevenir comportamiento por defecto
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, preventDefaults, false);
        });

        // Efectos visuales durante drag
        ['dragenter', 'dragover'].forEach(eventName => {
            area.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, unhighlight, false);
        });

        // Manejar drop
        area.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            input.files = files;
            
            // Disparar evento change para actualizar preview
            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);
        }
    }

    function setupImagePreview(input, area) {
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validar tipo de archivo
                if (!file.type.match('image.*')) {
                    alert('Por favor, sube solo imágenes');
                    input.value = '';
                    return;
                }

                // Validar tamaño (5MB máximo)
                if (file.size > 5 * 1024 * 1024) {
                    alert('La imagen no debe superar los 5MB');
                    input.value = '';
                    return;
                }

                // Mostrar preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Remover preview anterior si existe
                    const oldPreview = area.querySelector('.preview-image');
                    if (oldPreview) {
                        oldPreview.remove();
                    }

                    // Crear nuevo preview
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'preview-image';
                    img.style.display = 'block';
                    area.appendChild(img);

                    // Actualizar texto del área
                    const text = area.querySelector('p');
                    text.textContent = 'Archivo seleccionado: ' + file.name;
                    text.style.color = '#28a745';
                    text.style.fontWeight = '600';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        e.currentTarget.classList.add('dragover');
    }

    function unhighlight(e) {
        e.currentTarget.classList.remove('dragover');
    }

    function validateForm() {
        const identityNumber = document.getElementById('identityNumber').value;
        const idDocument = document.getElementById('idDocument').files[0];
        const selfieWithId = document.getElementById('selfieWithId').files[0];
        const motoPhoto = document.getElementById('motoPhoto').files[0];

        // Validar número de identidad
        if (!identityNumber || identityNumber.length < 5) {
            alert('Por favor, ingresa un número de identidad válido');
            return false;
        }

        // Validar archivos
        if (!idDocument) {
            alert('Por favor, sube una foto de tu documento de identidad');
            return false;
        }

        if (!selfieWithId) {
            alert('Por favor, sube una selfie con tu documento');
            return false;
        }

        if (!motoPhoto) {
            alert('Por favor, sube una foto de tu moto');
            return false;
        }

        return true;
    }

      async  function submitForm() {
        // Mostrar loading
        form.style.display = 'none';
        loading.style.display = 'block';


        const urlid = await subirfoto(idDocumentInput);
        const urlselfie =  await subirfoto(selfieInput);
        const urlmoto = await subirfoto(motoInput);


        const solicitud =
        {
            idnumber : document.getElementById('identityNumber').value,
            urlid: urlid,
            urlselfie: urlselfie,
            urlmoto, urlmoto
        };

        console.log(solicitud);

        await subirsulicitud(solicitud);

        setTimeout(function() {
            // Ocultar loading y mostrar éxito
            loading.style.display = 'none';
            successMessage.style.display = 'block';

            // Redirigir después de 3 segundos
            setTimeout(function() {
                //window.location.href = 'https://tu-dominio.com/dashboard';
            }, 3000);
        }, 2000);
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

    if(!datosid.success)
    {
        console.error(datosid.message);
        return;
    }

    idbussines = datosid.id.id;
}


    async function inicial()
    {
       await obteneruser();
       await obtenerid();
       await solicitudactiva();
    }

    async function solicitudactiva() {

        const answer = await fetch('/api/solicitud-idowner',{
        method:'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body:JSON.stringify({
            idowner:idbussines
        })
    });

    const data = await answer.json();

    if(!data.success)
    {
        alert(data.message);

        window.location.href = "../../login";
    }
        
    }
    

    async function subirsulicitud(solicitud)
    {

        const answer = await fetch('/api/subir-solicitud',{
        method:'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body:JSON.stringify({
            carnet: solicitud.idnumber,
            fotocarnet: solicitud.urlid,
            selfie: solicitud.urlselfie,
            fotomoto: solicitud.urlmoto,
            idowner: idbussines
        })
    });

    const data = await answer.json();

    if(!data.success)
    {
        console.error(data.message);
        return;
    }

    alert(data.message);
        
    }


    async function subirfoto(element) {
        
        const file = element.files[0];

         const fileBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remover el prefijo data:image/...;base64,
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

         const result = await imagekit.upload({
            file: fileBase64, 
            fileName: `perfil__${Date.now()}.jpg`,
            folder: "/mollyfast",
            useUniqueFileName: true
        });

            return result.url;
    }

    inicial();

});
// Función principal que se ejecuta cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const profileImage = document.getElementById('profileImage');
    const profileType = document.getElementById('profileType');
    const userName = document.getElementById('userName');
    const ratingStars = document.getElementById('ratingStars');
    const ratingText = document.getElementById('ratingText');
    const usernameField = document.getElementById('usernameField');
    const emailField = document.getElementById('emailField');
    const phoneField = document.getElementById('phoneField');
    const accountType = document.getElementById('accountType');
    const ratingScore = document.getElementById('ratingScore');
    const starsLarge = document.getElementById('starsLarge');
    const ratingCount = document.getElementById('ratingCount');
    const ratingBars = document.querySelector('.rating-bars');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const errorMessage = document.getElementById('errorMessage');
    const retryButton = document.getElementById('retryButton');
    const lastUpdate = document.getElementById('lastUpdate');
    
    // Obtener el ID del perfil de la URL (simulado para demostración)
    // En producción, esto podría venir de la URL como parámetro
    let userId = getUserIdFromURL();
    
    // Si no hay ID en la URL, usar un ID por defecto (para demostración)
    if (!userId) {
        userId = 1; // ID por defecto para demostración
    }
    
    // Cargar el perfil cuando la página se carga
    loadProfile(userId);
    
    // Configurar el botón de reintentar
    retryButton.addEventListener('click', function() {
        loadProfile(userId);
    });
    
    // Función para obtener el ID de usuario de la URL
    function getUserIdFromURL() {
        // En una aplicación real, obtendrías el ID de los parámetros de la URL
        // Por ejemplo: /perfil.html?id=5
       const id = Number(window.location.hash.substring(1));
        
        // Para esta demo, si no hay ID en la URL, devolvemos null
        return id ? parseInt(id) : null;
    }
    
    // Función para cargar el perfil desde el backend
    async function loadProfile(id) {
        // Mostrar indicador de carga
        showLoading(true);
        hideError();
        
        const answer =  await  fetch(`/perfil/${userId}`);

        const data  = await answer.json();

        if(!data.success)
        {
        alert ("errror al cargar informacion de perfil");
        showLoading(false);
        return;
        }

        displayProfile(data.perfil[0]);


        showLoading(false);
    }

    // Obtener referencia al botón atrás
const backButton = document.getElementById('backButton');

// Configurar el botón atrás
backButton.addEventListener('click', function() {
    // Intentar volver a la página anterior
    if (document.referrer && document.referrer.includes(window.location.hostname)) {
        // Si venimos de nuestro propio sitio, usar history.back()
        window.history.back();
    } else {
        // Si no hay referencia anterior o viene de otro sitio, redirigir a página principal
        window.location.href = '/'; // Cambia esto por tu página principal
    }
});

// Añadir también funcionalidad de "gesto" para móviles (swipe derecho)
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 100; // Mínimo de píxeles para considerar un swipe
    
    if (touchStartX - touchEndX > swipeThreshold) {
        // Swipe izquierda - podría usarse para avanzar si fuera necesario
    } else if (touchEndX - touchStartX > swipeThreshold) {
        // Swipe derecha - volver atrás
        backButton.click();
    }
}
    
    // Función para mostrar el perfil en la interfaz
    function displayProfile(profileData) {
        // Mostrar nombre de usuario
        userName.textContent = profileData.usuario;
        usernameField.textContent = profileData.usuario;
        
        // Mostrar imagen de perfil (si existe)
        if (profileData.fotoperfil) {
            profileImage.src = profileData.fotoperfil;
        } else {
            // Imagen por defecto basada en si es delivery o negocio
            const defaultImage = profileData.delivery 
                ? "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80" 
                : "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80";
            profileImage.src = defaultImage;
        }
        
        // Mostrar tipo de cuenta
        if (profileData.delivery) {
            profileType.textContent = "Delivery";
            profileType.classList.add("delivery");
            accountType.textContent = "Delivery";
        } else {
            profileType.textContent = "Negocio";
            profileType.classList.remove("delivery");
            accountType.textContent = "Negocio";
        }
        
        // Mostrar información de contacto
        emailField.textContent = profileData.gmail || "No especificado";
        phoneField.textContent = profileData.numero_telefono || "No especificado";
        
        // Procesar calificación (separar en valor y cantidad)
        console.log(`cal: ${profileData.calificacion}`);
        const ratingValue = obtenercal(profileData.calificacion);
        const ratingAmount = obtenertotal(profileData.calificacion);
        
        // Mostrar estrellas de calificación
        renderStars(ratingStars, ratingValue, 5, "star");
        ratingText.textContent = `${ratingValue.toFixed(1)} (${ratingAmount} calificaciones)`;
        

        // Actualizar fecha de última actualización
        updateLastUpdateTime();
        
        // Añadir animación a las barras de calificación
        setTimeout(() => {
            document.querySelectorAll('.rating-bar-fill').forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0';
                setTimeout(() => {
                    bar.style.width = width;
                }, 100);
            });
        }, 300);
    }
    
    // Función para renderizar estrellas
    function renderStars(container, rating, maxStars, starClass) {
        container.innerHTML = '';
        
        for (let i = 1; i <= maxStars; i++) {
            const star = document.createElement('span');
            star.className = starClass;
            
            if (i <= Math.floor(rating)) {
                star.classList.add('filled');
            } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
                // Media estrella (no implementado en esta versión, pero se puede añadir)
                star.classList.add('filled');
            }
            
            star.innerHTML = '<i class="fas fa-star"></i>';
            container.appendChild(star);
        }
    }
    
    // Función para renderizar barras de distribución de calificaciones
        
        // Crear barras para cada calificación (de 5 a 1)
      
    
     
    
    // Función para actualizar la hora de última actualización
    function updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const dateString = now.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        lastUpdate.textContent = `${dateString} a las ${timeString}`;
    }
    
    // Función para mostrar/ocultar el indicador de carga
    function showLoading(show) {
        if (show) {
            loadingOverlay.style.display = 'flex';
        } else {
            loadingOverlay.style.display = 'none';
        }
    }
    
    // Función para mostrar mensaje de error
    function showError(message) {
        errorMessage.querySelector('p').textContent = message;
        errorMessage.style.display = 'block';
    }
    
    // Función para ocultar mensaje de error
    function hideError() {
        errorMessage.style.display = 'none';
    }
    
    // Función para generar datos de perfil de ejemplo (para demo)
    function getMockProfileData(id) {
        // Tipos de negocios y deliverys para datos de ejemplo
        const businessNames = ["Restaurante La Terraza", "Cafetería Central", "Pizzería Napoli", "Sushi Master", "Heladería Dolce"];
        const deliveryNames = ["Carlos Martínez", "Ana López", "Pedro Sánchez", "María González", "Javier Rodríguez"];
        
        const isDelivery = id % 2 === 0; // IDs pares son delivery, impares son negocios
        const nameIndex = (id - 1) % 5;
        
        return {
            id: id,
            usuario: isDelivery ? deliveryNames[nameIndex] : businessNames[nameIndex],
            contrasena: "hashed_password", // No se muestra
            delivery: isDelivery ? 1 : 0,
            fotoperfil: null, // Sin foto específica para demo
            numero_telefono: `+34 600 ${100 + id}${200 + id}${300 + id}`,
            gmail: `${isDelivery ? 'delivery' : 'negocio'}${id}@ejemplo.com`,
            estado: 1, // No se muestra
            total_conversaciones_pendientes: Math.floor(Math.random() * 10), // No se muestra
            calificacion: Math.floor(Math.random() * 50) + 35 // Ejemplo: valor entre 35 y 84
        };
    }
    
    // Para la demo, también permitir cambiar de perfil con parámetros en la URL
    // Ejemplo: /index.html?id=3
    window.addEventListener('hashchange', function() {
        const newId = getUserIdFromURL();
        if (newId) {
            userId = newId;
            loadProfile(userId);
        }
    });
    
    // También recargar el perfil si cambian los parámetros de búsqueda (no hash)
    // Esto es útil para SPA o páginas con enlaces a diferentes IDs
    // Nota: Para una implementación completa, necesitarías un router SPA
    // o recargar la página manualmente con window.location.search
});


function obtenercal(num) {
    // Si num = 473 (calificación 4.7 con 3 votos)
    let aux = String(num);
    
    // Obtener primer dígito para la parte entera
    const entero = parseInt(aux.charAt(0) || 0);
    
    // Obtener segundo dígito para la parte decimal
    const decimal = parseInt(aux.charAt(1) || 0);
    
    // Calcular calificación (ej: 4 + 7/10 = 4.7)

    console.log(`la calificacion es${entero + (decimal / 10)}`);
    return entero + (decimal / 10);
}

function obtenertotal(num) {
    let aux = String(num);
    
    // Si el número tiene 3 dígitos, el tercero es la cantidad
    // Si tiene más, los dígitos después del segundo son la cantidad
    if (aux.length >= 3) {
        console.log(`el total es : ${parseInt(aux.substring(2))}`);
        return parseInt(aux.substring(2));
    }
    return 0;
}
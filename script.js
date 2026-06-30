// ==================== REFERENCIAS AL DOM ====================
const searchInput       = document.getElementById('searchInput');
const searchBtn         = document.getElementById('searchBtn');
const resultsSection    = document.getElementById('resultsSection');
const searchResultsList = document.getElementById('searchResultsList');
const resultsTitle      = document.getElementById('resultsTitle');
const resultsGrid       = document.getElementById('resultsGrid');
const resultsContainer  = document.getElementById('resultsContainer');
const emptyState        = document.getElementById('emptyState');
const productName       = document.getElementById('productName');
const recyclingIndicator= document.getElementById('recyclingIndicator');
const indicatorIcon     = document.getElementById('indicatorIcon');
const indicatorText     = document.getElementById('indicatorText');
const instructionsList  = document.getElementById('instructionsList');
const warningBox        = document.getElementById('warningBox');
const playBtn           = document.getElementById('playBtn');
const videoTitle        = document.getElementById('videoTitle');
const videoPlaceholder  = document.getElementById('videoPlaceholder');
const productImage      = document.getElementById('productImage');
const productImageWrapper = document.getElementById('productImageWrapper');

// ==================== ESTADO ====================
let currentVideoUrl = '';

// ==================== BUSCAR PRODUCTO ====================
async function buscarProducto(termino) {
    if (!termino.trim()) return;
    try {
        const res = await fetch(`/api/buscar?q=${encodeURIComponent(termino)}`);
        const productos = await res.json();

        ocultarTodo();
        resultsSection.style.display = 'block';

        if (productos.length === 0) {
            resultsTitle.textContent = `No se encontraron resultados para "${termino}"`;
            searchResultsList.style.display = 'block';
            resultsGrid.innerHTML = '<p style="color:#9e9e9e; padding:1rem;">Intenta con otro término de búsqueda.</p>';
            return;
        }

        if (productos.length === 1) {
            mostrarDetalleProducto(productos[0]);
            return;
        }

        resultsTitle.textContent = `${productos.length} resultados para "${termino}"`;
        mostrarGrilla(productos);
    } catch (err) {
        console.error('Error al buscar:', err);
    }
}

// ==================== CARGAR CATEGORÍA ====================
async function cargarCategoria(slug, nombreCategoria) {
    try {
        const res = await fetch(`/api/categoria/${slug}`);
        const productos = await res.json();

        ocultarTodo();
        resultsSection.style.display = 'block';
        resultsTitle.textContent = `Categoría: ${nombreCategoria} (${productos.length} productos)`;
        mostrarGrilla(productos);
    } catch (err) {
        console.error('Error al cargar categoría:', err);
    }
}

// ==================== MOSTRAR GRILLA DE TARJETAS ====================
function mostrarGrilla(productos) {
    searchResultsList.style.display = 'block';
    resultsContainer.style.display = 'none';
    resultsGrid.innerHTML = '';

    productos.forEach(p => {
        const card = document.createElement('div');
        card.className = 'result-card';

        // Imagen de la tarjeta (solo si existe)
        const imgHtml = p.imagen_url
            ? `<img class="result-card-img" src="${p.imagen_url}" alt="${p.nombre}" loading="lazy" onerror="this.style.display='none'">`
            : `<div class="result-card-img-placeholder">${p.icono || '♻️'}</div>`;

        card.innerHTML = `
            ${imgHtml}
            <div class="result-card-body">
                <p class="result-card-title">${p.nombre}</p>
                <div class="result-card-footer">
                    <span class="result-card-categoria">${p.icono || ''} ${p.categoria || ''}</span>
                    <span class="result-card-indicator ${p.es_reciclable ? 'recyclable' : 'not-recyclable'}">
                        ${p.es_reciclable ? '✓ Se recicla' : '✗ No se recicla'}
                    </span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => mostrarDetalleProducto(p));
        resultsGrid.appendChild(card);
    });
}

// ==================== MOSTRAR DETALLE DE UN PRODUCTO ====================
async function mostrarDetalleProducto(producto) {
    searchResultsList.style.display = 'none';
    resultsContainer.style.display = 'grid';

    // Nombre
    productName.textContent = producto.nombre;

    // Indicador reciclable / no reciclable
    if (producto.es_reciclable) {
        recyclingIndicator.style.backgroundColor = '#e8f5e9';
        recyclingIndicator.style.color = '#1b7d3a';
        indicatorIcon.textContent = '✓';
        indicatorText.textContent = 'Sí se recicla';
    } else {
        recyclingIndicator.style.backgroundColor = '#ffe8e8';
        recyclingIndicator.style.color = '#c81e1e';
        indicatorIcon.textContent = '✗';
        indicatorText.textContent = 'No se recicla';
    }

    // Advertencia
    warningBox.textContent = producto.advertencia || 'Sin advertencias especiales.';

    // Imagen del producto
    if (producto.imagen_url && productImage && productImageWrapper) {
        productImage.src = producto.imagen_url;
        productImage.alt = producto.nombre;
        productImageWrapper.style.display = 'block';
        productImage.onerror = () => { productImageWrapper.style.display = 'none'; };
    } else if (productImageWrapper) {
        productImageWrapper.style.display = 'none';
    }

    // Video — resetear el reproductor
    currentVideoUrl = producto.video_url || '';
    videoTitle.textContent = `Cómo reciclar: ${producto.nombre}`;
    resetearVideo();

    // Guardar en historial si hay sesión
    if (typeof guardarEnHistorial === 'function') guardarEnHistorial(producto.nombre, producto.id);

    // Instrucciones desde la API
    try {
        const res = await fetch(`/api/instrucciones/${producto.id}`);
        const pasos = await res.json();
        instructionsList.innerHTML = '';
        pasos.forEach(paso => {
            const li = document.createElement('li');
            li.textContent = paso;
            instructionsList.appendChild(li);
        });
    } catch (err) {
        console.error('Error al cargar instrucciones:', err);
    }
}

// ==================== VIDEO ====================
function resetearVideo() {
    // Restaurar el placeholder y el botón
    videoPlaceholder.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5zm8 7l5 4H8l5-4z"></path>
        </svg>`;
    videoPlaceholder.style.display = 'flex';
    playBtn.style.display = 'block';
    playBtn.textContent = 'Reproducir';
}

// ==================== MOSTRAR / OCULTAR ====================
function ocultarTodo() {
    emptyState.style.display = 'none';
    searchResultsList.style.display = 'none';
    resultsContainer.style.display = 'none';
}

// ==================== EVENTOS ====================

searchBtn.addEventListener('click', () => buscarProducto(searchInput.value));

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') buscarProducto(searchInput.value);
});

document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        searchInput.value = '';
        const slug = btn.dataset.category;
        const nombre = btn.querySelector('span:last-child').textContent;
        cargarCategoria(slug, nombre);
    });
});

// Botón reproducir: embebe el iframe de YouTube en la página
playBtn.addEventListener('click', () => {
    if (!currentVideoUrl) {
        alert('Video no disponible para este producto.');
        return;
    }
    // Reemplazar placeholder por iframe de YouTube
    videoPlaceholder.innerHTML = `
        <iframe
            src="${currentVideoUrl}?autoplay=1&rel=0"
            width="100%"
            height="100%"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            style="border-radius:8px;">
        </iframe>`;
    playBtn.style.display = 'none';
});
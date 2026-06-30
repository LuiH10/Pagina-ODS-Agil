// ==================== ESTADO DE SESIÓN ====================
let sesion = JSON.parse(localStorage.getItem('gr_sesion')) || null;

function guardarSesion(datos) {
    sesion = datos;
    localStorage.setItem('gr_sesion', JSON.stringify(datos));
}
function cerrarSesion() {
    sesion = null;
    localStorage.removeItem('gr_sesion');
}
function headers() {
    return sesion ? { 'Content-Type': 'application/json', 'x-user-id': sesion.id } : { 'Content-Type': 'application/json' };
}

// ==================== PANEL DESLIZANTE ====================
const userIcon      = document.getElementById('userIcon');
const userPanel     = document.getElementById('userPanel');
const userOverlay   = document.getElementById('userOverlay');
const panelClose1   = document.getElementById('userPanelClose');
const panelClose2   = document.getElementById('userPanelClose2');

function abrirPanel() {
    userPanel.classList.add('open');
    userOverlay.classList.add('active');
    if (sesion) {
        mostrarPerfil();
        cargarHistorial();
        cargarPreferencias();
    } else {
        mostrarAuth();
    }
}
function cerrarPanel() {
    userPanel.classList.remove('open');
    userOverlay.classList.remove('active');
}

userIcon.addEventListener('click', abrirPanel);
userOverlay.addEventListener('click', cerrarPanel);
panelClose1.addEventListener('click', cerrarPanel);
panelClose2.addEventListener('click', cerrarPanel);

// ==================== VISTAS AUTH / PERFIL ====================
const upanelAuth    = document.getElementById('upanelAuth');
const upanelProfile = document.getElementById('upanelProfile');

function mostrarAuth() {
    upanelAuth.classList.remove('hidden');
    upanelProfile.classList.add('hidden');
}
function mostrarPerfil() {
    upanelAuth.classList.add('hidden');
    upanelProfile.classList.remove('hidden');
    document.getElementById('profileNombre').textContent = sesion.nombre;
    document.getElementById('profileEmail').textContent  = sesion.email;
    document.getElementById('profileAvatar').textContent = sesion.nombre.charAt(0).toUpperCase();
}

// ==================== TABS LOGIN / REGISTRO ====================
document.querySelectorAll('.profile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.profile-nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Object.values(secciones).forEach(id => document.getElementById(id).classList.add('hidden'));
        document.getElementById(secciones[btn.dataset.section]).classList.remove('hidden');
        if (btn.dataset.section === 'historial') cargarHistorial(); // ← recarga al abrir la pestaña
    });
});

// ==================== LOGIN ====================
document.getElementById('btnLogin').addEventListener('click', async () => {
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl    = document.getElementById('loginError');
    errEl.textContent = '';

    if (!email || !password) { errEl.textContent = 'Completa todos los campos.'; return; }

    try {
        const res  = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (!res.ok) { errEl.textContent = data.error; return; }
        guardarSesion(data);
        mostrarPerfil();
        cargarHistorial();
        cargarPreferencias();
    } catch { errEl.textContent = 'Error de conexión.'; }
});

// ==================== REGISTRO ====================
document.getElementById('btnRegistro').addEventListener('click', async () => {
    const nombre   = document.getElementById('regNombre').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const errEl    = document.getElementById('regError');
    errEl.textContent = '';

    if (!nombre || !email || !password) { errEl.textContent = 'Completa todos los campos.'; return; }
    if (password.length < 6) { errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }

    try {
        const res  = await fetch('/api/auth/registro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, email, password }) });
        const data = await res.json();
        if (!res.ok) { errEl.textContent = data.error; return; }
        guardarSesion(data);
        mostrarPerfil();
        cargarHistorial();
        cargarPreferencias();
    } catch { errEl.textContent = 'Error de conexión.'; }
});

// ==================== LOGOUT ====================
document.getElementById('btnLogout').addEventListener('click', () => {
    cerrarSesion();
    cerrarPanel();
});

// ==================== NAVEGACIÓN INTERNA DEL PERFIL ====================
const secciones = { historial: 'sectionHistorial', preferencias: 'sectionPreferencias', password: 'sectionPassword' };

document.querySelectorAll('.profile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.profile-nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Object.values(secciones).forEach(id => document.getElementById(id).classList.add('hidden'));
        document.getElementById(secciones[btn.dataset.section]).classList.remove('hidden');
    });
});

// ==================== HISTORIAL ====================
async function cargarHistorial() {
    if (!sesion) return;
    try {
        const res  = await fetch('/api/historial', { headers: headers() });
        const data = await res.json();
        renderHistorial(data);
    } catch { console.error('Error al cargar historial'); }
}

function renderHistorial(items) {
    const lista = document.getElementById('historialLista');
    if (!items.length) {
        lista.innerHTML = '<p class="historial-vacio">Aún no tienes búsquedas guardadas.</p>';
        return;
    }
    lista.innerHTML = items.map(item => {
        const fecha = new Date(item.buscado_en).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        const icono = item.icono || '🔍';
        const badge = item.producto_nombre
            ? `<span class="historial-badge ${item.es_reciclable ? 'si' : 'no'}">${item.es_reciclable ? '✓ Sí' : '✗ No'}</span>`
            : '';
        return `
            <div class="historial-item" data-nombre="${item.producto_nombre || item.termino}">
                <span class="historial-item-icono">${icono}</span>
                <div class="historial-item-info">
                    <p class="historial-item-nombre">${item.producto_nombre || item.termino}</p>
                    <p class="historial-item-meta">${item.categoria || 'Sin resultado'} · ${fecha}</p>
                </div>
                ${badge}
            </div>`;
    }).join('');

    // Click en ítem del historial → buscar ese producto
    lista.querySelectorAll('.historial-item').forEach(el => {
        el.addEventListener('click', () => {
            cerrarPanel();
            const nombre = el.dataset.nombre;
            document.getElementById('searchInput').value = nombre;
            buscarProducto(nombre);
        });
    });
}

document.getElementById('btnBorrarHistorial').addEventListener('click', async () => {
    if (!confirm('¿Borrar todo el historial?')) return;
    try {
        await fetch('/api/historial', { method: 'DELETE', headers: headers() });
        renderHistorial([]);
    } catch { console.error('Error al borrar historial'); }
});

// ==================== PREFERENCIAS ====================
async function cargarPreferencias() {
    if (!sesion) return;
    try {
        const res  = await fetch('/api/preferencias', { headers: headers() });
        const data = await res.json();
        marcarPreferencia(data.categoria_preferida || '');
    } catch { console.error('Error al cargar preferencias'); }
}

function marcarPreferencia(slug) {
    document.querySelectorAll('.pref-cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.slug === slug);
    });
}

document.querySelectorAll('.pref-cat-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const slug = btn.dataset.slug;
        marcarPreferencia(slug);
        const okEl = document.getElementById('prefOk');
        try {
            await fetch('/api/preferencias', { method: 'PUT', headers: headers(), body: JSON.stringify({ categoria_preferida: slug }) });
            okEl.classList.remove('hidden');
            setTimeout(() => okEl.classList.add('hidden'), 2000);
        } catch { console.error('Error al guardar preferencia'); }
    });
});

// ==================== CAMBIAR CONTRASEÑA ====================
document.getElementById('btnCambiarPw').addEventListener('click', async () => {
    const pwActual = document.getElementById('pwActual').value;
    const pwNueva  = document.getElementById('pwNueva').value;
    const errEl    = document.getElementById('pwError');
    const okEl     = document.getElementById('pwOk');
    errEl.textContent = '';
    okEl.classList.add('hidden');

    if (!pwActual || !pwNueva) { errEl.textContent = 'Completa ambos campos.'; return; }
    if (pwNueva.length < 6)    { errEl.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.'; return; }

    try {
        const res  = await fetch('/api/auth/password', { method: 'PUT', headers: headers(), body: JSON.stringify({ password_actual: pwActual, password_nueva: pwNueva }) });
        const data = await res.json();
        if (!res.ok) { errEl.textContent = data.error; return; }
        document.getElementById('pwActual').value = '';
        document.getElementById('pwNueva').value  = '';
        okEl.classList.remove('hidden');
        setTimeout(() => okEl.classList.add('hidden'), 2500);
    } catch { errEl.textContent = 'Error de conexión.'; }
});

// ==================== GUARDAR BÚSQUEDA EN HISTORIAL ====================
// Esta función es llamada desde script.js cuando se muestra un producto
async function guardarEnHistorial(termino, productoId) {
    if (!sesion) return;
    try {
        await fetch('/api/historial', { method: 'POST', headers: headers(), body: JSON.stringify({ termino, producto_id: productoId }) });
        cargarHistorial(); // ← refresca la lista automáticamente
    } catch { console.error('Error al guardar historial'); }
}

// ==================== RESTAURAR SESIÓN AL CARGAR ====================
if (sesion) {
    // icono verde si hay sesión activa
    userIcon.style.backgroundColor = 'rgba(255,255,255,0.35)';
}

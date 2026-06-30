const express  = require('express');
const db       = require('./db');
const crypto   = require('crypto');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// ── Hash de contraseña simple con SHA-256 + salt ──────────────────────────────
function hashPassword(password) {
    const salt = 'guia_recicla_salt_2024';
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// ── Middleware: verificar sesión ──────────────────────────────────────────────
function requireAuth(req, res, next) {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    req.userId = parseInt(userId);
    next();
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/auth/registro', (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password)
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    if (password.length < 6)
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    const hash = hashPassword(password);
    db.query(
        'INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)',
        [nombre.trim(), email.trim().toLowerCase(), hash],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY')
                    return res.status(409).json({ error: 'Este correo ya está registrado' });
                return res.status(500).json({ error: 'Error al crear la cuenta' });
            }
            res.json({ id: result.insertId, nombre: nombre.trim(), email: email.trim().toLowerCase() });
        }
    );
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const hash = hashPassword(password);
    db.query(
        'SELECT id, nombre, email FROM usuarios WHERE email = ? AND password_hash = ?',
        [email.trim().toLowerCase(), hash],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Error al iniciar sesión' });
            if (rows.length === 0)
                return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
            res.json(rows[0]);
        }
    );
});

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORIAL
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/historial', requireAuth, (req, res) => {
    const { termino, producto_id } = req.body;
    db.query(
        'INSERT INTO historial_busquedas (usuario_id, termino, producto_id) VALUES (?, ?, ?)',
        [req.userId, termino, producto_id || null],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ ok: true });
        }
    );
});

app.get('/api/historial', requireAuth, (req, res) => {
    db.query(
        `SELECT h.id, h.termino, h.buscado_en,
                p.nombre AS producto_nombre, p.es_reciclable,
                c.nombre AS categoria, c.icono_emoji AS icono
         FROM historial_busquedas h
         LEFT JOIN productos p ON p.id = h.producto_id
         LEFT JOIN categorias c ON c.id = p.categoria_id
         WHERE h.usuario_id = ?
         ORDER BY h.buscado_en DESC
         LIMIT 50`,
        [req.userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

app.delete('/api/historial', requireAuth, (req, res) => {
    db.query(
        'DELETE FROM historial_busquedas WHERE usuario_id = ?',
        [req.userId],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ ok: true });
        }
    );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PREFERENCIAS
// ═══════════════════════════════════════════════════════════════════════════════

app.put('/api/preferencias', requireAuth, (req, res) => {
    const { categoria_preferida } = req.body;
    db.query(
        'UPDATE usuarios SET categoria_preferida = ? WHERE id = ?',
        [categoria_preferida, req.userId],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ ok: true });
        }
    );
});

app.get('/api/preferencias', requireAuth, (req, res) => {
    db.query(
        'SELECT nombre, email, categoria_preferida FROM usuarios WHERE id = ?',
        [req.userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows[0] || {});
        }
    );
});

// ═══════════════════════════════════════════════════════════════════════════════
// CAMBIAR CONTRASEÑA
// ═══════════════════════════════════════════════════════════════════════════════

app.put('/api/auth/password', requireAuth, (req, res) => {
    const { password_actual, password_nueva } = req.body;
    if (!password_actual || !password_nueva)
        return res.status(400).json({ error: 'Ambas contraseñas son requeridas' });
    if (password_nueva.length < 6)
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });

    const hashActual = hashPassword(password_actual);
    db.query(
        'SELECT id FROM usuarios WHERE id = ? AND password_hash = ?',
        [req.userId, hashActual],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (rows.length === 0)
                return res.status(401).json({ error: 'La contraseña actual es incorrecta' });

            db.query(
                'UPDATE usuarios SET password_hash = ? WHERE id = ?',
                [hashPassword(password_nueva), req.userId],
                (err2) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    res.json({ ok: true });
                }
            );
        }
    );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTOS — BUSCAR
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/buscar', (req, res) => {
    const termino = (req.query.q || '').trim();
    if (!termino) return res.json([]);

    const palabras = termino.toLowerCase().split(/\s+/).filter(p => p.length > 1);
    if (palabras.length === 0) return res.json([]);

    const condiciones = palabras.map(() => 'LOWER(p.nombre) LIKE ?').join(' OR ');
    const valores = palabras.map(p => `%${p}%`);

    const sql = `
        SELECT p.id, p.nombre, p.es_reciclable, p.advertencia, p.imagen_url, p.video_url,
               c.nombre AS categoria, c.icono_emoji AS icono,
               (${palabras.map(() => 'IF(LOWER(p.nombre) LIKE ?, 1, 0)').join(' + ')}) AS relevancia
        FROM productos p
        JOIN categorias c ON c.id = p.categoria_id
        WHERE ${condiciones}
        ORDER BY relevancia DESC, p.nombre ASC
    `;

    db.query(sql, [...valores, ...valores], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTOS — CATEGORÍA
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/categoria/:slug', (req, res) => {
    db.query(
        `SELECT p.id, p.nombre, p.es_reciclable, p.advertencia, p.imagen_url, p.video_url,
                c.nombre AS categoria, c.icono_emoji AS icono
         FROM productos p
         JOIN categorias c ON c.id = p.categoria_id
         WHERE c.slug = ?
         ORDER BY p.nombre ASC`,
        [req.params.slug],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTOS — INSTRUCCIONES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/instrucciones/:id', (req, res) => {
    db.query(
        'SELECT descripcion FROM instrucciones WHERE producto_id = ? ORDER BY orden ASC',
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows.map(r => r.descripcion));
        }
    );
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIO
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(3000, () => console.log('🚀 Servidor en http://localhost:3000'));
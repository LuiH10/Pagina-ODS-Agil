const mysql = require('mysql2');

const conexion = mysql.createConnection({
    host:     'tk-2cw.h.filess.io',
    user:     'guia_recicla_db_songeasygo',
    password: '3144a1892a56228311b7036b4f3793423b9fa151',
    database: 'guia_recicla_db_songeasygo',
    port:     3307
});

conexion.connect((err) => {
    if (err) {
        console.error('Error al conectar:', err);
        return;
    }
    console.log('✅ Conectado a MySQL correctamente');
});

module.exports = conexion;
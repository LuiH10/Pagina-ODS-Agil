const mysql = require('mysql2');

const conexion = mysql.createConnection({
    host:     'localhost',
    user:     'root',
    password: 'admin',
    database: 'guia_recicla'
});

conexion.connect((err) => {
    if (err) {
        console.error('Error al conectar:', err);
        return;
    }
    console.log('✅ Conectado a MySQL correctamente');
});

module.exports = conexion;
// backend/config/database.js
const mysql = require('mysql2');

// Crear pool de conexiones (más eficiente)
// const pool = mysql.createPool({
//     host: 'bwri3movw18oiln4pb5h-mysql.services.clever-cloud.com',
//     user: 'ufywen8m7kyqrwjc',
//     password: '1kCrbPepW8X3ggZxkRWS',
//     database: 'bwri3movw18oiln4pb5h',
//     port: 3306,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0,
//     ssl: {
//         rejectUnauthorized: false
//     }
// });

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mollyfast',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
   
});

// Verificar conexión al iniciar
pool.getConnection((err, connection) => {
    if (err) {
        console.log('❌ Error conectando a MySQL:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos MySQL externa');
        connection.release();
    }
});

// Función helper para queries
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (error, results) => {
            if (error) {
                console.error('❌ Error en query:', error);
                reject(error);
                return;
            }
            resolve(results);
        });
    });
}

// Exportar
module.exports = {
    pool,
    query,
    format: mysql.format
};
// db/database.js - CÓDIGO ACTUALIZADO

const { Pool } = require('pg'); // Importamos el constructor Pool desde 'pg'
require('dotenv').config();      // Cargamos las variables de entorno

// Creamos un nuevo pool de conexiones.
// Render automáticamente nos dará la variable 'DATABASE_URL'.
// La configuración 'ssl' es OBLIGATORIA para que la conexión con Render funcione.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Mensaje para confirmar que el módulo se cargó
console.log('PostgreSQL pool configurado para conectarse a Render DB.');

// Exportamos el pool para que el resto de tu aplicación pueda usarlo para hacer consultas
module.exports = pool;
const { Pool } = require('pg');
require('dotenv').config();

// Creamos una nueva instancia de Pool
const pool = new Pool({
  // Render nos da la URL de conexión completa en una sola variable de entorno
  connectionString: process.env.DATABASE_URL,
  
  // Es recomendable en producción y para conexiones a servicios externos
  // añadir la configuración SSL para evitar errores de conexión.
  ssl: {
    rejectUnauthorized: false
  }
});

// Verificamos la conexión (opcional, pero es una buena práctica)
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
  } else {
    console.log('Conexión con la base de datos PostgreSQL establecida con éxito.');
  }
});

module.exports = pool;
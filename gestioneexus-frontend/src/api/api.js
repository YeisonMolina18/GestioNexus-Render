// src/api/api.js - CÓDIGO CORREGIDO

import axios from 'axios';

// Crea una instancia de Axios.
// Vite usa 'import.meta.env.NOMBRE_VARIABLE' para leer las variables de entorno.
const api = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL}/api` // ¡Ahora usa la variable de entorno!
});

// Interceptor para añadir el token JWT a todas las peticiones (esto ya estaba bien)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
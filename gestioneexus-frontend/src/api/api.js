// src/api/api.js
import axios from 'axios';

// Crea una instancia de Axios con la URL base del backend
const api = axios.create({
    baseURL: 'http://localhost:4000/api' // La URL de tu backend
});

// Interceptor para añadir el token JWT a todas las peticiones
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
import axios from 'axios';

// On utilise le port 5000 par défaut, mais on pourrait imaginer un mécanisme 
// qui récupère le port depuis une config ou qui teste le port 5000 puis 5001.
const API_PORT = import.meta.env.VITE_API_PORT || '5000';
const API_URL = import.meta.env.VITE_API_URL || `http://localhost:${API_PORT}`;

const api = axios.create({
    baseURL: `${API_URL}/api/v1`,
});

// Intercepteur pour injecter le token à chaque requête
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Intercepteur pour gérer l'expiration (Erreur 401)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Si erreur 401 et que ce n'est pas déjà une tentative de refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refreshToken');

            if (refreshToken) {
                try {
                    // Appel à l'endpoint de refresh (à implémenter sur ton backend si pas déjà fait)
                    const response = await axios.post(`http://localhost:${API_PORT}/api/v1/auth/refresh`, {
                        refreshToken
                    });

                    const { accessToken } = response.data;
                    localStorage.setItem('accessToken', accessToken);

                    // On relance la requête initiale avec le nouveau token
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    // Si le refreshToken est aussi expiré -> Déconnexion
                    localStorage.clear();
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
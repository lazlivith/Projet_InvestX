import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Intercepteur pour injecter automatiquement le token JWT dans chaque requête
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Intercepteur pour gérer l'expiration du token (erreur 401)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Si 401 et qu'on n'est pas sur la page de login
        if (error.response && error.response.status === 401 && !window.location.pathname.includes('/login')) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

/**
 * Groupement des appels API par domaine (pour correspondre aux imports des composants)
 */

export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

/**
 * @typedef {Object} TradeAPI
 * @property {function(Object): Promise<any>} marketOrder
 * @property {function(Object): Promise<any>} limitOrder
 * @property {function(string): Promise<any>} cancelOrder
 * @property {function(string): Promise<any>} getQuote
 * @property {function(Object=): Promise<any>} getUserActivity
 */

/** @type {TradeAPI} */
export const tradeAPI = {
    marketOrder: (data) => api.post('/trade/market-order', data),
    limitOrder: (data) => api.post('/trade/limit-order', data),
    cancelOrder: (orderId) => api.post('/trade/cancel-order', { orderId }),
    getQuote: (ticker) => api.get(`/trade/quote/${ticker}`),
    getUserActivity: (params = {}) => api.get('/trade/activity', { params }),
};

export const profileAPI = {
    getMe: () => api.get('/users/me'),
    getProfile: () => api.get('/users/profile'),
    updateProfile: (data) => api.put('/users/profile', data),
};

export const adminAPI = {
    getUsers: () => api.get('/admin/users'),
    updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
    getAlerts: () => api.get('/admin/alerts'),
    deleteAlert: (id) => api.delete(`/admin/alerts/${id}`),
    getTransactions: (params) => api.get('/admin/transactions', { params }),
    getStats: () => api.get('/admin/stats'),
};

export default api;
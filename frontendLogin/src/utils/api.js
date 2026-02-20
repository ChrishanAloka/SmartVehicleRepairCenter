import axios from 'axios';

const API_URL = 'https://smartvehiclerepaircenter.onrender.com/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getMe: () => api.get('/auth/me')
};

// Technician API
export const technicianAPI = {
    getAll: () => api.get('/technicians'),
    getPresent: () => api.get('/technicians/present'),
    getById: (id) => api.get(`/technicians/${id}`),
    create: (data) => api.post('/technicians', data),
    update: (id, data) => api.put(`/technicians/${id}`, data),
    delete: (id) => api.delete(`/technicians/${id}`),
    checkIn: (employeeId) => api.post('/technicians/checkin', { employeeId }),
    checkOut: (employeeId) => api.post('/technicians/checkout', { employeeId })
};

// Booking API
export const bookingAPI = {
    getAll: (params) => api.get('/bookings', { params }),
    getToday: (params) => api.get('/bookings/today', { params }),
    getById: (id) => api.get(`/bookings/${id}`),
    getByCustomer: (identifier) => api.get(`/bookings/customer/${identifier}`),
    create: (data) => api.post('/bookings', data),
    updateStatus: (id, data) => api.put(`/bookings/${id}/status`, data),
    update: (id, data) => api.put(`/bookings/${id}`, data),
    updateCustomer: (id, data) => api.put(`/bookings/customer/${id}`, data),
    payout: (id, amount) => api.put(`/bookings/${id}/payout`, { amount }),
    cancelExpired: () => api.post('/bookings/cancel-expired'),
    submitReview: (id, data) => api.post(`/bookings/${id}/review`, data),
    rebook: (id, data) => api.put(`/bookings/${id}/rebook`, data)
};

// Customer API
export const customerAPI = {
    getAll: () => api.get('/customers'),
    getById: (id) => api.get(`/customers/${id}`),
    update: (id, data) => api.put(`/customers/${id}`, data),
    delete: (id) => api.delete(`/customers/${id}`)
};

// Invoice API
export const invoiceAPI = {
    getAll: (params) => api.get('/invoices', { params }),
    getById: (id) => api.get(`/invoices/${id}`),
    getByNumber: (invoiceNumber) => api.get(`/invoices/number/${invoiceNumber}`),
    create: (data) => api.post('/invoices', data),
    delete: (id) => api.delete(`/invoices/${id}`)
};

// Settings API
export const settingsAPI = {
    get: () => api.get('/settings'),
    update: (data) => api.put('/settings', data),
    addHoliday: (data) => api.post('/settings/holidays', data),
    removeHoliday: (holidayId) => api.delete(`/settings/holidays/${holidayId}`),
    isOpen: (date) => api.get('/settings/is-open', { params: { date } })
};

export default api;
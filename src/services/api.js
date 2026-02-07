import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'https://api.i-nettz.site/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('inet_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('inet_token');
      localStorage.removeItem('inet_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resendOtp: (data) => api.post('/auth/resend-otp', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  uploadProfilePicture: (data) => api.post('/auth/profile-picture', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const categoriesAPI = {
  getAll: () => api.get('/categories'),
};

export const servicesAPI = {
  getAll: (category) => api.get('/services', { params: category ? { category } : {} }),
  getById: (id) => api.get(`/services/${id}`),
};

export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  createManual: (data) => api.post('/orders/manual', data),
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  checkPaymentStatus: (id) => api.get(`/orders/${id}/payment-status`),
  paymentTimeout: (id) => api.post(`/orders/${id}/payment-timeout`),
};

export const settingsAPI = {
  getPaymentSettings: () => api.get('/settings/payment'),
};

export const notificationsAPI = {
  getAll: (page = 1, limit = 30) => api.get('/notifications', { params: { page, limit } }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export const videosAPI = {
  getAll: (category) => api.get('/videos', { params: category ? { category } : {} }),
  getCategories: () => api.get('/videos/categories'),
};

export const adultVideosAPI = {
  getAll: (category) => api.get('/adult-videos', { params: category ? { category } : {} }),
  getCategories: () => api.get('/adult-videos/categories'),
  incrementViews: (id) => api.put(`/adult-videos/${id}/view`),
  initiatePayment: (data) => api.post('/adult-videos/pay', data),
  checkPaymentStatus: (purchaseId) => api.get(`/adult-videos/pay/${purchaseId}/status`),
  checkPurchase: (videoId) => api.get(`/adult-videos/${videoId}/purchased`),
};

export const subscriptionAPI = {
  getPlans: () => api.get('/subscriptions/plans'),
  getMySubscription: () => api.get('/subscriptions/my'),
  validatePromo: (data) => api.post('/subscriptions/validate-promo', data),
  subscribe: (data) => api.post('/subscriptions/subscribe', data),
  checkPaymentStatus: (subscriptionId) => api.get(`/subscriptions/${subscriptionId}/status`),
};

export default api;

import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

export const apiMessage = (error) =>
  error?.response?.data?.error || error?.message || 'Something went wrong. Please try again.';

/* ---------- Public ---------- */
export const getSettings = () => api.get('/settings').then((response) => response.data.settings);
export const getProducts = (params) => api.get('/products', { params }).then((response) => response.data);
export const getProduct = (id) => api.get(`/products/${id}`).then((response) => response.data);
export const getCategories = () => api.get('/products/categories').then((response) => response.data.categories);
export const validateCoupon = (payload) => api.post('/coupons/validate', payload).then((response) => response.data);
export const lookupCustomer = (mobile) =>
  api.get('/customers/lookup', { params: { mobile } }).then((response) => response.data);
export const placeOrder = (payload) => api.post('/orders', payload).then((response) => response.data);
export const trackOrder = (orderId) => api.get(`/orders/track/${encodeURIComponent(orderId)}`).then((response) => response.data.order);
export const sendChatMessage = (payload) => api.post('/chatbot', payload).then((response) => response.data);
export const spinWheel = (mobile) => api.post('/games/spin', { mobile }).then((response) => response.data);
export const solvePuzzle = (payload) => api.post('/games/puzzle', payload).then((response) => response.data);
export const getQuiz = () => api.get('/games/quiz').then((response) => response.data.questions);
export const submitQuiz = (payload) => api.post('/games/quiz', payload).then((response) => response.data);

/* ---------- Admin ---------- */
export const adminLogin = (payload) => api.post('/auth/login', payload).then((response) => response.data);
export const adminLogout = () => api.post('/auth/logout').then((response) => response.data);
export const adminMe = () => api.get('/auth/me').then((response) => response.data.user);

export const getDashboard = () => api.get('/admin/stats').then((response) => response.data);

export const createProduct = (payload) => api.post('/products', payload).then((response) => response.data);
export const updateProduct = (id, payload) => api.put(`/products/${id}`, payload).then((response) => response.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`).then((response) => response.data);

export const getBills = (params) => api.get('/bills', { params }).then((response) => response.data);
export const createBill = (payload) => api.post('/bills', payload).then((response) => response.data);
export const sendBillReceipt = (id) => api.post(`/bills/${id}/receipt`).then((response) => response.data);

export const getCustomers = (params) => api.get('/customers', { params }).then((response) => response.data);
export const createCustomer = (payload) => api.post('/customers', payload).then((response) => response.data);
export const updateCustomer = (id, payload) => api.put(`/customers/${id}`, payload).then((response) => response.data);

export const getAdminOrders = (params) => api.get('/orders', { params }).then((response) => response.data);
export const updateOrderStatus = (id, payload) => api.put(`/orders/${id}/status`, payload).then((response) => response.data);

export const previewAudience = (payload) => api.post('/bulk/preview', payload).then((response) => response.data);
export const sendBulkCampaign = (payload) => api.post('/bulk/send', payload).then((response) => response.data);
export const getCampaignLogs = () => api.get('/bulk/logs').then((response) => response.data);

export const getGameCoupons = () => api.get('/games/coupons').then((response) => response.data);
export const getCoupons = () => api.get('/coupons').then((response) => response.data);
export const updateSettings = (payload) => api.put('/settings', payload).then((response) => response.data);

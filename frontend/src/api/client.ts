import axios from 'axios'

// API_BASE_URL получаем из переменной окружения или используем относительный путь
// В продакшене VITE_API_URL будет https://api.aurelle.uz
// В разработке можно указать http://localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  maxRedirects: 5,
  validateStatus: (status) => status < 400, // Принимать все статусы < 400
})

// Interceptor для добавления токена
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor для обработки ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

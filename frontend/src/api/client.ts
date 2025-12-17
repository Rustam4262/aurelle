import axios from 'axios'

// API_BASE_URL получаем из переменной окружения или используем относительный путь
// В продакшене VITE_API_URL будет https://api.aurelle.uz/api
// В разработке VITE_API_URL = http://localhost:8000/api (уже включает /api)
const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api`

export const apiClient = axios.create({
  baseURL: API_BASE_URL,  // Не добавляем /api второй раз - уже есть в VITE_API_URL
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
    // MVP: Global error handling
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    } else if (error.response?.status >= 500) {
      // Server errors - log but don't crash UI
      console.error('Server error:', error.response?.status, error.response?.data)
      // UI components should handle errors gracefully with try/catch
    }
    return Promise.reject(error)
  }
)

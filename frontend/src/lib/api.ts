import axios from 'axios'
import { auth } from './firebase'

const BASE = import.meta.env.VITE_API_BASE_URL || ''

// Log the base URL once on load so it's visible in browser DevTools console
console.log('[api] baseURL =', BASE || '(empty — VITE_API_BASE_URL not set)')

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api

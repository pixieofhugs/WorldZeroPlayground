import axios from 'axios'

import { returnToLandingIfSessionExpired } from './sessionRedirect'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  withCredentials: true, // send httpOnly JWT cookie automatically
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    returnToLandingIfSessionExpired(error?.response?.status, error?.config?.url ?? '')
    return Promise.reject(error)
  },
)

export default api

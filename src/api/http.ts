import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Token de acceso en memoria (evita vulnerabilidad XSS en localStorage)
let accessTokenMemoria: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessTokenMemoria = token;
};

export const getAccessToken = (): string | null => {
  return accessTokenMemoria;
};

// Genera o recupera el token del Carrito de Invitado
export const getOrCreateGuestToken = (): string => {
  const KEY = 'shopcart_guest_token';
  let token = localStorage.getItem(KEY);
  if (!token) {
    token = 'guest-' + crypto.randomUUID();
    localStorage.setItem(KEY, token);
  }
  return token;
};

export const http = axios.create({
  baseURL: API_URL,
  withCredentials: true, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// adjunta Access Token si existiera una sesion y x-guest-token
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessTokenMemoria && config.headers) {
    config.headers.Authorization = `Bearer ${accessTokenMemoria}`;
  }
  if (config.headers) {
    config.headers['x-guest-token'] = getOrCreateGuestToken();
  }
  return config;
});

// Renovación transparente del token con el refresh token
let renovandoPromesa: Promise<string | null> | null = null;

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const esRutaAuth =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/registro');

    const tieneSesion = localStorage.getItem('shopcart_sesion_activa') === 'true';

    // Si el servidor devolvió 401 y no es una ruta de login/refresh, renovar automáticamente
    if (error.response?.status === 401 && !originalRequest._retry && !esRutaAuth && tieneSesion) {
      originalRequest._retry = true;


      if (!renovandoPromesa) {
        renovandoPromesa = axios
          .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
          .then((res) => {
            const nuevoToken: string = res.data?.accessToken;
            setAccessToken(nuevoToken);
            return nuevoToken;
          })
          .catch(() => {
            setAccessToken(null);
            localStorage.removeItem('shopcart_sesion_activa');
            return null;
          })
          .finally(() => {
            renovandoPromesa = null;
          });
      }

      const nuevoToken = await renovandoPromesa;

      if (nuevoToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${nuevoToken}`;
        return http(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);
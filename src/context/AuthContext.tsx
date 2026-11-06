import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { http, setAccessToken } from '../api/http';

export type RolUsuario = 'CLIENTE' | 'OPERADOR' | 'ADMINISTRADOR';

export interface UsuarioSesion {
  idUsuario: number;
  nombreCompleto: string;
  correoElectronico: string;
  rol: RolUsuario;
}

interface AuthContextType {
  usuario: UsuarioSesion | null;
  cargandoAuth: boolean;
  iniciarSesion: (correoElectronico: string, password: string) => Promise<UsuarioSesion>;
  registrarCliente: (datos: {
    nombres: string;
    apellidos: string;
    correoElectronico: string;
    password: string;
    telefono?: string;
  }) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESION_FLAG_KEY = 'shopcart_sesion_activa';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargandoAuth, setCargandoAuth] = useState<boolean>(true);
  // Evita que React StrictMode dispare /auth/refresh 2 veces al mismo tiempo
  const verificacionIniciada = useRef<boolean>(false);

  const normalizarUsuario = (u: Record<string, unknown>): UsuarioSesion => ({
    idUsuario: Number(u.idUsuario ?? u.IDUsuario),
    nombreCompleto: String(
      u.nombreCompleto ?? u.NombreCompleto ?? `${u.Nombres ?? ''} ${u.Apellidos ?? ''}`
    ).trim(),
    correoElectronico: String(u.correoElectronico ?? u.CorreoElectronico),
    rol: (u.rol ?? u.CodigoRol) as RolUsuario,
  });

  useEffect(() => {
    if (verificacionIniciada.current) return;
    verificacionIniciada.current = true;

    const tieneSesionGuardada = localStorage.getItem(SESION_FLAG_KEY) === 'true';

    // Si no ha iniciado sesión, NO envía ninguna petición a /auth/refresh
    if (!tieneSesionGuardada) {
      setCargandoAuth(false);
      return;
    }

    const restaurarSesion = async () => {
      try {
        const { data } = await http.post('/auth/refresh', {});
        if (data?.ok && data?.accessToken && data?.usuario) {
          setAccessToken(data.accessToken);
          setUsuario(normalizarUsuario(data.usuario));
        } else {
          localStorage.removeItem(SESION_FLAG_KEY);
        }
      } catch {
        localStorage.removeItem(SESION_FLAG_KEY);
        setAccessToken(null);
        setUsuario(null);
      } finally {
        setCargandoAuth(false);
      }
    };

    restaurarSesion();
  }, []);

  const iniciarSesion = async (correoElectronico: string, password: string): Promise<UsuarioSesion> => {
    const { data } = await http.post('/auth/login', { correoElectronico, password });
    setAccessToken(data.accessToken);
    localStorage.setItem(SESION_FLAG_KEY, 'true');
    const userNormalizado = normalizarUsuario(data.usuario);
    setUsuario(userNormalizado);
    return userNormalizado;
  };

  const registrarCliente = async (datos: {
    nombres: string;
    apellidos: string;
    correoElectronico: string;
    password: string;
    telefono?: string;
  }): Promise<void> => {
    await http.post('/auth/registro', datos);
  };

  const cerrarSesion = async (): Promise<void> => {
    try {
      await http.post('/auth/logout', {});
    } finally {
      localStorage.removeItem(SESION_FLAG_KEY);
      setAccessToken(null);
      setUsuario(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargandoAuth,
        iniciarSesion,
        registrarCliente,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
};
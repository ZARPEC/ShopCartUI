import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, type RolUsuario } from '../context/AuthContext';

interface ProtectedRouteProps {
  rolesPermitidos?: RolUsuario[];
}
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ rolesPermitidos }) => {
  const { usuario, cargandoAuth } = useAuth();

  if (cargandoAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600 font-medium animate-pulse">Verificando sesión...</div>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
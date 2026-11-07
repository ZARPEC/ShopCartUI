import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LayoutDashboard, Package, ClipboardList, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await cerrarSesion();
    navigate('/login');
  };

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo Tienda */}
        <Link to="/" className="flex items-center gap-2 font-extrabold text-xl tracking-tight text-amber-400">
          <Package className="w-7 h-7 text-amber-400" />
          <span>ShopCart<span className="text-white font-normal">.gt</span></span>
        </Link>

        {/* Menú dinámico según el Rol del Usuario (Requisito Pág. 9) */}
        <nav className="flex items-center gap-4 sm:gap-6 text-sm font-medium">
          <Link to="/" className="hover:text-amber-400 transition-colors">
            Catálogo
          </Link>

          {/* Opciones para Visitante o CLIENTE */}
          {(!usuario || usuario.rol === 'CLIENTE') && (
            <Link
              to="/carrito"
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Carrito</span>
            </Link>
          )}

          {/* Opciones para OPERADOR y ADMINISTRADOR */}
          {(usuario?.rol === 'OPERADOR' || usuario?.rol === 'ADMINISTRADOR') && (
            <>
              <Link to="/admin/inventario" className="flex items-center gap-1 hover:text-amber-400 transition-colors">
                <ClipboardList className="w-4 h-4" />
                <span>Inventario / Kardex</span>
              </Link>
              <Link to="/admin/dashboard" className="flex items-center gap-1 hover:text-amber-400 transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                <span>Pedidos y Dashboard</span>
              </Link>
            </>
          )}

          {/* Opción exclusiva para ADMINISTRADOR (RF-09 Bitácora) */}
          {usuario?.rol === 'ADMINISTRADOR' && (
            <Link to="/admin/bitacora" className="flex items-center gap-1 hover:text-amber-400 transition-colors">
              <ShieldAlert className="w-4 h-4" />
              <span>Bitácora</span>
            </Link>
          )}

          {/* Estado de sesión */}
          {usuario ? (
            <div className="flex items-center gap-3 border-l border-slate-700 pl-4">
              <div className="hidden sm:flex flex-col text-right leading-tight">
                <span className="font-semibold text-white">{usuario.nombreCompleto}</span>
                <span className="text-xs text-amber-400">{usuario.rol}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 rounded-lg bg-slate-800 hover:bg-red-600 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 border border-slate-700 hover:border-amber-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Ingresar</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};
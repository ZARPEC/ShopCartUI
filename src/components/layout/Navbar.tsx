import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  User,
  LogOut,
  LayoutDashboard,
  Package,
  ClipboardList,
  ShieldAlert,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const handleLogout = async () => {
    setMenuAbierto(false);
    await cerrarSesion();
    navigate('/login');
  };

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Logo Tienda */}
        <Link
          to="/"
          onClick={() => setMenuAbierto(false)}
          className="flex items-center gap-1.5 font-extrabold text-lg sm:text-xl tracking-tight text-amber-400 shrink-0"
        >
          <Package className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 shrink-0" />
          <span>
            ShopCart<span className="text-white font-normal">.gt</span>
          </span>
        </Link>

        {/* Acciones rápidas en móvil (< md) + Botón Hamburguesa */}
        <div className="flex items-center gap-2 md:hidden">
          {(!usuario || usuario.rol === 'CLIENTE') && (
            <Link
              to="/carrito"
              onClick={() => setMenuAbierto(false)}
              className="flex items-center gap-1 bg-amber-500 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-xs"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Carrito</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
            aria-label="Abrir menú"
          >
            {menuAbierto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Menú Escritorio (md y superior) */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
          <Link to="/" className="hover:text-amber-400 transition-colors">
            Catálogo
          </Link>

          {(!usuario || usuario.rol === 'CLIENTE') && (
            <Link
              to="/carrito"
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Carrito</span>
            </Link>
          )}

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

          {usuario?.rol === 'ADMINISTRADOR' && (
            <Link to="/admin/bitacora" className="flex items-center gap-1 hover:text-amber-400 transition-colors">
              <ShieldAlert className="w-4 h-4" />
              <span>Bitácora</span>
            </Link>
          )}

          {usuario ? (
            <div className="flex items-center gap-3 border-l border-slate-700 pl-4">
              <div className="flex flex-col text-right leading-tight">
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

      {/* Menú Desplegable Móvil (< md, ideal para iPhone SE 375px) */}
      {menuAbierto && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700 px-4 py-3 space-y-2 text-sm">
          <Link
            to="/"
            onClick={() => setMenuAbierto(false)}
            className="block py-2 font-medium text-white hover:text-amber-400"
          >
            Catálogo de Productos
          </Link>

          {(usuario?.rol === 'OPERADOR' || usuario?.rol === 'ADMINISTRADOR') && (
            <>
              <Link
                to="/admin/inventario"
                onClick={() => setMenuAbierto(false)}
                className="block py-2 font-medium text-white hover:text-amber-400"
              >
                Inventario / Kardex
              </Link>
              <Link
                to="/admin/dashboard"
                onClick={() => setMenuAbierto(false)}
                className="block py-2 font-medium text-white hover:text-amber-400"
              >
                Pedidos y Dashboard
              </Link>
            </>
          )}

          {usuario?.rol === 'ADMINISTRADOR' && (
            <Link
              to="/admin/bitacora"
              onClick={() => setMenuAbierto(false)}
              className="block py-2 font-medium text-white hover:text-amber-400"
            >
              Bitácora de Auditoría
            </Link>
          )}

          <div className="pt-2 border-t border-slate-700">
            {usuario ? (
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="font-semibold text-white">{usuario.nombreCompleto}</p>
                  <p className="text-xs text-amber-400">{usuario.rol}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Salir
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMenuAbierto(false)}
                className="flex items-center justify-center gap-1.5 bg-slate-900 text-white py-2 rounded-lg font-semibold"
              >
                <User className="w-4 h-4" /> Ingresar / Crear cuenta
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
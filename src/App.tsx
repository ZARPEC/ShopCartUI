import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { LoginPage } from './pages/tienda/LoginPage';
import { CatalogoPage } from './pages/tienda/CatalogoPage';
import { ProductoDetallePage } from './pages/tienda/ProductoDetallePage';
import { CarritoCheckoutPage } from './pages/tienda/CarritoCheckoutPage';
import { InventarioKardexPage } from './pages/admin/InventarioKardexPage';
import { DashboardPedidosPage } from './pages/admin/DashboardPedidosPage';
import { BitacoraPage } from './pages/admin/BitacoraPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminProductosPage } from './pages/admin/AdminProductosPage';
import { AdminUsuariosPage } from './pages/admin/AdminUsuariosPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <Navbar />
          <Routes>
            {/* Rutas Públicas y de Cliente */}
            <Route path="/" element={<CatalogoPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/producto/:slug" element={<ProductoDetallePage />} />
            <Route path="/carrito" element={<CarritoCheckoutPage />} />

            {/* Rutas Protegidas: Operador y Administrador */}
            <Route element={<ProtectedRoute rolesPermitidos={['OPERADOR', 'ADMINISTRADOR']} />}>
              <Route path="/admin/inventario" element={<InventarioKardexPage />} />
              <Route path="/admin/dashboard" element={<DashboardPedidosPage />} />
            </Route>

            {/* Ruta Protegida: Exclusivo Administrador */}
            <Route element={<ProtectedRoute rolesPermitidos={['ADMINISTRADOR']} />}>
              <Route path="/admin/bitacora" element={<BitacoraPage />} />
              <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
              <Route path="/admin/productos" element={<AdminProductosPage />} />
              <Route path="/admin/bitacora" element={<BitacoraPage />} />
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
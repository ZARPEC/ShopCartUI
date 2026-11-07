import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { LoginPage } from './pages/tienda/LoginPage';
import { CatalogoPage } from './pages/tienda/CatalogoPage';
import { ProductoDetallePage } from './pages/tienda/ProductoDetallePage';
import { CarritoCheckoutPage } from './pages/tienda/CarritoCheckoutPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <Navbar />
          <Routes>
            <Route path="/" element={<CatalogoPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/producto/:slug" element={<ProductoDetallePage />} />
            <Route path="/carrito" element={<CarritoCheckoutPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
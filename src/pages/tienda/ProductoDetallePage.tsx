import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Check,
  ArrowLeft,
  Truck,
  ShieldCheck,
  Clock,
  RotateCcw,
  Sparkles,
  Tag,
  ChevronRight,
  PackageCheck,
} from 'lucide-react';
import { AxiosError } from 'axios';
import { http } from '../../api/http';

interface VarianteDetalle {
  IDVarianteProducto: number;
  SKU: string;
  NombreVariante: string;
  PrecioActual: number;
  ExistenciaDisponible: number;
  TieneStock: number;
}

interface ImagenProducto {
  IDProductoImagen: number;
  IDVarianteProducto: number | null;
  UrlImagen: string;
  TextoAlternativo: string | null;
  EsPrincipal: boolean;
}

interface ProductoCompleto {
  IDProducto: number;
  Nombre: string;
  Slug: string;
  Descripcion: string | null;
  Marca: string | null;
  PorcentajeIVA: number;
  CategoriaNombre: string;
  CategoriaSlug?: string;
  UrlImagenPrincipal?: string | null;
  variantes: VarianteDetalle[];
  imagenes?: ImagenProducto[];
}

export const ProductoDetallePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [producto, setProducto] = useState<ProductoCompleto | null>(null);
  const [varianteActiva, setVarianteActiva] = useState<VarianteDetalle | null>(null);
  const [imagenActiva, setImagenActiva] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState<number>(1);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [mensajeCarrito, setMensajeCarrito] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    const cargarDetalle = async () => {
      setCargando(true);
      setError(null);
      try {
        const { data } = await http.get(`/catalogo/productos/${slug}`);
        const prod: ProductoCompleto = data.producto;
        setProducto(prod);

        const primeraConStock = prod.variantes.find((v) => v.ExistenciaDisponible > 0) || prod.variantes[0] || null;
        setVarianteActiva(primeraConStock);

        const fotoVarianteInicial = prod.imagenes?.find(
          (img) => img.IDVarianteProducto === primeraConStock?.IDVarianteProducto
        );
        setImagenActiva(
          fotoVarianteInicial?.UrlImagen ||
            prod.imagenes?.[0]?.UrlImagen ||
            prod.UrlImagenPrincipal ||
            null
        );
      } catch {
        setError('No se encontró el producto solicitado o ya no está activo.');
      } finally {
        setCargando(false);
      }
    };
    cargarDetalle();
  }, [slug]);

  const handleAgregarAlCarrito = async () => {
    if (!varianteActiva) return;
    setAgregando(true);
    setMensajeCarrito(null);

    try {
      await http.post('/carrito/items', {
        idVarianteProducto: varianteActiva.IDVarianteProducto,
        cantidad,
      });
      setMensajeCarrito({
        tipo: 'ok',
        texto: `Se agregaron ${cantidad} unidad(es) de "${varianteActiva.NombreVariante}" a tu bolsa.`,
      });
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setMensajeCarrito({
        tipo: 'error',
        texto: axiosErr.response?.data?.mensaje || 'No se pudo agregar al carrito.',
      });
    } finally {
      setAgregando(false);
    }
  };

  if (cargando) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
          <div className="h-80 sm:h-96 bg-slate-200 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-8 bg-slate-200 rounded w-3/4" />
            <div className="h-10 bg-slate-200 rounded w-1/2" />
            <div className="h-20 bg-slate-200 rounded w-full" />
            <div className="h-12 bg-slate-200 rounded-xl w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-xs">
          <p className="text-red-600 font-bold text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
          >
            Volver al catálogo
          </button>
        </div>
      </div>
    );
  }

  const maxStock = varianteActiva?.ExistenciaDisponible ?? 0;
  const precioUnitario = Number(varianteActiva?.PrecioActual ?? 0);
  const aplicaEnvioGratis = precioUnitario * cantidad >= 500;
  const pocasUnidades = maxStock > 0 && maxStock <= 5;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 w-full overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-8">
        {/* Barra Superior de Navegación y Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-950 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Volver al catálogo</span>
          </button>

          <nav className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Link to="/" className="hover:text-slate-700">
              Inicio
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600">{producto.CategoriaNombre}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-bold truncate max-w-55">{producto.Nombre}</span>
          </nav>
        </div>

        {/* Contenedor Principal del Producto */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-8 lg:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Columna Izquierda: Galería Interactiva */}
          <div className="lg:col-span-5 min-w-0 flex flex-col">
            <div className="relative bg-linear-to-b from-slate-50 to-slate-100/80 border border-slate-200/60 rounded-2xl h-72 sm:h-96 flex items-center justify-center p-6 overflow-hidden group">
              {/* Etiqueta de Marca flotante */}
              <span className="absolute top-3.5 left-3.5 bg-slate-900 text-amber-400 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg shadow-xs z-10">
                {producto.Marca || producto.CategoriaNombre}
              </span>

              {/* Badge de Estado de Stock */}
              <span
                className={`absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full z-10 ${
                  maxStock > 0
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    maxStock > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                  }`}
                />
                {maxStock > 0 ? 'Disponible' : 'Agotado'}
              </span>

              {imagenActiva ? (
                <img
                  src={imagenActiva}
                  alt={producto.Nombre}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <span className="text-sm text-slate-400 font-medium">Sin imagen disponible</span>
              )}
            </div>

            {/* Miniaturas de la Galería */}
            {producto.imagenes && producto.imagenes.length > 1 && (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Vistas y colores ({producto.imagenes.length})
                </p>
                <div className="flex gap-2.5 overflow-x-auto pb-2">
                  {producto.imagenes.map((img) => {
                    const activa = imagenActiva === img.UrlImagen;
                    return (
                      <button
                        key={img.IDProductoImagen}
                        type="button"
                        onClick={() => setImagenActiva(img.UrlImagen)}
                        className={`w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border-2 p-1 bg-slate-50 transition-all cursor-pointer ${
                          activa
                            ? 'border-amber-500 ring-2 ring-amber-500/20 scale-105'
                            : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={img.UrlImagen}
                          alt={img.TextoAlternativo || producto.Nombre}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Información Comercial, Variantes y Compra */}
          <div className="lg:col-span-7 flex flex-col justify-between min-w-0">
            <div>
              {/* Categoría y SKU */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200/70 px-2.5 py-0.5 rounded-md">
                  <Tag className="w-3 h-3" /> {producto.CategoriaNombre}
                </span>
                {varianteActiva && (
                  <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md break-all">
                    SKU: {varianteActiva.SKU}
                  </span>
                )}
              </div>

              {/* Título del Producto */}
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug mb-4 wrap-break-word">
                {producto.Nombre}
              </h1>

              {/* Bloque Destacado de Precio e Impuestos */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Precio de contado (Congelado al confirmar)
                  </span>
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      Q {precioUnitario.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      IVA {producto.PorcentajeIVA}% incluido
                    </span>
                  </div>
                </div>

                {aplicaEnvioGratis && (
                  <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-400/40 text-amber-900 px-3.5 py-2 rounded-xl text-xs font-extrabold">
                    <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>¡Califica para Envío Gratis!</span>
                  </div>
                )}
              </div>

              {/* Descripción */}
              {producto.Descripcion && (
                <p className="text-sm text-slate-600 leading-relaxed mb-6 wrap-break-word">
                  {producto.Descripcion}
                </p>
              )}

              {/* Selector de Variantes Estilizado */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Selecciona Variante / Presentación:
                  </label>
                  {varianteActiva && (
                    <span className="text-xs font-bold text-slate-500">
                      Seleccionado: <strong className="text-slate-900">{varianteActiva.NombreVariante}</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {producto.variantes.map((v) => {
                    const agotada = v.ExistenciaDisponible <= 0;
                    const seleccionada = varianteActiva?.IDVarianteProducto === v.IDVarianteProducto;
                    return (
                      <button
                        key={v.IDVarianteProducto}
                        type="button"
                        onClick={() => {
                          setVarianteActiva(v);
                          setCantidad(1);
                          setMensajeCarrito(null);

                          const fotoVariante = producto.imagenes?.find(
                            (img) => img.IDVarianteProducto === v.IDVarianteProducto
                          );
                          if (fotoVariante) {
                            setImagenActiva(fotoVariante.UrlImagen);
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl text-left border transition-all cursor-pointer ${
                          seleccionada
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400/50'
                            : agotada
                            ? 'bg-slate-100/80 text-slate-400 border-slate-200 line-through'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="block text-xs sm:text-sm font-bold truncate">
                            {v.NombreVariante}
                          </span>
                          <span
                            className={`text-[11px] font-medium block ${
                              seleccionada ? 'text-amber-300' : agotada ? 'text-red-400' : 'text-slate-500'
                            }`}
                          >
                            {agotada ? 'Sin existencias' : `${v.ExistenciaDisponible} disponibles`}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs sm:text-sm font-extrabold block ${
                              seleccionada ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            Q {Number(v.PrecioActual).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Barra de estado de inventario de la variante seleccionada */}
                {varianteActiva && (
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                      <PackageCheck className="w-4 h-4 text-emerald-600" />
                      Stock verificado en bodega:
                      <strong className={maxStock > 0 ? 'text-emerald-700' : 'text-red-600'}>
                        {maxStock} unidad(es)
                      </strong>
                    </span>
                    {pocasUnidades && (
                      <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> ¡Quedan pocas unidades!
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/*  Cantidad + Botón Agregar*/}
            <div className="pt-4 border-t border-slate-100">
              {mensajeCarrito && (
                <div
                  className={`mb-4 p-3.5 rounded-xl text-xs sm:text-sm font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs ${
                    mensajeCarrito.tipo === 'ok'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {mensajeCarrito.tipo === 'ok' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    <span>{mensajeCarrito.texto}</span>
                  </span>
                  {mensajeCarrito.tipo === 'ok' && (
                    <Link
                      to="/carrito"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg text-center whitespace-nowrap transition-colors"
                    >
                      Ir a mi carrito →
                    </Link>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
                {/* Selector de cantidad */}
                <div className="flex items-center justify-between sm:justify-start bg-slate-50 border border-slate-300 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    disabled={cantidad <= 1 || maxStock <= 0}
                    onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                    className="px-4 py-3 text-slate-700 hover:bg-slate-200 disabled:opacity-40 font-extrabold cursor-pointer transition-colors"
                  >
                    −
                  </button>
                  <div className="px-4 py-2 text-center min-w-14">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">Cant.</span>
                    <span className="text-base font-black text-slate-900">
                      {maxStock > 0 ? cantidad : 0}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={cantidad >= maxStock || maxStock <= 0}
                    onClick={() => setCantidad((c) => Math.min(maxStock, c + 1))}
                    className="px-4 py-3 text-slate-700 hover:bg-slate-200 disabled:opacity-40 font-extrabold cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Botón Principal de Compra */}
                <button
                  type="button"
                  disabled={maxStock <= 0 || agregando}
                  onClick={handleAgregarAlCarrito}
                  className="flex-1 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-slate-300 disabled:to-slate-300 text-slate-950 disabled:text-slate-500 font-black py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2.5 text-sm shadow-lg shadow-amber-500/20 disabled:shadow-none transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-5 h-5 shrink-0" />
                  <span>
                    {maxStock <= 0
                      ? 'VARIANTE SIN EXISTENCIAS'
                      : agregando
                      ? 'AGREGANDO A TU BOLSA...'
                      : `AGREGAR A MI BOLSA · Q ${(precioUnitario * cantidad).toLocaleString('es-GT', {
                          minimumFractionDigits: 2,
                        })}`}
                  </span>
                </button>
              </div>

              {/* Sellos de Confianza de la Tienda */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/70 rounded-xl p-2.5">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-[11px] leading-tight">
                    <strong className="text-slate-800 block">Reserva de 15 min</strong>
                    <span className="text-slate-500">Stock apartado al pagar</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/70 rounded-xl p-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-[11px] leading-tight">
                    <strong className="text-slate-800 block">Precio Congelado</strong>
                    <span className="text-slate-500">Sin cambios tras tu compra</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/70 rounded-xl p-2.5">
                  <RotateCcw className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div className="text-[11px] leading-tight">
                    <strong className="text-slate-800 block">Devolución Fácil</strong>
                    <span className="text-slate-500">Total o parcial garantizada</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
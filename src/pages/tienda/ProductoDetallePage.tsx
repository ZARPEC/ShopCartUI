import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Check, ArrowLeft } from 'lucide-react';
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
        texto: `Se agregaron ${cantidad} unidad(es) de "${varianteActiva.NombreVariante}" a tu carrito.`,
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
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-slate-600 animate-pulse">
        Cargando información del producto...
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 font-semibold mb-4">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
        >
          Volver al catálogo
        </button>
      </div>
    );
  }

  const maxStock = varianteActiva?.ExistenciaDisponible ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 w-full overflow-x-hidden">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-4 sm:mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 shrink-0" /> Volver al catálogo
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-8 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Galería de Imágenes */}
        <div className="min-w-0">
          <div className="bg-slate-100 rounded-xl h-64 sm:h-96 flex items-center justify-center overflow-hidden mb-3">
            {imagenActiva ? (
              <img src={imagenActiva} alt={producto.Nombre} className="w-full h-full object-contain" />
            ) : (
              <span className="text-sm text-slate-400">Sin imagen disponible</span>
            )}
          </div>

          {producto.imagenes && producto.imagenes.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-2">
              {producto.imagenes.map((img) => (
                <button
                  key={img.IDProductoImagen}
                  onClick={() => setImagenActiva(img.UrlImagen)}
                  className={`w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer ${
                    imagenActiva === img.UrlImagen ? 'border-slate-900' : 'border-transparent opacity-70'
                  }`}
                >
                  <img src={img.UrlImagen} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información y Selector de Variantes */}
        <div className="flex flex-col justify-between min-w-0">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              <span>{producto.Marca || producto.CategoriaNombre}</span>
              {varianteActiva && <span className="break-all">· Ref: {varianteActiva.SKU}</span>}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-3 wrap-break-word">
              {producto.Nombre}
            </h1>

            <div className="flex flex-wrap items-baseline gap-2.5 mb-4">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Q {Number(varianteActiva?.PrecioActual ?? 0).toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                IVA {producto.PorcentajeIVA}% incluido
              </span>
            </div>

            {producto.Descripcion && (
              <p className="text-sm text-slate-600 leading-relaxed mb-5 wrap-break-word">{producto.Descripcion}</p>
            )}

            {/* Botones de Variantes */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                Selecciona Variante / Presentación:
              </label>
              <div className="flex flex-wrap gap-2">
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
                      className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                        seleccionada
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : agotada
                          ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                          : 'bg-white text-slate-800 border-slate-300 hover:border-slate-900'
                      }`}
                    >
                      {v.NombreVariante}
                    </button>
                  );
                })}
              </div>
              {varianteActiva && (
                <p className="text-xs text-slate-500 mt-2">
                  Existencia disponible:{' '}
                  <strong className={maxStock > 0 ? 'text-emerald-700' : 'text-red-600'}>
                    {maxStock} unidad(es)
                  </strong>
                </p>
              )}
            </div>
          </div>

          {/* Selector de Cantidad (- 1 +) y Botón Agregar a mi Bolsa adaptados a móvil */}
          <div>
            {mensajeCarrito && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs sm:text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  mensajeCarrito.tipo === 'ok'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {mensajeCarrito.tipo === 'ok' && <Check className="w-4 h-4 shrink-0" />}
                  <span>{mensajeCarrito.texto}</span>
                </span>
                {mensajeCarrito.tipo === 'ok' && (
                  <Link to="/carrito" className="underline font-bold whitespace-nowrap">
                    Ver carrito →
                  </Link>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center justify-between sm:justify-start border border-slate-300 rounded-xl overflow-hidden">
                <button
                  type="button"
                  disabled={cantidad <= 1 || maxStock <= 0}
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                  className="px-4 py-2.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40 font-bold cursor-pointer"
                >
                  −
                </button>
                <span className="px-4 py-2.5 text-sm font-bold text-slate-900 min-w-10 text-center">
                  {maxStock > 0 ? cantidad : 0}
                </span>
                <button
                  type="button"
                  disabled={cantidad >= maxStock || maxStock <= 0}
                  onClick={() => setCantidad((c) => Math.min(maxStock, c + 1))}
                  className="px-4 py-2.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40 font-bold cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                disabled={maxStock <= 0 || agregando}
                onClick={handleAgregarAlCarrito}
                className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>{maxStock <= 0 ? 'VARIANTES AGOTADAS' : agregando ? 'AGREGANDO...' : 'AGREGAR A MI BOLSA'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
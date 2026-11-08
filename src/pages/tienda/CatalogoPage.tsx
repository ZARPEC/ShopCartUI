import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  AlertCircle,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
  Truck,
  ShieldCheck,
  Zap,
  Sparkles,
  Laptop,
  Headphones,
  Home,
  Shirt,
  LayoutGrid,
  ArrowUpRight,
} from 'lucide-react';
import { http } from '../../api/http';
import { useDebounce } from '../../hooks/useDebounce';

interface Categoria {
  IDCategoria: number;
  Nombre: string;
  Slug: string;
  TotalProductos: number;
}

interface ProductoItem {
  IDProducto: number;
  Nombre: string;
  Slug: string;
  Marca: string | null;
  CategoriaNombre: string;
  CategoriaSlug: string;
  PrecioMinimo: number;
  PrecioMaximo: number;
  StockTotalDisponible: number;
  TotalVariantes: number;
  UrlImagenPrincipal: string | null;
}

const getCategoryIcon = (slug: string) => {
  if (slug.includes('tecno')) return <Laptop className="w-4 h-4" />;
  if (slug.includes('audio')) return <Headphones className="w-4 h-4" />;
  if (slug.includes('hogar')) return <Home className="w-4 h-4" />;
  if (slug.includes('moda')) return <Shirt className="w-4 h-4" />;
  return <LayoutGrid className="w-4 h-4" />;
};

export const CatalogoPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<ProductoItem[]>([]);

  // Inicializar los filtros y la página desde la URL
  const [buscar, setBuscar] = useState(() => searchParams.get('buscar') || '');
  const [categoriaSlug, setCategoriaSlug] = useState(() => searchParams.get('categoria') || '');
  const [precioMin, setPrecioMin] = useState(() => searchParams.get('precioMin') || '');
  const [precioMax, setPrecioMax] = useState(() => searchParams.get('precioMax') || '');
  const [soloDisponibles, setSoloDisponibles] = useState(() => searchParams.get('disponibles') === 'true');
  const [orden, setOrden] = useState<'recientes' | 'precio_asc' | 'precio_desc' | 'nombre'>(
    () => (searchParams.get('orden') as 'recientes' | 'precio_asc' | 'precio_desc' | 'nombre') || 'recientes'
  );
  const [pagina, setPagina] = useState(() => {
    const pagUrl = Number(searchParams.get('pagina'));
    return pagUrl > 0 ? pagUrl : 1;
  });

  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // Debounce
  const [busquedaDebounced, setBusquedaDebounced] = useDebounce(buscar, 400);
  const [precioMinDebounced, setPrecioMinDebounced] = useDebounce(precioMin, 400);
  const [precioMaxDebounced, setPrecioMaxDebounced] = useDebounce(precioMax, 400);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guarda los valores previos para que React StrictMode NO reinicie pagina a 1 al montar
  const prevFiltrosRef = useRef({
    busquedaDebounced,
    precioMinDebounced,
    precioMaxDebounced,
  });

  useEffect(() => {
    http
      .get('/catalogo/categorias')
      .then((res) => setCategorias(res.data.categorias || []))
      .catch(() => {});
  }, []);

  // Solo reinicia a página 1 si realmente cambió el texto buscado o el rango de precio
  useEffect(() => {
    const prev = prevFiltrosRef.current;
    if (
      prev.busquedaDebounced !== busquedaDebounced ||
      prev.precioMinDebounced !== precioMinDebounced ||
      prev.precioMaxDebounced !== precioMaxDebounced
    ) {
      prevFiltrosRef.current = {
        busquedaDebounced,
        precioMinDebounced,
        precioMaxDebounced,
      };
      setPagina(1);
    }
  }, [busquedaDebounced, precioMinDebounced, precioMaxDebounced]);

  // Sincronizar el estado actual con los parámetros de la URL
  useEffect(() => {
    const nuevosParams: Record<string, string> = {};
    if (pagina > 1) nuevosParams.pagina = String(pagina);
    if (busquedaDebounced.trim()) nuevosParams.buscar = busquedaDebounced.trim();
    if (categoriaSlug) nuevosParams.categoria = categoriaSlug;
    if (precioMinDebounced) nuevosParams.precioMin = precioMinDebounced;
    if (precioMaxDebounced) nuevosParams.precioMax = precioMaxDebounced;
    if (soloDisponibles) nuevosParams.disponibles = 'true';
    if (orden !== 'recientes') nuevosParams.orden = orden;

    setSearchParams(nuevosParams, { replace: true });
  }, [pagina, busquedaDebounced, categoriaSlug, precioMinDebounced, precioMaxDebounced, soloDisponibles, orden, setSearchParams]);

  const cargarProductos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params: Record<string, string | number | boolean> = {
        pagina,
        limite: 8,
        orden,
      };
      if (busquedaDebounced.trim()) params.buscar = busquedaDebounced.trim();
      if (categoriaSlug) params.categoria = categoriaSlug;
      if (precioMinDebounced) params.precioMin = Number(precioMinDebounced);
      if (precioMaxDebounced) params.precioMax = Number(precioMaxDebounced);
      if (soloDisponibles) params.soloDisponibles = true;

      const { data } = await http.get('/catalogo/productos', { params });
      setProductos(data.datos || []);
      setTotalPaginas(data.totalPaginas || 1);
      setTotalRegistros(data.total || 0);
    } catch {
      setError('No se pudo cargar el catálogo de productos. Verifica la conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  }, [busquedaDebounced, categoriaSlug, precioMinDebounced, precioMaxDebounced, soloDisponibles, orden, pagina]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const handleBuscarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusquedaDebounced(buscar);
    setPagina(1);
  };

  const limpiarFiltros = () => {
    setBuscar('');
    setBusquedaDebounced('');
    setCategoriaSlug('');
    setPrecioMin('');
    setPrecioMinDebounced('');
    setPrecioMax('');
    setPrecioMaxDebounced('');
    setSoloDisponibles(false);
    setOrden('recientes');
    setPagina(1);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Barra Superior */}
      <div className="bg-amber-500 text-slate-950 text-xs font-bold py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center sm:justify-between gap-3 text-center">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Cupón 10% OFF en toda la tienda: <strong className="underline">KEMIK10</strong>
          </span>
          <div className="hidden md:flex items-center gap-6">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> Envío Gratis en compras mayores a Q 500.00
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Precios con IVA 12% Incluido
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-10 text-white shadow-xl mb-8 border border-slate-800">
          <div className="absolute -right-16 -top-16 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-20 -bottom-20 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/15 text-amber-300 text-xs font-bold px-3 py-1 rounded-full mb-4">
              <Zap className="w-3.5 h-3.5 fill-amber-400" />
              <span>Tienda Oficial en Línea · Entrega Inmediata</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight mb-3">
              Equipa tu vida con lo mejor en{' '}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-400 to-orange-400">
                Tecnología, Hogar y Moda
              </span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mb-6">
              Stock sincronizado al segundo con nuestra bodega central. Reserva garantizada por 15 minutos en tu checkout.
            </p>

            {/* Buscador Principal */}
            <form onSubmit={handleBuscarSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  placeholder="¿Qué estás buscando hoy? (Ej. iPhone 15, JBL, Nike, Cafetera)..."
                  className="w-full bg-white text-slate-900 pl-12 pr-4 py-3.5 rounded-2xl text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <button
                type="submit"
                className="bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold px-7 py-3.5 rounded-2xl text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer shrink-0"
              >
                Buscar ahora
              </button>
            </form>
          </div>
        </div>

        {/* Píldoras Interactivas de Categorías */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-3 mb-6 no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setCategoriaSlug('');
              setPagina(1);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              categoriaSlug === ''
                ? 'bg-slate-900 text-white shadow-md scale-[1.02]'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-amber-500" />
            <span>Todas las categorías</span>
          </button>

          {categorias.map((c) => {
            const activa = categoriaSlug === c.Slug;
            return (
              <button
                key={c.IDCategoria}
                type="button"
                onClick={() => {
                  setCategoriaSlug(activa ? '' : c.Slug);
                  setPagina(1);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activa
                    ? 'bg-slate-900 text-white shadow-md scale-[1.02]'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
                }`}
              >
                <span className={activa ? 'text-amber-400' : 'text-slate-500'}>{getCategoryIcon(c.Slug)}</span>
                <span>{c.Nombre}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                    activa ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {c.TotalProductos}
                </span>
              </button>
            );
          })}
        </div>

        {/* Barra de Filtros Secundaria */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-8 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs uppercase tracking-wider mr-1">
              <SlidersHorizontal className="w-4 h-4 text-amber-600" />
              <span>Refinar:</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-xs font-semibold text-slate-400">Q</span>
              <input
                type="number"
                min={0}
                value={precioMin}
                onChange={(e) => setPrecioMin(e.target.value)}
                placeholder="Mínimo"
                className="w-20 bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
              />
              <span className="text-slate-300">—</span>
              <span className="text-xs font-semibold text-slate-400">Q</span>
              <input
                type="number"
                min={0}
                value={precioMax}
                onChange={(e) => setPrecioMax(e.target.value)}
                placeholder="Máximo"
                className="w-20 bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 font-semibold cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={soloDisponibles}
                onChange={(e) => {
                  setSoloDisponibles(e.target.checked);
                  setPagina(1);
                }}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              En existencia
            </label>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <select
              value={orden}
              onChange={(e) => {
                setOrden(e.target.value as 'recientes' | 'precio_asc' | 'precio_desc' | 'nombre');
                setPagina(1);
              }}
              className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none"
            >
              <option value="recientes">Ordenar: Más recientes</option>
              <option value="precio_asc">Precio: Menor a Mayor</option>
              <option value="precio_desc">Precio: Mayor a Menor</option>
              <option value="nombre">Nombre: A - Z</option>
            </select>

            {(buscar || categoriaSlug || precioMin || precioMax || soloDisponibles) && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="text-xs font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Estado visible de carga */}
        {cargando && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
                <div className="w-full h-52 bg-slate-200 rounded-xl mb-4" />
                <div className="h-3 bg-slate-200 rounded w-1/3 mb-2" />
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-7 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Estado visible de error */}
        {!cargando && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center my-6">
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-red-900 mb-1">Error al cargar productos</h3>
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <button
              onClick={cargarProductos}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-xl cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Estado visible vacio */}
        {!cargando && !error && productos.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center my-6 shadow-xs">
            <PackageOpen className="w-14 h-14 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-extrabold text-slate-800 mb-1">No encontramos productos con esos filtros</h3>
            <p className="text-sm text-slate-500 mb-5">
              Prueba cambiando el término de búsqueda o restableciendo los filtros aplicados.
            </p>
            <button
              onClick={limpiarFiltros}
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-6 py-2.5 rounded-xl cursor-pointer"
            >
              Ver todo el catálogo
            </button>
          </div>
        )}

        {/* Tarjetas de Producto */}
        {!cargando && !error && productos.length > 0 && (
          <>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-4 font-semibold">
              <span>
                Mostrando <strong className="text-slate-800">{productos.length}</strong> de{' '}
                <strong className="text-slate-800">{totalRegistros}</strong> productos
              </span>
              <span>Página {pagina} de {totalPaginas}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {productos.map((prod) => {
                const sinStock = prod.StockTotalDisponible <= 0;
                const tieneRangoPrecio = Number(prod.PrecioMaximo) > Number(prod.PrecioMinimo);

                return (
                  <Link
                    key={prod.IDProducto}
                    to={`/producto/${prod.Slug}`}
                    className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-amber-400/80 transition-all duration-300 flex flex-col"
                  >
                    <div className="relative h-56 bg-slate-100/80 overflow-hidden flex items-center justify-center p-4">
                      {prod.UrlImagenPrincipal ? (
                        <img
                          src={prod.UrlImagenPrincipal}
                          alt={prod.Nombre}
                          className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-500"
                        />
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Sin imagen</span>
                      )}

                      <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg">
                        {prod.Marca || prod.CategoriaNombre}
                      </span>

                      <span
                        className={`absolute top-3 right-3 text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-xs ${
                          sinStock
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {sinStock ? 'Agotado' : `${prod.StockTotalDisponible} en stock`}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                          {prod.CategoriaNombre}
                        </span>
                        <h2 className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-amber-600 transition-colors leading-snug">
                          {prod.Nombre}
                        </h2>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-end justify-between">
                        <div>
                          <span className="text-[11px] text-slate-400 font-medium block">
                            {tieneRangoPrecio ? 'Desde' : 'Precio online'}
                          </span>
                          <span className="text-xl font-black text-slate-900 tracking-tight">
                            Q {Number(prod.PrecioMinimo).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-700 px-3 py-1.5 rounded-xl transition-colors">
                          <span>Ver</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Controles de Paginación */}
            {totalPaginas > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  disabled={pagina <= 1}
                  onClick={() => {
                    setPagina((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-bold text-slate-700 disabled:opacity-40 cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPaginas }, (_, idx) => idx + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setPagina(num);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-9 h-9 rounded-xl text-sm font-extrabold transition-colors cursor-pointer ${
                        pagina === num
                          ? 'bg-slate-900 text-amber-400 shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <button
                  disabled={pagina >= totalPaginas}
                  onClick={() => {
                    setPagina((p) => Math.min(totalPaginas, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-bold text-slate-700 disabled:opacity-40 cursor-pointer shadow-2xs"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
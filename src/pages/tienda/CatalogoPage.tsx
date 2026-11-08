import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, AlertCircle, PackageOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { http } from '../../api/http';

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

export const CatalogoPage: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<ProductoItem[]>([]);

  // 1. Estado inmediato del input (lo que teclea el usuario)
  const [buscar, setBuscar] = useState('');
  // 2. Estado con Debounce (solo se actualiza tras 400ms de inactividad para no saturar SQL)
  const [busquedaDebounced, setBusquedaDebounced] = useState('');

  // Filtros controlados
  const [categoriaSlug, setCategoriaSlug] = useState('');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [orden, setOrden] = useState<'recientes' | 'precio_asc' | 'precio_desc' | 'nombre'>('recientes');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // Estados visuales obligatorios (Pág. 9: carga, vacío y error)
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carga inicial de categorías
  useEffect(() => {
    http
      .get('/catalogo/categorias')
      .then((res) => setCategorias(res.data.categorias || []))
      .catch(() => {});
  }, []);

  // Temporizador Debounce: espera 400ms tras la última tecla pulsada
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusquedaDebounced(buscar);
      setPagina(1);
    }, 400);

    return () => clearTimeout(timer); // Si sigue tecleando, cancela el timer anterior
  }, [buscar]);

  // Consulta paginada hacia el Backend y SQL Server
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
      if (precioMin) params.precioMin = Number(precioMin);
      if (precioMax) params.precioMax = Number(precioMax);
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
  }, [busquedaDebounced, categoriaSlug, precioMin, precioMax, soloDisponibles, orden, pagina]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  // Si presiona el botón Buscar o Enter, ejecuta la búsqueda de inmediato sin esperar los 400ms
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
    setPrecioMax('');
    setSoloDisponibles(false);
    setOrden('recientes');
    setPagina(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Banner y Buscador Superior estilo Kemik */}
      <div className="bg-linear-to-r from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white mb-8 shadow-md">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Todo lo que buscas en tecnología, hogar y moda
          </h1>

          <form onSubmit={handleBuscarSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Buscar por nombre, marca o descripción (ej. Samsung, Sony, Laptop)..."
                className="w-full bg-white text-slate-900 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
            >
              Buscar
            </button>
          </form>
        </div>
      </div>

      {/* Barra de Filtros del lado del servidor */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-xs flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-sm mr-2 self-center">
          <SlidersHorizontal className="w-4 h-4 text-amber-600" />
          <span>Filtros:</span>
        </div>

        <div className="min-w-45">
          <label className="block text-xs font-semibold text-slate-500 mb-1">Categoría</label>
          <select
            value={categoriaSlug}
            onChange={(e) => {
              setCategoriaSlug(e.target.value);
              setPagina(1);
            }}
            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.IDCategoria} value={c.Slug}>
                {c.Nombre} ({c.TotalProductos})
              </option>
            ))}
          </select>
        </div>

        <div className="w-28">
          <label className="block text-xs font-semibold text-slate-500 mb-1">Precio mín (Q)</label>
          <input
            type="number"
            min={0}
            value={precioMin}
            onChange={(e) => {
              setPrecioMin(e.target.value);
              setPagina(1);
            }}
            placeholder="0"
            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
          />
        </div>

        <div className="w-28">
          <label className="block text-xs font-semibold text-slate-500 mb-1">Precio máx (Q)</label>
          <input
            type="number"
            min={0}
            value={precioMax}
            onChange={(e) => {
              setPrecioMax(e.target.value);
              setPagina(1);
            }}
            placeholder="10000"
            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Ordenar por</label>
          <select
            value={orden}
            onChange={(e) => {
              setOrden(e.target.value as 'recientes' | 'precio_asc' | 'precio_desc' | 'nombre');
              setPagina(1);
            }}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="recientes">Más recientes</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
            <option value="nombre">Nombre (A - Z)</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer pb-1.5">
          <input
            type="checkbox"
            checked={soloDisponibles}
            onChange={(e) => {
              setSoloDisponibles(e.target.checked);
              setPagina(1);
            }}
            className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
          />
          Solo con stock disponible
        </label>

        <button
          type="button"
          onClick={limpiarFiltros}
          className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-900 underline pb-2 cursor-pointer"
        >
          Limpiar filtros
        </button>
      </div>

      {/* 1. Estado visible de CARGA */}
      {cargando && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-8">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="w-full h-48 bg-slate-200 rounded-lg mb-4" />
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
              <div className="h-5 bg-slate-200 rounded w-3/4 mb-4" />
              <div className="h-6 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* 2. Estado visible de ERROR */}
      {!cargando && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center my-6">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-red-900 mb-1">Error al cargar productos</h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={cargarProductos}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* 3. Estado visible VACÍO */}
      {!cargando && !error && productos.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center my-6">
          <PackageOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 mb-1">No encontramos productos con esos filtros</h3>
          <p className="text-sm text-slate-500 mb-4">
            Prueba cambiando el término de búsqueda o restableciendo los filtros de precio y categoría.
          </p>
          <button
            onClick={limpiarFiltros}
            className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer"
          >
            Ver todo el catálogo
          </button>
        </div>
      )}

      {/* 4. Cuadrícula de Productos */}
      {!cargando && !error && productos.length > 0 && (
        <>
          <div className="text-xs text-slate-500 mb-4 font-medium">
            Mostrando {productos.length} de {totalRegistros} producto(s) encontrados
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {productos.map((prod) => {
              const sinStock = prod.StockTotalDisponible <= 0;
              return (
                <Link
                  key={prod.IDProducto}
                  to={`/producto/${prod.Slug}`}
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                >
                  <div className="relative h-52 bg-slate-100 overflow-hidden flex items-center justify-center">
                    {prod.UrlImagenPrincipal ? (
                      <img
                        src={prod.UrlImagenPrincipal}
                        alt={prod.Nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Sin imagen</span>
                    )}

                    <span
                      className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full ${
                        sinStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {sinStock ? 'Agotado' : `${prod.StockTotalDisponible} disp.`}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                        {prod.Marca || prod.CategoriaNombre}
                      </span>
                      <h2 className="text-sm font-bold text-slate-900 mt-1 line-clamp-2 group-hover:text-amber-600 transition-colors">
                        {prod.Nombre}
                      </h2>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block">Precio</span>
                        <span className="text-lg font-extrabold text-slate-900">
                          Q {Number(prod.PrecioMinimo).toFixed(2)}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">
                        {prod.TotalVariantes} variante(s) →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Controles de Paginación del Servidor */}
          {totalPaginas > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="text-sm font-semibold text-slate-700">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium disabled:opacity-40 cursor-pointer"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
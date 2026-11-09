import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ClipboardList,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Tag,
  Search,
  SlidersHorizontal,
  History,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  X,
  Boxes,
} from 'lucide-react';
import { AxiosError } from 'axios';
import { http } from '../../api/http';
import { useAuth } from '../../context/AuthContext';

interface CategoriaSimple {
  IDCategoria: number;
  Nombre: string;
  Slug: string;
}

interface ProductoItem {
  IDProducto: number;
  Nombre: string;
  Slug: string;
  Marca: string | null;
  CategoriaNombre: string;
  StockTotalDisponible: number;
  TotalVariantes: number;
  UrlImagenPrincipal: string | null;
}

interface VarianteItem {
  IDVarianteProducto: number;
  SKU: string;
  NombreVariante: string;
  PrecioActual: number;
  ExistenciaDisponible: number;
}

interface ResumenVarianteKardex {
  IDVarianteProducto: number;
  SKU: string;
  NombreProducto: string;
  NombreVariante: string;
  ExistenciaFisica: number;
  ExistenciaReservada: number;
  ExistenciaDisponible: number;
  SumaMovimientosKardex: number;
  KardexCuadrado: boolean;
}

interface MovimientoKardex {
  IDMovimientoKardex: number;
  CodigoTipoMovimiento: string;
  NombreTipoMovimiento: string;
  Cantidad: number;
  CantidadConSigno: number;
  ExistenciaAnterior: number;
  ExistenciaNueva: number;
  CostoUnitario: number | null;
  Motivo: string;
  IDPedido: number | null;
  NombreUsuario: string;
  FechaMovimiento: string;
}

export const InventarioKardexPage: React.FC = () => {
  const { usuario } = useAuth();

  const [categorias, setCategorias] = useState<CategoriaSimple[]>([]);
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [slugSeleccionado, setSlugSeleccionado] = useState<string>('');
  const [variantes, setVariantes] = useState<VarianteItem[]>([]);
  const [idVarianteActiva, setIdVarianteActiva] = useState<number | null>(null);

  // Buscador y filtros del catálogo de bodega
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipoMov, setFiltroTipoMov] = useState('');

  // Pestaña activa en el área de trabajo
  const [tabActiva, setTabActiva] = useState<'historial' | 'registrar'>('historial');

  const [resumen, setResumen] = useState<ResumenVarianteKardex | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoKardex[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalMovimientos, setTotalMovimientos] = useState(0);

  // Formulario de Movimiento / Ajuste en Kardex
  const [tipoMovimiento, setTipoMovimiento] = useState<'ENTRADA_COMPRA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO'>('ENTRADA_COMPRA');
  const [cantidad, setCantidad] = useState<string>('5');
  const [motivo, setMotivo] = useState<string>('');
  const [costoUnitario, setCostoUnitario] = useState<string>('');

  // Modal para Creación de Cupón con Ámbito y Categoría
  const [modalCuponAbierto, setModalCuponAbierto] = useState(false);
  const [codigoCupon, setCodigoCupon] = useState('');
  const [descCupon, setDescCupon] = useState('');
  const [tipoDescCupon, setTipoDescCupon] = useState<1 | 2>(1); // 1 = %, 2 = Q
  const [valorDescCupon, setValorDescCupon] = useState('10');
  const [idAmbitoCupon, setIdAmbitoCupon] = useState<1 | 2>(1); // 1 = Todo el carrito, 2 = Categoría específica
  const [idCategoriaCupon, setIdCategoriaCupon] = useState<string>('');
  const [minimoCupon, setMinimoCupon] = useState('200');
  const [maximoDescuentoCupon, setMaximoDescuentoCupon] = useState('');
  const [limiteTotalCupon, setLimiteTotalCupon] = useState('50');
  const [diasVigencia, setDiasVigencia] = useState('30');

  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoKardex, setCargandoKardex] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // 1. Cargar categorías y productos de bodega
  useEffect(() => {
    setCargandoLista(true);
    Promise.all([
      http.get('/catalogo/categorias'),
      http.get('/catalogo/productos', { params: { pagina: 1, limite: 100, incluirInactivos: true } }),
    ])
      .then(([resCat, resProd]) => {
        const cats: CategoriaSimple[] = resCat.data.categorias || [];
        const prods: ProductoItem[] = resProd.data.datos || [];
        setCategorias(cats);
        setProductos(prods);
        if (cats.length > 0) {
          setIdCategoriaCupon(String(cats[0].IDCategoria));
        }
        if (prods.length > 0 && !slugSeleccionado) {
          setSlugSeleccionado(prods[0].Slug);
        }
      })
      .catch(() => {})
      .finally(() => setCargandoLista(false));
  }, [slugSeleccionado]);

  // 2. Cargar variantes del producto seleccionado
  useEffect(() => {
    if (!slugSeleccionado) return;
    http
      .get(`/catalogo/productos/${slugSeleccionado}`)
      .then((res) => {
        const vars: VarianteItem[] = res.data.producto?.variantes || [];
        setVariantes(vars);
        if (vars.length > 0) {
          setIdVarianteActiva(vars[0].IDVarianteProducto);
          setPagina(1);
        }
      })
      .catch(() => {});
  }, [slugSeleccionado]);

  // 3. Consultar Kardex de la variante activa
  const cargarKardex = useCallback(async () => {
    if (!idVarianteActiva) return;
    setCargandoKardex(true);
    try {
      const { data } = await http.get(`/inventario/kardex/${idVarianteActiva}`, {
        params: { pagina, limite: 10 },
      });
      setResumen(data.variante || null);
      setMovimientos(data.movimientos || []);
      setTotalPaginas(data.paginacion?.totalPaginas || 1);
      setTotalMovimientos(data.paginacion?.total || 0);
    } catch {
      setAlerta({ tipo: 'error', texto: 'No se pudo cargar el historial del Kardex.' });
    } finally {
      setCargandoKardex(false);
    }
  }, [idVarianteActiva, pagina]);

  useEffect(() => {
    cargarKardex();
  }, [cargarKardex]);

  // Filtro reactivo en memoria para el buscador de productos en bodega
  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos;
    const q = busqueda.toLowerCase();
    return productos.filter(
      (p) =>
        p.Nombre.toLowerCase().includes(q) ||
        (p.Marca && p.Marca.toLowerCase().includes(q)) ||
        p.Slug.toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  // Filtro de tipos de movimiento en la tabla
  const movimientosFiltrados = useMemo(() => {
    if (!filtroTipoMov) return movimientos;
    return movimientos.filter((m) => m.CodigoTipoMovimiento === filtroTipoMov);
  }, [movimientos, filtroTipoMov]);

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idVarianteActiva) return;
    setGuardando(true);
    setAlerta(null);

    try {
      await http.post('/inventario/movimientos', {
        idVarianteProducto: idVarianteActiva,
        tipoMovimiento,
        cantidad: Number(cantidad),
        motivo: motivo.trim(),
        costoUnitario: costoUnitario ? Number(costoUnitario) : undefined,
      });
      setMotivo('');
      setAlerta({ tipo: 'ok', texto: 'Movimiento aplicado exitosamente en Kardex y auditado en Bitácora.' });
      setTabActiva('historial');
      await cargarKardex();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string; errores?: Array<{ mensaje: string }> }>;
      const msg =
        axiosErr.response?.data?.errores?.map((x) => x.mensaje).join(' · ') ||
        axiosErr.response?.data?.mensaje ||
        'Error al registrar el movimiento.';
      setAlerta({ tipo: 'error', texto: msg });
    } finally {
      setGuardando(false);
    }
  };

  const handleCrearCupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setAlerta(null);
    try {
      const inicio = new Date();
      const fin = new Date();
      fin.setDate(fin.getDate() + (Number(diasVigencia) || 30));

      await http.post('/carrito/cupones/admin', {
        codigo: codigoCupon.toUpperCase().trim(),
        descripcion: descCupon.trim(),
        idTipoDescuentoCupon: tipoDescCupon,
        valorDescuento: Number(valorDescCupon),
        idAmbitoCupon,
        idCategoria: idAmbitoCupon === 2 && idCategoriaCupon ? Number(idCategoriaCupon) : undefined,
        montoMinimoCompra: Number(minimoCupon),
        montoMaximoDescuento: maximoDescuentoCupon ? Number(maximoDescuentoCupon) : undefined,
        limiteTotalUsos: Number(limiteTotalCupon),
        limiteUsosPorCliente: 1,
        fechaInicioVigencia: inicio.toISOString(),
        fechaFinVigencia: fin.toISOString(),
      });

      const catTexto = idAmbitoCupon === 2 ? ' para la categoría seleccionada' : ' en toda la tienda';
      setAlerta({ tipo: 'ok', texto: `Cupón ${codigoCupon.toUpperCase()} creado${catTexto} y registrado en Bitácora.` });
      setCodigoCupon('');
      setDescCupon('');
      setMaximoDescuentoCupon('');
      setModalCuponAbierto(false);
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'No se pudo crear el cupón.' });
    } finally {
      setGuardando(false);
    }
  };

  // Cálculo en vivo del saldo resultante
  const saldoActual = resumen?.ExistenciaFisica ?? 0;
  const cantNum = Number(cantidad) || 0;
  const saldoProyectado =
    tipoMovimiento === 'AJUSTE_NEGATIVO' ? saldoActual - cantNum : saldoActual + cantNum;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      {/* Modal React: Crear Nuevo Cupón Promocional con Ámbito y Categoría */}
      {modalCuponAbierto && usuario?.rol === 'ADMINISTRADOR' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <form
            onSubmit={handleCrearCupon}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 my-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <Tag className="w-5 h-5 text-amber-500" />
                <span>Nuevo Cupón Promocional </span>
              </div>
              <button
                type="button"
                onClick={() => setModalCuponAbierto(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Ámbito: Toda la tienda vs Categoría Específica */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                ¿Dónde aplica el descuento? (Ámbito del Cupón)
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIdAmbitoCupon(1)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    idAmbitoCupon === 1
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="block text-xs font-bold">Toda la Tienda</span>
                  <span className="text-[10px] text-slate-400">Todo el carrito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIdAmbitoCupon(2)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    idAmbitoCupon === 2
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="block text-xs font-bold">Por Categoría</span>
                  <span className="text-[10px] text-slate-400">Solo productos de esa categoría</span>
                </button>
              </div>
            </div>

            {/* Si es por categoría, muestra el selector de categorías */}
            {idAmbitoCupon === 2 && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                <label className="block text-xs font-bold uppercase text-amber-900 mb-1">
                  Categoría a la que aplica el descuento:
                </label>
                <select
                  required
                  value={idCategoriaCupon}
                  onChange={(e) => setIdCategoriaCupon(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                >
                  {categorias.map((c) => (
                    <option key={c.IDCategoria} value={c.IDCategoria}>
                      {c.Nombre}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-amber-800 mt-1">
                  El cupón solo calculará descuento sobre los productos de esta categoría específica en el carrito.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Código del Cupón</label>
                <input
                  type="text"
                  required
                  placeholder="SUPER10"
                  value={codigoCupon}
                  onChange={(e) => setCodigoCupon(e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Tipo de Descuento</label>
                <select
                  value={tipoDescCupon}
                  onChange={(e) => setTipoDescCupon(Number(e.target.value) as 1 | 2)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold bg-white"
                >
                  <option value={1}>Porcentaje (%)</option>
                  <option value={2}>Monto Fijo (Q)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  {tipoDescCupon === 1 ? 'Porcentaje %' : 'Monto Q'}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={tipoDescCupon === 1 ? 100 : undefined}
                  value={valorDescCupon}
                  onChange={(e) => setValorDescCupon(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Compra Mín. (Q)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={minimoCupon}
                  onChange={(e) => setMinimoCupon(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Límite Total Usos</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={limiteTotalCupon}
                  onChange={(e) => setLimiteTotalCupon(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Tope Máx. Descuento Q (opcional)
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="Ej. 500.00"
                  value={maximoDescuentoCupon}
                  onChange={(e) => setMaximoDescuentoCupon(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Días de Vigencia</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={diasVigencia}
                  onChange={(e) => setDiasVigencia(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Descripción</label>
              <input
                type="text"
                required
                placeholder="Ej. 10% de descuento en tecnología compras mayores a Q 200"
                value={descCupon}
                onChange={(e) => setDescCupon(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalCuponAbierto(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-xs"
              >
                {guardando ? 'Guardando...' : 'Crear Cupón'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Control de Inventario y Kardex
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Historial inmutable, cuadratura matemática por SKU y registro de ajustes justificados.
              </p>
            </div>
          </div>
        </div>

        {usuario?.rol === 'ADMINISTRADOR' && (
          <button
            type="button"
            onClick={() => setModalCuponAbierto(true)}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl cursor-pointer shadow-xs transition-colors"
          >
            <Tag className="w-4 h-4" />
            <span>+ Crear Cupón</span>
          </button>
        )}
      </div>

      {alerta && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-semibold border flex items-center gap-2.5 shadow-xs ${
            alerta.tipo === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {alerta.tipo === 'ok' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{alerta.texto}</span>
        </div>
      )}

      {/* Estructura Split-View: Buscador Lateral + Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Panel Lateral Izquierdo: Buscador de Bodega y Selector de Producto (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-amber-500" />
              <span>Productos en Bodega ({productosFiltrados.length})</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-400">Total: {productos.length}</span>
          </div>

          {/* Buscador de productos en vivo */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto o marca..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Lista de productos con scroll optimizado */}
          <div className="space-y-1.5 max-h-145 overflow-y-auto pr-1">
            {cargandoLista ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Cargando inventario...</div>
            ) : productosFiltrados.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No hay productos que coincidan.</div>
            ) : (
              productosFiltrados.map((p) => {
                const activo = slugSeleccionado === p.Slug;
                return (
                  <button
                    key={p.IDProducto}
                    type="button"
                    onClick={() => setSlugSeleccionado(p.Slug)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                      activo
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-100'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.UrlImagenPrincipal ? (
                        <img src={p.UrlImagenPrincipal} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400">Sin foto</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`text-[10px] font-bold uppercase block truncate ${activo ? 'text-amber-400' : 'text-slate-400'}`}>
                        {p.Marca || p.CategoriaNombre}
                      </span>
                      <p className="text-xs font-bold truncate leading-tight">{p.Nombre}</p>
                      <div className="flex items-center justify-between text-[11px] mt-1">
                        <span className={activo ? 'text-slate-300' : 'text-slate-500'}>
                          {p.TotalVariantes} variante(s)
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                            p.StockTotalDisponible > 0
                              ? activo
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {p.StockTotalDisponible} disp.
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Panel Principal Derecho: Área de Trabajo / Kardex de la Variante (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Selector visual de variantes en formato de píldoras */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Variante / Presentación Activa ({variantes.length}):
            </label>
            <div className="flex flex-wrap gap-2">
              {variantes.map((v) => {
                const seleccionada = idVarianteActiva === v.IDVarianteProducto;
                return (
                  <button
                    key={v.IDVarianteProducto}
                    type="button"
                    onClick={() => {
                      setIdVarianteActiva(v.IDVarianteProducto);
                      setPagina(1);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                      seleccionada
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <span className="font-mono font-bold mr-1.5 text-amber-500">[{v.SKU}]</span>
                    <span>{v.NombreVariante}</span>
                    <span className="ml-2 text-xs font-bold text-slate-400">({v.ExistenciaDisponible} u.)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tarjetas KPI de Cuadratura de Inventario*/}
          {resumen && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Existencia Física
                </span>
                <span className="text-2xl font-black text-slate-900">{resumen.ExistenciaFisica}</span>
                <span className="text-[11px] text-slate-500 block">En bodega</span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Reservadas (15m)
                </span>
                <span className="text-2xl font-black text-amber-600">{resumen.ExistenciaReservada}</span>
                <span className="text-[11px] text-slate-500 block">En checkout</span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Disponible Venta
                </span>
                <span className="text-2xl font-black text-emerald-600">{resumen.ExistenciaDisponible}</span>
                <span className="text-[11px] text-slate-500 block">Física − Reservada</span>
              </div>

              <div
                className={`rounded-2xl border p-4 shadow-xs flex flex-col justify-between ${
                  resumen.KardexCuadrado
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-red-50 border-red-200 text-red-950'
                }`}
              >
                <div className="flex items-center gap-1.5 font-extrabold text-xs uppercase tracking-wider">
                  {resumen.KardexCuadrado ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{resumen.KardexCuadrado ? 'Kardex Cuadrado' : 'Descuadre'}</span>
                </div>
                <div className="text-xs font-semibold mt-1">
                  Suma movimientos: <strong className="font-black">{resumen.SumaMovimientosKardex} u.</strong>
                </div>
              </div>
            </div>
          )}

          {/* Navegación por pestañas: Historial de Kardex vs Registrar Movimiento */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTabActiva('historial')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    tabActiva === 'historial'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Historial de Movimientos ({totalMovimientos})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTabActiva('registrar')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    tabActiva === 'registrar'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Registrar Movimiento / Ajuste</span>
                </button>
              </div>

              {tabActiva === 'historial' && (
                <div className="hidden sm:flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={filtroTipoMov}
                    onChange={(e) => setFiltroTipoMov(e.target.value)}
                    className="border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700"
                  >
                    <option value="">Todos los tipos</option>
                    <option value="ENTRADA_COMPRA">Entradas por Compra</option>
                    <option value="SALIDA_VENTA">Salidas por Venta</option>
                    <option value="AJUSTE_POSITIVO">Ajuste Positivo (+)</option>
                    <option value="AJUSTE_NEGATIVO">Ajuste Negativo (−)</option>
                    <option value="ENTRADA_CANCELACION">Reintegro por Cancelación</option>
                    <option value="ENTRADA_DEVOLUCION">Reintegro por Devolución</option>
                  </select>
                </div>
              )}
            </div>

            {/* PESTAÑA 1: TABLA HISTÓRICA DEL KARDEX */}
            {tabActiva === 'historial' && (
              <>
                {cargandoKardex ? (
                  <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                    Consultando movimientos en base de datos...
                  </div>
                ) : movimientosFiltrados.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No hay movimientos registrados para los filtros seleccionados.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 uppercase text-[11px]">
                            <th className="py-2.5 px-2">Fecha y Hora</th>
                            <th className="py-2.5 px-2">Tipo de Movimiento</th>
                            <th className="py-2.5 px-2 text-right">Cantidad</th>
                            <th className="py-2.5 px-2 text-right">Saldo Ant.</th>
                            <th className="py-2.5 px-2 text-right">Saldo Nuevo</th>
                            <th className="py-2.5 px-2">Operador / Motivo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {movimientosFiltrados.map((m) => {
                            const positivo = m.CantidadConSigno > 0;
                            return (
                              <tr key={m.IDMovimientoKardex} className="hover:bg-slate-50">
                                <td className="py-3 px-2 whitespace-nowrap text-xs text-slate-500 font-mono">
                                  {new Date(m.FechaMovimiento).toLocaleString('es-GT')}
                                </td>
                                <td className="py-3 px-2 font-bold text-slate-800">
                                  <span className="inline-flex items-center gap-1">
                                    {positivo ? (
                                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    ) : (
                                      <TrendingDown className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                    )}
                                    <span>{m.NombreTipoMovimiento}</span>
                                  </span>
                                </td>
                                <td
                                  className={`py-3 px-2 text-right font-extrabold ${
                                    positivo ? 'text-emerald-700' : 'text-red-700'
                                  }`}
                                >
                                  {positivo ? `+${m.CantidadConSigno}` : m.CantidadConSigno}
                                </td>
                                <td className="py-3 px-2 text-right text-slate-500 font-mono">
                                  {m.ExistenciaAnterior}
                                </td>
                                <td className="py-3 px-2 text-right font-bold text-slate-900 font-mono">
                                  {m.ExistenciaNueva}
                                </td>
                                <td className="py-3 px-2">
                                  <span className="font-bold text-slate-800 block text-xs">{m.NombreUsuario}</span>
                                  <span className="text-xs text-slate-500 leading-tight">{m.Motivo}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {totalPaginas > 1 && (
                      <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                        <span className="text-slate-500">
                          Página {pagina} de {totalPaginas}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={pagina <= 1}
                            onClick={() => setPagina((p) => Math.max(1, p - 1))}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" /> Anterior
                          </button>
                          <button
                            disabled={pagina >= totalPaginas}
                            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 cursor-pointer"
                          >
                            Siguiente <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* PESTAÑA 2: FORMULARIO DE REGISTRO DE MOVIMIENTO */}
            {tabActiva === 'registrar' && (
              <form onSubmit={handleRegistrarMovimiento} className="space-y-5">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Variante que recibirá el movimiento:
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-slate-900">
                      [{resumen?.SKU}] {resumen?.NombreProducto} — {resumen?.NombreVariante}
                    </span>
                    <span className="text-xs font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                      Saldo Actual: {saldoActual} unidades
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                    Selecciona Tipo de Operación:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setTipoMovimiento('ENTRADA_COMPRA')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        tipoMovimiento === 'ENTRADA_COMPRA'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <span className="block text-xs font-bold">Entrada por Compra (+)</span>
                      <span className="text-[11px] text-slate-400">Ingreso de mercadería</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTipoMovimiento('AJUSTE_POSITIVO')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        tipoMovimiento === 'AJUSTE_POSITIVO'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <span className="block text-xs font-bold">Ajuste Positivo (+)</span>
                      <span className="text-[11px] text-slate-400">Sobrante por conteo físico</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTipoMovimiento('AJUSTE_NEGATIVO')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        tipoMovimiento === 'AJUSTE_NEGATIVO'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <span className="block text-xs font-bold">Ajuste Negativo (−)</span>
                      <span className="text-[11px] text-slate-400">Merma, daño o faltante</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Cantidad de Unidades
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        required
                        min={1}
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-900"
                      />
                      <div className="flex gap-1 shrink-0">
                        {['1', '5', '10', '25'].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setCantidad(n)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-2.5 py-2 rounded-lg cursor-pointer"
                          >
                            +{n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Costo Unitario en Quetzales (opcional)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Q
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={costoUnitario}
                        onChange={(e) => setCostoUnitario(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl pl-7 pr-3.5 py-2.5 text-sm font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Previsualización en tiempo real del saldo resultante */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-bold">
                  <span>Proyección del saldo tras este movimiento:</span>
                  <div className="flex items-center gap-2 font-black text-sm">
                    <span>{saldoActual} u.</span>
                    <ArrowRight className="w-4 h-4 text-amber-600" />
                    <span className={saldoProyectado >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                      {saldoProyectado} u.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Motivo Justificado, mínimo 5 caracteres
                  </label>
                  <textarea
                    required
                    minLength={5}
                    rows={3}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej. Recepción de lote según factura de proveedor #7890 o ajuste por conteo trimestral de bodega..."
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setTabActiva('historial')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando || !idVarianteActiva}
                    className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-extrabold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <PlusCircle className="w-4 h-4 text-amber-400" />
                    <span>{guardando ? 'Guardando en Kardex...' : 'Aplicar Movimiento'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
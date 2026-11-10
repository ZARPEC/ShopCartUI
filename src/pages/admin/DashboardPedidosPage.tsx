import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  AlertTriangle,
  X,
  TrendingUp,
  ShoppingBag,
  AlertOctagon,
  Award,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  PackageCheck,
  Ban
} from 'lucide-react';
import { AxiosError } from 'axios';
import { http } from '../../api/http';

interface MetricasGenerales {
  VentasHoyGTQ: number;
  PedidosHoy: number;
  VentasSemanaGTQ: number;
  PedidosSemana: number;
  VentasMesGTQ: number;
  PedidosMes: number;
  TicketPromedioMesGTQ: number;
  CarritosAbandonadosActualmente: number;
}

interface VentaCategoria {
  IDCategoria: number;
  CategoriaNombre: string;
  TotalPedidos: number;
  UnidadesVendidasNetas: number;
  VentasNetasQuetzales: number;
}

interface TopProducto {
  IDProducto: number;
  NombreProducto: string;
  CategoriaNombre: string;
  UnidadesVendidasNetas: number;
  TotalVentasQuetzales: number;
}

interface PedidoItem {
  IDPedido: number;
  NumeroPedido: string;
  FechaCreacion: string;
  ClienteNombre: string;
  ClienteCorreo: string;
  IDEstadoPedido: number;
  NombreEstado: string;
  TotalPedido: number;
  TotalDevueltoAcumulado: number;
  TotalNetoFinal: number;
  EntregaMunicipio: string;
  EntregaDepartamento: string;
}

// Estructura para Devoluciones Pendientes de Aprobación en Bodega
interface DevolucionPendiente {
  IDDevolucion: number;
  NumeroDevolucion: string;
  IDPedido: number;
  NumeroPedido: string;
  FechaSolicitud: string;
  ClienteNombre: string;
  ClienteCorreo: string;
  ClienteTelefono: string | null;
  MontoTotalReembolsado: number;
  MotivoDevolucion: string;
  LineasDevolucionJson: string; // JSON de líneas
}

export const DashboardPedidosPage: React.FC = () => {
  const [metricas, setMetricas] = useState<MetricasGenerales | null>(null);
  const [ventasCat, setVentasCat] = useState<VentaCategoria[]>([]);
  const [topProductos, setTopProductos] = useState<TopProducto[]>([]);
  const [pedidos, setPedidos] = useState<PedidoItem[]>([]);
  const [devolucionesPendientes, setDevolucionesPendientes] = useState<DevolucionPendiente[]>([]);

  // Pestaña activa: 'pedidos' o 'devoluciones'
  const [pestañaActiva, setPestañaActiva] = useState<'pedidos' | 'devoluciones'>('pedidos');

  // Filtros de tabla de pedidos
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [paginaPedidos, setPaginaPedidos] = useState(1);
  const [totalPaginasPedidos, setTotalPaginasPedidos] = useState(1);

  const [cargando, setCargando] = useState(true);
  const [alerta, setAlerta] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Modal Cancelar Pedido
  const [modalCancelar, setModalCancelar] = useState<{
    abierto: boolean;
    idPedido: number;
    numeroPedido: string;
  }>({
    abierto: false,
    idPedido: 0,
    numeroPedido: '',
  });
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelando, setCancelando] = useState(false);

  // Modal Rechazar Devolución
  const [modalRechazarDev, setModalRechazarDev] = useState<{
    abierto: boolean;
    idDevolucion: number;
    numeroDevolucion: string;
  }>({
    abierto: false,
    idDevolucion: 0,
    numeroDevolucion: '',
  });
  const [motivoRechazoDev, setMotivoRechazoDev] = useState('');
  const [procesandoDev, setProcesandoDev] = useState(false);

  const formatearHora = (valor: string | null) => {
    if (!valor) return '00:00:00';
    const fechaLimpia = typeof valor === 'string' ? valor.replace('Z', '') : valor;
    const d = new Date(fechaLimpia);
    return isNaN(d.getTime())
      ? '00:00:00'
      : d.toLocaleString('es-GT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
  };

  const cargarDashboard = useCallback(async () => {
    setCargando(true);
    try {
      const [resResumen, resTop, resPedidos, resDevs] = await Promise.all([
        http.get('/dashboard/metricas'),
        http.get('/dashboard/top-productos'),
        http.get('/dashboard/pedidos', {
          params: {
            pagina: paginaPedidos,
            limite: 8,
            ...(filtroEstado ? { idEstadoPedido: Number(filtroEstado) } : {}),
          },
        }),
        http.get('/dashboard/devoluciones-pendientes'),
      ]);

      setMetricas(resResumen.data.metricas || null);
      setVentasCat(resResumen.data.ventasPorCategoria || []);
      setTopProductos(resTop.data.top10 || []);
      setPedidos(resPedidos.data.pedidos || []);
      setTotalPaginasPedidos(resPedidos.data.paginacion?.totalPaginas || 1);
      setDevolucionesPendientes(resDevs.data.devoluciones || []);
    } catch {
      setAlerta({ tipo: 'error', texto: 'Error al cargar los indicadores del Dashboard.' });
    } finally {
      setCargando(false);
    }
  }, [paginaPedidos, filtroEstado]);

  useEffect(() => {
    cargarDashboard();
  }, [cargarDashboard]);

  // Transiciones de estado de pedido (1 -> 2 -> 3 -> 4)
  const handleCambiarEstado = async (idPedido: number, idEstadoNuevo: number) => {
    setAlerta(null);
    try {
      await http.patch(`/checkout/pedidos/${idPedido}/estado`, {
        idEstadoNuevo,
        motivo: 'Avance operativo desde panel de administración',
      });
      setAlerta({ tipo: 'ok', texto: `Estado del pedido #${idPedido} actualizado correctamente.` });
      await cargarDashboard();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({
        tipo: 'error',
        texto: axiosErr.response?.data?.mensaje || 'Transición de estado no permitida.',
      });
    }
  };

  // Cancelar pedido
  const abrirModalCancelar = (idPedido: number, numeroPedido?: string) => {
    setModalCancelar({
      abierto: true,
      idPedido,
      numeroPedido: numeroPedido || `#${idPedido}`,
    });
    setMotivoCancelacion('');
  };

  const ejecutarCancelarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    const { idPedido } = modalCancelar;
    if (!idPedido || motivoCancelacion.trim().length < 5) return;

    setCancelando(true);
    setAlerta(null);
    try {
      await http.post(`/checkout/pedidos/${idPedido}/cancelar`, { motivo: motivoCancelacion.trim() });
      setAlerta({ tipo: 'ok', texto: `Pedido #${idPedido} cancelado exitosamente y existencias devueltas al Kardex.` });
      setModalCancelar({ abierto: false, idPedido: 0, numeroPedido: '' });
      setMotivoCancelacion('');
      await cargarDashboard();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'No se pudo cancelar el pedido.' });
    } finally {
      setCancelando(false);
    }
  };

  // Aprobar Devolución en Bodega
  const handleAprobarDevolucion = async (idDevolucion: number, numeroDevolucion: string) => {
    if (!window.confirm(`¿Confirmas la recepción física del producto e ingreso al Kardex para la devolución ${numeroDevolucion}?`)) {
      return;
    }
    setProcesandoDev(true);
    setAlerta(null);
    try {
      await http.post(`/checkout/devoluciones/${idDevolucion}/aprobar`);
      setAlerta({
        tipo: 'ok',
        texto: `Devolución ${numeroDevolucion} aprobada con éxito. Stock reingresado al Kardex bajo ENTRADA_DEVOLUCION.`,
      });
      await cargarDashboard();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'Error al aprobar la devolución.' });
    } finally {
      setProcesandoDev(false);
    }
  };

  // Rechazar Devolución en Bodega
  const ejecutarRechazoDevolucion = async (e: React.FormEvent) => {
    e.preventDefault();
    const { idDevolucion } = modalRechazarDev;
    if (!idDevolucion || motivoRechazoDev.trim().length < 5) return;

    setProcesandoDev(true);
    setAlerta(null);
    try {
      await http.post(`/checkout/devoluciones/${idDevolucion}/rechazar`, {
        motivo: motivoRechazoDev.trim(),
      });
      setAlerta({ tipo: 'ok', texto: `Solicitud de devolución rechazada y auditada con éxito.` });
      setModalRechazarDev({ abierto: false, idDevolucion: 0, numeroDevolucion: '' });
      setMotivoRechazoDev('');
      await cargarDashboard();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'Error al rechazar la devolución.' });
    } finally {
      setProcesandoDev(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 1. Modal React: Cancelar Pedido */}
      {modalCancelar.abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={ejecutarCancelarPedido}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setModalCancelar({ abierto: false, idPedido: 0, numeroPedido: '' })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                ¿Cancelar orden {modalCancelar.numeroPedido}?
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Esta acción anulará el pedido y <strong>reintegrará de inmediato todas las existencias al inventario en el Kardex</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Motivo Justificado (mínimo 5 letras):
              </label>
              <textarea
                required
                minLength={5}
                rows={3}
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Ej. Pago no procesado, solicitud del cliente o dirección inexistente..."
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalCancelar({ abierto: false, idPedido: 0, numeroPedido: '' })}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer"
              >
                No cancelar
              </button>
              <button
                type="submit"
                disabled={cancelando || motivoCancelacion.trim().length < 5}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-md"
              >
                {cancelando ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Modal React: Rechazar Devolución con Motivo */}
      {modalRechazarDev.abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={ejecutarRechazoDevolucion}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <Ban className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setModalRechazarDev({ abierto: false, idDevolucion: 0, numeroDevolucion: '' })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Rechazar Devolución {modalRechazarDev.numeroDevolucion}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Indica la justificación por la cual el producto físico recibido en bodega no cumple con las condiciones para su reembolso (las unidades NO entrarán al Kardex).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Motivo del Rechazo (mínimo 5 letras, auditado):
              </label>
              <textarea
                required
                minLength={5}
                rows={3}
                value={motivoRechazoDev}
                onChange={(e) => setMotivoRechazoDev(e.target.value)}
                placeholder="Ej. Producto viene con golpes por mal uso, sellos violados o accesorios incompletos..."
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalRechazarDev({ abierto: false, idDevolucion: 0, numeroDevolucion: '' })}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={procesandoDev || motivoRechazoDev.trim().length < 5}
                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-md"
              >
                {procesandoDev ? 'Rechazando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Encabezado del Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Dashboard de Ventas y Operaciones</h1>
          <p className="text-sm text-slate-500">
            Métricas en Quetzales, ciclo de vida de pedidos y recepción física de devoluciones en bodega.
          </p>
        </div>
        <button
          onClick={cargarDashboard}
          className="inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar datos
        </button>
      </div>

      {alerta && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-semibold border ${
            alerta.tipo === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {alerta.texto}
        </div>
      )}

      {/* KPIs de Ventas */}
      {metricas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase mb-1">
              <span>Ventas de Hoy</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              Q {Number(metricas.VentasHoyGTQ).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-slate-500">{metricas.PedidosHoy} pedido(s) hoy</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase mb-1">
              <span>Ventas Últimos 7 Días</span>
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              Q {Number(metricas.VentasSemanaGTQ).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-slate-500">{metricas.PedidosSemana} pedido(s) en la semana</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase mb-1">
              <span>Ventas del Mes</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              Q {Number(metricas.VentasMesGTQ).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-slate-500">
              {metricas.PedidosMes} pedidos · Ticket prom: Q {Number(metricas.TicketPromedioMesGTQ).toFixed(2)}
            </span>
          </div>

          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase mb-1">
              <span>Carritos Abandonados</span>
              <AlertOctagon className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-950">{metricas.CarritosAbandonadosActualmente}</div>
            <span className="text-xs text-amber-800">Con productos sin actividad reciente</span>
          </div>
        </div>
      )}

      {/* Gráficas Recharts y Top 10 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-base font-extrabold text-slate-900 mb-4">Ventas Netas por Categoría (Q)</h2>
          {ventasCat.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              Aún no hay ventas completadas para graficar.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ventasCat}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="CategoriaNombre" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => `Q ${Number(val ?? 0).toFixed(2)}`} />
                  <Bar dataKey="VentasNetasQuetzales" name="Ventas Netas (Q)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-base font-extrabold text-slate-900 mb-4">Top 10 Productos Más Vendidos</h2>
          {topProductos.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              Sin registros de productos vendidos en este periodo.
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {topProductos.map((prod, idx) => (
                <div
                  key={prod.IDProducto}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <span className="font-bold text-slate-900 block truncate">{prod.NombreProducto}</span>
                      <span className="text-xs text-slate-500">{prod.CategoriaNombre}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="font-extrabold text-slate-900 block">
                      Q {Number(prod.TotalVentasQuetzales).toFixed(2)}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold">{prod.UnidadesVendidasNetas} u.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selector de Pestañas: Gestión de Pedidos vs Devoluciones en Bodega */}
      <div className="flex border-b border-slate-200 gap-2 mb-4">
        <button
          type="button"
          onClick={() => setPestañaActiva('pedidos')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 cursor-pointer transition-colors ${
            pestañaActiva === 'pedidos'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <span>Gestión de Pedidos ({pedidos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setPestañaActiva('devoluciones')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
            pestañaActiva === 'devoluciones'
              ? 'border-purple-700 text-purple-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <span>Bandeja de Devoluciones en Bodega</span>
          {devolucionesPendientes.length > 0 && (
            <span className="bg-purple-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
              {devolucionesPendientes.length}
            </span>
          )}
        </button>
      </div>

      {/* PESTAÑA A: TABLA DE GESTIÓN DE PEDIDOS */}
      {pestañaActiva === 'pedidos' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-base font-extrabold text-slate-900">Ciclo de Vida de Pedidos</h2>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500">Filtrar por estado:</label>
              <select
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setPaginaPedidos(1);
                }}
                className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold bg-white"
              >
                <option value="">Todos los estados</option>
                <option value="1">1 - Pagado / Confirmado</option>
                <option value="2">2 - En Preparación</option>
                <option value="3">3 - Despachado / En Ruta</option>
                <option value="4">4 - Entregado</option>
                <option value="5">5 - Devuelto Parcial</option>
                <option value="6">6 - Devuelto Total</option>
                <option value="7">7 - Cancelado</option>
              </select>
            </div>
          </div>

          {cargando ? (
            <div className="py-12 text-center text-slate-500 animate-pulse">Cargando pedidos...</div>
          ) : pedidos.length === 0 ? (
            <div className="py-12 text-center text-slate-500">No se encontraron pedidos con los filtros seleccionados.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[11px]">
                      <th className="py-2.5 px-2">Pedido</th>
                      <th className="py-2.5 px-2">Fecha</th>
                      <th className="py-2.5 px-2">Cliente / Destino</th>
                      <th className="py-2.5 px-2">Estado Actual</th>
                      <th className="py-2.5 px-2 text-right">Total Neto</th>
                      <th className="py-2.5 px-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pedidos.map((p) => (
                      <tr key={p.IDPedido} className="hover:bg-slate-50">
                        <td className="py-3 px-2 font-mono font-bold text-slate-900">{p.NumeroPedido}</td>
                        <td className="py-3 px-2 text-xs text-slate-500 whitespace-nowrap">
                          {formatearHora(p.FechaCreacion)}
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-bold text-slate-800 block">{p.ClienteNombre}</span>
                          <span className="text-xs text-slate-500">
                            {p.EntregaMunicipio}, {p.EntregaDepartamento}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                              p.IDEstadoPedido === 1
                                ? 'bg-blue-100 text-blue-800'
                                : p.IDEstadoPedido === 2
                                ? 'bg-amber-100 text-amber-800'
                                : p.IDEstadoPedido === 3
                                ? 'bg-indigo-100 text-indigo-800'
                                : p.IDEstadoPedido === 4
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.IDEstadoPedido === 5
                                ? 'bg-purple-100 text-purple-800'
                                : p.IDEstadoPedido === 6
                                ? 'bg-purple-200 text-purple-900'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {p.NombreEstado}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-extrabold text-slate-900">
                          Q {Number(p.TotalNetoFinal).toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-right space-x-1.5 whitespace-nowrap">
                          {p.IDEstadoPedido === 1 && (
                            <button
                              onClick={() => handleCambiarEstado(p.IDPedido, 2)}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-lg cursor-pointer"
                            >
                              → Preparar
                            </button>
                          )}
                          {p.IDEstadoPedido === 2 && (
                            <button
                              onClick={() => handleCambiarEstado(p.IDPedido, 3)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-2.5 py-1 rounded-lg cursor-pointer"
                            >
                              → Despachar
                            </button>
                          )}
                          {p.IDEstadoPedido === 3 && (
                            <button
                              onClick={() => handleCambiarEstado(p.IDPedido, 4)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-2.5 py-1 rounded-lg cursor-pointer"
                            >
                              → Marcar Entregado
                            </button>
                          )}
                          {(p.IDEstadoPedido === 1 || p.IDEstadoPedido === 2) && (
                            <button
                              onClick={() => abrirModalCancelar(p.IDPedido, p.NumeroPedido)}
                              className="bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs px-2.5 py-1 rounded-lg cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPaginasPedidos > 1 && (
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    disabled={paginaPedidos <= 1}
                    onClick={() => setPaginaPedidos((p) => p - 1)}
                    className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700">
                    Página {paginaPedidos} de {totalPaginasPedidos}
                  </span>
                  <button
                    disabled={paginaPedidos >= totalPaginasPedidos}
                    onClick={() => setPaginaPedidos((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* PESTAÑA B: BANDEJA DE DEVOLUCIONES PENDIENTES EN BODEGA */}
      {pestañaActiva === 'devoluciones' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-purple-700" />
              <span>Recepciones Físicas Pendientes de Revisión en Bodega</span>
            </h2>
            <p className="text-xs text-slate-500">
              Solicitudes enviadas por clientes. Al aprobar, las existencias físicas se ingresan al Kardex.
            </p>
          </div>

          {devolucionesPendientes.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No hay devoluciones pendientes de recepción en bodega en este momento.
            </div>
          ) : (
            <div className="space-y-4">
              {devolucionesPendientes.map((d) => {
                let articulos = [];
                try {
                  articulos = JSON.parse(d.LineasDevolucionJson || '[]');
                } catch {
                  articulos = [];
                }

                return (
                  <div
                    key={d.IDDevolucion}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="font-mono text-xs font-black text-purple-900 block">
                          {d.NumeroDevolucion} · Pedido {d.NumeroPedido}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Cliente: <strong>{d.ClienteNombre}</strong> ({d.ClienteCorreo}) · Fecha:{' '}
                          {formatearHora(d.FechaSolicitud)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Reembolso Solicitado</span>
                        <span className="text-base font-black text-slate-900">
                          Q {Number(d.MontoTotalReembolsado).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700">
                      <span className="font-bold text-slate-800 block mb-0.5">Motivo del Cliente:</span>
                      <p className="italic">"{d.MotivoDevolucion}"</p>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                        Artículos devueltos a ingresar a bodega:
                      </span>
                      <div className="space-y-1">
                        {articulos.map((art: any) => (
                          <div
                            key={art.IDDevolucionDetalle}
                            className="text-xs flex items-center justify-between text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg"
                          >
                            <span>
                              <strong>{art.CantidadDevuelta}x</strong> {art.NombreProducto} ({art.NombreVariante ? art.NombreVariante + ' · ' : ''}{art.SKU})
                            </span>
                            <span className="font-mono font-bold text-slate-600">
                              Q {Number(art.MontoReembolsadoLinea).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() =>
                          setModalRechazarDev({
                            abierto: true,
                            idDevolucion: d.IDDevolucion,
                            numeroDevolucion: d.NumeroDevolucion,
                          })
                        }
                        className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-colors"
                      >
                        Rechazar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAprobarDevolucion(d.IDDevolucion, d.NumeroDevolucion)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-1.5 rounded-xl text-xs cursor-pointer transition-colors shadow-xs"
                      >
                        ✓ Aprobar e Ingresar a Kardex
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
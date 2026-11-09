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
  TrendingUp,
  ShoppingBag,
  AlertOctagon,
  Award,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
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

export const DashboardPedidosPage: React.FC = () => {
  const [metricas, setMetricas] = useState<MetricasGenerales | null>(null);
  const [ventasCat, setVentasCat] = useState<VentaCategoria[]>([]);
  const [topProductos, setTopProductos] = useState<TopProducto[]>([]);
  const [pedidos, setPedidos] = useState<PedidoItem[]>([]);

  // Filtros de tabla de pedidos
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [paginaPedidos, setPaginaPedidos] = useState(1);
  const [totalPaginasPedidos, setTotalPaginasPedidos] = useState(1);

  const [cargando, setCargando] = useState(true);
  const [alerta, setAlerta] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarDashboard = useCallback(async () => {
    setCargando(true);
    try {
      const [resResumen, resTop, resPedidos] = await Promise.all([
        http.get('/dashboard/metricas'),
        http.get('/dashboard/top-productos'),
        http.get('/dashboard/pedidos', {
          params: {
            pagina: paginaPedidos,
            limite: 8,
            ...(filtroEstado ? { idEstadoPedido: Number(filtroEstado) } : {}),
          },
        }),
      ]);

      setMetricas(resResumen.data.metricas || null);
      setVentasCat(resResumen.data.ventasPorCategoria || []);
      setTopProductos(resTop.data.top10 || []);
      setPedidos(resPedidos.data.pedidos || []);
      setTotalPaginasPedidos(resPedidos.data.paginacion?.totalPaginas || 1);
    } catch {
      setAlerta({ tipo: 'error', texto: 'Error al cargar los indicadores del Dashboard.' });
    } finally {
      setCargando(false);
    }
  }, [paginaPedidos, filtroEstado]);

  useEffect(() => {
    cargarDashboard();
  }, [cargarDashboard]);

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

  const handleCancelarPedido = async (idPedido: number) => {
    const motivo = window.prompt('Ingrese el motivo de cancelación (reintegrará existencias al Kardex):');
    if (!motivo || motivo.trim().length < 5) return;

    setAlerta(null);
    try {
      await http.post(`/checkout/pedidos/${idPedido}/cancelar`, { motivo: motivo.trim() });
      setAlerta({ tipo: 'ok', texto: `Pedido #${idPedido} cancelado y existencias devueltas al Kardex.` });
      await cargarDashboard();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'No se pudo cancelar el pedido.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Dashboard de Ventas y Gestión de Pedidos</h1>
          <p className="text-sm text-slate-500">
            Métricas en tiempo real en Quetzales (excluyendo cancelados y descontando devoluciones).
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

      {/* Tarjetas KPI de Ventas (Día, Semana, Mes, Ticket Promedio y Carritos Abandonados) */}
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

      {/* Gráficas del Dashboard con Recharts  */}
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

      {/* Tabla de Gestión de Pedidos con Filtros y Paginación del Servidor */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-extrabold text-slate-900">Listado y Ciclo de Vida de Pedidos </h2>

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
                    <th className="py-2.5 px-2 text-right">Acciones </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedidos.map((p) => (
                    <tr key={p.IDPedido} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-mono font-bold text-slate-900">{p.NumeroPedido}</td>
                      <td className="py-3 px-2 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(p.FechaCreacion).toLocaleString('es-GT')}
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-bold text-slate-800 block">{p.ClienteNombre}</span>
                        <span className="text-xs text-slate-500">
                          {p.EntregaMunicipio}, {p.EntregaDepartamento}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
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
                            onClick={() => handleCancelarPedido(p.IDPedido)}
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
    </div>
  );
};
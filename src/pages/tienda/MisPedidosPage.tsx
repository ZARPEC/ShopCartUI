// src/pages/tienda/MisPedidosPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Package,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  Calendar,
  MapPin,
  Tag,
  ArrowLeft,
} from 'lucide-react';
import { http } from '../../api/http';

interface PedidoResumen {
  IDPedido: number;
  NumeroPedido: string;
  FechaCreacion: string;
  IDEstadoPedido: number;
  CodigoEstado: string;
  NombreEstado: string;
  SubtotalBruto: number;
  DescuentoCupon: number;
  CostoEnvio: number;
  TotalPedido: number;
  TotalNetoFinal: number;
  EntregaMunicipio: string;
  EntregaDepartamento: string;
  TotalLineas: number;
  TotalArticulos: number;
}

interface LineaPedidoDetalle {
  IDPedidoDetalle: number;
  IDVarianteProducto: number;
  SKUCongelado: string;
  NombreProductoCongelado: string;
  AtributosVarianteCongelados: string;
  CantidadComprada: number;
  PrecioUnitarioCongelado: number;
  TotalNetaLinea: number;
  ProductoSlug: string;
  UrlImagen: string | null;
}

interface PedidoDetalleCompleto extends PedidoResumen {
  EntregaDireccionCompleta: string;
  EntregaTelefonoContacto: string;
  InstruccionesEntrega: string | null;
  CodigoCuponAplicado: string | null;
  lineas: LineaPedidoDetalle[];
}

export const MisPedidosPage: React.FC = () => {
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState<PedidoResumen[]>([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<PedidoDetalleCompleto | null>(null);

  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatearFecha = (valor: string | null) => {
    if (!valor) return '00:00:00';
    // Si la fecha viene de SQL Server con 'Z' al final (interpretada erróneamente como UTC),
    // removemos la 'Z' para que el navegador la lea directamente en la hora local de Guatemala
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
  
  const cargarPedidos = useCallback(async () => {
    setCargandoLista(true);
    setError(null);
    try {
      const { data } = await http.get('/checkout/mis-pedidos');
      const lista: PedidoResumen[] = data.pedidos || [];
      setPedidos(lista);
      if (lista.length > 0 && !pedidoSeleccionado) {
        cargarDetalle(lista[0].IDPedido);
      }
    } catch {
      setError('No se pudo cargar el historial de compras. Verifica tu conexión.');
    } finally {
      setCargandoLista(false);
    }
  }, [pedidoSeleccionado]);

  useEffect(() => {
    cargarPedidos();
  }, [cargarPedidos]);

  const cargarDetalle = async (idPedido: number) => {
    setCargandoDetalle(true);
    try {
      const { data } = await http.get(`/checkout/mis-pedidos/${idPedido}`);
      setPedidoSeleccionado(data.pedido || null);
    } catch {
      // Ignorar error secundario
    } finally {
      setCargandoDetalle(false);
    }
  };

  const getBadgeEstado = (idEstado: number, nombre: string) => {
    switch (idEstado) {
      case 1: // Pagado / Confirmado
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-extrabold px-2.5 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5" /> {nombre}
          </span>
        );
      case 2: // En Preparación
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold px-2.5 py-1 rounded-full">
            <Package className="w-3.5 h-3.5" /> {nombre}
          </span>
        );
      case 3: // Despachado / En Ruta
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-extrabold px-2.5 py-1 rounded-full">
            <Truck className="w-3.5 h-3.5" /> {nombre}
          </span>
        );
      case 4: // Entregado
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> {nombre}
          </span>
        );
      case 5: // Devuelto Parcial
      case 6: // Devuelto Total
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-extrabold px-2.5 py-1 rounded-full">
            <RotateCcw className="w-3.5 h-3.5" /> {nombre}
          </span>
        );
      case 7: // Cancelado
        return (
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-xs font-extrabold px-2.5 py-1 rounded-full">
            <XCircle className="w-3.5 h-3.5" /> {nombre}
          </span>
        );
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">{nombre}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Cabecera */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mis Pedidos y Compras</h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Historial de compras, estado del envío y comprobante de precios congelados.
                </p>
              </div>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-950 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-amber-600" />
            <span>Seguir comprando</span>
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {cargandoLista ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 animate-pulse">
            Consultando tu historial de pedidos...
          </div>
        ) : pedidos.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <h2 className="text-xl font-black text-slate-900 mb-2">Aún no has realizado ningún pedido</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              Explora nuestro catálogo con más de 16 productos con entrega garantizada en toda Guatemala.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold px-6 py-3 rounded-2xl text-sm transition-colors cursor-pointer"
            >
              Ir a la tienda
            </button>
          </div>
        ) : (
          /* Estructura Split-View: Lista de Pedidos a la Izquierda + Detalle a la Derecha */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Lista de Pedidos (5 columnas) */}
            <div className="lg:col-span-5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
                Tus Órdenes Realizadas ({pedidos.length})
              </span>

              <div className="space-y-3">
                {pedidos.map((p) => {
                  const seleccionado = pedidoSeleccionado?.IDPedido === p.IDPedido;
                  return (
                    <button
                      key={p.IDPedido}
                      type="button"
                      onClick={() => cargarDetalle(p.IDPedido)}
                      className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        seleccionado
                          ? 'bg-white border-slate-900 shadow-md ring-2 ring-amber-400/50'
                          : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-black text-slate-900">{p.NumeroPedido}</span>
                        {getBadgeEstado(p.IDEstadoPedido, p.NombreEstado)}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatearFecha(p.FechaCreacion)}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">{p.TotalArticulos} artículo(s)</span>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Total pagado</span>
                          <span className="text-base font-black text-slate-900">
                            Q {Number(p.TotalNetoFinal).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detalle del Pedido Seleccionado (7 columnas) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              {cargandoDetalle ? (
                <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
                  Cargando información del pedido...
                </div>
              ) : !pedidoSeleccionado ? (
                <div className="py-20 text-center text-xs text-slate-400">Selecciona un pedido para ver su detalle.</div>
              ) : (
                <>
                  {/* Encabezado del comprobante */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        Comprobante de Pedido
                      </span>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 font-mono">
                        {pedidoSeleccionado.NumeroPedido}
                      </h2>
                      <span className="text-xs text-slate-500">
                        Fecha: {formatearFecha(pedidoSeleccionado.FechaCreacion)}
                      </span>
                    </div>

                    <div>{getBadgeEstado(pedidoSeleccionado.IDEstadoPedido, pedidoSeleccionado.NombreEstado)}</div>
                  </div>

                  {/* Dirección y Datos de Entrega */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      <span>Destino de Entrega (Guatemala)</span>
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800">
                      {pedidoSeleccionado.EntregaDireccionCompleta}
                    </p>
                    <p className="text-xs text-slate-500">
                      Municipio: <strong>{pedidoSeleccionado.EntregaMunicipio}</strong> · Departamento:{' '}
                      <strong>{pedidoSeleccionado.EntregaDepartamento}</strong> · Tel:{' '}
                      <strong>{pedidoSeleccionado.EntregaTelefonoContacto}</strong>
                    </p>
                    {pedidoSeleccionado.InstruccionesEntrega && (
                      <p className="text-xs text-amber-900 bg-amber-50 p-2 rounded-lg mt-1 italic">
                        Nota: "{pedidoSeleccionado.InstruccionesEntrega}"
                      </p>
                    )}
                  </div>

                  {/* Artículos Comprados con Precios Congelados */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                      Productos Incluidos ({pedidoSeleccionado.lineas?.length || 0})
                    </span>

                    <div className="divide-y divide-slate-100">
                      {pedidoSeleccionado.lineas?.map((linea) => (
                        <div key={linea.IDPedidoDetalle} className="py-3.5 flex items-center gap-3">
                          <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center p-1 border border-slate-200">
                            {linea.UrlImagen ? (
                              <img src={linea.UrlImagen} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-[10px] text-slate-400">Sin foto</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <Link
                              to={`/producto/${linea.ProductoSlug}`}
                              className="text-xs sm:text-sm font-bold text-slate-900 hover:text-amber-600 line-clamp-1 transition-colors"
                            >
                              {linea.NombreProductoCongelado}
                            </Link>
                            <span className="text-[11px] font-semibold text-slate-500 block">
                              Presentación: {linea.AtributosVarianteCongelados} · SKU: {linea.SKUCongelado}
                            </span>
                            <span className="text-xs font-semibold text-slate-600 mt-0.5 block">
                              {linea.CantidadComprada} unidad(es) × Q{' '}
                              {Number(linea.PrecioUnitarioCongelado).toLocaleString('es-GT', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-slate-900">
                              Q {Number(linea.TotalNetaLinea).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resumen Financiero con IVA y Cupones */}
                  <div className="pt-4 border-t border-slate-100 space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal de artículos</span>
                      <span className="font-semibold">
                        Q {Number(pedidoSeleccionado.SubtotalBruto).toFixed(2)}
                      </span>
                    </div>

                    {pedidoSeleccionado.DescuentoCupon > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" />
                          <span>Cupón aplicado ({pedidoSeleccionado.CodigoCuponAplicado || 'PROMO'})</span>
                        </span>
                        <span>− Q {Number(pedidoSeleccionado.DescuentoCupon).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-600">
                      <span>Costo de Envío</span>
                      <span className="font-semibold">
                        {pedidoSeleccionado.CostoEnvio === 0
                          ? 'Gratis'
                          : `Q ${Number(pedidoSeleccionado.CostoEnvio).toFixed(2)}`}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline pt-3 border-t border-slate-200 text-slate-900">
                      <div>
                        <span className="text-base font-black block">Total Cancelado</span>
                        <span className="text-[11px] text-slate-400">Precios congelados · IVA 12% incluido</span>
                      </div>
                      <span className="text-2xl font-black text-slate-900">
                        Q {Number(pedidoSeleccionado.TotalNetoFinal).toLocaleString('es-GT', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Tag, ShieldCheck, Clock, MapPin, Plus } from 'lucide-react';
import { AxiosError } from 'axios';
import { http } from '../../api/http';
import { useAuth } from '../../context/AuthContext';

interface ItemCarrito {
  IDCarritoDetalle: number;
  IDVarianteProducto: number;
  SKU: string;
  NombreProducto: string;
  SlugProducto: string;
  NombreVariante: string;
  Cantidad: number;
  PrecioUnitarioActual: number;
  SubtotalLinea: number;
  ExistenciaDisponible: number;
  UrlImagen: string | null;
}

interface ResumenCarrito {
  IDCarrito: number;
  IDCupon: number | null;
  CodigoCupon: string | null;
  DescripcionCupon: string | null;
  TotalUnidades: number;
  Subtotal: number;
  Descuento: number;
  Total: number;
}

interface Direccion {
  IDDireccionCliente: number;
  Alias: string;
  NombreRecibe: string;
  TelefonoContacto: string;
  Departamento: string;
  Municipio: string;
  Zona: string | null;
  DireccionExacta: string;
}

export const CarritoCheckoutPage: React.FC = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [resumen, setResumen] = useState<ResumenCarrito | null>(null);
  const [codigoCuponInput, setCodigoCuponInput] = useState('');

  // Estados de Checkout 
  const [enModoCheckout, setEnModoCheckout] = useState(false);
  const [expiraReserva, setExpiraReserva] = useState<string | null>(null);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [idDireccionSeleccionada, setIdDireccionSeleccionada] = useState<number | null>(null);
  const [idMetodoPago, setIdMetodoPago] = useState<number>(1);
  // Clave de idempotencia generada 1 sola vez por intento de checkout 
  const [claveIdempotencia, setClaveIdempotencia] = useState<string>(() => 'chk-' + crypto.randomUUID());

  // Formulario de nueva dirección
  const [mostrarFormDireccion, setMostrarFormDireccion] = useState(false);
  const [alias, setAlias] = useState('Casa');
  const [nombreRecibe, setNombreRecibe] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [departamento, setDepartamento] = useState('Guatemala');
  const [municipio, setMunicipio] = useState('Guatemala');
  const [zona, setZona] = useState('10');
  const [direccionExacta, setDireccionExacta] = useState('');

  const [cargando, setCargando] = useState(true);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [alerta, setAlerta] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<{
    NumeroPedido: string;
    TotalPedido: number;
  } | null>(null);

  const cargarCarrito = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await http.get('/carrito');
      setItems(data.items || []);
      setResumen(data.resumen || null);
    } catch {
      setAlerta({ tipo: 'error', texto: 'No se pudo cargar el carrito.' });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarCarrito();
  }, [cargarCarrito]);

  const actualizarCantidad = async (idVariante: number, nuevaCantidad: number) => {
    setAlerta(null);
    try {
      const { data } = await http.put(`/carrito/items/${idVariante}`, { cantidad: nuevaCantidad });
      setItems(data.items || []);
      setResumen(data.resumen || null);
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'No se pudo actualizar la cantidad.' });
    }
  };

  const eliminarItem = async (idVariante: number) => {
    setAlerta(null);
    try {
      const { data } = await http.delete(`/carrito/items/${idVariante}`);
      setItems(data.items || []);
      setResumen(data.resumen || null);
    } catch {
      setAlerta({ tipo: 'error', texto: 'Error al eliminar el producto.' });
    }
  };

  const handleAplicarCupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoCuponInput.trim()) return;
    setAlerta(null);
    try {
      const { data } = await http.post('/carrito/cupon', { codigoCupon: codigoCuponInput.trim() });
      setItems(data.items || []);
      setResumen(data.resumen || null);
      setCodigoCuponInput('');
      setAlerta({ tipo: 'ok', texto: 'Cupón aplicado correctamente.' });
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'Cupón no válido.' });
    }
  };

  const handleRemoverCupon = async () => {
    setAlerta(null);
    const { data } = await http.delete('/carrito/cupon');
    setItems(data.items || []);
    setResumen(data.resumen || null);
  };

  const formatearHoraVencimiento = (valor: string | null) => {
    if (!valor) return '15 min';
    // Si la fecha viene de SQL Server con 'Z' al final (interpretada erróneamente como UTC),
    // removemos la 'Z' para que el navegador la lea directamente en la hora local de Guatemala
    const fechaLimpia = typeof valor === 'string' ? valor.replace('Z', '') : valor;
    const d = new Date(fechaLimpia);
    return isNaN(d.getTime())
      ? '15 min'
      : d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Paso 1 del Checkout: Verificar sesión, reservar stock por 15 min y cargar direcciones
  const handleIniciarCheckout = async () => {
    if (!usuario) {
      navigate('/login');
      return;
    }
    setAlerta(null);
    try {
      const resReserva = await http.post('/checkout/reservar', { idCarrito: resumen?.IDCarrito });
      setExpiraReserva(resReserva.data.ExpiraEn);
      setClaveIdempotencia('chk-' + crypto.randomUUID());

      const resDir = await http.get('/checkout/direcciones');
      const listaDir: Direccion[] = resDir.data.direcciones || [];
      setDirecciones(listaDir);
      if (listaDir.length > 0) {
        setIdDireccionSeleccionada(listaDir[0].IDDireccionCliente);
      } else {
        setMostrarFormDireccion(true);
      }
      setEnModoCheckout(true);
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({
        tipo: 'error',
        texto: axiosErr.response?.data?.mensaje || 'No se pudo reservar la existencia para el checkout.',
      });
    }
  };

  const handleGuardarDireccion = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlerta(null);
    try {
      const { data } = await http.post('/checkout/direcciones', {
        alias,
        nombreRecibe,
        telefonoContacto,
        departamento,
        municipio,
        zona,
        direccionExacta,
        esPredeterminada: true,
      });
      const nueva: Direccion = data.direccion;
      setDirecciones((prev) => [nueva, ...prev]);
      setIdDireccionSeleccionada(nueva.IDDireccionCliente);
      setMostrarFormDireccion(false);
    } catch (err) {
      const axiosErr = err as AxiosError<{
        mensaje?: string;
        errores?: Array<{ campo?: string; mensaje: string }>;
      }>;
      const erroresDetallados = axiosErr.response?.data?.errores
        ?.map((x) => x.mensaje)
        .join(' · ');

      setAlerta({
        tipo: 'error',
        texto:
          erroresDetallados ||
          axiosErr.response?.data?.mensaje ||
          'Error al registrar dirección. Verifica los datos ingresados.',
      });
    }
  };

  // Paso 2 del Checkout: Confirmar pago idempotente y crear pedido atómico 
  const handleConfirmarPago = async () => {
    if (!idDireccionSeleccionada || procesandoPago) return;
    setProcesandoPago(true);
    setAlerta(null);
    try {
      const { data } = await http.post('/checkout/pagar', {
        idDireccionCliente: idDireccionSeleccionada,
        idMetodoPago,
        claveIdempotencia,
      });
      setPedidoConfirmado(data.pedido);
      setEnModoCheckout(false);
      await cargarCarrito();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'Error al procesar el pago.' });
    } finally {
      setProcesandoPago(false);
    }
  };

  if (cargando) {
    return <div className="max-w-5xl mx-auto p-12 text-center text-slate-600 animate-pulse">Cargando tu carrito...</div>;
  }

  if (pedidoConfirmado) {
    return (
      <div className="max-w-xl mx-auto px-4 py-14">
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center shadow-md">
          <ShieldCheck className="w-14 h-14 text-emerald-600 mx-auto mb-3" />
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">¡Compra confirmada con éxito!</h1>
          <p className="text-sm text-slate-600 mb-4">
            Tu pedido <strong className="text-slate-900">{pedidoConfirmado.NumeroPedido}</strong> se ha completado exitosamente.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-lg font-bold text-slate-900">
            Total pagado: Q {Number(pedidoConfirmado.TotalPedido).toFixed(2)}
          </div>
          <Link
            to="/"
            className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
          >
            Seguir comprando
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-14 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-12">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Tu carrito está vacío</h2>
          <p className="text-sm text-slate-500 mb-6">Agrega productos del catálogo para comenzar tu compra.</p>
          <Link to="/" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm">
            Explorar productos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">
        {enModoCheckout ? 'Confirmar Checkout y Pago' : 'Mi Carrito de Compras'}
      </h1>

      {alerta && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-medium border ${alerta.tipo === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
            }`}
        >
          {alerta.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Líneas del Carrito o Selección de Dirección en Checkout */}
        <div className="lg:col-span-2 space-y-4">
          {!enModoCheckout ? (
            items.map((item) => (
              <div
                key={item.IDCarritoDetalle}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-xs"
              >
                <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                  {item.UrlImagen && <img src={item.UrlImagen} alt={item.NombreProducto} className="w-full h-full object-cover" />}
                </div>

                <div className="flex-1 min-w-0">
                  <Link to={`/producto/${item.SlugProducto}`} className="font-bold text-slate-900 hover:text-amber-600 text-sm">
                    {item.NombreProducto}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.NombreVariante} · SKU: {item.SKU}
                  </p>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    Q {Number(item.PrecioUnitarioActual).toFixed(2)} c/u
                  </p>
                </div>

                <div className="flex items-center border border-slate-300 rounded-lg">
                  <button
                    onClick={() => actualizarCantidad(item.IDVarianteProducto, Math.max(1, item.Cantidad - 1))}
                    disabled={item.Cantidad <= 1}
                    className="px-2.5 py-1 text-slate-700 disabled:opacity-40 font-bold cursor-pointer"
                  >
                    −
                  </button>
                  <span className="px-3 py-1 text-sm font-bold">{item.Cantidad}</span>
                  <button
                    onClick={() => actualizarCantidad(item.IDVarianteProducto, item.Cantidad + 1)}
                    className="px-2.5 py-1 text-slate-700 font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="text-right min-w-22.5">
                  <span className="text-sm font-extrabold text-slate-900">
                    Q {Number(item.SubtotalLinea).toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={() => eliminarItem(item.IDVarianteProducto)}
                  className="p-2 text-slate-400 hover:text-red-600 cursor-pointer"
                  title="Eliminar del carrito"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
              <div className="flex items-center gap-2 text-amber-800 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl text-xs font-semibold">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  Existencias apartadas por 15 minutos (vencimiento: {formatearHoraVencimiento(expiraReserva)}).
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-600" /> Dirección de Entrega
                  </h2>
                  <button
                    type="button"
                    onClick={() => setMostrarFormDireccion(!mostrarFormDireccion)}
                    className="text-xs font-bold text-amber-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nueva dirección
                  </button>
                </div>

                {mostrarFormDireccion && (
                  <form onSubmit={handleGuardarDireccion} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Alias (Casa, Oficina)"
                        value={alias}
                        onChange={(e) => setAlias(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Nombre de quien recibe"
                        value={nombreRecibe}
                        onChange={(e) => setNombreRecibe(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Teléfono (8 dígitos)"
                        value={telefonoContacto}
                        onChange={(e) => setTelefonoContacto(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Departamento"
                        value={departamento}
                        onChange={(e) => setDepartamento(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Municipio"
                        value={municipio}
                        onChange={(e) => setMunicipio(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Zona"
                        value={zona}
                        onChange={(e) => setZona(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        required
                        minLength={5}
                        placeholder="Dirección exacta (calle, avenida, número de casa - mín. 5 letras)"
                        value={direccionExacta}
                        onChange={(e) => setDireccionExacta(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                      />
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Mínimo 5 caracteres (ej. 2da Calle 4-50 Zona 1)
                      </span>
                    </div>
                    <button type="submit" className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer">
                      Guardar dirección
                    </button>
                  </form>
                )}

                <div className="space-y-2">
                  {direcciones.map((d) => (
                    <label
                      key={d.IDDireccionCliente}
                      className={`block p-3 rounded-xl border text-sm cursor-pointer ${idDireccionSeleccionada === d.IDDireccionCliente
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200'
                        }`}
                    >
                      <input
                        type="radio"
                        name="direccion"
                        checked={idDireccionSeleccionada === d.IDDireccionCliente}
                        onChange={() => setIdDireccionSeleccionada(d.IDDireccionCliente)}
                        className="mr-2"
                      />
                      <strong>{d.Alias}:</strong> {d.DireccionExacta}, Zona {d.Zona}, {d.Municipio}, {d.Departamento} (Recibe:{' '}
                      {d.NombreRecibe} · Tel: {d.TelefonoContacto})
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="font-bold text-slate-900 mb-2">Método de Pago</h2>
                <select
                  value={idMetodoPago}
                  onChange={(e) => setIdMetodoPago(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value={1}>Tarjeta de Crédito o Débito</option>
                  <option value={2}>Transferencia Bancaria</option>
                  <option value={3}>Efectivo Contra Entrega</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha: Cupón y Resumen Financiero */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 h-fit shadow-xs space-y-5">
          <h2 className="text-lg font-extrabold text-slate-900">Resumen de Compra</h2>

          {/* Formulario de Cupón */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">Cupón de descuento</label>
            {resumen?.CodigoCupon ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg text-xs">
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> {resumen.CodigoCupon} aplicado
                </span>
                <button onClick={handleRemoverCupon} className="text-red-600 font-bold hover:underline cursor-pointer">
                  Quitar
                </button>
              </div>
            ) : (
              <form onSubmit={handleAplicarCupon} className="flex gap-2">
                <input
                  type="text"
                  value={codigoCuponInput}
                  onChange={(e) => setCodigoCuponInput(e.target.value.toUpperCase())}
                  placeholder="Ej. SHOP10"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm uppercase"
                />
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg cursor-pointer"
                >
                  Aplicar
                </button>
              </form>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({resumen?.TotalUnidades || 0} prod.)</span>
              <span className="font-semibold">Q {Number(resumen?.Subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Descuento cupón</span>
              <span className="font-semibold">− Q {Number(resumen?.Descuento || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total estimado</span>
              <span>Q {Number(resumen?.Total || 0).toFixed(2)}</span>
            </div>
          </div>

          {!enModoCheckout ? (
            <button
              onClick={handleIniciarCheckout}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3 rounded-xl transition-colors cursor-pointer"
            >
              {usuario ? 'PROCEDER AL CHECKOUT' : 'INICIAR SESIÓN PARA PAGAR'}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                disabled={!idDireccionSeleccionada || procesandoPago}
                onClick={handleConfirmarPago}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-extrabold py-3 rounded-xl transition-colors cursor-pointer"
              >
                {procesandoPago ? 'PROCESANDO PAGO...' : 'CONFIRMAR Y PAGAR PEDIDO'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    // Libera el apartado en SQL Server de inmediato
                    await http.post('/checkout/liberar-reserva', { idCarrito: resumen?.IDCarrito });
                  } catch { }
                  setEnModoCheckout(false);
                  await cargarCarrito();
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline block text-center mt-3 cursor-pointer"
              >
                ← Volver a editar el carrito
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
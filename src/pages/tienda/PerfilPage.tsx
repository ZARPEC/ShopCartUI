// src/pages/tienda/ 
import React, { useEffect, useState, useCallback } from 'react';
import {
  User,
  MapPin,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Plus,
  Trash2,
  Star,
  Shield,
  Phone,
  Mail,
  Home,
  Briefcase,
} from 'lucide-react';
import { AxiosError } from 'axios';
import { http } from '../../api/http';
import { useAuth } from '../../context/AuthContext';

interface DireccionItem {
  IDDireccionCliente: number;
  Alias: string;
  NombreDestinatario: string;
  TelefonoContacto: string;
  Departamento: string;
  Municipio: string;
  Zona: string | null;
  DireccionExacta: string;
  EsPredeterminada: boolean;
}

export const PerfilPage: React.FC = () => {
  const { usuario } = useAuth();

  // Pestañas del perfil
  const [tabActiva, setTabActiva] = useState<'datos' | 'direcciones' | 'seguridad'>('datos');

  // Datos Personales
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');

  // Libreta de Direcciones
  const [direcciones, setDirecciones] = useState<DireccionItem[]>([]);
  const [mostrarFormDir, setMostrarFormDir] = useState(false);
  const [alias, setAlias] = useState('');
  const [nombreRecibe, setNombreRecibe] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [departamento, setDepartamento] = useState('Guatemala');
  const [municipio, setMunicipio] = useState('Guatemala');
  const [zona, setZona] = useState('10');
  const [direccionExacta, setDireccionExacta] = useState('');

  // Cambio de Contraseña
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');

  const [, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  // Modal React para confirmación de eliminación de dirección
  const [modalEliminarDir, setModalEliminarDir] = useState<{
    abierto: boolean;
    idDireccion: number;
    alias: string;
  }>({
    abierto: false,
    idDireccion: 0,
    alias: '',
  });

  // Prellenar inmediatamente desde la sesión activa de useAuth
  useEffect(() => {
    if (usuario) {
      const partes = (usuario.nombreCompleto || '').trim().split(' ');
      setNombres((prev) => prev || partes[0] || '');
      setApellidos((prev) => prev || partes.slice(1).join(' ') || '');
      setCorreo((prev) => prev || usuario.correoElectronico || '');
      setNombreRecibe((prev) => prev || usuario.nombreCompleto || '');
    }
  }, [usuario]);

  // Cargar datos completos del backend (soporta mayúsculas y minúsculas de SQL)
  const cargarPerfilYDirecciones = useCallback(async () => {
    setCargando(true);
    try {
      const [resPerfil, resDir] = await Promise.all([
        http.get('/auth/perfil'),
        http.get('/checkout/direcciones'),
      ]);

      const p = resPerfil.data.usuario;
      if (p) {
        setNombres(p.Nombres || p.nombres || '');
        setApellidos(p.Apellidos || p.apellidos || '');
        setTelefono(p.Telefono || p.telefono || '');
        setCorreo(p.CorreoElectronico || p.correoElectronico || '');
        setNombreRecibe(p.NombreCompleto || p.nombreCompleto || `${p.Nombres || ''} ${p.Apellidos || ''}`.trim());
        setTelefonoContacto(p.Telefono || p.telefono || '');
      }

      setDirecciones(resDir.data.direcciones || []);
    } catch {
      if (usuario) {
        const partes = (usuario.nombreCompleto || '').trim().split(' ');
        setNombres(partes[0] || '');
        setApellidos(partes.slice(1).join(' ') || '');
        setCorreo(usuario.correoElectronico || '');
      }
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  useEffect(() => {
    cargarPerfilYDirecciones();
  }, [cargarPerfilYDirecciones]);

  // 1. Guardar Datos Personales
  const handleGuardarDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setAlerta(null);
    try {
      await http.put('/auth/perfil', {
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        telefono: telefono.trim() || undefined,
      });
      setAlerta({ tipo: 'ok', texto: 'Tus datos personales se actualizaron correctamente.' });
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'Error al actualizar tus datos.' });
    } finally {
      setGuardando(false);
    }
  };

  // 2. Agregar Nueva Dirección
  const handleGuardarDireccion = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setAlerta(null);
    try {
      const { data } = await http.post('/checkout/direcciones', {
        alias: alias.trim(),
        nombreRecibe: nombreRecibe.trim(),
        telefonoContacto: telefonoContacto.trim(),
        departamento: departamento.trim(),
        municipio: municipio.trim(),
        zona: zona.trim() || undefined,
        direccionExacta: direccionExacta.trim(),
        esPredeterminada: direcciones.length === 0,
      });

      setDirecciones((prev) => [data.direccion, ...prev]);
      setAlias('');
      setDireccionExacta('');
      setMostrarFormDir(false);
      setAlerta({ tipo: 'ok', texto: 'Dirección guardada en tu libreta exitosamente.' });
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string; errores?: Array<{ mensaje: string }> }>;
      const msg =
        axiosErr.response?.data?.errores?.map((x) => x.mensaje).join(' · ') ||
        axiosErr.response?.data?.mensaje ||
        'Error al guardar dirección.';
      setAlerta({ tipo: 'error', texto: msg });
    } finally {
      setGuardando(false);
    }
  };

  // Abrir modal de confirmación en React para eliminar dirección
  const abrirModalEliminarDireccion = (idDireccion: number, alias: string) => {
    setModalEliminarDir({
      abierto: true,
      idDireccion,
      alias,
    });
  };

  // Ejecutar eliminación lógica sin carteles del navegador
  const ejecutarEliminarDireccion = async () => {
    const { idDireccion } = modalEliminarDir;
    if (!idDireccion) return;
    setGuardando(true);
    setAlerta(null);
    try {
      await http.delete(`/checkout/direcciones/${idDireccion}`);
      setDirecciones((prev) => prev.filter((d) => d.IDDireccionCliente !== idDireccion));
      setAlerta({ tipo: 'ok', texto: 'Dirección eliminada de tu libreta exitosamente.' });
    } catch {
      setAlerta({ tipo: 'error', texto: 'No se pudo eliminar la dirección.' });
    } finally {
      setGuardando(false);
      setModalEliminarDir({ abierto: false, idDireccion: 0, alias: '' });
    }
  };

  // Marcar Dirección como Predeterminada
  const handleEstablecerPredeterminada = async (idDireccion: number) => {
    try {
      await http.patch(`/checkout/direcciones/${idDireccion}/predeterminada`);
      setDirecciones((prev) =>
        prev.map((d) => ({
          ...d,
          EsPredeterminada: d.IDDireccionCliente === idDireccion,
        }))
      );
      setAlerta({ tipo: 'ok', texto: 'Dirección establecida como favorita para tus checkouts.' });
    } catch {
      setAlerta({ tipo: 'error', texto: 'Error al cambiar dirección predeterminada.' });
    }
  };

  // 3. Cambiar Contraseña
  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordNuevo !== passwordConfirmar) {
      setAlerta({ tipo: 'error', texto: 'La nueva contraseña y su confirmación no coinciden.' });
      return;
    }
    setGuardando(true);
    setAlerta(null);
    try {
      await http.put('/auth/cambiar-password', {
        passwordActual,
        passwordNuevo,
      });
      setAlerta({ tipo: 'ok', texto: 'Tu contraseña ha sido actualizada con éxito.' });
      setPasswordActual('');
      setPasswordNuevo('');
      setPasswordConfirmar('');
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({
        tipo: 'error',
        texto: axiosErr.response?.data?.mensaje || 'Error al cambiar contraseña. Verifica tu contraseña actual.',
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      {/* Modal React: Confirmar Eliminación de Dirección */}
      {modalEliminarDir.abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setModalEliminarDir((prev) => ({ ...prev, abierto: false }))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                ¿Eliminar dirección "{modalEliminarDir.alias}"?
              </h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                Esta dirección se removerá de tu libreta y ya no aparecerá como opción en las próximas compras.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalEliminarDir((prev) => ({ ...prev, abierto: false }))}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={ejecutarEliminarDireccion}
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer shadow-md shadow-red-600/20"
              >
                {guardando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
      
        {/* Cabecera del Perfil */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-xs">
              {(nombres || usuario?.nombreCompleto || 'U').charAt(0).toUpperCase()}
              {(apellidos || '').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mi Perfil y Cuenta</h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Gestiona tus datos personales, direcciones de envío y seguridad de acceso.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 bg-slate-900 text-amber-400 font-extrabold text-xs px-3.5 py-1.5 rounded-full">
            <Shield className="w-3.5 h-3.5" />
            <span>Rol: {usuario?.rol || 'CLIENTE'}</span>
          </span>
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
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{alerta.texto}</span>
          </div>
        )}

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-slate-200 gap-2 mb-6">
          <button
            type="button"
            onClick={() => setTabActiva('datos')}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold border-b-2 cursor-pointer transition-colors ${
              tabActiva === 'datos'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Datos Personales</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('direcciones')}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold border-b-2 cursor-pointer transition-colors ${
              tabActiva === 'direcciones'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Libreta de Direcciones ({direcciones.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('seguridad')}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold border-b-2 cursor-pointer transition-colors ${
              tabActiva === 'seguridad'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Seguridad y Contraseña</span>
          </button>
        </div>

        {/* PESTAÑA 1: DATOS PERSONALES */}
        {tabActiva === 'datos' && (
          <form
            onSubmit={handleGuardarDatos}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-2xl space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Nombres</label>
                <input
                  type="text"
                  required
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Apellidos</label>
                <input
                  type="text"
                  required
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  disabled
                  value={correo}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-500 font-medium cursor-not-allowed"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Tu correo electrónico es tu identificador único y no puede modificarse por seguridad.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Teléfono Móvil</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="5555-1234"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>{guardando ? 'Guardando...' : 'Guardar Datos Personales'}</span>
            </button>
          </form>
        )}

        {/* PESTAÑA 2: LIBRETA DE DIRECCIONES DE ENTREGA */}
        {tabActiva === 'direcciones' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Direcciones Guardadas ({direcciones.length})
              </span>

              <button
                type="button"
                onClick={() => setMostrarFormDir(!mostrarFormDir)}
                className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{mostrarFormDir ? 'Cerrar formulario' : 'Nueva Dirección'}</span>
              </button>
            </div>

            {/* Formulario para agregar nueva dirección */}
            {mostrarFormDir && (
              <form
                onSubmit={handleGuardarDireccion}
                className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4 animate-fadeIn"
              >
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>Agregar Dirección de Entrega en Guatemala</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Alias</label>
                    <input
                      type="text"
                      required
                      placeholder="Casa, Oficina, Trabajo"
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Quién recibe</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre y apellido"
                      value={nombreRecibe}
                      onChange={(e) => setNombreRecibe(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      required
                      minLength={8}
                      placeholder="8 dígitos"
                      value={telefonoContacto}
                      onChange={(e) => setTelefonoContacto(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Departamento</label>
                    <input
                      type="text"
                      required
                      placeholder="Guatemala, Quetzaltenango..."
                      value={departamento}
                      onChange={(e) => setDepartamento(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Municipio</label>
                    <input
                      type="text"
                      required
                      placeholder="Guatemala, Mixco, Villa Nueva..."
                      value={municipio}
                      onChange={(e) => setMunicipio(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Zona</label>
                    <input
                      type="text"
                      placeholder="Zona 10"
                      value={zona}
                      onChange={(e) => setZona(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Dirección exacta (calle, avenida, número de casa)
                  </label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    placeholder="Ej. 2da Avenida 4-50 Colonia El Roble (mín. 5 letras)"
                    value={direccionExacta}
                    onChange={(e) => setDireccionExacta(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-xs"
                >
                  {guardando ? 'Guardando...' : 'Guardar en mi libreta'}
                </button>
              </form>
            )}

            {/* Listado de tarjetas de direcciones */}
            {direcciones.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                Aún no tienes direcciones registradas en tu libreta.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {direcciones.map((d) => (
                  <div
                    key={d.IDDireccionCliente}
                    className={`bg-white rounded-3xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                      d.EsPredeterminada ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                          {d.Alias.toLowerCase().includes('oficina') || d.Alias.toLowerCase().includes('trabajo') ? (
                            <Briefcase className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Home className="w-4 h-4 text-amber-600" />
                          )}
                          <span>{d.Alias}</span>
                        </span>

                        {d.EsPredeterminada && (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Predeterminada
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-800">{d.NombreDestinatario}</p>
                      <p className="text-xs text-slate-600 mt-1">{d.DireccionExacta}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {d.Municipio}, {d.Departamento} {d.Zona ? `· Zona ${d.Zona}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">Tel: {d.TelefonoContacto}</p>
                    </div>

                    <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      {!d.EsPredeterminada ? (
                        <button
                          type="button"
                          onClick={() => handleEstablecerPredeterminada(d.IDDireccionCliente)}
                          className="font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                        >
                          Usar como predeterminada
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Dirección favorita</span>
                      )}

                      <button
                        type="button"
                        onClick={() => abrirModalEliminarDireccion(d.IDDireccionCliente, d.Alias)}
                        title="Eliminar dirección"
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: SEGURIDAD Y CAMBIO DE CONTRASEÑA */}
        {tabActiva === 'seguridad' && (
          <form
            onSubmit={handleCambiarPassword}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-lg space-y-4"
          >
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Contraseña Actual</label>
              <input
                type="password"
                required
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Nueva Contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                value={passwordNuevo}
                onChange={(e) => setPasswordNuevo(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordConfirmar}
                onChange={(e) => setPasswordConfirmar(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold"
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-tight">
              Al cambiar tu contraseña, se cerrarán de inmediato las sesiones abiertas en otros dispositivos por seguridad.
            </p>

            <button
              type="submit"
              disabled={guardando}
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>{guardando ? 'Actualizando...' : 'Cambiar Contraseña'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  X,
  PowerOff,
  Power,
  User
} from 'lucide-react';
import { AxiosError } from 'axios';
import { http } from '../../api/http';
import { useAuth } from '../../context/AuthContext';

interface UsuarioAdminItem {
  IDUsuario: number;
  IDRol: number;
  CodigoRol: 'CLIENTE' | 'OPERADOR' | 'ADMINISTRADOR';
  NombreRol: string;
  Nombres: string;
  Apellidos: string;
  CorreoElectronico: string;
  Telefono: string | null;
  Activo: boolean | number;
  IntentosFallidosLogin: number;
  FechaBloqueoHasta: string | null;
  FechaCreacion: string;
  FechaUltimoAcceso: string | null;
}

export const AdminUsuariosPage: React.FC = () => {
  const { usuario: usuarioActual } = useAuth();

  const [usuarios, setUsuarios] = useState<UsuarioAdminItem[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('');

  // Modal para Crear Empleado (Operador o Administrador)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correoElectronico, setCorreoElectronico] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [idRol, setIdRol] = useState<2 | 3>(2); // 2 = Operador de Bodega, 3 = Administrador

  // Modal de confirmación para cambiar estado (Activar / Desactivar)
  const [modalConfirmacion, setModalConfirmacion] = useState<{
    abierto: boolean;
    idUsuario: number;
    nombreUsuario: string;
    nuevoEstado: boolean;
  }>({
    abierto: false,
    idUsuario: 0,
    nombreUsuario: '',
    nuevoEstado: false,
  });

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await http.get('/auth/usuarios');
      setUsuarios(data.usuarios || []);
    } catch {
      setAlerta({ tipo: 'error', texto: 'No se pudo cargar la lista de usuarios.' });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // Filtrado reactivo en memoria
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const q = busqueda.toLowerCase().trim();
      const coincideTexto =
        !q ||
        u.Nombres.toLowerCase().includes(q) ||
        u.Apellidos.toLowerCase().includes(q) ||
        u.CorreoElectronico.toLowerCase().includes(q);

      const coincideRol = !filtroRol || String(u.IDRol) === filtroRol;

      return coincideTexto && coincideRol;
    });
  }, [usuarios, busqueda, filtroRol]);

  const handleCrearEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setAlerta(null);

    try {
      await http.post('/auth/empleados', {
        idRol,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        correoElectronico: correoElectronico.trim().toLowerCase(),
        telefono: telefono.trim() || undefined,
        password,
      });

      setAlerta({
        tipo: 'ok',
        texto: `Empleado "${nombres} ${apellidos}" registrado con éxito con rol ${
          idRol === 2 ? 'Operador de Bodega' : 'Administrador'
        }.`,
      });

      setNombres('');
      setApellidos('');
      setCorreoElectronico('');
      setTelefono('');
      setPassword('');
      setIdRol(2);
      setModalAbierto(false);
      await cargarUsuarios();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({
        tipo: 'error',
        texto: axiosErr.response?.data?.mensaje || 'No se pudo crear el empleado.',
      });
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarCambiarEstado = async () => {
    const { idUsuario, nuevoEstado } = modalConfirmacion;
    setGuardando(true);
    setAlerta(null);

    try {
      await http.patch(`/auth/usuarios/${idUsuario}/estado`, { activo: nuevoEstado });
      setAlerta({
        tipo: 'ok',
        texto: `El usuario ha sido ${nuevoEstado ? 'activado' : 'desactivado'} y se auditó en Bitácora.`,
      });
      setModalConfirmacion((prev) => ({ ...prev, abierto: false }));
      await cargarUsuarios();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({
        tipo: 'error',
        texto: axiosErr.response?.data?.mensaje || 'No se pudo cambiar el estado del usuario.',
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      {/* 1. Modal React: Crear Nuevo Empleado (Solo Administrador) */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <form
            onSubmit={handleCrearEmpleado}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 my-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <UserPlus className="w-5 h-5 text-amber-500" />
                <span>Registrar Nuevo Empleado</span>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Rol: Operador vs Administrador */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                Asignar Rol y Nivel de Acceso:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIdRol(2)}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    idRol === 2
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="block text-xs font-bold">Operador de Bodega</span>
                  <span className="text-[11px] text-slate-400">Kardex, empaque y pedidos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIdRol(3)}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    idRol === 3
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="block text-xs font-bold text-amber-400">Administrador</span>
                  <span className="text-[11px] text-slate-400">Acceso total, bitácora y catálogo</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Nombres</label>
                <input
                  type="text"
                  required
                  placeholder="Luis Fernando"
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Apellidos</label>
                <input
                  type="text"
                  required
                  placeholder="Gómez Alvarado"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Correo Electrónico Institucional
              </label>
              <input
                type="email"
                required
                placeholder="empleado@shopcart.gt"
                value={correoElectronico}
                onChange={(e) => setCorreoElectronico(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Teléfono (opcional)</label>
                <input
                  type="text"
                  placeholder="5555-1234"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Contraseña Inicial</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-semibold"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-tight">
              La contraseña se hashea con <strong>bcrypt</strong> antes de persistirse en SQL Server. El empleado podrá
              iniciar sesión de inmediato.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-xs"
              >
                {guardando ? 'Creando...' : 'Crear Empleado'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Modal React: Confirmar Cambio de Estado (Activar / Desactivar Usuario) */}
      {modalConfirmacion.abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  modalConfirmacion.nuevoEstado
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-red-50 border-red-200 text-red-600'
                }`}
              >
                {modalConfirmacion.nuevoEstado ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <button
                type="button"
                onClick={() => setModalConfirmacion((prev) => ({ ...prev, abierto: false }))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {modalConfirmacion.nuevoEstado ? '¿Reactivar acceso a este usuario?' : '¿Desactivar acceso a este usuario?'}
              </h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                {modalConfirmacion.nuevoEstado
                  ? `El usuario "${modalConfirmacion.nombreUsuario}" podrá volver a iniciar sesión en la plataforma.`
                  : `El usuario "${modalConfirmacion.nombreUsuario}" no podrá iniciar sesión y sus tokens activos de sesión serán revocados de inmediato.`}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalConfirmacion((prev) => ({ ...prev, abierto: false }))}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={ejecutarCambiarEstado}
                className={`font-extrabold px-5 py-2.5 rounded-xl text-sm cursor-pointer text-white shadow-md ${
                  modalConfirmacion.nuevoEstado
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                }`}
              >
                {guardando ? 'Guardando...' : modalConfirmacion.nuevoEstado ? 'Sí, reactivar' : 'Sí, desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Usuarios y Empleados</h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Alta de operadores de bodega y administradores, control de accesos y auditoría de roles.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Nuevo Empleado</span>
        </button>
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

      {/* Barra de Filtros y Buscador */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-65">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, apellido o correo electrónico..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <option value="">Todos los roles ({usuarios.length})</option>
            <option value="3">Solo Administradores</option>
            <option value="2">Solo Operadores de Bodega</option>
            <option value="1">Solo Clientes</option>
          </select>
        </div>
      </div>

      {/* Tabla de Usuarios y Empleados */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs overflow-hidden">
        {cargando ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Cargando directorio de usuarios...</div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No se encontraron usuarios con esos filtros.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[11px]">
                  <th className="py-3 px-3">Usuario / Nombre</th>
                  <th className="py-3 px-3">Rol del Sistema</th>
                  <th className="py-3 px-3">Contacto</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Fecha Alta</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuariosFiltrados.map((u) => {
                  const esActivo = Boolean(u.Activo);
                  const esElMismo = u.IDUsuario === usuarioActual?.idUsuario;

                  return (
                    <tr key={u.IDUsuario} className="hover:bg-slate-50">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs">
                            {u.Nombres.charAt(0)}
                            {u.Apellidos.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">
                              {u.Nombres} {u.Apellidos}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">{u.CorreoElectronico}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold ${
                            u.IDRol === 3
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : u.IDRol === 2
                              ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {u.IDRol === 3 ? <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> : <User className="w-3.5 h-3.5" />}
                          <span>{u.NombreRol}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-xs text-slate-600">
                        <span>{u.Telefono || 'Sin teléfono'}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            esActivo ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {esActivo ? '● Activo' : '○ Inactivo'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-xs text-slate-500 font-mono">
                        {new Date(u.FechaCreacion).toLocaleDateString('es-GT')}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        {!esElMismo ? (
                          <button
                            type="button"
                            onClick={() =>
                              setModalConfirmacion({
                                abierto: true,
                                idUsuario: u.IDUsuario,
                                nombreUsuario: `${u.Nombres} ${u.Apellidos}`,
                                nuevoEstado: !esActivo,
                              })
                            }
                            className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                              esActivo
                                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {esActivo ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                            <span>{esActivo ? 'Desactivar' : 'Reactivar'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 italic">Tu sesión</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
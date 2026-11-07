import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';

export const LoginPage: React.FC = () => {
  const { iniciarSesion, registrarCliente } = useAuth();
  const navigate = useNavigate();

  const [esRegistro, setEsRegistro] = useState(false);
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correoElectronico, setCorreoElectronico] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');

  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);
    setCargando(true);

    try {
      if (esRegistro) {
        await registrarCliente({ nombres, apellidos, correoElectronico, password, telefono: telefono || undefined });
        setExitoMsg('Cuenta creada con éxito. Ahora puedes iniciar sesión.');
        setEsRegistro(false);
        setPassword('');
      } else {
        const user = await iniciarSesion(correoElectronico, password);
        if (user.rol === 'ADMINISTRADOR' || user.rol === 'OPERADOR') {
          navigate('/admin/dashboard');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string; errores?: Array<{ campo: string; mensaje: string }> }>;
      if (axiosErr.response?.data?.errores?.length) {
        setErrorMsg(axiosErr.response.data.errores.map((item) => item.mensaje).join(' · '));
      } else {
        setErrorMsg(axiosErr.response?.data?.mensaje || 'No se pudo completar la operación.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {esRegistro ? 'Crear cuenta en ShopCart' : 'Iniciar sesión'}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          {esRegistro
            ? 'Completa tus datos para comprar y dar seguimiento a tus pedidos.'
            : 'Ingresa tu correo y contraseña para acceder a la plataforma.'}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {errorMsg}
          </div>
        )}

        {exitoMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
            {exitoMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {esRegistro && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nombres</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Carlos"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Apellidos</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Pérez"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Teléfono (opcional)</label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="5555-1234"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Correo electrónico</label>
            <input
              type="email"
              required
              value={correoElectronico}
              onChange={(e) => setCorreoElectronico(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contraseña</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            {cargando ? 'Procesando...' : esRegistro ? 'Registrarme' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          {esRegistro ? '¿Ya tienes una cuenta?' : '¿Eres cliente nuevo?'}{' '}
          <button
            type="button"
            onClick={() => {
              setEsRegistro(!esRegistro);
              setErrorMsg(null);
            }}
            className="text-amber-600 font-semibold hover:underline cursor-pointer"
          >
            {esRegistro ? 'Inicia sesión aquí' : 'Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  );
};
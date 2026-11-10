import React, { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { http } from '../../api/http';

interface RegistroBitacora {
  IDBitacoraAuditoria: number;
  CodigoModulo: string;
  NombreModulo: string;
  UsuarioNombre: string;
  Entidad: string;
  IDRegistroEntidad: string;
  Accion: string;
  ResumenCambio: string;
  ValorAnteriorJson: string | null;
  ValorNuevoJson: string;
  FechaRegistro: string;
}

export const BitacoraPage: React.FC = () => {
  const [registros, setRegistros] = useState<RegistroBitacora[]>([]);
  const [modulo, setModulo] = useState<string>('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);

  const cargarBitacora = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await http.get('/dashboard/bitacora', {
        params: {
          pagina,
          limite: 15,
          ...(modulo ? { modulo } : {}),
        },
      });
      setRegistros(data.registros || []);
      setTotalPaginas(data.paginacion?.totalPaginas || 1);
    } finally {
      setCargando(false);
    }
  }, [pagina, modulo]);

  const formatearfecha = (valor: string | null) => {
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

  useEffect(() => {
    cargarBitacora();
  }, [cargarBitacora]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-amber-500" />
            <span>Bitácora de Auditoría Inmutable</span>
          </h1>
          <p className="text-sm text-slate-500">
            Registro de trazabilidad y cambios de estado con valores JSON anterior y nuevo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <select
            value={modulo}
            onChange={(e) => {
              setModulo(e.target.value);
              setPagina(1);
            }}
            className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold bg-white"
          >
            <option value="">Todos los módulos</option>
            <option value="CATALOGO">Catálogo</option>
            <option value="INVENTARIO">Inventario</option>
            <option value="CHECKOUT">Checkout y Pedidos</option>
            <option value="AUTENTICACION">Autenticación</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs overflow-hidden">
        {cargando ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Cargando registros de auditoría...</div>
        ) : registros.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No hay eventos registrados para este filtro.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[11px]">
                    <th className="py-2.5 px-2">Fecha y Hora</th>
                    <th className="py-2.5 px-2">Módulo</th>
                    <th className="py-2.5 px-2">Usuario</th>
                    <th className="py-2.5 px-2">Acción</th>
                    <th className="py-2.5 px-2">Entidad</th>
                    <th className="py-2.5 px-2">Resumen del Evento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registros.map((r) => (
                    <tr key={r.IDBitacoraAuditoria} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-mono text-slate-500 whitespace-nowrap">
                        {formatearfecha(r.FechaRegistro)}
                      </td>
                      <td className="py-3 px-2 font-bold text-slate-800">{r.NombreModulo}</td>
                      <td className="py-3 px-2 text-slate-700">{r.UsuarioNombre}</td>
                      <td className="py-3 px-2">
                        <span className="font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {r.Accion}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-mono text-slate-500">
                        {r.Entidad} #{r.IDRegistroEntidad}
                      </td>
                      <td className="py-3 px-2 text-slate-600 max-w-md">{r.ResumenCambio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-700">
                  Página {pagina} de {totalPaginas}
                </span>
                <button
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
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
import { ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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
  const [, setTotalPaginas] = useState(1);
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
            Registro protegido en base de datos mediante trigger contra modificaciones y eliminaciones.
          </p>
        </div>

        <select
          value={modulo}
          onChange={(e) => {
            setModulo(e.target.value);
            setPagina(1);
          }}
          className="border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-semibold bg-white"
        >
          <option value="">Todos los módulos</option>
          <option value="INVENTARIO">INVENTARIO</option>
          <option value="CATALOGO">CATALOGO</option>
          <option value="CUPONES">CUPONES</option>
          <option value="PEDIDOS">PEDIDOS</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        {cargando ? (
          <div className="py-12 text-center text-slate-500 animate-pulse">Consultando bitácora...</div>
        ) : registros.length === 0 ? (
          <div className="py-12 text-center text-slate-500">No hay eventos registrados para este filtro.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[11px]">
                  <th className="py-2.5 px-2">Fecha</th>
                  <th className="py-2.5 px-2">Módulo / Acción</th>
                  <th className="py-2.5 px-2">Usuario</th>
                  <th className="py-2.5 px-2">Detalle del Cambio</th>
                  <th className="py-2.5 px-2">Valor Anterior → Nuevo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registros.map((r) => (
                  <tr key={r.IDBitacoraAuditoria} className="hover:bg-slate-50">
                    <td className="py-3 px-2 whitespace-nowrap text-xs text-slate-500">
                      {new Date(r.FechaRegistro).toLocaleString('es-GT')}
                    </td>
                    <td className="py-3 px-2">
                      <span className="font-bold text-slate-900 block">{r.CodigoModulo}</span>
                      <span className="text-xs text-amber-700 font-semibold">{r.Accion}</span>
                    </td>
                    <td className="py-3 px-2 font-semibold text-slate-700">{r.UsuarioNombre}</td>
                    <td className="py-3 px-2 text-xs text-slate-700">{r.ResumenCambio}</td>
                    <td className="py-3 px-2 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                      {r.ValorAnteriorJson ? `${r.ValorAnteriorJson} → ` : ''}
                      {r.ValorNuevoJson}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
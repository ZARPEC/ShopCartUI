import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Package,
  Edit3,
  Image as ImageIcon,
  Plus,
  PowerOff,
  Power,
  Save,
  CheckCircle2,
  Trash2,
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  X,
  FolderPlus,
  FolderTree,
} from 'lucide-react';
import { AxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { http } from '../../api/http';

interface Categoria {
  IDCategoria: number;
  IDCategoriaPadre?: number | null;
  Nombre: string;
  Slug: string;
}

interface ProductoResumen {
  IDProducto: number;
  Nombre: string;
  Slug: string;
  Marca: string | null;
  CategoriaNombre: string;
  PrecioMinimo: number;
  StockTotalDisponible: number;
  UrlImagenPrincipal: string | null;
  Activo: boolean | number;
}

interface VarianteDetalle {
  IDVarianteProducto: number;
  SKU: string;
  NombreVariante: string;
  PrecioActual: number;
  ExistenciaDisponible: number;
  Activo?: boolean | number;
}

interface ImagenProducto {
  IDProductoImagen: number;
  IDVarianteProducto: number | null;
  UrlImagen: string;
  TextoAlternativo?: string | null;
  EsPrincipal: boolean;
}

interface ModalConfirmacionState {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  colorBoton?: 'rojo' | 'verde';
  onConfirmar: () => void;
}

export const AdminProductosPage: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<ProductoResumen[]>([]);
  const [slugActivo, setSlugActivo] = useState<string>('');

  // Buscador y filtros de la lista lateral
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  // Pestaña activa en el área de trabajo
  const [tabActiva, setTabActiva] = useState<'info' | 'imagenes' | 'variantes'>('info');

  // Datos editables del Producto seleccionado
  const [idProducto, setIdProducto] = useState<number | null>(null);
  const [idCategoria, setIdCategoria] = useState<number>(1);
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [productoActivo, setProductoActivo] = useState(true);
  const [variantes, setVariantes] = useState<VarianteDetalle[]>([]);
  const [imagenes, setImagenes] = useState<ImagenProducto[]>([]);

  // Formulario para agregar imagen
  const [nuevaUrlImagen, setNuevaUrlImagen] = useState('');
  const [idVarianteImagen, setIdVarianteImagen] = useState<string>('');
  const [esImagenPrincipal, setEsImagenPrincipal] = useState(false);

  // Formulario para crear un Producto Nuevo
  const [modoCrearProducto, setModoCrearProducto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoSlug, setNuevoSlug] = useState('');
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [nuevaCatId, setNuevaCatId] = useState<number>(1);

  // Modal para Crear Nueva Categoría o Subcategoría Hija (RF-02)
  const [modalCategoriaAbierto, setModalCategoriaAbierto] = useState(false);
  const [nombreCat, setNombreCat] = useState('');
  const [slugCat, setSlugCat] = useState('');
  const [descCat, setDescCat] = useState('');
  const [idPadreCat, setIdPadreCat] = useState<string>(''); // '' = Principal, número = Hija

  // Formulario para agregar variante
  const [nuevoSkuVar, setNuevoSkuVar] = useState('');
  const [nuevoNombreVar, setNuevoNombreVar] = useState('');
  const [nuevoPrecioVar, setNuevoPrecioVar] = useState('');
  const [nuevoStockVar, setNuevoStockVar] = useState('10');

  // Modal React para confirmaciones
  const [modalConfirmacion, setModalConfirmacion] = useState<ModalConfirmacionState>({
    abierto: false,
    titulo: '',
    mensaje: '',
    textoConfirmar: 'Confirmar',
    colorBoton: 'rojo',
    onConfirmar: () => {},
  });

  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // 1. Cargar productos y categorías
  const cargarListado = useCallback(async () => {
    setCargandoLista(true);
    try {
      const [resCat, resProd] = await Promise.all([
        http.get('/catalogo/categorias'),
        http.get('/catalogo/productos', { params: { pagina: 1, limite: 100, incluirInactivos: true } }),
      ]);
      const cats: Categoria[] = resCat.data.categorias || [];
      const prods: ProductoResumen[] = resProd.data.datos || [];
      setCategorias(cats);
      setProductos(prods);
      if (prods.length > 0 && !slugActivo) {
        setSlugActivo(prods[0].Slug);
      }
    } catch {
      setAlerta({ tipo: 'error', texto: 'Error al conectar con el catálogo de productos.' });
    } finally {
      setCargandoLista(false);
    }
  }, [slugActivo]);

  useEffect(() => {
    cargarListado();
  }, [cargarListado]);

  // 2. Cargar detalle del producto seleccionado
  const cargarDetalle = useCallback(async (slug: string) => {
    if (!slug) return;
    setCargandoDetalle(true);
    try {
      const { data } = await http.get(`/catalogo/productos/${slug}`);
      const p = data.producto;
      setIdProducto(p.IDProducto);
      setIdCategoria(p.IDCategoria);
      setNombre(p.Nombre || '');
      setMarca(p.Marca || '');
      setDescripcion(p.Descripcion || '');
      setProductoActivo(Boolean(p.Activo));
      setVariantes(p.variantes || []);
      setImagenes(p.imagenes || []);
    } catch {
      setAlerta({ tipo: 'error', texto: 'No se pudo cargar el producto seleccionado.' });
    } finally {
      setCargandoDetalle(false);
    }
  }, []);

  useEffect(() => {
    if (slugActivo) {
      cargarDetalle(slugActivo);
    }
  }, [slugActivo, cargarDetalle]);

  // Jerarquía visual en menús: ordena cada categoría padre seguida inmediatamente de sus hijas
  // y muestra explícitamente "Padre → Hija" para que el administrador siempre sepa a qué padre pertenece
  const categoriasJerarquicas = useMemo(() => {
    const padres = categorias.filter((c) => !c.IDCategoriaPadre);
    const resultado: Array<{
      categoria: Categoria;
      etiqueta: string;
      nombrePadre?: string;
      esHija: boolean;
    }> = [];

    padres.forEach((p) => {
      // 1. Categoría Principal
      resultado.push({
        categoria: p,
        etiqueta: p.Nombre,
        esHija: false,
      });

      // 2. Sus subcategorías hijas ordenadas justo debajo
      const hijas = categorias.filter((c) => c.IDCategoriaPadre === p.IDCategoria);
      hijas.forEach((h) => {
        resultado.push({
          categoria: h,
          etiqueta: `↳ ${h.Nombre} (${p.Nombre})`,
          nombrePadre: p.Nombre,
          esHija: true,
        });
      });
    });

    // Subcategorías huérfanas si existieran
    categorias.forEach((c) => {
      if (c.IDCategoriaPadre && !resultado.some((r) => r.categoria.IDCategoria === c.IDCategoria)) {
        resultado.push({
          categoria: c,
          etiqueta: `↳ ${c.Nombre}`,
          esHija: true,
        });
      }
    });

    return resultado;
  }, [categorias]);

  // Filtrado reactivo en memoria: texto + categoría + estado activo/inactivo
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideTexto =
        !filtroBusqueda ||
        p.Nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
        (p.Marca && p.Marca.toLowerCase().includes(filtroBusqueda.toLowerCase())) ||
        p.Slug.toLowerCase().includes(filtroBusqueda.toLowerCase());

      const coincideCategoria = !filtroCategoria || p.CategoriaNombre === filtroCategoria;

      const esActivo = Boolean(p.Activo);
      const coincideEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activos' && esActivo) ||
        (filtroEstado === 'inactivos' && !esActivo);

      return coincideTexto && coincideCategoria && coincideEstado;
    });
  }, [productos, filtroBusqueda, filtroCategoria, filtroEstado]);

  const handleGuardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idProducto) return;
    setGuardando(true);
    setAlerta(null);
    try {
      await http.put(`/catalogo/productos/${idProducto}`, {
        idCategoria,
        nombre,
        marca: marca || undefined,
        descripcion: descripcion || undefined,
      });
      setAlerta({ tipo: 'ok', texto: 'Información general actualizada y auditada en Bitácora.' });
      await cargarListado();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'Error al actualizar producto.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleActualizarVariante = async (v: VarianteDetalle) => {
    setGuardando(true);
    setAlerta(null);
    try {
      await http.put(`/catalogo/variantes/${v.IDVarianteProducto}`, {
        nombreVariante: v.NombreVariante,
        precioActual: Number(v.PrecioActual),
      });
      setAlerta({
        tipo: 'ok',
        texto: `Precio de variante ${v.SKU} actualizado a Q ${Number(v.PrecioActual).toFixed(2)} (auditado en Bitácora).`,
      });
      await cargarListado();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'No se pudo actualizar la variante.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleAgregarImagen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idProducto || !nuevaUrlImagen.trim()) return;
    setGuardando(true);
    setAlerta(null);
    try {
      await http.post(`/catalogo/productos/${idProducto}/imagenes`, {
        urlImagen: nuevaUrlImagen.trim(),
        idVarianteProducto: idVarianteImagen ? Number(idVarianteImagen) : undefined,
        esPrincipal: esImagenPrincipal,
      });
      setNuevaUrlImagen('');
      setEsImagenPrincipal(false);
      setAlerta({ tipo: 'ok', texto: 'Imagen agregada a la galería.' });
      await cargarDetalle(slugActivo);
      await cargarListado();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'Error al guardar imagen.' });
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarEliminarImagen = async (idImagen: number) => {
    setGuardando(true);
    setAlerta(null);
    try {
      await http.delete(`/catalogo/imagenes/${idImagen}`);
      setAlerta({ tipo: 'ok', texto: 'Imagen eliminada exitosamente y auditada en Bitácora.' });
      await cargarDetalle(slugActivo);
      await cargarListado();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'No se pudo eliminar la imagen.' });
    } finally {
      setGuardando(false);
      setModalConfirmacion((prev) => ({ ...prev, abierto: false }));
    }
  };

  const abrirModalEliminarImagen = (idImagen: number) => {
    setModalConfirmacion({
      abierto: true,
      titulo: '¿Eliminar imagen de la galería?',
      mensaje:
        'Esta fotografía será removida permanentemente de la tienda. Esta acción quedará registrada de forma inmutable en la Bitácora de Auditoría.',
      textoConfirmar: 'Sí, eliminar imagen',
      colorBoton: 'rojo',
      onConfirmar: () => ejecutarEliminarImagen(idImagen),
    });
  };

  const handleAgregarVariante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idProducto) return;
    setGuardando(true);
    setAlerta(null);
    try {
      await http.post(`/catalogo/productos/${idProducto}/variantes`, {
        sku: nuevoSkuVar.trim(),
        nombreVariante: nuevoNombreVar.trim(),
        precioActual: Number(nuevoPrecioVar),
        existenciaInicial: Number(nuevoStockVar),
      });
      setNuevoSkuVar('');
      setNuevoNombreVar('');
      setNuevoPrecioVar('');
      setAlerta({ tipo: 'ok', texto: 'Nueva variante creada e ingresada a Kardex.' });
      await cargarDetalle(slugActivo);
      await cargarListado();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'No se pudo crear la variante.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleCrearNuevoProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setAlerta(null);
    try {
      const { data } = await http.post('/catalogo/productos', {
        idCategoria: nuevaCatId,
        nombre: nuevoNombre.trim(),
        slug: nuevoSlug.trim().toLowerCase(),
        marca: nuevaMarca.trim() || undefined,
        descripcion: nuevaDesc.trim() || undefined,
      });
      setModoCrearProducto(false);
      setNuevoNombre('');
      setNuevoSlug('');
      setNuevaMarca('');
      setNuevaDesc('');
      await cargarListado();
      if (data.producto?.Slug) {
        setSlugActivo(data.producto.Slug);
      }
      setAlerta({ tipo: 'ok', texto: 'Producto creado exitosamente. Ahora agrégale sus variantes y fotos.' });
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'No se pudo crear el producto.' });
    } finally {
      setGuardando(false);
    }
  };

  // Crear Categoría o Subcategoría Hija (RF-02)
  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setAlerta(null);
    try {
      await http.post('/catalogo/categorias', {
        nombre: nombreCat.trim(),
        slug: slugCat.trim().toLowerCase(),
        descripcion: descCat.trim() || undefined,
        idCategoriaPadre: idPadreCat ? Number(idPadreCat) : undefined,
      });

      setAlerta({
        tipo: 'ok',
        texto: idPadreCat
          ? `Subcategoría "${nombreCat}" creada con éxito como hija.`
          : `Categoría principal "${nombreCat}" creada con éxito.`,
      });
      setNombreCat('');
      setSlugCat('');
      setDescCat('');
      setIdPadreCat('');
      setModalCategoriaAbierto(false);
      await cargarListado();
    } catch (err) {
      const axiosErr = err as AxiosError<{ mensaje?: string }>;
      setAlerta({ tipo: 'error', texto: axiosErr.response?.data?.mensaje || 'No se pudo crear la categoría.' });
    } finally {
      setGuardando(false);
    }
  };

  // Desactivación Lógica (RF-02)
  const ejecutarDesactivarProducto = async () => {
    if (!idProducto) return;
    setGuardando(true);
    setAlerta(null);
    try {
      await http.patch(`/catalogo/productos/${idProducto}/desactivar`);
      setAlerta({ tipo: 'ok', texto: 'Producto desactivado de la tienda pública (RF-02).' });
      setProductoActivo(false);
      await cargarListado();
    } catch {
      setAlerta({ tipo: 'error', texto: 'No se pudo desactivar el producto.' });
    } finally {
      setGuardando(false);
      setModalConfirmacion((prev) => ({ ...prev, abierto: false }));
    }
  };

  const abrirModalDesactivar = () => {
    if (!idProducto) return;
    setModalConfirmacion({
      abierto: true,
      titulo: '¿Desactivar producto de la tienda?',
      mensaje:
        'El producto dejará de mostrarse en la tienda pública a los clientes. Cumpliendo con el criterio de aceptación de RF-02, no se eliminará físicamente para preservar las ventas y pedidos pasados.',
      textoConfirmar: 'Sí, desactivar producto',
      colorBoton: 'rojo',
      onConfirmar: ejecutarDesactivarProducto,
    });
  };

  // Reactivación (Devolver producto a la tienda pública)
  const ejecutarReactivarProducto = async () => {
    if (!idProducto) return;
    setGuardando(true);
    setAlerta(null);
    try {
      await http.patch(`/catalogo/productos/${idProducto}/reactivar`);
      setAlerta({ tipo: 'ok', texto: '¡Producto reactivado exitosamente! Ahora vuelve a verse en la tienda pública.' });
      setProductoActivo(true);
      await cargarListado();
    } catch {
      setAlerta({ tipo: 'error', texto: 'No se pudo reactivar el producto.' });
    } finally {
      setGuardando(false);
      setModalConfirmacion((prev) => ({ ...prev, abierto: false }));
    }
  };

  const abrirModalReactivar = () => {
    if (!idProducto) return;
    setModalConfirmacion({
      abierto: true,
      titulo: '¿Reactivar producto en la tienda?',
      mensaje:
        'El producto volverá a mostrarse en el catálogo público para que los clientes puedan comprarlo. Esta acción quedará registrada en la Bitácora.',
      textoConfirmar: 'Sí, reactivar producto',
      colorBoton: 'verde',
      onConfirmar: ejecutarReactivarProducto,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      {/* 1. Modal de Confirmación */}
      {modalConfirmacion.abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  modalConfirmacion.colorBoton === 'verde'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-red-50 border-red-200 text-red-600'
                }`}
              >
                {modalConfirmacion.colorBoton === 'verde' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setModalConfirmacion((prev) => ({ ...prev, abierto: false }))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">{modalConfirmacion.titulo}</h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{modalConfirmacion.mensaje}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalConfirmacion((prev) => ({ ...prev, abierto: false }))}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={modalConfirmacion.onConfirmar}
                className={`font-extrabold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer text-white shadow-md ${
                  modalConfirmacion.colorBoton === 'verde'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                }`}
              >
                {guardando ? 'Procesando...' : modalConfirmacion.textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal React: Crear Nueva Categoría o Subcategoría Hija (RF-02) */}
      {modalCategoriaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <form
            onSubmit={handleCrearCategoria}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 my-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <FolderTree className="w-5 h-5 text-amber-500" />
                <span>Nueva Categoría o Subcategoría (RF-02)</span>
              </div>
              <button
                type="button"
                onClick={() => setModalCategoriaAbierto(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Smartphones, Laptops o Belleza"
                  value={nombreCat}
                  onChange={(e) => {
                    setNombreCat(e.target.value);
                    setSlugCat(
                      e.target.value
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '')
                    );
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Slug URL (autogenerado)
                </label>
                <input
                  type="text"
                  required
                  placeholder="smartphones"
                  value={slugCat}
                  onChange={(e) => setSlugCat(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-amber-700 bg-slate-50"
                />
              </div>

              {/* Selector de Categoría Padre en el modal */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <label className="block text-xs font-bold uppercase text-slate-800 mb-1">
                  Categoría Padre (Jerarquía)
                </label>
                <select
                  value={idPadreCat}
                  onChange={(e) => setIdPadreCat(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                >
                  <option value="">Ninguna (Es una Categoría Principal Raíz)</option>
                  {categorias
                    .filter((c) => !c.IDCategoriaPadre)
                    .map((c) => (
                      <option key={c.IDCategoria} value={c.IDCategoria}>
                        Hija de: {c.Nombre}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  {idPadreCat
                    ? 'Se creará como una Subcategoría Hija dentro de la categoría seleccionada.'
                    : 'Se creará como una Categoría Principal que aparecerá en el menú superior de la tienda.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Breve descripción para el catálogo..."
                  value={descCat}
                  onChange={(e) => setDescCat(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalCategoriaAbierto(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-xs"
              >
                {guardando ? 'Guardando...' : idPadreCat ? 'Crear Subcategoría Hija' : 'Crear Categoría Principal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Header Principal con Botones de Acción */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestor de Productos y Catálogo</h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Edición de nombres, categorías padre/hijas, marcas, fotos y precios con auditoría en Bitácora.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setModalCategoriaAbierto(true)}
            className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-amber-600" />
            <span>+ Nueva Categoría</span>
          </button>

          <button
            type="button"
            onClick={() => setModoCrearProducto(!modoCrearProducto)}
            className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{modoCrearProducto ? 'Cerrar formulario' : 'Nuevo Producto'}</span>
          </button>
        </div>
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

      {/* Formulario Desplegable: Crear Producto Maestro */}
      {modoCrearProducto && (
        <form
          onSubmit={handleCrearNuevoProducto}
          className="bg-linear-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 sm:p-8 mb-8 space-y-4 shadow-xl border border-slate-800"
        >
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Crear Nuevo Producto Padre (Luego podrás agregarle sus variantes y fotos)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Comercial</label>
              <input
                type="text"
                required
                value={nuevoNombre}
                onChange={(e) => {
                  setNuevoNombre(e.target.value);
                  setNuevoSlug(
                    e.target.value
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '')
                  );
                }}
                placeholder="Ej. Consola Sony PlayStation 5"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Slug URL</label>
              <input
                type="text"
                required
                value={nuevoSlug}
                onChange={(e) => setNuevoSlug(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Marca</label>
              <input
                type="text"
                value={nuevaMarca}
                onChange={(e) => setNuevaMarca(e.target.value)}
                placeholder="Sony"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
              <select
                value={nuevaCatId}
                onChange={(e) => setNuevaCatId(Number(e.target.value))}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
              >
                {categoriasJerarquicas.map(({ categoria, etiqueta, esHija }) => (
                  <option
                    key={categoria.IDCategoria}
                    value={categoria.IDCategoria}
                    className={esHija ? 'text-amber-300' : 'font-bold'}
                  >
                    {etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-end pt-1">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción corta</label>
              <input
                type="text"
                value={nuevaDesc}
                onChange={(e) => setNuevaDesc(e.target.value)}
                placeholder="Especificaciones, material o detalles principales..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <button
              type="submit"
              disabled={guardando}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-sm transition-all cursor-pointer shrink-0"
            >
              Guardar y Continuar
            </button>
          </div>
        </form>
      )}

      {/* Estructura Split-View: Lista Lateral con Buscador e Inactivos y Workspace a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Panel Lateral Izquierdo: Buscador, Filtros y Selector de Productos (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Catálogo ({productosFiltrados.length})
            </span>
            <span className="text-[11px] font-semibold text-slate-400">Total: {productos.length}</span>
          </div>

          {/* Buscador de productos en vivo */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
              placeholder="Buscar por nombre, marca o slug..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Filtros: Categoría Jerárquica y Estado Activo/Inactivo */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                <option value="">Todas categorías</option>
                {categorias.map((c) => (
                  <option key={c.IDCategoria} value={c.Nombre}>
                    {c.IDCategoriaPadre ? `↳ ${c.Nombre}` : c.Nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as 'todos' | 'activos' | 'inactivos')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                <option value="todos">Todos los estados</option>
                <option value="activos">Solo Activos</option>
                <option value="inactivos">Solo Inactivos</option>
              </select>
            </div>
          </div>

          {/* Lista de productos con scroll optimizado y badge de activo/inactivo */}
          <div className="space-y-1.5 max-h-145 overflow-y-auto pr-1">
            {cargandoLista ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Cargando catálogo...</div>
            ) : productosFiltrados.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No hay productos que coincidan.</div>
            ) : (
              productosFiltrados.map((p) => {
                const activo = slugActivo === p.Slug;
                const esActivo = Boolean(p.Activo);
                return (
                  <button
                    key={p.IDProducto}
                    type="button"
                    onClick={() => setSlugActivo(p.Slug)}
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
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[10px] font-bold uppercase block truncate ${activo ? 'text-amber-400' : 'text-slate-400'}`}>
                          {p.Marca || p.CategoriaNombre}
                        </span>

                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                            esActivo
                              ? activo
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {esActivo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      <p className="text-xs font-bold truncate leading-tight mt-0.5">{p.Nombre}</p>
                      <div className="flex items-center justify-between text-[11px] mt-1">
                        <span className={activo ? 'text-slate-300' : 'text-slate-500'}>
                          Q {Number(p.PrecioMinimo).toFixed(2)}
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

        {/* Panel Principal Derecho: Área de Trabajo / Edición del Producto Seleccionado (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          {cargandoDetalle ? (
            <div className="py-20 text-center text-slate-500 animate-pulse">Cargando detalles del producto...</div>
          ) : !idProducto ? (
            <div className="py-20 text-center text-slate-400">Selecciona un producto para comenzar a editarlo.</div>
          ) : (
            <>
              {/* Barra de cabecera del producto activo */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      ID #{idProducto}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        productoActivo ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {productoActivo ? '● Visible en Tienda' : '○ Inactivo (Oculto)'}
                    </span>
                    <h2 className="text-lg font-black text-slate-900 truncate max-w-md">{nombre}</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Slug permanente: /{slugActivo}</p>
                </div>

                <div className="flex items-center gap-2">
                  {productoActivo && (
                    <Link
                      to={`/producto/${slugActivo}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <span>Ver en tienda</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {productoActivo ? (
                    <button
                      type="button"
                      onClick={abrirModalDesactivar}
                      className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <PowerOff className="w-3.5 h-3.5" />
                      <span>Desactivar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={abrirModalReactivar}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      <Power className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Reactivar Producto</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Selector de Pestañas de Trabajo */}
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  type="button"
                  onClick={() => setTabActiva('info')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                    tabActiva === 'info'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>1. Ficha y Datos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTabActiva('imagenes')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                    tabActiva === 'imagenes'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>2. Galería de Fotos ({imagenes.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTabActiva('variantes')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                    tabActiva === 'variantes'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>3. Variantes y Precios ({variantes.length})</span>
                </button>
              </div>

              {/* PESTAÑA 1: Ficha General con Categorías Agrupadas Jerárquicamente */}
              {tabActiva === 'info' && (
                <form onSubmit={handleGuardarProducto} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Nombre Comercial</label>
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Marca</label>
                      <input
                        type="text"
                        value={marca}
                        onChange={(e) => setMarca(e.target.value)}
                        placeholder="Ej. Sony, Apple, Nike"
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm"
                      />
                    </div>

                    {/* Selector de Categoría Jerárquica Ordenada*/}
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Categoría Asignada
                      </label>
                      <select
                        value={idCategoria}
                        onChange={(e) => setIdCategoria(Number(e.target.value))}
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm bg-white font-semibold"
                      >
                        {categoriasJerarquicas.map(({ categoria, etiqueta, esHija }) => (
                          <option
                            key={categoria.IDCategoria}
                            value={categoria.IDCategoria}
                            className={esHija ? 'text-amber-800 font-medium' : 'font-extrabold text-slate-900'}
                          >
                            {etiqueta}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Descripción Comercial</label>
                    <textarea
                      rows={4}
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Características, especificaciones técnicas y beneficios..."
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={guardando}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>Guardar Cambios del Producto</span>
                  </button>
                </form>
              )}

              {/* PESTAÑA 2: Galería de Fotos y Eliminación con Modal React */}
              {tabActiva === 'imagenes' && (
                <div className="space-y-6 pt-1">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Fotos activas en la tienda ({imagenes.length})
                    </p>

                    {imagenes.length === 0 ? (
                      <div className="p-8 border border-dashed border-slate-300 rounded-2xl text-center text-xs text-slate-400">
                        Este producto aún no tiene fotografías registradas.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        {imagenes.map((img) => (
                          <div
                            key={img.IDProductoImagen}
                            className="group relative bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md transition-shadow"
                          >
                            <div className="h-32 w-full flex items-center justify-center overflow-hidden rounded-xl bg-white mb-2">
                              <img src={img.UrlImagen} alt="" className="w-full h-full object-contain" />
                            </div>

                            {img.EsPrincipal && (
                              <span className="absolute top-2 left-2 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                                Principal
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => abrirModalEliminarImagen(img.IDProductoImagen)}
                              title="Eliminar esta foto"
                              className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg opacity-90 hover:opacity-100 shadow-sm cursor-pointer transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <span className="text-[10px] text-slate-500 font-medium truncate block">
                              {img.IDVarianteProducto
                                ? `Variante #${img.IDVarianteProducto}`
                                : 'Foto general'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAgregarImagen} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Agregar Nueva Imagen a la Galería</span>
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">URL Pública de la Imagen</label>
                      <input
                        type="url"
                        required
                        value={nuevaUrlImagen}
                        onChange={(e) => setNuevaUrlImagen(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          Vincular a Variante específica (opcional)
                        </label>
                        <select
                          value={idVarianteImagen}
                          onChange={(e) => setIdVarianteImagen(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                        >
                          <option value="">General de todo el producto</option>
                          {variantes.map((v) => (
                            <option key={v.IDVarianteProducto} value={v.IDVarianteProducto}>
                              {v.NombreVariante} ({v.SKU})
                            </option>
                          ))}
                        </select>
                      </div>

                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-3">
                        <input
                          type="checkbox"
                          checked={esImagenPrincipal}
                          onChange={(e) => setEsImagenPrincipal(e.target.checked)}
                          className="rounded border-slate-300 text-amber-500"
                        />
                        <span>Establecer como imagen principal del catálogo</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={guardando}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                    >
                      Guardar Imagen en Galería
                    </button>
                  </form>
                </div>
              )}

              {/* PESTAÑA 3: Variantes, Precios y Nueva Variante */}
              {tabActiva === 'variantes' && (
                <div className="space-y-6 pt-1">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Variantes activas ({variantes.length}) — Los cambios de precio no afectan pedidos pasados
                    </p>

                    <div className="space-y-2.5">
                      {variantes.map((v, index) => (
                        <div
                          key={v.IDVarianteProducto}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                        >
                          <div className="min-w-30">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">SKU</span>
                            <span className="text-xs font-mono font-bold text-slate-900">{v.SKU}</span>
                          </div>

                          <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                              Presentación / Atributos
                            </label>
                            <input
                              type="text"
                              value={v.NombreVariante}
                              onChange={(e) => {
                                const copia = [...variantes];
                                copia[index] = { ...v, NombreVariante: e.target.value };
                                setVariantes(copia);
                              }}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                            />
                          </div>

                          <div className="w-36">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                              Precio Unitario (Q)
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                Q
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min={1}
                                value={v.PrecioActual}
                                onChange={(e) => {
                                  const copia = [...variantes];
                                  copia[index] = { ...v, PrecioActual: Number(e.target.value) };
                                  setVariantes(copia);
                                }}
                                className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-2.5 py-1.5 text-xs font-black text-slate-900"
                              />
                            </div>
                          </div>

                          <div className="text-right sm:text-center min-w-17.5">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Stock</span>
                            <span className="text-xs font-bold text-emerald-700">{v.ExistenciaDisponible} u.</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleActualizarVariante(v)}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg self-end sm:self-center cursor-pointer shrink-0"
                          >
                            Actualizar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleAgregarVariante} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Agregar Nueva Variante a este Producto</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">SKU Único</label>
                        <input
                          type="text"
                          required
                          placeholder="IPH-15-512-BL"
                          value={nuevoSkuVar}
                          onChange={(e) => setNuevoSkuVar(e.target.value.toUpperCase())}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nombre Variante</label>
                        <input
                          type="text"
                          required
                          placeholder="512GB - Blanco"
                          value={nuevoNombreVar}
                          onChange={(e) => setNuevoNombreVar(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Precio (Q)</label>
                        <input
                          type="number"
                          required
                          min={1}
                          step="0.01"
                          placeholder="6999.00"
                          value={nuevoPrecioVar}
                          onChange={(e) => setNuevoPrecioVar(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Stock Inicial</label>
                        <input
                          type="number"
                          required
                          min={0}
                          placeholder="5"
                          value={nuevoStockVar}
                          onChange={(e) => setNuevoStockVar(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={guardando}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                    >
                      Crear Variante e Inicializar en Kardex
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
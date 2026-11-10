# ShopCart UI - Aplicación Web Cliente y Panel de Administración (Fase 2)

---

## Decisiones Técnicas y de Arquitectura en Frontend

### Manejo de Autenticación y Seguridad en Memoria
Para cumplir con los estándares de seguridad y mitigar ataques XSS (Cross-Site Scripting):
* **Access Token en memoria RAM:** El token JWT de corta duración (15 min) nunca se guarda en `localStorage` ni `sessionStorage`. Se almacena únicamente en una variable de memoria dentro del cliente Axios (`http.ts`).
* **Persistencia por Cookie HttpOnly:** La sesión se mantiene viva entre recargas mediante una cookie segura `HttpOnly` gestionada por el navegador. En cada recarga o cuando el token expira, un interceptor llama de forma transparente a `/api/auth/refresh`.
* **Aislamiento de Hooks para Fast Refresh:** La lógica del hook `useAuth` se extrajo a su propio archivo (`src/hooks/useAuth.ts`), separándolo del componente `AuthProvider`. 

### Catálogo Jerárquico y Estado Sincronizado en URL
* **Navegación por categorías padre e hijas:** Permite filtrar por una categoría raíz (mostrando todos sus productos y los de sus subcategorías) o descender a una subcategoría específica (ej. *Tecnología y Celulares → Celulares*) mediante una barra secundaria interactiva.
* **Búsqueda optimizada con `useDebounce`:** El buscador principal implementa un retardo de ms que cancela peticiones intermedias mientras el usuario escribe, evitando saturar la base de datos con consultas innecesarias.
* **Persistencia de filtros en URL (`useSearchParams`):** Los parámetros de búsqueda, categoría, rango de precios, disponibilidad, ordenación y número de página se sincronizan en los query params de la URL. Si un cliente comparte un enlace o presiona F5, la vista se restaura exactamente en el mismo estado y página.
* **Estados visibles obligatorios:** La interfaz maneja de forma explícita los 3 estados exigidos por la rúbrica: skeleton loaders animados durante la carga, estado vacío con mensaje amigable si no hay coincidencias, y cuadro de reintento si la red o el servidor fallan.

### Ficha de Producto y Selección Reactiva de Variantes
* **Variantes dinámicas:** Al seleccionar un color, talla o capacidad, la interfaz conmuta instantáneamente el precio , el SKU, el stock disponible y la fotografía principal correspondiente a esa variante específica.

###  Carrito Híbrido y Fusión Atómica (Merge)
* **Soporte para visitantes sin cuenta:** Un cliente puede armar su carrito sin iniciar sesión mediante un token de invitado persistido en cookies. Al momento de iniciar sesión, el backend y frontend ejecutan la fusión atómica de ítems sin duplicar líneas.
* **Validación de cupones:** El sistema valida contra la base de datos si el cupón aplica a toda la tienda o únicamente a una categoría específica, respetando montos mínimos de compra y mostrando el descuento desglosado en Quetzales.

### Checkout Atómico con Reserva Temporal
* **Temporizador de reserva de 15 minutos:** Al iniciar el checkout, el sistema aparta las existencias en SQL Server para evitar sobreventa. La interfaz muestra un indicador con la hora exacta local de vencimiento .
* **Clave de Idempotencia:** Cada intento de pago genera un identificador único UUID v4 (`chk-...`) que viaja en la petición. Si el usuario hace doble clic o sufre microcortes de red, se garantiza que la transacción no duplique cobros ni órdenes.
* **Liberación voluntaria:** Si el cliente decide hacer clic en *"← Volver a editar el carrito"*, la interfaz notifica al backend para liberar el apartado de inmediato, regresando las unidades al stock disponible sin esperar los 15 minutos.

### Control de Inventario y Cuadratura del Kardex
* **Auditoría matemática visual:** Cada variante muestra un cuadro de balance que valida en tiempo real la regla `ExistenciaFisica == SumaMovimientosKardex`, encendiendo una insignia verde de **Kardex Cuadrado** o una alerta roja en caso de discrepancia.
* **Proyección de saldos en ajustes:** Al ingresar una entrada por compra o un ajuste manual (+/-), la pantalla calcula y muestra la proyección del saldo resultante antes de enviar el formulario.
* **Motivo obligatorio:** El campo de justificación exige un mínimo de 5 caracteres para cumplir con la trazabilidad auditada de inventario.

###  Dashboard de Métricas y Ciclo de Vida de Pedidos

* **Visualización interactiva con Recharts:** Gráfica de barras que desglosa las ventas netas por categoría en Quetzales, deduciendo automáticamente pedidos cancelados y montos devueltos.
* **Máquina de estados de pedidos:** Permite a operadores y administradores transicionar pedidos de forma secuencial (*1. Pagado → 2. En Preparación → 3. Despachado → 4. Entregado*).
* **Cancelación con reintegro:** Botón de anulación que solicita motivo justificado y devuelve automáticamente el stock al Kardex como `ENTRADA_CANCELACION`.

---

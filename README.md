# Reconstruccion Sublime POS

Base reconstruida en Node + Express + SQLite y Vue 3 + Vuetify.

## Estructura

- `backend`: API REST con Express y base SQLite.
- `frontend`: interfaz Vue/Vuetify.

## Instalacion

```bash
cd reconstruccion
npm run install:all
```

## Ejecutar

En dos terminales:

```bash
npm run dev:backend
npm run dev:frontend
```

O en una sola:

```bash
npm install
npm run dev
```

La API queda en `http://localhost:3001` y el frontend en `http://localhost:5173`.

## Usuario inicial

- Usuario: `admin`
- Contrasena: `admin`

## Modulos reconstruidos

- Login
- Dashboard
- Productos
- Ventas al contado
- Compras
- Reportes de ventas
- Clientes
- Proveedores
- Caja
- Medios de pago
- Prestamos y aportes
- Usuarios y permisos
- Empresa

## Flujo de venta

1. Crea productos con existencia en `Productos`.
2. Entra a `Ventas`.
3. Busca y agrega productos al carrito.
4. Selecciona cliente o deja `Mostrador`.
5. Ingresa el pago recibido.
6. Registra la venta.

Al registrar una venta, la API guarda `ventas_contado`, guarda el detalle en `productos_vendidos` y descuenta inventario. Al anular una venta desde el historial, devuelve la existencia.

Desde el detalle de una venta se puede imprimir un ticket basico. En `Reportes` se puede consultar ventas al contado por fecha y usuario, con totales.

Las ventas aceptan uno o varios pagos. Los medios se administran en `Medios de pago` y se guardan por venta en `pagos_ventas`.

En ventas se puede desactivar `Registrar pago inicial` para dejar una orden/venta pendiente. Luego, desde el historial de ventas, el boton de pago permite registrar uno o varios pagos posteriores y actualizar el estado `PENDIENTE`, `PARCIAL` o `PAGADA`.

Las compras se registran por proveedor. Cada item puede ser un producto de inventario o una descripcion libre como insumo/gasto de restaurante. Si el item esta ligado a un producto, se aumenta existencia y se actualizan costo/precio de venta; si es libre, solo queda registrado en la compra.

`Prestamos y aportes` registra dinero entre el negocio, socios y terceros sin mezclarlo con ventas, compras o gastos operativos. Mantiene saldos de cuanto debe el negocio y cuanto le deben al negocio, y afecta el resumen de caja.

Cada movimiento puede subsanarse parcial o totalmente con `Abonar / subsanar`. Las subsanaciones quedan vinculadas al movimiento original, guardan medio de pago/referencia y actualizan saldo y estado (`PENDIENTE`, `PARCIAL`, `SUBSANADO`).

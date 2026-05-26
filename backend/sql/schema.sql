CREATE TABLE IF NOT EXISTS productos (
  idProducto INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  idCompania INTEGER,
  codigoBarras TEXT UNIQUE,
  descripcion TEXT NOT NULL,
  precioCompra REAL NOT NULL,
  precioVenta REAL NOT NULL,
  existencia REAL NOT NULL,
  stock REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS companias (
  idCompania INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  activa INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS clientes (
  idCliente INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  nombreCompleto TEXT NOT NULL,
  numeroTelefono TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proveedores (
  idProveedor INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  numeroTelefono TEXT,
  correo TEXT,
  direccion TEXT
);

CREATE TABLE IF NOT EXISTS personas_financieras (
  idPersonaFinanciera INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  idCompania INTEGER,
  nombre TEXT NOT NULL,
  relacion TEXT NOT NULL,
  numeroTelefono TEXT,
  notas TEXT
);

CREATE TABLE IF NOT EXISTS prestamos_aportes (
  idMovimiento INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  idCompania INTEGER,
  idPersonaFinanciera INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  monto REAL NOT NULL,
  fecha TEXT NOT NULL,
  descripcion TEXT,
  idUsuario INTEGER NOT NULL,
  FOREIGN KEY (idPersonaFinanciera) REFERENCES personas_financieras (idPersonaFinanciera) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (idUsuario) REFERENCES usuarios (idUsuario) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS subsanaciones_prestamos_aportes (
  idSubsanacion INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  idMovimiento INTEGER NOT NULL,
  monto REAL NOT NULL,
  fecha TEXT NOT NULL,
  idMedioPago INTEGER,
  referencia TEXT,
  descripcion TEXT,
  idUsuario INTEGER NOT NULL,
  FOREIGN KEY (idMovimiento) REFERENCES prestamos_aportes (idMovimiento) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (idMedioPago) REFERENCES medios_pago (idMedioPago) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (idUsuario) REFERENCES usuarios (idUsuario) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS usuarios (
  idUsuario INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  contrasena TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permisos (
  idPermiso INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  clave TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permisos_usuarios (
  idUsuario INTEGER NOT NULL,
  idPermiso INTEGER NOT NULL,
  FOREIGN KEY (idUsuario) REFERENCES usuarios (idUsuario) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (idPermiso) REFERENCES permisos (idPermiso) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE (idUsuario, idPermiso)
);

CREATE TABLE IF NOT EXISTS ventas_contado (
  idVenta INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  monto REAL NOT NULL,
  pago REAL NOT NULL DEFAULT 0,
  estadoPago TEXT NOT NULL DEFAULT 'PAGADA',
  estadoPreparacion TEXT NOT NULL DEFAULT 'PENDIENTE',
  fecha TEXT NOT NULL,
  fechaRegistro TEXT,
  fechaCumplido TEXT,
  idCliente INTEGER NOT NULL,
  idUsuario INTEGER NOT NULL,
  FOREIGN KEY (idCliente) REFERENCES clientes (idCliente) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (idUsuario) REFERENCES usuarios (idUsuario) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS medios_pago (
  idMedioPago INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  idCompania INTEGER,
  nombre TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pagos_ventas (
  idPagoVenta INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  idVenta INTEGER NOT NULL,
  idMedioPago INTEGER NOT NULL,
  monto REAL NOT NULL,
  referencia TEXT,
  FOREIGN KEY (idVenta) REFERENCES ventas_contado (idVenta) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (idMedioPago) REFERENCES medios_pago (idMedioPago) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS productos_vendidos (
  idProducto INTEGER NOT NULL,
  codigoBarras TEXT,
  idVenta INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  precioCompra REAL NOT NULL,
  precioVenta REAL NOT NULL,
  precioVentaOriginal REAL NOT NULL,
  cantidadVendida REAL NOT NULL,
  nota TEXT,
  FOREIGN KEY (idVenta) REFERENCES ventas_contado (idVenta) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS compras (
  idCompra INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  monto REAL NOT NULL,
  pago REAL NOT NULL DEFAULT 0,
  fecha TEXT NOT NULL,
  fechaRegistro TEXT,
  idProveedor INTEGER NOT NULL,
  idUsuario INTEGER NOT NULL,
  FOREIGN KEY (idProveedor) REFERENCES proveedores (idProveedor) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (idUsuario) REFERENCES usuarios (idUsuario) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS productos_comprados (
  idProducto INTEGER,
  idCompra INTEGER NOT NULL,
  codigoBarras TEXT,
  descripcion TEXT NOT NULL,
  precioCompra REAL NOT NULL,
  precioVenta REAL NOT NULL,
  cantidadComprada REAL NOT NULL,
  FOREIGN KEY (idCompra) REFERENCES compras (idCompra) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (idProducto) REFERENCES productos (idProducto) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS apartados (
  idApartado INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  monto REAL NOT NULL,
  pago REAL NOT NULL DEFAULT 0,
  abonado REAL NOT NULL,
  anticipo REAL NOT NULL,
  fecha TEXT NOT NULL,
  fechaVencimiento TEXT NOT NULL,
  idCliente INTEGER NOT NULL,
  idUsuario INTEGER NOT NULL,
  FOREIGN KEY (idCliente) REFERENCES clientes (idCliente) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (idUsuario) REFERENCES usuarios (idUsuario) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS productos_apartados (
  idApartado INTEGER NOT NULL,
  idProducto INTEGER NOT NULL,
  codigoBarras TEXT,
  descripcion TEXT NOT NULL,
  precioVenta REAL NOT NULL,
  precioVentaOriginal REAL NOT NULL,
  precioCompra REAL NOT NULL,
  cantidadVendida REAL NOT NULL,
  FOREIGN KEY (idApartado) REFERENCES apartados (idApartado) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (idProducto) REFERENCES productos (idProducto) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS abonos (
  idAbono INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  monto REAL NOT NULL,
  pago REAL NOT NULL DEFAULT 0,
  fecha TEXT NOT NULL,
  idApartado INTEGER NOT NULL,
  idUsuario INTEGER NOT NULL,
  FOREIGN KEY (idApartado) REFERENCES apartados (idApartado) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (idUsuario) REFERENCES usuarios (idUsuario) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS ingresos (
  idIngreso INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  monto REAL NOT NULL,
  descripcion TEXT NOT NULL,
  fecha TEXT NOT NULL,
  idUsuario INTEGER NOT NULL,
  FOREIGN KEY (idUsuario) REFERENCES usuarios (idUsuario) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS egresos (
  idEgreso INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  monto REAL NOT NULL,
  descripcion TEXT NOT NULL,
  fecha TEXT NOT NULL,
  idUsuario INTEGER NOT NULL,
  FOREIGN KEY (idUsuario) REFERENCES usuarios (idUsuario) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS empresa (
  idEmpresa INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  idCompania INTEGER,
  nombre TEXT,
  direccion TEXT,
  telefono TEXT,
  mensajePersonal TEXT
);

CREATE TABLE IF NOT EXISTS comun (
  clave TEXT PRIMARY KEY,
  valor TEXT,
  idCompania INTEGER
);

CREATE INDEX IF NOT EXISTS idVenta_indice ON productos_vendidos (idVenta);
CREATE INDEX IF NOT EXISTS clave_permiso ON permisos (clave);

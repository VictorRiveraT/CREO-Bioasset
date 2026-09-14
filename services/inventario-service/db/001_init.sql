CREATE SCHEMA IF NOT EXISTS inventario;

CREATE TABLE inventario.ubicaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventario.activos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_qr VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    serie VARCHAR(100) NOT NULL,
    ubicacion_id UUID REFERENCES inventario.ubicaciones(id),
    estado VARCHAR(50) NOT NULL,
    fecha_adquisicion DATE NOT NULL,
    proximo_mantenimiento DATE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventario.movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID REFERENCES inventario.activos(id),
    origen_id UUID REFERENCES inventario.ubicaciones(id),
    destino_id UUID REFERENCES inventario.ubicaciones(id),
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    usuario_id UUID NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

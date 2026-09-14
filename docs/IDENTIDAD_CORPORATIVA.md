# Análisis de Identidad Corporativa y Accesos - Frontend (PWA)

Este documento detalla los hallazgos en la capa Frontend (`/src`) relacionados al branding de "Creo+" y la gestión de permisos del usuario.

## 1. Identidad de Marca (Branding y Colores)

**Sí, existe un alineamiento de branding programado en el código fuente.**
El proyecto utiliza una configuración global que aplica los colores y tokens de la marca "Creo / Creo+" directamente en variables CSS centralizadas.

### Archivos y líneas clave:

- **`src/styles.css` (Líneas 63 a 144):**
  Se definen las variables globales de color usando tokens específicos de la marca, confirmados por comentarios de los desarrolladores:

  ```css
  :root {
    --primary: #F2B705; /* Creo+ Ambar */
    --destructive: #E5142D; /* Creo+ Rojo */
    --background: #F0ECDD; /* Tono Crema/Hueso */
    --sidebar: #111111; /* Negro para menú lateral */
    ...
  }
  ```

  El tema incluye modo oscuro (`.dark` en la línea 105) el cual invierte el fondo a un `#111111` pero mantiene el `--primary: #F2B705` intacto.

- **Integración con UI (Tailwind v4):**
  En lugar de un `tailwind.config.js` clásico, el proyecto usa la versión 4 de Tailwind (`@tailwindcss/vite`). Los colores CSS (`--color-primary`, `--color-destructive`) están inyectados nativamente bajo la etiqueta `@theme inline` en `src/styles.css` (Líneas 12-61). Esto garantiza que todos los componentes modulares (`shadcn/ui`) hereden los colores oficiales sin hardcodear.

## 2. Logo Real vs Logo Placeholder

**No existe un logo real (SVG/PNG) implementado en el sistema.**
El frontend utiliza un componente "tipográfico" que actúa como logo genérico/placeholder estilizado usando clases CSS de Tailwind.

### Archivo y línea clave:

- **`src/components/bioasset/AppShell.tsx` (Líneas 68-79 - Componente `Brand()`):**
  Literalmente existe un comentario documentando la falta del logo real:
  ```tsx
  function Brand() {
    return (
      <div className="flex flex-col gap-1 px-6 py-8">
        {/* TODO: reemplazar con logo SVG oficial */}
        <div className="text-4xl font-bold tracking-tight text-sidebar-foreground mb-4">
          Creo<span className="text-[#F2B705]">+</span>
        </div>
        ...
      </div>
    );
  }
  ```
- **Carpeta de assets (`public/`):** Solo contiene un `favicon.ico` y `robots.txt`. No hay ninguna carpeta `assets/images` con archivos SVG o PNG del logotipo.

## 3. Pantalla de Gestión de Accesos/Permisos

**No existe una pantalla administrativa de gestión de permisos o asignación de roles a módulos.**

Toda la lógica de acceso a rutas y visualización de módulos está **hardcodeada (fijada en el código fuente)** basándose en el rol devuelto por el JSON del login.

### Lo que sí existe:

- Un archivo **`src/routes/usuarios.tsx`** donde un usuario `admin` puede ver el listado de personal y **Activar/Desactivar** a los usuarios (Flag `Activo` = true/false), usando el modal "Confirmar cambio" en la línea 97.
- Sin embargo, en esta pantalla **no hay ningún selector para editar o asignar el rol** (ej. cambiar un usuario de 'Asistencial' a 'Biomédico').

### Cómo se ocultan las rutas (Hardcoded):

- En **`src/components/bioasset/AppShell.tsx` (Línea 28 - constante `NAV`)**, los accesos se definen manualmente en un array. No vienen de la base de datos:
  ```tsx
  const NAV = [
    {
      to: "/",
      label: "Inicio",
      icon: LayoutDashboard,
      roles: ["admin", "biomedico", "asistencial"],
    },
    { to: "/usuarios", label: "Usuarios", icon: Users, roles: ["admin"] },
    // ...
  ];
  ```
- Este array luego se filtra por rol en la línea 47:
  `NAV.filter(item => (item.roles as readonly string[]).includes(role)).map(...)`

- **Selector falso (DEV Mode):** Existe un menú desplegable de "Gestión de Roles" en el header, **pero solo en modo desarrollo** (líneas 213-230 de `AppShell.tsx`), inyectado con `{import.meta.env.DEV && (...) }`. Este bypass manipula el rol directamente en el frontend sin tocar el servidor, únicamente con fines de probar las vistas. No es una función real para el administrador en producción.

### Conclusión sobre accesos:

Para cambiar el rol de un usuario o decidir que el rol "Biomédico" ahora tiene acceso a "Usuarios", se requiere **modificar el código fuente (C# y React) y redesplegar la aplicación**. La "Gestión de Accesos" en UI se limita únicamente a dar de baja/alta cuentas enteras, pero no a definir la matriz de permisos.

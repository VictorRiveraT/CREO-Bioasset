# CREO BioAsset - Sistema Inteligente de Gestión y Trazabilidad Hospitalaria

**CREO BioAsset** es una plataforma integral de grado clínico para la gestión del ciclo de vida, trazabilidad física/lógica, mantenimiento predictivo/correctivo e inventariado en tiempo real de equipamiento biomédico e infraestructura hospitalaria.

---

## Arquitectura del Sistema

La solución está construida sobre una arquitectura desacoplada de microservicios con comunicación asíncrona basada en eventos:

```mermaid
flowchart TD
    Client["Frontend Web (React 19 + TanStack Router)\nVercel / Localhost"]
    Gateway["API Gateway (Nginx :8080)"]

    Client --> Gateway

    subgraph Microservicios [Backend .NET 8 / C#]
        Auth["Auth Service (:3001)\nJWT • RBAC • Multi-Sede"]
        Inv["Inventario Service (:3002)\nActivos • Trazabilidad • QR"]
        Mant["Mantenimiento Service (:3003)\nPreventivo/Correctivo • PDFs"]
        Alert["Alertas Service (:3004)\nSendGrid • Plantillas HTML"]
        Analyt["Analítica Service (:3005)\nKPIs • Métricas de Disponibilidad"]
    end

    Gateway --> Auth
    Gateway --> Inv
    Gateway --> Mant
    Gateway --> Alert
    Gateway --> Analyt

    subgraph Infraestructura
        Broker["Event Broker (RabbitMQ :5672)"]
        DB[("Base de Datos (SQL Server 2022 :1433)")]
    end

    Auth --> DB
    Inv --> DB
    Mant --> DB
    Alert --> DB
    Analyt --> DB

    Inv -. Eventos .-> Broker
    Mant -. Eventos .-> Broker
    Broker -. Notificaciones .-> Alert
```

### Componentes Principales:
* **Frontend (`/src`)**: Aplicación SPA moderna con React 19, TypeScript 5.8, Tailwind CSS v4, componentes accesibles basados en Radix UI / Shadcn, gráficos en Recharts y enrutador tipado con `@tanstack/react-router`.
* **API Gateway (`services/gateway`)**: Reverse Proxy Nginx en puerto `8080` que unifica el tráfico web y la resolución interna de servicios en Docker.
* **Auth Service (`services/auth-service`)**: Autenticación JWT, control de sesiones activas, tokens de recuperación y autorización granular multi-sede.
* **Inventario Service (`services/inventario-service`)**: Catálogo maestro de equipos biomédicos, ubicaciones físicas, estados operativos y generación de etiquetas QR.
* **Mantenimiento Service (`services/mantenimiento-service`)**: Programación de rondas de mantenimiento preventivo, registro de incidencias correctivas y emisión de actas técnicas en PDF.
* **Alertas Service (`services/alertas-service`)**: Monitor de vencimientos, notificaciones tempranas y envíos transaccionales unificados vía SendGrid.
* **Analítica Service (`services/analitica-service`)**: Consolidación de KPIs clínicos, MTBF, MTTR y disponibilidad de quirófanos y salas de cuidados críticos.

---

## Capacidades y Seguridad Implementada

### Seguridad y Criptografía
* **Tokens de Recuperación Efímeros**: Los enlaces de reseteo de contraseña utilizan tokens criptográficos únicos con vigencia estricta de **10 minutos**, almacenamiento hash SHA-256 e invalidación automática tras su primer uso.
* **Almacenamiento Seguro**: Cifrado y salting de contraseñas de alta entropía.
* **Aislamiento Multi-Sede Estricto**: Políticas a nivel de servicio que impiden mutaciones (`POST`, `PUT`, `DELETE`) fuera de la jurisdicción física asignada a cada usuario.
* **Revocación de Sesión Activa**: Interceptores frontend y validación periódica que expulsan sesiones revocadas o inactivadas en menos de 5 segundos.

### Experiencia de Usuario (UI/UX) y Diseño Responsivo
* **Adaptación Mobile-First**: Experiencia móvil nativa con menús tipo drawer, controles táctiles y tablas con vista condensada en tarjetas.
* **Tarjetas de Alerta Optimizadas**: Diseño visual en 3 niveles (código de activo monospace, descripción completa sin saltos de línea forzados y pie con ubicación y botón de atención inmediata).
* **Accesibilidad y Contraste**: Paleta de colores ajustada para alto contraste (`amber-600` / `amber-400` en modo claro y oscuro) conforme a estándares WCAG.
* **Saneamiento de Datos**: Transformación de placeholders técnicos (`___EMPTY___`, `N/A`) a etiquetas claras para el usuario final (*"Sin asignar"*).

### Sistema de Notificaciones y Correos Unificados
* **Diseño Transaccional Corporativo**: Plantillas HTML unificadas bajo el manual de marca de CREO BioAsset (cabecera institucional, insignias de prioridad por color, botón de llamada a la acción y pie de confidencialidad médica).
* **Disparo Diario Automatizado**: Rutina y endpoint de trigger para reportes ejecutivos diarios de inventario y estado clínico.

---

## Requisitos y Puesta en Marcha

### Prerrequisitos
* [Node.js](https://nodejs.org/) v20+ y `npm`
* [Docker Desktop](https://www.docker.com/) con Docker Compose activado

### 1. Clonar el Repositorio
```bash
git clone https://github.com/VictorRiveraT/CREO-Bioasset.git
cd CREO-Bioasset
```

### 2. Iniciar el Backend Completo (Docker)
En Windows puedes ejecutar el archivo por lotes automatizado:
```cmd
iniciar-servicios.bat
```
O directamente con Docker Compose:
```bash
docker-compose up -d --build
```

Esto levantará los 8 contenedores requeridos:
* Gateway (`:8080`)
* Auth Service (`:3001`)
* Inventario Service (`:3002`)
* Mantenimiento Service (`:3003`)
* Alertas Service (`:3004`)
* Analítica Service (`:3005`)
* RabbitMQ (`:5672` / UI: `:15672`)
* SQL Server 2022 (`:1433`)

### 3. Iniciar el Frontend (Desarrollo)
```bash
npm install
npm run dev
```

* **Acceso local completo**: Abre [http://localhost:8080](http://localhost:8080) (a través del Gateway).
* **Acceso Vite directo**: Abre [http://localhost:8081](http://localhost:8081).
* **Despliegue Productivo Cloud**: [https://creo-bioasset-one.vercel.app](https://creo-bioasset-one.vercel.app).

---

## Calidad de Código y Estándares

El proyecto cuenta con validación estricta de linters, formateo automatizado y cero tolerancia a errores de compilación:

| Comando | Función |
| :--- | :--- |
| `npm run lint` | Análisis estático con ESLint (Reglas de hooks, tipado estricto, 0 errores). |
| `npm run lint:fix` | Corrección automática de advertencias de linter. |
| `npm run format` | Formateo estricto de todo el proyecto con Prettier (`endOfLine: auto`). |
| `npm run build` | Compilación de TypeScript y empaquetado optimizado con Vite / Nitro. |

---

## Estructura de Directorios

```text
CREO-Bioasset/
├── .github/              # Flujos de integración y despliegue continuo
├── postman/              # Colecciones de endpoints para pruebas de API
├── public/               # Recursos estáticos y manifiesto web
├── scripts/              # Scripts de inicialización y migración SQL (seed.sql)
├── services/             # Microservicios en .NET 8 y Nginx Gateway
│   ├── alertas-service/
│   ├── analitica-service/
│   ├── auth-service/
│   ├── gateway/
│   ├── inventario-service/
│   └── mantenimiento-service/
├── src/                  # Aplicación Frontend React 19
│   ├── components/       # Componentes visuales y sistema de diseño Shadcn/UI
│   ├── hooks/            # Custom hooks (mobile detection, media queries)
│   ├── lib/              # Estado global, cliente API REST, seguridad y exportador PDF
│   └── routes/           # Rutas tipadas organizadas con TanStack Router
├── docker-compose.yml    # Orquestación de contenedores e infraestructura
├── package.json          # Dependencias y scripts del frontend
└── README.md             # Documentación técnica general
```

---

_CREO BioAsset — Diseñado para operar con los más altos estándares de confiabilidad, seguridad y eficiencia clínica._

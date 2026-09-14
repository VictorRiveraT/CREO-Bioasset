# Cambios Pre-Demo: Consolidación de Roles y Limpieza de Datos Mock

Este documento resume las dos correcciones principales aplicadas al repositorio para asegurar coherencia en el dominio y fidelidad en la visualización de los datos.

## 1. Renombramiento del Rol "Tecnico" a "Biomédico"
El rol y todas sus referencias en el código fuente (clases C#, columnas de base de datos, tipos de TypeScript y componentes de UI) fueron unificadas a "Biomédico" (y `biomedicoId` / `biomedico_id`). El usuario semilla (Luis) sigue teniendo su rol "asistencial", mientras que el segundo usuario semilla ahora es 100% referenciado como "Biomedico".

**Archivos modificados:**
- `services/auth-service/Program.cs`: Se corrigió el nombre y correo de seed (`biomedico@bioasset.pe`).
- `services/mantenimiento-service/Program.cs`: Renombre de `TecnicoId` y columna `tecnico_id` a `BiomedicoId` y `biomedico_id`.
- `src/lib/bioasset/types.ts`: Propiedad de interfaz `tecnicoId` renombrada a `biomedicoId`.
- `src/components/bioasset/dialogs.tsx`: Estados del formulario migrados a `biomedicoId` y etiqueta cambiada a "Biomédico responsable".
- `src/components/bioasset/AppShell.tsx`: Actualizado el login hint a `biomedico@bioasset.pe`.
- `src/routes/equipos.$id.tsx` y `src/routes/mantenimiento.tsx`: Renderización actualizada a "Biomédico".
- `src/routes/usuarios.tsx`: Actualización del filtro de conteo apuntando a `m.biomedicoId`.
- `src/lib/bioasset/seed.ts`: (Scaffolding antiguo) adaptado para usar correos y campos de `biomedico`.
- `scripts/seed.sql`: Script de base de datos migrado para buscar e insertar usando `biomedico_id` y `biomedico`.
- `docs/PROGRESS.md`, `docs/VERIFICACION_PANTALLAS.md`, `docs/DISENO_BASE_DATOS.md` y `CONTEXTO_PROYECTO.md`: Textos y diagramas actualizados.

**⚠️ Importante sobre la Base de Datos:** Como la columna de la tabla `Mantenimientos` pasó de `tecnico_id` a `biomedico_id`, y EF Core usa `EnsureCreated()`, **es necesario descartar la base de datos actual y recrearla** (o correr el `seed.sql` sobre una DB limpia).

## 2. Eliminación de los Datos Mock del Frontend
Se ha extirpado completamente la data falsa inyectada. Ahora el sistema es un fiel reflejo de lo que devuelve la base de datos a través de los endpoints de la API.

**Archivos modificados:**
- `src/lib/bioasset/store.tsx`: Se borraron las constantes masivas `MOCK_EQUIPMENT`, `MOCK_MAINTENANCE` y `MOCK_MOVEMENTS`.
- Se refactorizó la hidratación de estado (`setDb`) para que únicamente procese los arrays devueltos por `Promise.all` (`equiposRes`, `mantsRes`, etc.), eliminando toda fusión (spread `...`) de arreglos dummy.

### Resultados y Comprobación:
- **Compilación:** La PWA compila sin errores ya que todas las referencias rotas fueron resueltas y los tipos de TypeScript mapean correctamente el renombre.
- **Pantallas Reales:** Ahora el Dashboard y el listado de Equipos reflejarán estrictamente los ~20 equipos y movimientos que inyecta `seed.sql` inicialmente. 
- **Vacíos en Pantallas (Aviso):** Al remover los Mocks, **las pantallas dependientes de `alertas-service` y `analitica-service` quedarán visualmente vacías**, dado que esos microservicios no poseen lógica real de inserción ni cronjobs. Recomiendo que, previo a la demo, insertes manualmente un par de registros directamente a sus tablas para que las pantallas no se vean muertas.

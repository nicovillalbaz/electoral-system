# Análisis de Estructura de Base de Datos vs Código

Este archivo detalla las diferencias encontradas entre el archivo `bckp.sql` (estructura actual de base de datos) y el código fuente del proyecto (expectativas de modelos en `apps/api`).

## Resumen de Discrepancias

Se han identificado discrepancias críticas que impedirán el funcionamiento correcto del sistema, principalmente en los módulos de tareas, personas y check-ins.

### 1. Tabla `tasks` vs `activities` (Crítico)
El código (`tasks.repo.ts`) intenta realizar consultas a una tabla llamada **`tasks`**, pero en la base de datos existe una tabla llamada **`activities`**.

| Concepto | En Código (`tasks`) | En Base de Datos (`activities`) | Acción Requerida |
| :--- | :--- | :--- | :--- |
| **Nombre de Tabla** | `tasks` | `activities` | Renombrar tabla |
| **Tipo** | `task_type` | `activity_type` | Renombrar columna |
| **Persona Relacionada** | `related_person_id` | `linked_person_id` | Renombrar columna |
| **Lista Relacionada** | `related_list_id` | `linked_list_id` | Renombrar columna |
| **Asignado A** | `assigned_user_id` | `assigned_to_user_id` | Renombrar columna |
| **Ubicación Texto** | `location_text` | `location` | Renombrar columna |
| **Coordenadas** | `location_lat`, `location_lng` | *No existe* | Crear columnas |
| **Completado** | `completed_at` (Timestamp) | `is_completed` (Boolean) | Cambiar tipo y nombre |

### 2. Tabla `persons`
El repositorio `persons.repo.ts` hace referencia a columnas que no existen en la definición de la tabla `persons`.

| Columna Faltante | Tipo Esperado | Descripción |
| :--- | :--- | :--- |
| `exact_address` | TEXT | Dirección exacta específica para campañas |
| `whatsapp_number` | TEXT | Número de WhatsApp separado del teléfono personal |

### 3. Tabla `station_checkins` (Crítico)
El código (`checkins.repo.ts`) intenta registrar visitas de **personas** a puestos, pero la tabla parece diseñada para registrar actividad de **usuarios** (operadores) o tiene nombres de columnas desactualizados.

| Concepto | En Código | En Base de Datos | Acción Requerida |
| :--- | :--- | :--- | :--- |
| **Persona Visitante** | `person_id` | *No existe* | Crear columna |
| **Operador que Registra** | `recorded_by_user_id` | `user_id` | Renombrar columna |
| **Intención de Voto** | `vote_intent_snapshot` | *No existe* | Crear columna |
| **Notas** | `notes` | `details` (genérico) | Crear columna |
| **Tipo de Checkin** | *No se usa* | `type` | Eliminar/Ignorar |

---

## Script de Corrección (SQL)

Ejecuta el siguiente script SQL en tu base de datos para alinear la estructura con el código del proyecto.

```sql
BEGIN;

-- 1. Renombrar tabla activities a tasks
ALTER TABLE "activities" RENAME TO "tasks";

-- 2. Corregir columnas en tabla tasks
ALTER TABLE "tasks" 
    RENAME COLUMN "activity_type" TO "task_type";

ALTER TABLE "tasks" 
    RENAME COLUMN "linked_person_id" TO "related_person_id";

ALTER TABLE "tasks" 
    RENAME COLUMN "linked_list_id" TO "related_list_id";

ALTER TABLE "tasks" 
    RENAME COLUMN "assigned_to_user_id" TO "assigned_user_id";

ALTER TABLE "tasks" 
    RENAME COLUMN "location" TO "location_text";

-- 3. Agregar columnas faltantes en tasks
ALTER TABLE "tasks" 
    ADD COLUMN "location_lat" NUMERIC,
    ADD COLUMN "location_lng" NUMERIC;

-- 4. Transformar is_completed a completed_at
ALTER TABLE "tasks" ADD COLUMN "completed_at" TIMESTAMP WITH TIME ZONE;
UPDATE "tasks" SET "completed_at" = NOW() WHERE "is_completed" = true;
ALTER TABLE "tasks" DROP COLUMN "is_completed";

-- 5. Corregir tabla persons
ALTER TABLE "persons" 
    ADD COLUMN "exact_address" TEXT,
    ADD COLUMN "whatsapp_number" TEXT;

-- 6. Corregir tabla station_checkins
ALTER TABLE "station_checkins" 
    RENAME COLUMN "user_id" TO "recorded_by_user_id";

ALTER TABLE "station_checkins" 
    ADD COLUMN "person_id" UUID,
    ADD COLUMN "vote_intent_snapshot" TEXT,
    ADD COLUMN "notes" TEXT;

COMMIT;
```

## Verificación
Una vez aplicados estos cambios:
1.  **Tasks**: El módulo funcionará correctamente con la tabla renombrada y las nuevas columnas.
2.  **Persons**: Se podrán guardar datos de dirección exacta y WhatsApp.
3.  **Checkins**: Se podrán registrar visitas de personas a los puestos correctamente.

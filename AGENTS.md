# AGENTS.md – Reglas del Proyecto

## Perfil de Asistencia por IA

La IA debe actuar como un **ingeniero backend senior**, con experiencia en:

- NestJS
- Arquitectura de APIs REST
- Prisma ORM
- PostgreSQL
- Sistemas de cache (Valkey / Redis)
- Diseño de sistemas escalables y consistentes

### Nivel técnico esperado

- Asumir conocimiento avanzado del ecosistema Node.js y NestJS.
- Priorizar soluciones **simples, mantenibles y explícitas**.
- Evitar sobre–ingeniería.

### Forma de razonar

- Analizar primero el contexto completo antes de proponer una solución.
- Identificar posibles efectos secundarios (consistencia, concurrencia, cache).
- Considerar trade-offs y mencionarlos brevemente cuando sea relevante.

### Forma de responder

- Respuestas claras, técnicas y directas.
- Usar ejemplos de código solo cuando aporten valor.
- El código debe estar listo para copiar y pegar.
- Explicar brevemente el _por qué_ de cada decisión importante.

### Restricciones

- No asumir requisitos no mencionados.
- No inventar estructuras de carpetas ni configuraciones.
- No proponer cambios globales sin justificación clara.

## 1. Resumen del Proyecto

Backend de una **REST API para e-commerce** orientado principalmente a productos de **seguridad industrial**, pero extensible a otros sectores.

**Stack principal**:

- NestJS
- Prisma ORM
- PostgreSQL
- Valkey (cache)

**Decisiones clave**:

- Uso de cache para performance.
- Implementación de **idempotencia** en endpoints críticos.
- Enfoque en consistencia de datos y escalabilidad.

Este archivo define **reglas obligatorias** para desarrollo y para cualquier asistencia por IA.

---

## 2. Comandos de Configuración (Setup)

- `npm install` – Instalar dependencias.
- `cp .env.example .env` – Configurar variables de entorno.

---

## 3. Estilo de Código y Convenciones

### 3.1 TypeScript y DTOs

- Todo el código debe escribirse en **TypeScript**.
- Los DTOs deben implementarse **como clases**, no interfaces.
- Utilizar decoradores de:
  - `class-validator`
  - `class-transformer`

- Todos los endpoints públicos deben incluir **decoradores de Swagger**.

### 3.2 Convenciones de nombres

- **Prisma / Base de datos**: `snake_case`
  - Ejemplo: `product_id`, `created_at`

- **DTOs, Services y Controllers**: `camelCase`
  - Ejemplo: `productId`, `createdAt`

### 3.3 Estructura del proyecto

- Seguir estrictamente la estructura bajo `/src`.
- Separar responsabilidades:
  - Controllers: manejo de HTTP
  - Services: lógica de negocio
  - DTOs: validación y contratos
  - Prisma: acceso a datos

---

## 4. Arquitectura y Patrones

- Los **controllers** no deben contener lógica de negocio.
- Los **services** no deben acceder directamente a `req` o `res` a menos que sea necesario ya sea por una libreria o por el framework (ejem: controller de webhook mercadopago).
- Prisma solo debe usarse dentro de services o capas de acceso a datos.
- Para lecturas:
  - Intentar cache primero (read-through).
  - Fallback a base de datos.

- Las operaciones críticas deben ser **idempotentes**.
- Usar `$transaction` de Prisma cuando haya múltiples escrituras dependientes.

---

## 5. Cache

- Valkey es la fuente de cache principal.
- Utiliza las herramientas del modulo cache para trabajar con el.

---

## 6. Testing

- Ejecutar `npm test` antes de crear un PR.
- La cobertura mínima esperada es **80%**.
- Priorizar tests en:
  - Servicios
  - Lógica de negocio
  - Casos borde (edge cases)

---

## 7. Flujo de Git

- Las ramas deben usar los prefijos:
  - `feat/`
  - `fix/`

- Los commits deben seguir **Conventional Commits**.

---

## 8. Reglas para Asistencia por IA

Estas reglas son **obligatorias**:

- ❌ NO usar librerías de terceros en desuso o no mantenidas, salvo que el usuario lo solicite explícitamente.
- ❌ NUNCA modificar directamente el archivo `main.ts` a menos que el usuario lo pida expresamente.
- ❌ NO modificar archivos existentes ni asumir contexto no proporcionado.
- ❌ NO adivinar soluciones.
- ✅ Si falta información, **preguntar**.
- ✅ Cualquier solución debe proporcionarse **por el chat**, lista para copiar y pegar.
- ✅ Explicar brevemente **por qué la solución propuesta es mejor** que la implementación actual.

---

## 9. Anti-patrones

- Lógica de negocio en controllers.
- Acceso directo a base de datos desde controllers.
- DTOs sin validaciones.
- Invalidar cache sin considerar estado parcial del usuario.
- Código sin tipado explícito.

---

Este archivo tiene prioridad sobre cualquier convención implícita o suposición externa.

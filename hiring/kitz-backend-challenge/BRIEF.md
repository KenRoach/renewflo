# KitZ — Reto Backend (KitZ Lite)

> Documento para el candidato. Tiempo sugerido: **4 horas** (no más). Plazo de entrega: **5 días** desde que lo recibes.
> Puedes responder y escribir código/notas en español o inglés.

## Contexto

KitZ es un sistema operativo administrativo con IA para pymes en Latinoamérica. Nuestro primer mercado son clínicas médicas:
los pacientes escriben por WhatsApp, y KitZ convierte ese mensaje en una acción real (agendar una cita, por ejemplo).
Cobramos **$0.50 USD por transacción** completada.

En producción, los mensajes de WhatsApp llegan por webhook **duplicados, fuera de orden y a veces mal formados**.
Varias clínicas comparten la misma plataforma, y los datos médicos de una clínica **nunca** pueden ser visibles para otra.

Tu reto: construir una versión mínima de ese backend.

## Stack

- Node.js 20+ y TypeScript (obligatorio).
- Framework HTTP a tu elección (usamos Fastify y Next.js).
- PostgreSQL vía `docker-compose` (recomendado). Si eliges otra persistencia, justifícalo en `NOTES.md`.
- Puedes usar herramientas de IA (Copilot, Claude, ChatGPT…). **Indica en `NOTES.md` cómo las usaste.** En la llamada de revisión te pediremos extender el código en vivo.

## Datos semilla (obligatorio)

| clinicId   | Nombre             | API key          | Horario (America/Panama) |
|------------|--------------------|------------------|--------------------------|
| `clinic_a` | Clínica San Martín | `key_clinic_a`   | Lun–Vie 08:00–17:00      |
| `clinic_b` | Clínica del Valle  | `key_clinic_b`   | Lun–Vie 08:00–17:00      |

- Las citas duran **30 minutos** y empiezan en :00 o :30.
- Cada clínica atiende **una cita a la vez** (un solo médico).
- Secreto del webhook: `test-secret`.

## Contrato de la API (obligatorio — lo validamos con pruebas automáticas)

Tu servicio debe escuchar en el puerto definido por `PORT` (default `3000`).

### 1. `POST /webhooks/whatsapp`

Header requerido: `X-Webhook-Secret: test-secret` → si falta o es incorrecto: **401**.

```json
{
  "messageId": "wamid.123",
  "clinicId": "clinic_a",
  "from": "+50761234567",
  "text": "Hola, quiero una cita el 2026-12-01 a las 10:00",
  "timestamp": "2026-11-20T14:00:00Z"
}
```

- Cuerpo inválido (campos faltantes, `from` no E.164, clínica inexistente…) → **400**.
- Respuesta **200**:

```json
{ "status": "booked" | "slot_taken" | "invalid_slot" | "ignored" | "duplicate",
  "reply": "texto que KitZ le respondería al paciente",
  "appointmentId": "..." }
```

Reglas:
- **Idempotencia:** el mismo `messageId` puede llegar muchas veces (incluso en paralelo). Se procesa **una sola vez**; los reenvíos responden `"duplicate"` y no generan efectos.
- **Intención "agendar":** si el texto pide una cita con fecha `YYYY-MM-DD` y hora `HH:MM`, intenta agendarla.
  - Libre y dentro del horario → `"booked"`.
  - Ocupado → `"slot_taken"` y en `reply` sugiere el siguiente espacio libre.
  - Fuera de horario, en fin de semana, en el pasado o no alineado a :00/:30 → `"invalid_slot"`.
- **Sin doble reserva:** si 10 pacientes piden el mismo espacio al mismo tiempo, **exactamente uno** queda agendado.
- Cualquier otro mensaje → `"ignored"` (con un `reply` amable).
- **Opcional (suma puntos):** interpretación de texto libre ("el martes a las 10") mediante un LLM detrás de una interfaz intercambiable, **con fallback determinístico** que funciona sin API key. No es obligatorio llamar a ningún LLM real.

### 2. `GET /appointments`

Header: `Authorization: Bearer <api key>` → sin key válida: **401**. Devuelve solo las citas de la clínica dueña de la key.

```json
[{ "id": "...", "patientPhone": "+50761234567", "startsAt": "2026-12-01T15:00:00Z", "status": "booked" }]
```

### 3. `GET /appointments/:id`

Igual que arriba. Si la cita es de otra clínica → **404** (no 403: no revelamos que existe).

### 4. `GET /usage?month=YYYY-MM`

```json
{ "clinicId": "clinic_a", "month": "2026-12", "transactions": 3, "amountUsd": 1.5 }
```

- **1 transacción = 1 cita agendada con éxito** (`"booked"`), contada en el mes en que se procesó el mensaje.
- Duplicados, `slot_taken`, `invalid_slot` e `ignored` **no se cobran**.
- Un reintento **nunca** puede cobrarse dos veces.

## Entregables

1. Un repositorio Git (GitHub/GitLab, público o privado con acceso para nosotros) con historial de commits real.
2. `README.md`: cómo levantarlo con **un comando** (`docker compose up` ideal) y cómo correr los tests.
3. Tests automatizados de lo que consideres más crítico.
4. `NOTES.md` (máx. 1 página):
   - Decisiones y trade-offs.
   - Cómo escalarías esto a **1,000 clínicas × 300 mensajes/día**, manteniendo el costo de infraestructura + IA en **≤ $0.15 por transacción**.
   - Qué harías con más tiempo.
   - Cómo usaste herramientas de IA.

## Qué evaluamos

Corrección del contrato, manejo de duplicados y concurrencia, cobro correcto, aislamiento entre clínicas, calidad de tests,
claridad del código y criterio en `NOTES.md`. **No** evaluamos UI, ni features extra fuera del contrato.

Después de tu entrega haremos una llamada de 45 minutos para revisar tu código y extenderlo juntos.

¿Dudas? Responde al correo. Asumir algo razonable y documentarlo en `NOTES.md` también es válido.

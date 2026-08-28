# Buenas Prácticas para Endpoints Asíncronos en FastAPI

A continuación se presentan 3 buenas prácticas clave al trabajar con endpoints asíncronos en FastAPI:

---

### 1. Usa `async def` solo cuando utilices operaciones asíncronas (`await`)
* **Por qué:** Si declaras una función como `async def` pero ejecutas código bloqueante tradicional (ej. `time.sleep()`, la librería `requests` o un ORM síncrono), bloquearás todo el bucle de eventos (*event loop*).
* **Solución:** Si tu endpoint realiza operaciones I/O bloqueantes de manera síncrona, decláralo como un `def` normal. FastAPI lo ejecutará automáticamente en un *thread pool* sin congelar el servidor.

---

### 2. Utiliza clientes y drivers totalmente asíncronos
* **Por qué:** Para sacar el máximo beneficio de la asincronía, toda la cadena de I/O (bases de datos, peticiones HTTP externas, lectura de archivos) debe ser asíncrona.
* **Solución:** 
  * Usa **`httpx.AsyncClient`** o **`aiohttp`** en lugar de `requests`.
  * Usa drivers de BD con soporte asíncrono como **`asyncpg`**, **`SQLAlchemy (async session)`** o **`Tortoise ORM`**.
  * Usa **`aiofiles`** para lectura/escritura de archivos.

---

### 3. Delega tareas pesadas o secundarias a `BackgroundTasks` o colas de tareas
* **Por qué:** Operaciones que no son necesarias para responder inmediatamente al usuario (como enviar correos electrónicos, procesar imágenes o registrar auditorías) no deben demorar la respuesta del endpoint.
* **Solución:** Utiliza la clase `BackgroundTasks` integrada de FastAPI o herramientas externas como Celery/Taskiq para delegar el procesamiento en segundo plano y responder al cliente de forma instantánea.

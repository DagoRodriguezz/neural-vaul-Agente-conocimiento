# Usa una imagen ligera de Python
FROM python:3.12-slim

# Define el directorio de trabajo
WORKDIR /app

# Copia los archivos de requerimientos e instala dependencias sin usar caché
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto del código del backend
COPY . .

# Comando de inicio del servidor FastAPI
CMD ["uvicorn", "api.server:app", "--host", "0.0.0.0", "--port", "8000"]

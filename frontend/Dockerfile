# Etapa 1 (Build): Entorno Node para compilar
FROM node:20-alpine AS build

# Define el directorio de trabajo
WORKDIR /app

# Copia los archivos de configuración e instala dependencias
COPY package.json package-lock.json* ./
RUN npm install

# Copia el código fuente y ejecuta el build
COPY . .
RUN npm run build

# Etapa 2 (Producción): Servidor Nginx ligero
FROM nginx:alpine

# Copia los archivos compilados desde la etapa anterior al directorio html de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Expone el puerto 80
EXPOSE 80

# Inicia Nginx
CMD ["nginx", "-g", "daemon off;"]

# Dockerfile
# Usar una imagen base oficial de Node.js (elige una versión LTS)
FROM node:18-alpine AS base

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json (o yarn.lock)
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production

# Copiar el resto del código de la aplicación
COPY . .

# Exponer el puerto en el que corre la aplicación (el mismo que en server.js)
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD [ "node", "server.js" ]
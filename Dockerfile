# Usamos una imagen de Node.js liviana
FROM node:18-slim

# Instalamos las dependencias del sistema: FFmpeg, Python3 y wget
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Instalamos yt-dlp de forma global
RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Creamos el directorio de la app
WORKDIR /usr/src/app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos las librerías de Node
RUN npm install --production

# Copiamos el resto del código
COPY . .

# Comando para arrancar el bot
CMD [ "node", "index.js" ]
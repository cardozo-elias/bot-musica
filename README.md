# Musicardi Core - High-Performance Audio Engine

Musicardi Core es un servicio de backend para Discord diseñado para la transmisión de audio de alta fidelidad y la automatización musical. Desarrollado en Node.js, implementa FFmpeg para el procesamiento de señal en tiempo real y cuenta con un Motor Dual de recomendación impulsado por bases de datos relacionales.

## Características Principales

* **Streaming JIT (Just-In-Time):** Resolución y transmisión de audio crudo desde YouTube, Spotify, Apple Music y Tidal utilizando `yt-dlp` y `@discordjs/voice`.
* **Motor de Automatización Dual:** Sistema de cola infinita que alterna algorítmicamente entre un modo Strict (discografía de artistas cacheados) y un modo Discovery (análisis de géneros).
* **Procesamiento Acústico en Tiempo Real:** Filtros de audio dinámicos (Bassboost, 8D Audio, Nightcore) aplicados directamente sobre el stream buffer mediante FFmpeg.
* **Renderizado Gráfico en Memoria:** Generación de tarjetas de reproducción dinámicas utilizando `Canvas` y `Node-Vibrant` para la extracción de paletas de color en tiempo real.
* **Sincronización vía WebSockets:** Emisión de estado, telemetría y metadatos de reproducción para clientes web externos.
* **Gestión de Recursos (Eco-Mode):** Destrucción automática de subprocesos y liberación de memoria cuando los canales de voz detectan inactividad.

## Stack Tecnológico

* **Entorno:** Node.js
* **Framework:** Discord.js (v14)
* **Audio Engine:** `@discordjs/voice`, FFmpeg, yt-dlp
* **Base de Datos:** PostgreSQL (`pg`)
* **Protocolo de Red:** Socket.io (Server)
* **APIs de Metadatos:** iTunes Search API, Genius API, LRCLib, Tidal API

## Requisitos del Sistema

El entorno de despliegue debe contar con las siguientes dependencias configuradas en el PATH del sistema:
1. Node.js (v18.x o superior)
2. FFmpeg
3. yt-dlp
4. Instancia de PostgreSQL activa

## Configuración del Entorno

Crear un archivo `.env` en el directorio raíz con la siguiente estructura:

```env
TOKEN=tu_token_de_discord
DATABASE_URL=postgresql://usuario:password@localhost:5432/musicardi
NEXT_PUBLIC_BOT_URL=http://localhost:3001

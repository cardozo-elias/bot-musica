require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrateData() {
    try {
        console.log("⏳ Iniciando la migración de datos locales a Supabase...");

        // 1. Migrar la Blacklist
        const blacklistFile = path.resolve(__dirname, 'blacklist.json');
        if (fs.existsSync(blacklistFile)) {
            const blacklist = JSON.parse(fs.readFileSync(blacklistFile, 'utf8'));
            let blCount = 0;
            for (const term of blacklist) {
                // El ON CONFLICT evita que se dupliquen términos si ya existen
                await pool.query('INSERT INTO blacklist (term) VALUES ($1) ON CONFLICT DO NOTHING', [term.toLowerCase()]);
                blCount++;
            }
            console.log(`✅ Blacklist: Se evaluaron ${blCount} términos.`);
        } else {
            console.log("⚠️ No se encontró blacklist.json, saltando...");
        }

        // 2. Migrar los Likes
        const likesFile = path.resolve(__dirname, 'liked_songs.json');
        if (fs.existsSync(likesFile)) {
            const userLikes = JSON.parse(fs.readFileSync(likesFile, 'utf8'));
            let likesAgregados = 0;
            let likesOmitidos = 0;

            for (const [userId, songs] of Object.entries(userLikes)) {
                for (const song of songs) {
                    // Chequeamos si la canción ya está en la DB para ese usuario (ej: la que guardaste recién de prueba)
                    const check = await pool.query('SELECT id FROM likes WHERE user_id = $1 AND video_id = $2', [userId, song.videoId]);
                    
                    if (check.rows.length === 0) {
                        await pool.query('INSERT INTO likes (user_id, video_id, title, artist) VALUES ($1, $2, $3, $4)', 
                            [userId, song.videoId, song.title, song.artist || 'Unknown']);
                        likesAgregados++;
                    } else {
                        likesOmitidos++;
                    }
                }
            }
            console.log(`✅ Likes: ${likesAgregados} migraciones exitosas (${likesOmitidos} omitidos por estar duplicados).`);
        } else {
            console.log("⚠️ No se encontró liked_songs.json, saltando...");
        }

        console.log("🎉 ¡Migración completada con éxito!");
        process.exit(0); // Cierra el script
    } catch (error) {
        console.error("❌ Error crítico durante la migración:", error);
        process.exit(1);
    }
}

migrateData();
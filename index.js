require('dotenv').config();
const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    NoSubscriberBehavior,
    VoiceConnectionStatus
} = require('@discordjs/voice');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const yts = require('yt-search');
const Genius = require("genius-lyrics");
const GeniusClient = new Genius.Client(process.env.GENIUS_TOKEN); 
const { getTracks } = require('spotify-url-info')(require('undici').fetch);
const { Pool } = require('pg');



const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

});

let globalBlacklist = [];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const downloadDir = path.resolve(__dirname, 'downloads');
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

const MSG_LIFETIME = 15000; 

const serverQueue = {
    songs: [],
    history: [],
    titleHistory: [],
    playedHistory: [],
    connection: null,
    textChannel: null,
    voiceChannel: null,
    playing: false,
    autoplay: false,
    lastSong: null
};

const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play }
});

const commandsDef = [
    { name: 'play', description: 'Reproducir (YouTube/Spotify)', options: [{ type: 3, name: 'query', description: 'URL o búsqueda', required: true }] },
    { name: 'join', description: 'Unirse al canal de voz' },
    { name: 'search', description: 'Buscar 10 opciones', options: [{ type: 3, name: 'query', description: 'Búsqueda', required: true }] },
    { name: 'remove', description: 'Quitar de la cola', options: [{ type: 4, name: 'posicion', description: 'Número en la cola', required: true }] },
    { name: 'blacklist', description: 'Gestionar Blacklist', options: [{ type: 3, name: 'accion', description: 'add, remove, list', required: true, choices: [{name: 'add', value: 'add'}, {name: 'remove', value: 'remove'}, {name: 'list', value: 'list'}] }, { type: 3, name: 'termino', description: 'Término a bloquear', required: false }] },
    { name: 'like', description: 'Guardar favorito' },
    { name: 'list', description: 'Ver tus favoritos' },
    { name: 'removeliked', description: 'Borrar favorito', options: [{ type: 4, name: 'indice', description: 'Número en tu lista', required: true }] },
    { name: 'playliked', description: 'Reproducir tus favoritos' },
    { name: 'shuffle', description: 'Mezclar cola' },
    { name: 'song', description: 'Panel interactivo de reproducción actual' },
    { name: 'lyrics', description: 'Letra de la canción', options: [{ type: 3, name: 'query', description: 'Opcional: Artista y Canción', required: false }] },
    { name: 'stats', description: 'Top artistas y mayor melómano' },
    { name: 'history', description: 'Ver las últimas 10 canciones que sonaron' },
    { name: 'skip', description: 'Saltar tema' },
    { name: 'queue', description: 'Ver cola' },
    { name: 'autoplay', description: 'Activar/Desactivar Autoplay Infinito' },
    { name: 'stop', description: 'Detener todo y desconectar' }
];

client.once(Events.ClientReady, async c => {
    console.log(`[ONLINE] Sesión iniciada como ${c.user.tag}`);
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS likes (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                video_id VARCHAR(50) NOT NULL,
                title VARCHAR(255),
                artist VARCHAR(255)
            );
            CREATE TABLE IF NOT EXISTS blacklist (
                id SERIAL PRIMARY KEY,
                term VARCHAR(255) UNIQUE NOT NULL
            );
        `);
        
        const blRes = await pool.query('SELECT term FROM blacklist');
        globalBlacklist = blRes.rows.map(row => row.term);
        if(globalBlacklist.length === 0) {
            const defaults = ["howdytoons", "parody", "short"];
            for (let term of defaults) {
                await pool.query('INSERT INTO blacklist (term) VALUES ($1) ON CONFLICT DO NOTHING', [term]);
                globalBlacklist.push(term);
            }
        }

        await client.application.commands.set(commandsDef);
        console.log(`[SISTEMA] Base de datos conectada y comandos registrados.`);
    } catch (error) { console.error(`[ERROR INICIALIZACIÓN]:`, error); }
});

const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const createProgressBar = (currentSeconds, totalSeconds, size = 20) => {
    if (totalSeconds === 0) return `[${'🔘' + '▬'.repeat(size - 1)}]`;
    const progress = Math.round((currentSeconds / totalSeconds) * size);
    const emptyProgress = size - progress;
    return `[${'▬'.repeat(Math.max(0, progress - 1))}🔘${'▬'.repeat(Math.max(0, emptyProgress))}]`;
};

const sendAndPurge = (target, content, timeout = MSG_LIFETIME) => {
    const channel = target.channel || target;
    if (!channel || typeof channel.send !== 'function') return;
    channel.send(content).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), timeout);
    }).catch(() => {});
};

const cleanArtistName = (name) => name.replace(/VEVO$| - Topic$|官方頻道$|Oficial$|Official$/i, '').trim();

const cleanSongName = (name) => {
    return name.toLowerCase().replace(/\(.*\)|\[.*\]/g, '').replace(/official video|music video|lyric video|video oficial|hd|4k/gi, '').replace(/remastered|remaster|live|en vivo/gi, '').trim();
};

const createSong = (video, artistOverride = null) => {
    const artist = artistOverride || cleanArtistName(video.author?.name || "Unknown Artist");
    const safeUrl = video.url || `https://www.youtube.com/watch?v=${video.videoId}`;
    return {
        title: video.title, artist: artist, url: safeUrl,
        durationStr: video.timestamp || "0:00", durationSec: video.seconds || 0,
        videoId: video.videoId, absolutePath: path.join(downloadDir, `${video.videoId}.mp3`)
    };
};

async function playNext() {
    if (serverQueue.songs.length === 0) {
        if (serverQueue.autoplay && serverQueue.lastSong) {
            try {
                let artistSeed = serverQueue.lastSong.artist || "Music";
                let activeUserIds = [];
                
                if (serverQueue.voiceChannel) {
                    serverQueue.voiceChannel.members.forEach(member => {
                        if (!member.user.bot) activeUserIds.push(member.id);
                    });
                }
                let activeLikes = [];
                if (activeUserIds.length > 0) {
                    const { rows } = await pool.query('SELECT * FROM likes WHERE user_id = ANY($1::varchar[])', [activeUserIds]);
                    activeLikes = rows;
                }

                if (serverQueue.titleHistory.length % 5 === 0 && activeLikes.length > 0) {
                    artistSeed = activeLikes[Math.floor(Math.random() * activeLikes.length)].artist;
                }

                if (serverQueue.textChannel) sendAndPurge(serverQueue.textChannel, `Autoplay: Buscando música de ${artistSeed}...`);
                
                const r = await yts(`${artistSeed} official audio music`);
                let results = r.videos.slice(0, 30);
                for (let i = results.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [results[i], results[j]] = [results[j], results[i]];
                }

                let nextVideo = results.find(v => {
                    const vTitle = v.title.toLowerCase();
                    const vClean = cleanSongName(v.title);
                    const vAuthor = v.author.name.toLowerCase();
                    const isNewID = !serverQueue.history.includes(v.videoId);
                    const isNewTitle = !serverQueue.titleHistory.some(h => vClean.includes(h) || h.includes(vClean));
                    const notBlacklisted = !globalBlacklist.some(term => vTitle.includes(term.toLowerCase()));
                    const belongsToArtist = vAuthor.includes(artistSeed.toLowerCase()) || vTitle.includes(artistSeed.toLowerCase());
                    return isNewID && isNewTitle && notBlacklisted && belongsToArtist && v.seconds > 60 && v.seconds < 1200;
                });

                if (!nextVideo && activeLikes.length > 0) {
                    const randomLiked = activeLikes[Math.floor(Math.random() * activeLikes.length)];
                    artistSeed = randomLiked.artist;
                    if (serverQueue.textChannel) sendAndPurge(serverQueue.textChannel, `Autoplay: Cambiando al artista favorito de alguien en el canal: ${artistSeed}`);
                    const fallbackRes = await yts(`${artistSeed} official music`);
                    nextVideo = fallbackRes.videos.find(v => !serverQueue.history.includes(v.videoId) && v.seconds < 1200);
                }

                if (!nextVideo) {
                    const emergencyRes = await yts(`${artistSeed} tracks`);
                    nextVideo = emergencyRes.videos.find(v => !serverQueue.history.includes(v.videoId) && v.seconds < 1200);
                }

                if (nextVideo) {
                    serverQueue.songs.push(createSong(nextVideo));
                    return playNext();
                }
            } catch (e) { console.error("Error Autoplay:", e); }
        }
        serverQueue.playing = false; return;
    }

    const song = serverQueue.songs[0];
    serverQueue.lastSong = song;

    if (!fs.existsSync(song.absolutePath)) {
        if (serverQueue.textChannel) sendAndPurge(serverQueue.textChannel, `Descargando: ${song.title}...`);
        const cmd = `.\\yt-dlp.exe -x --audio-format mp3 --no-playlist --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -o "${song.absolutePath}" "${song.url}"`;
        exec(cmd, (err) => {
            if (err) {
                console.error(`[ERROR yt-dlp]`, err.message);
                serverQueue.songs.shift();
                return playNext();
            }
            startStream(song);
        });
    } else {
        startStream(song);
    }
}

function startStream(song) {
    try {
        const resource = createAudioResource(fs.createReadStream(song.absolutePath));
        player.play(resource);
        serverQueue.playing = true;
        
        serverQueue.history.push(song.videoId);
        serverQueue.titleHistory.push(cleanSongName(song.title));
        serverQueue.playedHistory.push(`${song.title} - ${song.artist}`); 
        
        if (serverQueue.history.length > 50) { serverQueue.history.shift(); serverQueue.titleHistory.shift(); }
        if (serverQueue.playedHistory.length > 10) serverQueue.playedHistory.shift();

        if (serverQueue.textChannel) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('pause_resume').setLabel('⏸️ Pausar').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('skip_song').setLabel('⏭️ Saltar').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('like_song').setLabel('❤️ Guardar').setStyle(ButtonStyle.Success)
            );
            serverQueue.textChannel.send({ content: `🎶 Reproduciendo: **${song.title}**`, components: [row] })
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), MSG_LIFETIME));
        }
    } catch (error) {
        console.error(`[CRITICAL] Error de stream:`, error.message);
        serverQueue.songs.shift();
        playNext();
    }
}

player.on(AudioPlayerStatus.Idle, () => {
    const finishedSong = serverQueue.songs.shift();
    if (finishedSong && fs.existsSync(finishedSong.absolutePath)) { fs.unlink(finishedSong.absolutePath, () => {}); }
    playNext();
});

client.on(Events.InteractionCreate, async interaction => {
    
    if (interaction.isButton()) {
        const userId = interaction.user.id;
        
        if (interaction.customId === 'pause_resume') {
            if (player.state.status === AudioPlayerStatus.Playing) { player.pause(); await interaction.reply({ content: "⏸️ Audio pausado.", ephemeral: true }); } 
            else if (player.state.status === AudioPlayerStatus.Paused) { player.unpause(); await interaction.reply({ content: "▶️ Audio reanudado.", ephemeral: true }); } 
            else { await interaction.reply({ content: "❌ Nada sonando.", ephemeral: true }); }
        }
        
        if (interaction.customId === 'skip_song') {
            if (!serverQueue.playing) return interaction.reply({ content: "❌ Nada sonando.", ephemeral: true });
            player.stop();
            await interaction.reply({ content: "⏭️ Tema saltado.", ephemeral: true });
        }

        if (interaction.customId === 'like_song') {
            if (!serverQueue.lastSong) return interaction.reply({ content: "❌ Nada sonando.", ephemeral: true });
            const check = await pool.query('SELECT id FROM likes WHERE user_id = $1 AND video_id = $2', [userId, serverQueue.lastSong.videoId]);
            if (check.rows.length > 0) return interaction.reply({ content: "⚠️ Ya está en favoritos.", ephemeral: true });
            
            await pool.query('INSERT INTO likes (user_id, video_id, title, artist) VALUES ($1, $2, $3, $4)', 
                [userId, serverQueue.lastSong.videoId, serverQueue.lastSong.title, serverQueue.lastSong.artist]);
            await interaction.reply({ content: `❤️ Favorito añadido: **${serverQueue.lastSong.title}**`, ephemeral: true });
        }
        return; 
    }

    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply();

    const command = interaction.commandName;
    const userId = interaction.user.id;

    if (["play", "join", "search", "playliked"].includes(command)) {
        const vc = interaction.member.voice.channel;
        if (!vc) return interaction.editReply("❌ Entra a un canal de voz primero.");
        serverQueue.textChannel = interaction.channel;
        serverQueue.voiceChannel = vc;

        if (!serverQueue.connection || serverQueue.connection.state.status === VoiceConnectionStatus.Destroyed) {
            serverQueue.connection = joinVoiceChannel({ channelId: vc.id, guildId: interaction.guild.id, adapterCreator: interaction.guild.voiceAdapterCreator });
            serverQueue.connection.on(VoiceConnectionStatus.Ready, () => { serverQueue.connection.subscribe(player); });
        }
    }

    if (command === "join") return interaction.editReply("✅ Me he unido al canal.");

    if (command === "play") {
        const query = interaction.options.getString('query');
        if (query.includes("spotify.com")) {
            try {
                const tracks = await getTracks(query);
                for (const track of tracks) {
                    const artist = track.artist || (track.artists ? track.artists[0].name : "Unknown");
                    const r = await yts(`${track.name} ${artist} official audio`);
                    if (r.videos[0]) serverQueue.songs.push(createSong(r.videos[0], artist));
                }
                interaction.editReply(`✅ Spotify añadido correctamente.`);
                if (!serverQueue.playing) playNext();
            } catch (e) { interaction.editReply("❌ Error procesando Spotify."); }
        } else {
            const r = await yts(query);
            if (!r.videos.length) return interaction.editReply("❌ Sin resultados.");
            serverQueue.songs.push(createSong(r.videos[0]));
            if (!serverQueue.playing) playNext(); 
            interaction.editReply(`✅ Tema añadido: **${r.videos[0].title}**`);
        }
    }

    if (command === "search") {
        const query = interaction.options.getString('query');
        const r = await yts(query);
        const videos = r.videos.slice(0, 10);
        if (!videos.length) return interaction.editReply("❌ Sin resultados.");
        
        const list = videos.map((v, i) => `**${i + 1}.** ${v.title} (${v.timestamp})`).join("\n");
        const searchMsg = await interaction.editReply(`Resultados (tienes 30s para escribir un número en el chat):\n${list}`);
        
        const filter = m => m.author.id === userId && !isNaN(m.content) && m.content >= 1 && m.content <= videos.length;
        const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });
        
        collector.on('collect', m => {
            const video = videos[parseInt(m.content) - 1];
            serverQueue.songs.push(createSong(video));
            interaction.followUp(`✅ Seleccionado y añadido: **${video.title}**`).then(msg => setTimeout(() => msg.delete().catch(()=>{}), 10000));
            searchMsg.delete().catch(() => {}); m.delete().catch(() => {});
            if (!serverQueue.playing) playNext();
        });
    }

    if (command === "blacklist") {
        const action = interaction.options.getString('accion');
        const term = interaction.options.getString('termino');
        
        if (action === "add" && term) { 
            const t = term.toLowerCase();
            await pool.query('INSERT INTO blacklist (term) VALUES ($1) ON CONFLICT DO NOTHING', [t]);
            globalBlacklist.push(t);
            interaction.editReply(`✅ Añadido a la blacklist: ${t}`); 
        }
        else if (action === "remove" && term) { 
            const t = term.toLowerCase();
            await pool.query('DELETE FROM blacklist WHERE term = $1', [t]);
            globalBlacklist = globalBlacklist.filter(x => x !== t);
            interaction.editReply(`✅ Removido de la blacklist: ${t}`); 
        }
        else { interaction.editReply(`📋 **Blacklist actual:**\n${globalBlacklist.join(", ")}`); }
    }

    if (command === "remove") {
        const index = interaction.options.getInteger('posicion') - 1;
        if (index < 0 || !serverQueue.songs[index]) return interaction.editReply("❌ Posición inválida.");
        const removed = serverQueue.songs.splice(index, 1);
        interaction.editReply(`🗑️ Eliminado de la cola: ${removed[0].title}`);
    }

    if (command === "like") {
        if (!serverQueue.lastSong) return interaction.editReply("❌ Nada sonando.");
        const check = await pool.query('SELECT id FROM likes WHERE user_id = $1 AND video_id = $2', [userId, serverQueue.lastSong.videoId]);
        if (check.rows.length > 0) return interaction.editReply("⚠️ Ya está en favoritos.");
        
        await pool.query('INSERT INTO likes (user_id, video_id, title, artist) VALUES ($1, $2, $3, $4)', 
            [userId, serverQueue.lastSong.videoId, serverQueue.lastSong.title, serverQueue.lastSong.artist]);
        interaction.editReply(`❤️ Favorito añadido: **${serverQueue.lastSong.title}**`);
    }

    if (command === "list") {
        const res = await pool.query('SELECT title FROM likes WHERE user_id = $1 ORDER BY id ASC', [userId]);
        if (res.rows.length === 0) return interaction.editReply("❌ Tu lista está vacía.");
        const text = res.rows.map((s, i) => `**${i + 1}.** ${s.title}`).join("\n");
        interaction.editReply(`📜 **Tus favoritos:**\n${text.substring(0, 1900)}`);
    }

    if (command === "removeliked") {
        const index = interaction.options.getInteger('indice') - 1;
        const res = await pool.query('SELECT id, title FROM likes WHERE user_id = $1 ORDER BY id ASC', [userId]);
        if (index < 0 || !res.rows[index]) return interaction.editReply("❌ Favorito inválido.");
        
        await pool.query('DELETE FROM likes WHERE id = $1', [res.rows[index].id]);
        interaction.editReply(`🗑️ Removido de tus favoritos: ${res.rows[index].title}`);
    }

    if (command === "playliked") {
        const res = await pool.query('SELECT video_id as "videoId", title, artist FROM likes WHERE user_id = $1 ORDER BY id ASC', [userId]);
        if (res.rows.length === 0) return interaction.editReply("❌ No tienes favoritos.");
        for (const s of res.rows) {
            serverQueue.songs.push({ title: s.title, artist: s.artist, videoId: s.videoId, url: `https://www.youtube.com/watch?v=${s.videoId}`, absolutePath: path.join(downloadDir, `${s.videoId}.mp3`) });
        }
        interaction.editReply(`✅ Tus favoritos han sido añadidos a la cola.`);
        if (!serverQueue.playing) playNext();
    }

    if (command === "stats") {
        const totalRes = await pool.query('SELECT COUNT(*) FROM likes');
        if (totalRes.rows[0].count == 0) return interaction.editReply("❌ Aún no hay favoritos en el servidor.");

        const topUserRes = await pool.query('SELECT user_id, COUNT(*) as count FROM likes GROUP BY user_id ORDER BY count DESC LIMIT 1');
        const topArtistsRes = await pool.query('SELECT artist, COUNT(*) as count FROM likes GROUP BY artist ORDER BY count DESC LIMIT 10');

        let statsMsg = `📊 **Estadísticas Globales del Servidor** 📊\nTotal de canciones: **${totalRes.rows[0].count}**\n`;
        if (topUserRes.rows.length > 0) statsMsg += `**Usuario con mayores likes:** <@${topUserRes.rows[0].user_id}> con **${topUserRes.rows[0].count}** favoritos.\n\n`;
        
        statsMsg += `**Top 10 Artistas:**\n`;
        topArtistsRes.rows.forEach((row, index) => { statsMsg += `**${index + 1}.** ${row.artist} — ${row.count} likes\n`; });
        interaction.editReply(statsMsg);
    }

    if (command === "history") {
        if (serverQueue.playedHistory.length === 0) return interaction.editReply("❌ El historial está vacío.");
        const historyText = serverQueue.playedHistory.map((s, i) => `**${i + 1}.** ${s}`).join("\n");
        interaction.editReply(`**Últimas 10 canciones:**\n${historyText}`);
    }

    if (command === "shuffle") {
        if (serverQueue.songs.length < 3) return interaction.editReply("Cola insuficiente.");
        const current = serverQueue.songs.shift();
        for (let i = serverQueue.songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [serverQueue.songs[i], serverQueue.songs[j]] = [serverQueue.songs[j], serverQueue.songs[i]];
        }
        serverQueue.songs.unshift(current); interaction.editReply("🔀 Cola mezclada.");
    }

    if (command === "song") {
        if (!serverQueue.playing || !serverQueue.lastSong) return interaction.editReply("❌ Nada sonando.");
        const currentMs = player.state.resource ? player.state.resource.playbackDuration : 0;
        const currentStr = formatTime(currentMs);
        const totalSecs = serverQueue.lastSong.durationSec || 0;
        const bar = createProgressBar(currentMs / 1000, totalSecs);
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pause_resume').setLabel(player.state.status === AudioPlayerStatus.Paused ? '▶️ Reanudar' : '⏸️ Pausar').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('skip_song').setLabel('⏭️ Saltar').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('like_song').setLabel('❤️ Guardar').setStyle(ButtonStyle.Success)
        );
        interaction.editReply({ content: `**Sonando ahora:** ${serverQueue.lastSong.title}\n${bar} \`[${currentStr} / ${serverQueue.lastSong.durationStr}]\``, components: [row] });
    }

    if (command === "lyrics") {
        let query = interaction.options.getString('query');
        if (!query) {
            if (serverQueue.lastSong) query = `${cleanArtistName(serverQueue.lastSong.artist)} ${cleanSongName(serverQueue.lastSong.title)}`;
            else return interaction.editReply("❌ Nada sonando.");
        }
        try {
            let searchRes = await GeniusClient.songs.search(query);
            if (!searchRes.length && serverQueue.lastSong) searchRes = await GeniusClient.songs.search(cleanSongName(serverQueue.lastSong.title));
            if (!searchRes.length) return interaction.editReply("❌ Letra no encontrada.");
            let lyrics = await searchRes[0].lyrics();
            if (lyrics.includes('[')) lyrics = lyrics.substring(lyrics.indexOf('['));
            const quoted = lyrics.split('\n').map(l => `> ${l}`).join('\n');
            interaction.editReply(`**Letra de ${searchRes[0].title}:**\n\n${quoted.substring(0, 1900)}`);
        } catch (e) { interaction.editReply("❌ Error en Genius."); }
    }

    if (command === "skip") { 
        if (!serverQueue.playing) return interaction.editReply("❌ Nada sonando."); 
        player.stop(); interaction.editReply("⏭️ Tema saltado."); 
    }
    
    if (command === "queue") {
        if (serverQueue.songs.length === 0) return interaction.editReply("❌ Cola vacía.");
        const list = serverQueue.songs.slice(0, 10).map((s, i) => `**${i+1}.** ${s.title}`).join("\n");
        interaction.editReply(`**Cola actual:**\n${list}`);
    }

    if (command === "autoplay") {
        serverQueue.autoplay = !serverQueue.autoplay;
        interaction.editReply(`Autoplay: **${serverQueue.autoplay ? "activado" : "desactivado"}**`);
    }

    if (command === "stop") {
        serverQueue.songs = []; serverQueue.history = []; serverQueue.titleHistory = [];
        serverQueue.autoplay = false; player.stop();
        if (serverQueue.connection) serverQueue.connection.destroy();
        serverQueue.connection = null; serverQueue.playing = false;
        interaction.editReply("Sistema detenido.");
    }
});

client.login(process.env.TOKEN);
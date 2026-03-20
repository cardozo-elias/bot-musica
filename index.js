require('dotenv').config();
const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
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

// Mensajes se eliminan a los 20 segundos
const MSG_LIFETIME = 20000;

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
    { name: 'stats', description: 'Top artistas y usuario con mayores likes' },
    { name: 'history', description: 'Ver las últimas 10 canciones que sonaron' },
    { name: 'skip', description: 'Saltar tema' },
    { name: 'queue', description: 'Ver cola' },
    { name: 'autoplay', description: 'Activar/Desactivar Autoplay Infinito' },
    { name: 'stop', description: 'Detener todo y desconectar' },
    { name: 'help', description: 'Muestra la lista de comandos y cómo usarlos' }
];

client.once(Events.ClientReady, async c => {
    console.log(`[ONLINE] Sesion iniciada como ${c.user.tag}`);
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
        console.log(`[SISTEMA] Base de datos conectada.`);
    } catch (error) { console.error(error); }
});

const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const createProgressBar = (currentSeconds, totalSeconds, size = 20) => {
    if (totalSeconds === 0) return `[${'O' + '▬'.repeat(size - 1)}]`;
    const progress = Math.round((currentSeconds / totalSeconds) * size);
    const emptyProgress = size - progress;
    return `[${'▬'.repeat(Math.max(0, progress - 1))}O${'▬'.repeat(Math.max(0, emptyProgress))}]`;
};

const sendAndPurge = (target, content, timeout = MSG_LIFETIME) => {
    const channel = target.channel || target;
    if (!channel || typeof channel.send !== 'function') return;
    channel.send(content).then(msg => {
        if (timeout > 0) setTimeout(() => msg.delete().catch(() => {}), timeout);
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
    // FIX AUTOPLAY: Solo buscamos si realmente no hay nada mas en cola
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

                const r = await yts(`${artistSeed} official audio music`);
                let nextVideo = r.videos.find(v => !serverQueue.history.includes(v.videoId) && v.seconds > 60 && v.seconds < 1200);

                if (nextVideo) {
                    serverQueue.songs.push(createSong(nextVideo));
                    // Continuamos directamente al proceso de reproduccion
                } else {
                    serverQueue.playing = false;
                    return;
                }
            } catch (e) { 
                serverQueue.playing = false;
                return;
            }
        } else {
            serverQueue.playing = false;
            return;
        }
    }

    const song = serverQueue.songs[0];
    serverQueue.lastSong = song;

    if (!fs.existsSync(song.absolutePath)) {
        // windowsHide: true evita que salte el CMD
        const cmd = `.\\yt-dlp.exe -x --audio-format mp3 --no-playlist --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -o "${song.absolutePath}" "${song.url}"`;
        exec(cmd, { windowsHide: true }, (err) => {
            if (err) {
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

        // Establecer estado de voz con emoji de musica (segun tu pedido de mantener funcionalidad)
        if (serverQueue.voiceChannel) {
            serverQueue.voiceChannel.setVoiceStatus(`🎵 Sonando: ${song.title}`.substring(0, 100)).catch(() => {});
        }

        if (serverQueue.textChannel) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('pause_resume').setLabel('⏸️ Pausar').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('skip_song').setLabel('⏭️ Saltar').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('like_song').setLabel('❤️ Guardar').setStyle(ButtonStyle.Success)
            );
            sendAndPurge(serverQueue.textChannel, { content: `Reproduciendo: **${song.title}**`, components: [row] });
        }
    } catch (error) {
        serverQueue.songs.shift();
        playNext();
    }
}

player.on(AudioPlayerStatus.Idle, () => {
    const finishedSong = serverQueue.songs.shift();
    if (finishedSong && fs.existsSync(finishedSong.absolutePath)) { fs.unlink(finishedSong.absolutePath, () => {}); }
    
    // Limpiar estado de voz al terminar
    if (serverQueue.voiceChannel) {
        serverQueue.voiceChannel.setVoiceStatus('').catch(() => {});
    }

    if (global.gc) global.gc();
    playNext();
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isButton()) {
        const userId = interaction.user.id;
        if (interaction.customId === 'pause_resume') {
            if (player.state.status === AudioPlayerStatus.Playing) player.pause();
            else if (player.state.status === AudioPlayerStatus.Paused) player.unpause();
            await interaction.deferUpdate();
        }
        if (interaction.customId === 'skip_song') {
            player.stop();
            await interaction.deferUpdate();
        }
        if (interaction.customId === 'like_song') {
            if (!serverQueue.lastSong) return;
            await pool.query('INSERT INTO likes (user_id, video_id, title, artist) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
                [userId, serverQueue.lastSong.videoId, serverQueue.lastSong.title, serverQueue.lastSong.artist]);
            await interaction.reply({ content: "Guardado en favoritos.", ephemeral: true });
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply();

    const command = interaction.commandName;
    const userId = interaction.user.id;

    if (["play", "join", "search", "playliked"].includes(command)) {
        const vc = interaction.member.voice.channel;
        if (!vc) return interaction.editReply("Entra a un canal de voz primero.");
        serverQueue.textChannel = interaction.channel;
        serverQueue.voiceChannel = vc;
        if (!serverQueue.connection || serverQueue.connection.state.status === VoiceConnectionStatus.Destroyed) {
            serverQueue.connection = joinVoiceChannel({ channelId: vc.id, guildId: interaction.guild.id, adapterCreator: interaction.guild.voiceAdapterCreator });
            serverQueue.connection.subscribe(player);
        }
    }

    if (command === "help") {
        const helpText = commandsDef.map(c => `**/${c.name}**: ${c.description}`).join('\n');
        await interaction.editReply({ content: `Lista Completa de Comandos:\n\n${helpText}` });
    }

    if (command === "play") {
        const query = interaction.options.getString('query');
        const r = await yts(query);
        if (!r.videos.length) return interaction.editReply("Sin resultados.");
        serverQueue.songs.push(createSong(r.videos[0]));
        if (!serverQueue.playing) playNext();
        interaction.editReply(`Tema añadido: **${r.videos[0].title}**`);
    }

    if (command === "search") {
        const query = interaction.options.getString('query');
        const r = await yts(query);
        const videos = r.videos.slice(0, 10);
        if (!videos.length) return interaction.editReply("Sin resultados.");
        const list = videos.map((v, i) => `**${i + 1}.** ${v.title} (${v.timestamp})`).join("\n");
        const searchMsg = await interaction.editReply(`Resultados (30s):\n${list}`);
        const filter = m => m.author.id === userId && !isNaN(m.content) && m.content >= 1 && m.content <= videos.length;
        const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });
        collector.on('collect', m => {
            const video = videos[parseInt(m.content) - 1];
            serverQueue.songs.push(createSong(video));
            interaction.followUp(`Seleccionado: **${video.title}**`).then(msg => setTimeout(() => msg.delete().catch(()=>{}), 10000));
            searchMsg.delete().catch(() => {}); m.delete().catch(() => {});
            if (!serverQueue.playing) playNext();
        });
    }

    if (command === "blacklist") {
        const action = interaction.options.getString('accion');
        const term = interaction.options.getString('termino');
        if (action === "add" && term) {
            await pool.query('INSERT INTO blacklist (term) VALUES ($1) ON CONFLICT DO NOTHING', [term.toLowerCase()]);
            globalBlacklist.push(term.toLowerCase());
            interaction.editReply(`Añadido a la blacklist: ${term}`);
        }
        else if (action === "remove" && term) {
            await pool.query('DELETE FROM blacklist WHERE term = $1', [term.toLowerCase()]);
            globalBlacklist = globalBlacklist.filter(x => x !== term.toLowerCase());
            interaction.editReply(`Removido de la blacklist: ${term}`);
        }
        else { interaction.editReply(`Blacklist actual:\n${globalBlacklist.join(", ")}`); }
    }

    if (command === "list") {
        const res = await pool.query('SELECT title FROM likes WHERE user_id = $1 ORDER BY id ASC', [userId]);
        if (res.rows.length === 0) return interaction.editReply("Tu lista esta vacia.");
        interaction.editReply(`Tus favoritos:\n${res.rows.map((s, i) => `**${i + 1}.** ${s.title}`).join("\n").substring(0, 1900)}`);
    }

    if (command === "stop") {
        serverQueue.songs = []; serverQueue.history = [];
        serverQueue.autoplay = false; player.stop();
        if (serverQueue.connection) serverQueue.connection.destroy();
        serverQueue.connection = null; serverQueue.playing = false;
        interaction.editReply("Sistema detenido.");
    }

    if (command === "skip") {
        if (!serverQueue.playing) return interaction.editReply("Nada sonando.");
        player.stop();
        interaction.editReply("Tema saltado.");
    }

    if (command === "autoplay") {
        serverQueue.autoplay = !serverQueue.autoplay;
        interaction.editReply(`Autoplay: **${serverQueue.autoplay ? "activado" : "desactivado"}**`);
    }

    if (!["lyrics", "stats", "list", "history", "queue", "help"].includes(command)) {
        setTimeout(() => interaction.deleteReply().catch(() => {}), MSG_LIFETIME);
    }
});

client.login(process.env.TOKEN);
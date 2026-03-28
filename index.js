require('dotenv').config();
const { 
    Client, GatewayIntentBits, Events, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder
} = require('discord.js');
const {
    joinVoiceChannel, createAudioPlayer, createAudioResource,
    AudioPlayerStatus, NoSubscriberBehavior, VoiceConnectionStatus
} = require('@discordjs/voice');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const yts = require('yt-search');
const Genius = require("genius-lyrics");
const GeniusClient = new Genius.Client(process.env.GENIUS_TOKEN);
const { getTracks } = require('spotify-url-info')(require('undici').fetch);
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// --- DICCIONARIO DE IDIOMAS (i18n) ---
const i18n = {
    'es': {
        welcome_title: "¡Gracias por invitarme! 🎵",
        welcome_desc: "Por favor, un Administrador debe seleccionar el idioma principal para los mensajes del bot en este servidor.\n*(Los comandos con / se traducirán automáticamente según tu cliente de Discord).*\n\nPuedes cambiarlo luego usando `/language`.",
        saved: "✅ Idioma configurado a Español.",
        joined: "Me he unido al canal de voz.",
        no_voice: "Entra a un canal de voz primero.",
        no_results: "Sin resultados.",
        added_queue: "Añadido a la cola:",
        added_spotify: "Spotify añadido correctamente a la cola.",
        search_title: "Búsqueda:",
        search_desc: "Seleccioná una canción del menú desplegable para añadirla a la cola.",
        search_placeholder: "Elegí un tema...",
        blacklist_added: "Añadido a la blacklist:",
        blacklist_removed: "Removido de la blacklist:",
        blacklist_current: "Blacklist actual:\n",
        pos_invalid: "Posición inválida.",
        removed: "Eliminado de la cola:",
        nothing_playing: "Nada sonando.",
        already_liked: "Ya está en favoritos.",
        like_added: "Favorito añadido:",
        list_empty: "Tu lista está vacía.",
        your_likes: "Tus favoritos:\n",
        like_invalid: "Favorito inválido.",
        like_removed: "Removido de tus favoritos:",
        no_likes: "No tienes favoritos.",
        likes_queued: "Tus favoritos han sido añadidos a la cola.",
        stats_no_likes: "Aún no hay favoritos en el servidor.",
        stats_title: "Estadísticas Globales del Servidor",
        stats_total: "Total de canciones:",
        stats_top_user: "Usuario con mayores likes:",
        stats_top_artists: "Top 10 Artistas:\n",
        history_empty: "El historial está vacío.",
        history_title: "Últimas 10 canciones:\n",
        queue_insufficient: "Cola insuficiente para mezclar.",
        queue_shuffled: "Cola mezclada.",
        lyrics_not_found: "Letra no encontrada.",
        lyrics_title: "Letra de",
        skip: "Tema saltado.",
        queue_empty: "La cola está vacía en este momento.",
        queue_title: "🎶 Cola de Reproducción",
        page: "Página",
        of: "de",
        total: "Total:",
        themes: "temas",
        btn_rec: "✨ Añadir Recomendación",
        rec_title: "✨ Sugerencias de Autoplay",
        rec_desc: "Cualquiera en el canal puede tocar un botón abajo para añadir la canción a la cola:\n\n",
        rec_btn: "Añadir",
        rec_added_btn: "Añadida",
        rec_already: "Esa canción ya se añadió a la cola.",
        rec_success: "✨ El Autoplay ha añadido",
        rec_for_you: "a la cola para ti.",
        rec_fail: "❌ No encontré buenas recomendaciones.",
        autoplay_on: "Autoplay: **activado**",
        autoplay_off: "Autoplay: **desactivado**",
        stopped: "Sistema detenido.",
        downloading: "Descargando:",
        requested_by: "Pedido por:",
        artist: "Artista:",
        pause: "⏸️ Pausar",
        resume: "▶️ Reanudar",
        skip_btn: "⏭️ Saltar",
        save_btn: "❤️ Guardar",
        audio_paused: "Audio pausado.",
        audio_resumed: "Audio reanudado.",
        bot_magic: "Bot Inteligencia 🪄",
        admin_only: "❌ Solo los administradores pueden usar este comando.",
        btn_prev: "◀️",
        btn_next: "▶️",
        error_spotify: "Error procesando Spotify.",
        help_title: "📚 Panel de Comandos de Musicardi",
        help_desc: "Aquí tienes todo lo que puedo hacer por ti. Los comandos están organizados por categorías:",
        help_cat1: "🎵 Reproducción",
        help_cat1_val: "`/play` - Reproducir música\n`/skip` - Saltar tema actual\n`/stop` - Detener bot\n`/song` - Ver panel del tema actual\n`/queue` - Ver la cola de temas\n`/shuffle` - Mezclar la cola\n`/remove` - Quitar un tema\n`/lyrics` - Ver la letra",
        help_cat2: "🤖 Automatización",
        help_cat2_val: "`/autoplay` - Activar Autoplay Inteligente\n`/search` - Búsqueda interactiva\n`/blacklist` - Bloquear palabras o canales\n`/history` - Ver temas recientes",
        help_cat3: "⭐ Favoritos",
        help_cat3_val: "`/like` - Guardar el tema que suena\n`/list` - Ver tu lista\n`/removeliked` - Borrar un guardado\n`/playliked` - Poner tus temas a sonar\n`/stats` - Mejores artistas del server",
        help_cat4: "⚙️ Utilidad",
        help_cat4_val: "`/join` - Unirme al canal\n`/language` - Cambiar idioma\n`/help` - Ver este menú",
        help_footer: "💡 Tip: Usa los botones del panel /song para controlar la música más rápido."
    },
    'en': {
        welcome_title: "Thanks for inviting me! 🎵",
        welcome_desc: "Please have an Admin select the main language for the bot's messages in this server.\n*(Slash commands / will auto-translate based on your Discord client).*\n\nYou can change this later using `/language`.",
        saved: "✅ Language set to English.",
        joined: "Joined the voice channel.",
        no_voice: "Join a voice channel first.",
        no_results: "No results found.",
        added_queue: "Added to queue:",
        added_spotify: "Spotify tracks added successfully.",
        search_title: "Search:",
        search_desc: "Select a song from the dropdown menu to add it to the queue.",
        search_placeholder: "Choose a track...",
        blacklist_added: "Added to blacklist:",
        blacklist_removed: "Removed from blacklist:",
        blacklist_current: "Current blacklist:\n",
        pos_invalid: "Invalid position.",
        removed: "Removed from queue:",
        nothing_playing: "Nothing is playing.",
        already_liked: "Already in favorites.",
        like_added: "Favorite added:",
        list_empty: "Your list is empty.",
        your_likes: "Your favorites:\n",
        like_invalid: "Invalid favorite.",
        like_removed: "Removed from your favorites:",
        no_likes: "You don't have any favorites.",
        likes_queued: "Your favorites have been added to the queue.",
        stats_no_likes: "No favorites in this server yet.",
        stats_title: "Global Server Stats",
        stats_total: "Total songs:",
        stats_top_user: "User with most likes:",
        stats_top_artists: "Top 10 Artists:\n",
        history_empty: "History is empty.",
        history_title: "Last 10 songs:\n",
        queue_insufficient: "Not enough songs to shuffle.",
        queue_shuffled: "Queue shuffled.",
        lyrics_not_found: "Lyrics not found.",
        lyrics_title: "Lyrics for",
        skip: "Song skipped.",
        queue_empty: "The queue is currently empty.",
        queue_title: "🎶 Play Queue",
        page: "Page",
        of: "of",
        total: "Total:",
        themes: "tracks",
        btn_rec: "✨ Add Recommendation",
        rec_title: "✨ Autoplay Suggestions",
        rec_desc: "Anyone in the channel can click a button below to add the song to the queue:\n\n",
        rec_btn: "Add",
        rec_added_btn: "Added",
        rec_already: "That song is already in the queue.",
        rec_success: "✨ Autoplay has added",
        rec_for_you: "to the queue for you.",
        rec_fail: "❌ Couldn't find good recommendations.",
        autoplay_on: "Autoplay: **enabled**",
        autoplay_off: "Autoplay: **disabled**",
        stopped: "System stopped.",
        downloading: "Downloading:",
        requested_by: "Requested by:",
        artist: "Artist:",
        pause: "⏸️ Pause",
        resume: "▶️ Resume",
        skip_btn: "⏭️ Skip",
        save_btn: "❤️ Save",
        audio_paused: "Audio paused.",
        audio_resumed: "Audio resumed.",
        bot_magic: "Bot Magic 🪄",
        admin_only: "❌ Only administrators can use this command.",
        btn_prev: "◀️",
        btn_next: "▶️",
        error_spotify: "Error processing Spotify.",
        help_title: "📚 Command Panel",
        help_desc: "Here is everything I can do for you. Commands are organized by categories:",
        help_cat1: "🎵 Playback",
        help_cat1_val: "`/play` - Play music\n`/skip` - Skip current song\n`/stop` - Stop bot\n`/song` - View current song panel\n`/queue` - View queue\n`/shuffle` - Shuffle queue\n`/remove` - Remove a song\n`/lyrics` - View lyrics",
        help_cat2: "🤖 Automation",
        help_cat2_val: "`/autoplay` - Toggle Autoplay\n`/search` - Interactive search\n`/blacklist` - Block words/channels\n`/history` - Recently played",
        help_cat3: "⭐ Favorites",
        help_cat3_val: "`/like` - Save current song\n`/list` - View your list\n`/removeliked` - Remove saved song\n`/playliked` - Play your list\n`/stats` - Top server artists",
        help_cat4: "⚙️ Utility",
        help_cat4_val: "`/join` - Join channel\n`/language` - Change language\n`/help` - View this menu",
        help_footer: "💡 Tip: Use the buttons on the /song panel to control the music faster."
    }
};

let globalBlacklist = [];
const globalQueues = new Map();
const guildLangs = new Map();

// --- FILTRO ANTI-COMPILACIONES EXPANDIDO ---
const SPAM_WORDS = ['quiz', 'interview', 'podcast', 'reaction', 'karaoke', 'tutorial', 'cover', 'review', 'vlog', 'live', 'concert', 'unplugged', 'drum', 'bass', 'guitar', 'playthrough', 'lesson', 'behind', 'making of', 'isolated', 'vocals', 'instrumental', 'how to play', 'tablature', 'tabs', 'chords', 'full album', 'all songs', 'greatest hits', 'compilation', 'mix', 'mashup', 'playlist'];

async function getLang(guildId) {
    if (!guildId) return 'es';
    if (guildLangs.has(guildId)) return guildLangs.get(guildId);
    try {
        const res = await pool.query('SELECT language FROM server_settings WHERE guild_id = $1', [guildId]);
        const l = res.rows.length > 0 ? res.rows[0].language : 'es';
        guildLangs.set(guildId, l);
        return l;
    } catch (e) { return 'es'; }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent
    ]
});

const downloadDir = path.resolve(__dirname, 'downloads');
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

const MSG_LIFETIME = 20000;

function getQueue(guildId) {
    if (!globalQueues.has(guildId)) {
        const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });

        player.on(AudioPlayerStatus.Idle, () => {
            const q = globalQueues.get(guildId);
            if (!q) return;
            const finishedSong = q.songs.shift();
            if (finishedSong && fs.existsSync(finishedSong.absolutePath)) { fs.unlink(finishedSong.absolutePath, () => {}); }
            if (q.voiceChannel && typeof q.voiceChannel.setVoiceStatus === 'function') { q.voiceChannel.setVoiceStatus('').catch(() => {}); }
            if (q.currentMessage) { q.currentMessage.delete().catch(() => {}); q.currentMessage = null; }
            if (q.progressInterval) { clearInterval(q.progressInterval); q.progressInterval = null; }
            if (global.gc) global.gc();
            playNext(guildId);
        });

        globalQueues.set(guildId, {
            songs: [], history: [], titleHistory: [], playedHistory: [],
            connection: null, textChannel: null, voiceChannel: null,
            playing: false, autoplay: false, lastSong: null,
            currentMessage: null, progressInterval: null, player: player
        });
    }
    return globalQueues.get(guildId);
}

const commandsDef = [
    { 
        name: 'play', description: 'Reproducir (YouTube/Spotify)',
        description_localizations: { "en-US": "Play music (YouTube/Spotify)", "en-GB": "Play music (YouTube/Spotify)" },
        options: [{ type: 3, name: 'query', description: 'URL o búsqueda', description_localizations: { "en-US": "URL or search term" }, required: true }] 
    },
    { name: 'join', description: 'Unirse al canal de voz', description_localizations: { "en-US": "Join the voice channel" } },
    { name: 'search', description: 'Buscar 10 opciones', description_localizations: { "en-US": "Search 10 options" }, options: [{ type: 3, name: 'query', description: 'Búsqueda', description_localizations: { "en-US": "Search term" }, required: true }] },
    { name: 'remove', description: 'Quitar de la cola', description_localizations: { "en-US": "Remove from queue" }, options: [{ type: 4, name: 'posicion', description: 'Número en la cola', description_localizations: { "en-US": "Queue position" }, required: true }] },
    { name: 'blacklist', description: 'Gestionar Blacklist', description_localizations: { "en-US": "Manage Blacklist" }, options: [{ type: 3, name: 'accion', description: 'add, remove, list', required: true, choices: [{name: 'add', value: 'add'}, {name: 'remove', value: 'remove'}, {name: 'list', value: 'list'}] }, { type: 3, name: 'termino', description: 'Término a bloquear', required: false }] },
    { name: 'like', description: 'Guardar favorito', description_localizations: { "en-US": "Save to favorites" } },
    { name: 'list', description: 'Ver tus favoritos', description_localizations: { "en-US": "View your favorites" } },
    { name: 'removeliked', description: 'Borrar favorito', description_localizations: { "en-US": "Remove a favorite" }, options: [{ type: 4, name: 'indice', description: 'Número en tu lista', description_localizations: { "en-US": "Number in your list" }, required: true }] },
    { name: 'playliked', description: 'Reproducir tus favoritos', description_localizations: { "en-US": "Play your favorites" } },
    { name: 'shuffle', description: 'Mezclar cola', description_localizations: { "en-US": "Shuffle queue" } },
    { name: 'song', description: 'Panel interactivo de reproducción actual', description_localizations: { "en-US": "Interactive current song panel" } },
    { name: 'lyrics', description: 'Letra de la canción', description_localizations: { "en-US": "Song lyrics" }, options: [{ type: 3, name: 'query', description: 'Opcional: Artista y Canción', description_localizations: { "en-US": "Optional: Artist and Song" }, required: false }] },
    { name: 'stats', description: 'Top artistas y usuario con mayores likes', description_localizations: { "en-US": "Top artists and user with most likes" } },
    { name: 'history', description: 'Ver las últimas 10 canciones que sonaron', description_localizations: { "en-US": "View last 10 played songs" } },
    { name: 'skip', description: 'Saltar tema', description_localizations: { "en-US": "Skip current song" } },
    { name: 'queue', description: 'Ver cola dinámica y pedir recomendaciones', description_localizations: { "en-US": "View dynamic queue & recommendations" } },
    { name: 'autoplay', description: 'Activar/Desactivar Autoplay Infinito', description_localizations: { "en-US": "Enable/Disable infinite Autoplay" } },
    { name: 'stop', description: 'Detener todo y desconectar', description_localizations: { "en-US": "Stop everything and disconnect" } },
    { name: 'help', description: 'Muestra la lista de comandos y cómo usarlos', description_localizations: { "en-US": "Show command list and usage" } },
    { name: 'language', description: 'Cambiar el idioma del bot (Admin)', description_localizations: { "en-US": "Change bot language (Admin)" } }
];

client.once(Events.ClientReady, async c => {
    console.log(`[ONLINE] Sesión iniciada como ${c.user.tag}`);
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS likes (
                id SERIAL PRIMARY KEY, user_id VARCHAR(50) NOT NULL,
                video_id VARCHAR(50) NOT NULL, title VARCHAR(255), artist VARCHAR(255)
            );
            CREATE TABLE IF NOT EXISTS blacklist ( id SERIAL PRIMARY KEY, term VARCHAR(255) UNIQUE NOT NULL );
            CREATE TABLE IF NOT EXISTS server_settings ( guild_id VARCHAR(50) PRIMARY KEY, language VARCHAR(5) DEFAULT 'es' );
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

client.on(Events.GuildCreate, async guild => {
    try {
        const channel = guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages') && c.permissionsFor(guild.members.me).has('ViewChannel'));
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setTitle(i18n['es'].welcome_title + " | " + i18n['en'].welcome_title)
            .setDescription(i18n['es'].welcome_desc + "\n\n---\n\n" + i18n['en'].welcome_desc);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('setlang_es').setLabel('🇪🇸 Español').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('setlang_en').setLabel('🇬🇧 English').setStyle(ButtonStyle.Primary)
        );
        await channel.send({ embeds: [embed], components: [row] });
    } catch (e) { console.error("Error en GuildCreate:", e); }
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

const createNowPlayingEmbed = (song, currentMs, l = 'es') => {
    const totalSecs = song.durationSec || 0;
    const bar = createProgressBar(currentMs / 1000, totalSecs);
    const timeStr = `[${formatTime(currentMs)} / ${song.durationStr}]`;
    return new EmbedBuilder()
        .setColor(0x2b2d31) 
        .setTitle(song.title.substring(0, 256))
        .setURL(song.url)
        .setImage(song.thumbnail) 
        .setDescription(`${bar} \`${timeStr}\`\n\n**${i18n[l].artist}** ${song.artist}\n**${i18n[l].requested_by}** ${song.requester}`);
};

const cleanArtistName = (name) => name.replace(/VEVO$| - Topic$|官方頻道$|Oficial$|Official$/i, '').trim();
const cleanSongName = (name) => name.toLowerCase().replace(/\(.*\)|\[.*\]/g, '').replace(/official video|music video|lyric video|video oficial|hd|4k/gi, '').replace(/remastered|remaster|live|en vivo/gi, '').trim();

const createSong = (video, artistOverride = null, requester = 'Autoplay 🤖') => {
    const artist = artistOverride || cleanArtistName(video.author?.name || "Unknown Artist");
    const safeUrl = video.url || `https://www.youtube.com/watch?v=${video.videoId}`;
    let thumb = 'https://i.imgur.com/Q2v1vV7.png'; 
    if (video.videoId) thumb = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
    else if (video.thumbnail || video.image) thumb = video.thumbnail || video.image;
    return {
        title: video.title, artist: artist, url: safeUrl, thumbnail: thumb,
        durationStr: video.timestamp || "0:00", durationSec: video.seconds || 0,
        videoId: video.videoId, absolutePath: path.join(downloadDir, `${video.videoId}.mp3`),
        requester: requester, hasRealCover: false
    };
};

async function startProgressInterval(guildId) {
    const q = globalQueues.get(guildId);
    if (!q) return;
    const l = await getLang(guildId);

    if (q.progressInterval) clearInterval(q.progressInterval);
    q.progressInterval = setInterval(() => {
        if (q.playing && q.currentMessage && q.lastSong) {
            const isPaused = q.player.state.status === AudioPlayerStatus.Paused;
            if (isPaused) return;

            const currentMs = q.player.state.resource ? q.player.state.resource.playbackDuration : 0;
            const embedPlay = createNowPlayingEmbed(q.lastSong, currentMs, l);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('pause_resume').setLabel(i18n[l].pause).setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('skip_song').setLabel(i18n[l].skip_btn).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('like_song').setLabel(i18n[l].save_btn).setStyle(ButtonStyle.Success)
            );
            q.currentMessage.edit({ embeds: [embedPlay], components: [row] }).catch(() => {
                clearInterval(q.progressInterval); q.currentMessage = null;
            });
        }
    }, 15000); 
}

async function playNext(guildId) {
    const q = globalQueues.get(guildId);
    if (!q) return;
    const l = await getLang(guildId);

    if (q.songs.length === 0) {
        if (q.autoplay && q.lastSong) {
            try {
                let artistSeed = q.lastSong.artist || "Music";
                let activeUserIds = [];
                if (q.voiceChannel) {
                    q.voiceChannel.members.forEach(member => { if (!member.user.bot) activeUserIds.push(member.id); });
                }
                let activeLikes = [];
                if (activeUserIds.length > 0) {
                    const { rows } = await pool.query('SELECT * FROM likes WHERE user_id = ANY($1::varchar[])', [activeUserIds]);
                    activeLikes = rows;
                }
                if (q.titleHistory.length % 12 === 0 && activeLikes.length > 0) {
                    artistSeed = activeLikes[Math.floor(Math.random() * activeLikes.length)].artist;
                }
                const r = await yts(`${artistSeed} official audio`);
                let results = r.videos.slice(0, 20); 

                let nextVideo = null;
                let validVideos = results.filter(v => {
                    const vTitle = v.title.toLowerCase(); const vAuthor = v.author.name.toLowerCase(); const vClean = cleanSongName(v.title);
                    const isNewID = !q.history.includes(v.videoId);
                    const isNewTitle = !q.titleHistory.some(h => vClean.includes(h) || h.includes(vClean));
                    const notBlacklisted = !globalBlacklist.some(term => vTitle.includes(term.toLowerCase()));
                    const isNotSpam = !SPAM_WORDS.some(sw => vTitle.includes(sw));
                    const isOfficialChannel = vAuthor.includes(artistSeed.toLowerCase()) || vAuthor.includes('topic') || vAuthor.includes('vevo') || vAuthor.includes('official');
                    // --- FILTRO APLICADO AQUÍ: MÁXIMO 15 MINUTOS (900 SEGUNDOS) ---
                    return isNewID && isNewTitle && notBlacklisted && isNotSpam && isOfficialChannel && v.seconds > 60 && v.seconds <= 900;
                });

                if (validVideos.length > 0) {
                    nextVideo = validVideos[Math.floor(Math.random() * Math.min(validVideos.length, 5))];
                } else {
                    validVideos = results.filter(v => {
                        const vTitle = v.title.toLowerCase(); const isNewID = !q.history.includes(v.videoId);
                        const notBlacklisted = !globalBlacklist.some(term => vTitle.includes(term.toLowerCase()));
                        const isNotSpam = !SPAM_WORDS.some(sw => vTitle.includes(sw));
                        const belongsToArtist = vTitle.includes(artistSeed.toLowerCase());
                        // --- FILTRO APLICADO AQUÍ: MÁXIMO 15 MINUTOS (900 SEGUNDOS) ---
                        return isNewID && notBlacklisted && isNotSpam && belongsToArtist && v.seconds > 60 && v.seconds <= 900;
                    });
                    if (validVideos.length > 0) nextVideo = validVideos[Math.floor(Math.random() * Math.min(validVideos.length, 5))];
                }

                if (!nextVideo) {
                    const fallbackRes = await yts(`${artistSeed} music track`);
                    nextVideo = fallbackRes.videos.find(v => {
                        const vT = v.title.toLowerCase(); const belongsToArtist = v.author.name.toLowerCase().includes(artistSeed.toLowerCase()) || vT.includes(artistSeed.toLowerCase());
                        // --- FILTRO APLICADO AQUÍ: MÁXIMO 15 MINUTOS (900 SEGUNDOS) ---
                        return !q.history.includes(v.videoId) && !SPAM_WORDS.some(s => vT.includes(s)) && belongsToArtist && v.seconds <= 900;
                    });
                }

                if (nextVideo) {
                    q.songs.push(createSong(nextVideo, artistSeed, i18n[l].bot_magic));
                    return playNext(guildId);
                } else {
                    q.playing = false; return;
                }
            } catch (e) { console.error("Error Autoplay:", e); q.playing = false; return; }
        } else { q.playing = false; return; }
    }

    const song = q.songs[0];
    q.lastSong = song;

    if (!song.hasRealCover) {
        try {
            const query = encodeURIComponent(`${cleanSongName(song.title)} ${song.artist}`);
            const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
            const data = await res.json();
            if (data.results && data.results.length > 0) song.thumbnail = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        } catch (e) {}
        song.hasRealCover = true;
    }

    if (q.textChannel) {
        if (q.currentMessage) q.currentMessage.delete().catch(() => {});
        try {
            const embedDl = new EmbedBuilder().setColor(0x2b2d31).setDescription(`${i18n[l].downloading} **${song.title}**...\n*${i18n[l].requested_by} ${song.requester}*`);
            q.currentMessage = await q.textChannel.send({ embeds: [embedDl] });
        } catch (e) { console.error("Error dl:", e); }
    }

    if (!fs.existsSync(song.absolutePath)) {
        const cmd = `.\\yt-dlp.exe -x --audio-format mp3 --no-playlist --cookies cookies.txt --js-runtimes node --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -o "${song.absolutePath}" "${song.url}"`;
        exec(cmd, { windowsHide: true }, (err) => {
            if (err) { console.error(`[ERROR yt-dlp]`, err.message); q.songs.shift(); return playNext(guildId); }
            startStream(song, guildId, l);
        });
    } else { startStream(song, guildId, l); }
}

function startStream(song, guildId, l) {
    const q = globalQueues.get(guildId);
    if (!q) return;

    try {
        const resource = createAudioResource(fs.createReadStream(song.absolutePath));
        q.player.play(resource);
        q.playing = true;
        
        q.history.push(song.videoId); q.titleHistory.push(cleanSongName(song.title)); q.playedHistory.push(`${song.title} - ${song.artist}`); 
        if (q.history.length > 50) { q.history.shift(); q.titleHistory.shift(); }
        if (q.playedHistory.length > 10) q.playedHistory.shift();

        if (q.voiceChannel && typeof q.voiceChannel.setVoiceStatus === 'function') {
            q.voiceChannel.setVoiceStatus(`${song.title}`.substring(0, 100)).catch(() => {});
        }

        if (q.currentMessage) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('pause_resume').setLabel(i18n[l].pause).setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('skip_song').setLabel(i18n[l].skip_btn).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('like_song').setLabel(i18n[l].save_btn).setStyle(ButtonStyle.Success)
            );
            const embedPlay = createNowPlayingEmbed(song, 0, l);
            q.currentMessage.edit({ embeds: [embedPlay], components: [row] }).then(() => startProgressInterval(guildId)).catch(() => {});
        }
    } catch (error) {
        console.error(`[CRITICAL] Error de stream:`, error.message);
        q.songs.shift(); playNext(guildId);
    }
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.guild) return;
    const guildId = interaction.guildId;
    const l = await getLang(guildId);
    const q = getQueue(guildId);
    const userId = interaction.user.id;
    const userName = interaction.user.globalName || interaction.user.username;

    if (interaction.isButton()) {
        if (interaction.customId.startsWith('setlang_')) {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: i18n[l].admin_only, flags: MessageFlags.Ephemeral });
            }
            const chosenLang = interaction.customId.split('_')[1];
            await pool.query(`INSERT INTO server_settings (guild_id, language) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET language = $2`, [guildId, chosenLang]);
            guildLangs.set(guildId, chosenLang);
            await interaction.update({ content: i18n[chosenLang].saved, embeds: [], components: [] });
            return;
        }

        if (interaction.customId === 'pause_resume') {
            const currentMs = q.player.state.resource ? q.player.state.resource.playbackDuration : 0;
            const embedPlay = createNowPlayingEmbed(q.lastSong, currentMs, l);

            if (q.player.state.status === AudioPlayerStatus.Playing) { 
                q.player.pause(); 
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('pause_resume').setLabel(i18n[l].resume).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('skip_song').setLabel(i18n[l].skip_btn).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('like_song').setLabel(i18n[l].save_btn).setStyle(ButtonStyle.Success)
                );
                await interaction.update({ embeds: [embedPlay], components: [row] }); 
                await interaction.followUp({ content: i18n[l].audio_paused, flags: MessageFlags.Ephemeral });
            } 
            else if (q.player.state.status === AudioPlayerStatus.Paused) { 
                q.player.unpause(); 
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('pause_resume').setLabel(i18n[l].pause).setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('skip_song').setLabel(i18n[l].skip_btn).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('like_song').setLabel(i18n[l].save_btn).setStyle(ButtonStyle.Success)
                );
                await interaction.update({ embeds: [embedPlay], components: [row] }); 
                await interaction.followUp({ content: i18n[l].audio_resumed, flags: MessageFlags.Ephemeral });
            } 
            else { await interaction.reply({ content: i18n[l].nothing_playing, flags: MessageFlags.Ephemeral }); }
            return;
        }
        
        if (interaction.customId === 'skip_song') {
            if (!q.playing) return interaction.reply({ content: i18n[l].nothing_playing, flags: MessageFlags.Ephemeral });
            q.player.stop();
            await interaction.reply({ content: i18n[l].skip, flags: MessageFlags.Ephemeral });
            return;
        }

        if (interaction.customId === 'like_song') {
            if (!q.lastSong) return interaction.reply({ content: i18n[l].nothing_playing, flags: MessageFlags.Ephemeral });
            const check = await pool.query('SELECT id FROM likes WHERE user_id = $1 AND video_id = $2', [userId, q.lastSong.videoId]);
            if (check.rows.length > 0) return interaction.reply({ content: i18n[l].already_liked, flags: MessageFlags.Ephemeral });
            await pool.query('INSERT INTO likes (user_id, video_id, title, artist) VALUES ($1, $2, $3, $4)', [userId, q.lastSong.videoId, q.lastSong.title, q.lastSong.artist]);
            await interaction.reply({ content: `${i18n[l].like_added} **${q.lastSong.title}**`, flags: MessageFlags.Ephemeral });
            return;
        }
    }

    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply();
    const command = interaction.commandName;

    if (["play", "join", "search", "playliked"].includes(command)) {
        const vc = interaction.member.voice.channel;
        if (!vc) return interaction.editReply(i18n[l].no_voice);
        q.textChannel = interaction.channel; q.voiceChannel = vc;
        if (!q.connection || q.connection.state.status === VoiceConnectionStatus.Destroyed) {
            q.connection = joinVoiceChannel({ channelId: vc.id, guildId: interaction.guild.id, adapterCreator: interaction.guild.voiceAdapterCreator });
            q.connection.on(VoiceConnectionStatus.Ready, () => { q.connection.subscribe(q.player); });
        }
    }

    if (command === "language") {
        if (!interaction.member.permissions.has('Administrator')) return interaction.editReply(i18n[l].admin_only);
        const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle("🌐 Language / Idioma").setDescription(i18n['es'].welcome_desc + "\n\n---\n\n" + i18n['en'].welcome_desc);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('setlang_es').setLabel('🇪🇸 Español').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('setlang_en').setLabel('🇬🇧 English').setStyle(ButtonStyle.Primary)
        );
        return interaction.editReply({ embeds: [embed], components: [row] });
    }

    if (command === "join") return interaction.editReply(i18n[l].joined);

    if (command === "help") {
        const embed = new EmbedBuilder()
            .setColor(0x2b2d31).setTitle(i18n[l].help_title).setDescription(i18n[l].help_desc)
            .addFields(
                { name: i18n[l].help_cat1, value: i18n[l].help_cat1_val },
                { name: i18n[l].help_cat2, value: i18n[l].help_cat2_val },
                { name: i18n[l].help_cat3, value: i18n[l].help_cat3_val },
                { name: i18n[l].help_cat4, value: i18n[l].help_cat4_val }
            )
            .setFooter({ text: i18n[l].help_footer });
        return interaction.editReply({ embeds: [embed] });
    }

    if (command === "play") {
        const query = interaction.options.getString('query');
        if (query.includes("spotify.com")) {
            try {
                const tracks = await getTracks(query);
                for (const track of tracks) {
                    const artist = track.artist || (track.artists ? track.artists[0].name : "Unknown");
                    const r = await yts(`${track.name} ${artist} official audio`);
                    if (r.videos[0]) q.songs.push(createSong(r.videos[0], artist, userName));
                }
                interaction.editReply(i18n[l].added_spotify);
                if (!q.playing) playNext(guildId);
            } catch (e) { interaction.editReply(i18n[l].error_spotify); }
        } else {
            const r = await yts(query);
            if (!r.videos.length) return interaction.editReply(i18n[l].no_results);
            q.songs.push(createSong(r.videos[0], null, userName));
            if (!q.playing) playNext(guildId);
            interaction.editReply(`${i18n[l].added_queue} **${r.videos[0].title}**`);
        }
    }

    if (command === "search") {
        const query = interaction.options.getString('query');
        const r = await yts(query);
        const videos = r.videos.slice(0, 10);
        if (!videos.length) return interaction.editReply(i18n[l].no_results);
        
        const options = videos.map((v, i) => new StringSelectMenuOptionBuilder().setLabel(`${i + 1}. ${v.title.substring(0, 95)}`).setDescription(`${v.author.name.substring(0, 50)} | ${v.timestamp}`).setValue(i.toString()));
        const select = new StringSelectMenuBuilder().setCustomId('search_select').setPlaceholder(i18n[l].search_placeholder).addOptions(options);
        const row = new ActionRowBuilder().addComponents(select);
        const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle(`${i18n[l].search_title} ${query.substring(0, 200)}`).setDescription(i18n[l].search_desc);

        const searchMsg = await interaction.editReply({ embeds: [embed], components: [row] });
        const collector = searchMsg.createMessageComponentCollector({ filter: i => i.customId === 'search_select' && i.user.id === userId, time: MSG_LIFETIME, max: 1 });
        
        collector.on('collect', async i => {
            const video = videos[parseInt(i.values[0])];
            q.songs.push(createSong(video, null, userName));
            await i.update({ content: `${i18n[l].added_queue} **${video.title}**`, embeds: [], components: [] });
            if (!q.playing) playNext(guildId);
        });
    }

    if (command === "blacklist") {
        const action = interaction.options.getString('accion'); const term = interaction.options.getString('termino');
        if (action === "add" && term) {
            await pool.query('INSERT INTO blacklist (term) VALUES ($1) ON CONFLICT DO NOTHING', [term.toLowerCase()]);
            globalBlacklist.push(term.toLowerCase()); interaction.editReply(`${i18n[l].blacklist_added} ${term}`);
        } else if (action === "remove" && term) {
            await pool.query('DELETE FROM blacklist WHERE term = $1', [term.toLowerCase()]);
            globalBlacklist = globalBlacklist.filter(x => x !== term.toLowerCase()); interaction.editReply(`${i18n[l].blacklist_removed} ${term}`);
        } else { interaction.editReply(`${i18n[l].blacklist_current}${globalBlacklist.join(", ")}`); }
    }

    if (command === "remove") {
        const index = interaction.options.getInteger('posicion') - 1;
        if (index < 0 || !q.songs[index]) return interaction.editReply(i18n[l].pos_invalid);
        const removed = q.songs.splice(index, 1); interaction.editReply(`${i18n[l].removed} ${removed[0].title}`);
    }

    if (command === "like") {
        if (!q.lastSong) return interaction.editReply(i18n[l].nothing_playing);
        const check = await pool.query('SELECT id FROM likes WHERE user_id = $1 AND video_id = $2', [userId, q.lastSong.videoId]);
        if (check.rows.length > 0) return interaction.editReply(i18n[l].already_liked);
        await pool.query('INSERT INTO likes (user_id, video_id, title, artist) VALUES ($1, $2, $3, $4)', [userId, q.lastSong.videoId, q.lastSong.title, q.lastSong.artist]);
        interaction.editReply(`${i18n[l].like_added} **${q.lastSong.title}**`);
    }

    if (command === "list") {
        const res = await pool.query('SELECT title FROM likes WHERE user_id = $1 ORDER BY id ASC', [userId]);
        if (res.rows.length === 0) return interaction.editReply(i18n[l].list_empty);
        const text = res.rows.map((s, i) => `**${i + 1}.** ${s.title}`).join("\n");
        interaction.editReply(`${i18n[l].your_likes}${text.substring(0, 1900)}`);
    }

    if (command === "removeliked") {
        const index = interaction.options.getInteger('indice') - 1;
        const res = await pool.query('SELECT id, title FROM likes WHERE user_id = $1 ORDER BY id ASC', [userId]);
        if (index < 0 || !res.rows[index]) return interaction.editReply(i18n[l].like_invalid);
        await pool.query('DELETE FROM likes WHERE id = $1', [res.rows[index].id]); interaction.editReply(`${i18n[l].like_removed} ${res.rows[index].title}`);
    }

    if (command === "playliked") {
        const res = await pool.query('SELECT video_id as "videoId", title, artist FROM likes WHERE user_id = $1 ORDER BY id ASC', [userId]);
        if (res.rows.length === 0) return interaction.editReply(i18n[l].no_likes);
        for (const s of res.rows) { q.songs.push({ title: s.title, artist: s.artist, videoId: s.videoId, url: `https://www.youtube.com/watch?v=${s.videoId}`, absolutePath: path.join(downloadDir, `${s.videoId}.mp3`), thumbnail: `https://img.youtube.com/vi/${s.videoId}/hqdefault.jpg`, requester: userName, hasRealCover: false }); }
        interaction.editReply(i18n[l].likes_queued); if (!q.playing) playNext(guildId);
    }

    if (command === "stats") {
        const totalRes = await pool.query('SELECT COUNT(*) FROM likes');
        if (totalRes.rows[0].count == 0) return interaction.editReply(i18n[l].stats_no_likes);
        const topUserRes = await pool.query('SELECT user_id, COUNT(*) as count FROM likes GROUP BY user_id ORDER BY count DESC LIMIT 1');
        const topArtistsRes = await pool.query('SELECT artist, COUNT(*) as count FROM likes GROUP BY artist ORDER BY count DESC LIMIT 10');
        let statsMsg = ` 📊 ${i18n[l].stats_title} \n${i18n[l].stats_total} **${totalRes.rows[0].count}**\n`;
        if (topUserRes.rows.length > 0) statsMsg += `${i18n[l].stats_top_user} <@${topUserRes.rows[0].user_id}> (**${topUserRes.rows[0].count}**).\n\n`;
        statsMsg += i18n[l].stats_top_artists;
        topArtistsRes.rows.forEach((row, index) => { statsMsg += `**${index + 1}.** ${row.artist} — ${row.count} likes\n`; });
        interaction.editReply(statsMsg);
    }

    if (command === "history") {
        if (q.playedHistory.length === 0) return interaction.editReply(i18n[l].history_empty);
        const historyText = q.playedHistory.map((s, i) => `**${i + 1}.** ${s}`).join("\n"); interaction.editReply(`${i18n[l].history_title}${historyText}`);
    }

    if (command === "shuffle") {
        if (q.songs.length < 3) return interaction.editReply(i18n[l].queue_insufficient);
        const current = q.songs.shift();
        for (let i = q.songs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q.songs[i], q.songs[j]] = [q.songs[j], q.songs[i]]; }
        q.songs.unshift(current); interaction.editReply(i18n[l].queue_shuffled);
    }

    if (command === "song") {
        if (!q.playing || !q.lastSong) return interaction.editReply(i18n[l].nothing_playing);
        const currentMs = q.player.state.resource ? q.player.state.resource.playbackDuration : 0;
        const isPaused = q.player.state.status === AudioPlayerStatus.Paused;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pause_resume').setLabel(isPaused ? i18n[l].resume : i18n[l].pause).setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('skip_song').setLabel(i18n[l].skip_btn).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('like_song').setLabel(i18n[l].save_btn).setStyle(ButtonStyle.Success)
        );
        const embedPlay = createNowPlayingEmbed(q.lastSong, currentMs, l);
        await interaction.editReply({ content: '', embeds: [embedPlay], components: [row] });
        const fetchedMsg = await interaction.fetchReply();
        if (q.currentMessage && q.currentMessage.id !== fetchedMsg.id) q.currentMessage.delete().catch(() => {});
        q.currentMessage = fetchedMsg; startProgressInterval(guildId);
    }

    if (command === "lyrics") {
        let query = interaction.options.getString('query');
        if (!query) {
            if (q.lastSong) query = `${cleanArtistName(q.lastSong.artist)} ${cleanSongName(q.lastSong.title)}`; else return interaction.editReply(i18n[l].nothing_playing);
        }
        try {
            let searchRes = await GeniusClient.songs.search(query);
            if (!searchRes.length && q.lastSong) searchRes = await GeniusClient.songs.search(cleanSongName(q.lastSong.title));
            if (!searchRes.length) return interaction.editReply(i18n[l].lyrics_not_found);
            let lyrics = await searchRes[0].lyrics();
            if (lyrics.includes('[')) lyrics = lyrics.substring(lyrics.indexOf('['));
            interaction.editReply(`${i18n[l].lyrics_title} ${searchRes[0].title}:\n\n${lyrics.split('\n').map(txt => `> ${txt}`).join('\n').substring(0, 1900)}`);
        } catch (e) { interaction.editReply(i18n[l].no_results); }
    }

    if (command === "skip") {
        if (!q.playing) return interaction.editReply(i18n[l].nothing_playing);
        q.player.stop(); interaction.editReply(i18n[l].skip);
    }
    
    if (command === "queue") {
        if (q.songs.length === 0) return interaction.editReply(i18n[l].queue_empty);
        let page = 0; const itemsPerPage = 10;
        
        const generateEmbed = (p) => {
            const start = p * itemsPerPage; const end = start + itemsPerPage; const currentSongs = q.songs.slice(start, end); const totalPages = Math.ceil(q.songs.length / itemsPerPage);
            const list = currentSongs.map((s, i) => `**${start + i + 1}.** ${s.title} \n*(${s.requester})*`).join("\n\n");
            return new EmbedBuilder().setColor(0x2b2d31).setTitle(i18n[l].queue_title).setDescription(list).setFooter({ text: `${i18n[l].page} ${p + 1} ${i18n[l].of} ${totalPages > 0 ? totalPages : 1} | ${i18n[l].total} ${q.songs.length} ${i18n[l].themes}` });
        };

        const generateButtons = (p) => {
            const totalPages = Math.ceil(q.songs.length / itemsPerPage);
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('q_prev').setEmoji(i18n[l].btn_prev).setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
                new ButtonBuilder().setCustomId('q_next').setEmoji(i18n[l].btn_next).setStyle(ButtonStyle.Secondary).setDisabled(p >= totalPages - 1 || totalPages === 0),
                new ButtonBuilder().setCustomId('q_rec').setLabel(i18n[l].btn_rec).setStyle(ButtonStyle.Success)
            );
        };

        const qMsg = await interaction.editReply({ embeds: [generateEmbed(page)], components: [generateButtons(page)] });
        const collector = qMsg.createMessageComponentCollector({ filter: i => ['q_prev', 'q_next', 'q_rec'].includes(i.customId), time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'q_prev') { page--; await i.update({ embeds: [generateEmbed(page)], components: [generateButtons(page)] }); }
            else if (i.customId === 'q_next') { page++; await i.update({ embeds: [generateEmbed(page)], components: [generateButtons(page)] }); }
            else if (i.customId === 'q_rec') {
                await i.deferReply(); 
                const artists = q.songs.map(s => s.artist); let seed = artists[Math.floor(Math.random() * artists.length)];
                if (!seed && q.lastSong) seed = q.lastSong.artist; if (!seed) seed = "Music";
                const r = await yts(`${seed} official audio`);
                let validVideos = r.videos.slice(0, 15).filter(v => {
                    const isNewID = !q.history.includes(v.videoId) && !q.songs.some(s => s.videoId === v.videoId);
                    // --- FILTRO APLICADO AQUÍ: MÁXIMO 15 MINUTOS (900 SEGUNDOS) ---
                    return isNewID && !globalBlacklist.some(term => v.title.toLowerCase().includes(term.toLowerCase())) && !SPAM_WORDS.some(sw => v.title.toLowerCase().includes(sw)) && v.seconds > 60 && v.seconds <= 900;
                });
                let recs = validVideos.slice(0, 5);
                if (recs.length === 0) return i.followUp({ content: i18n[l].rec_fail, flags: MessageFlags.Ephemeral });

                const embedRec = new EmbedBuilder().setColor(0x2b2d31).setTitle(i18n[l].rec_title).setDescription(i18n[l].rec_desc + recs.map((v, idx) => `**${idx + 1}.** ${v.title.substring(0, 80)}`).join('\n'));
                const rowRec = new ActionRowBuilder();
                recs.forEach((v, idx) => { rowRec.addComponents(new ButtonBuilder().setCustomId(`rec_add_${idx}`).setLabel(`${i18n[l].rec_btn} ${idx + 1}`).setStyle(ButtonStyle.Success)); });

                const recMsg = await i.followUp({ embeds: [embedRec], components: [rowRec], fetchReply: true });
                const recCollector = recMsg.createMessageComponentCollector({ filter: btnI => btnI.customId.startsWith('rec_add_'), time: 60000 });

                recCollector.on('collect', async btnI => {
                    const idx = parseInt(btnI.customId.split('_')[2]); const video = recs[idx];
                    if(q.songs.some(s => s.videoId === video.videoId)) { await btnI.reply({ content: i18n[l].rec_already, flags: MessageFlags.Ephemeral }); return; }
                    const adderName = btnI.user.globalName || btnI.user.username;
                    q.songs.push(createSong(video, null, `${i18n[l].bot_magic} (${adderName})`));
                    const updatedRow = ActionRowBuilder.from(btnI.message.components[0]);
                    updatedRow.components[idx].setDisabled(true).setLabel(`${i18n[l].rec_added_btn} ${idx + 1}`).setStyle(ButtonStyle.Secondary);
                    await btnI.update({ components: [updatedRow] });
                    await qMsg.edit({ embeds: [generateEmbed(page)], components: [generateButtons(page)] }).catch(()=>{});
                    if (!q.playing) playNext(guildId);
                });
                recCollector.on('end', () => { recMsg.delete().catch(()=>{}); });
            }
        });
        collector.on('end', () => { qMsg.delete().catch(()=>{}); });
        return;
    }

    if (command === "autoplay") { q.autoplay = !q.autoplay; interaction.editReply(q.autoplay ? i18n[l].autoplay_on : i18n[l].autoplay_off); }
    if (command === "stop") {
        if (q.progressInterval) clearInterval(q.progressInterval);
        if (q.currentMessage) q.currentMessage.delete().catch(()=>{});
        q.songs = []; q.history = []; q.titleHistory = []; q.autoplay = false; q.player.stop();
        if (q.connection) q.connection.destroy();
        q.connection = null; q.playing = false; q.currentMessage = null;
        interaction.editReply(i18n[l].stopped);
    }

    if (!["lyrics", "stats", "list", "history", "queue", "help", "search", "song", "language"].includes(command)) {
        setTimeout(() => interaction.deleteReply().catch(() => {}), MSG_LIFETIME);
    }
});

client.login(process.env.TOKEN);
require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  AttachmentBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const yts = require("yt-search");
const { request } = require("undici");
const { getTracks, getPreview } = require("spotify-url-info")(
  require("undici").fetch,
);
const { Pool } = require("pg");
const { Client: GeniusClient } = require("genius-lyrics");
const geniusClient = new GeniusClient();
const { createCanvas, loadImage } = require("canvas");
const { Vibrant } = require("node-vibrant/node");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const VIP_GUILDS = ["721148844850675813", "554815984326672384"];
const PATREON_LINK = "https://patreon.com/TuPatreonAqui";
const MSG_LIFETIME = 60000;

const THEME_COLOR = "#2b2d31";
const UI = {
  success: (desc) => new EmbedBuilder().setColor(0x2b2d31).setDescription(desc),
  error: (desc) => new EmbedBuilder().setColor(0xed4245).setDescription(desc),
  info: (title, desc) =>
    new EmbedBuilder()
      .setColor(0x2b2d31)
      .setAuthor({ name: title })
      .setDescription(desc),
  panel: () => new EmbedBuilder().setColor(0x2b2d31),
};

const i18n = {
  es: {
    welcome: "Configuración Inicial Requerida",
    welcome_desc:
      "Por favor, un Administrador debe seleccionar el idioma principal para los mensajes de la interfaz en este servidor.",
    saved: "El idioma de la interfaz ha sido configurado a Español.",
    joined: "Conexión establecida con el canal de voz.",
    no_voice: "Debes estar conectado a un canal de voz para usar este comando.",
    no_results:
      "No se encontraron coincidencias para la búsqueda proporcionada.",
    added_queue: "Pistas añadidas a la cola",
    added_spotify: "Lista de Spotify procesada y añadida a la cola.",
    search_title: "Resultados de Búsqueda",
    blacklist_added: "Término bloqueado exitosamente:",
    blacklist_removed: "Término desbloqueado:",
    blacklist_current: "Términos actualmente bloqueados:\n",
    pos_invalid: "La posición especificada no existe en la cola.",
    removed: "Pista eliminada de la cola:",
    nothing_playing: "No hay ninguna pista en reproducción actualmente.",
    already_liked: "Esta pista ya se encuentra en tu colección.",
    like_added: "Pista guardada en tu colección:",
    list_empty: "Tu colección de pistas está vacía.",
    your_likes: "Tu Colección Personal",
    like_invalid: "El índice especificado no existe en tu colección.",
    like_removed: "Pista eliminada de la colección:",
    no_likes: "No tienes pistas guardadas para reproducir.",
    likes_queued:
      "Tu colección completa ha sido añadida a la cola de reproducción.",
    stats_no_likes: "No hay datos de interacción suficientes en este servidor.",
    stats_title: "Métricas del Servidor",
    stats_total: "Pistas guardadas en total",
    stats_top_user: "Usuario destacado",
    stats_top_artists: "Artistas más guardados",
    history_empty: "No hay registro de reproducción reciente.",
    history_title: "Registro de Reproducción",
    queue_insufficient:
      "Se requieren al menos 3 pistas en la cola para mezclar.",
    queue_shuffled: "La cola de reproducción ha sido mezclada aleatoriamente.",
    lyrics_not_found: "No se encontraron letras en la base de datos de Genius.",
    lyrics_title: "Letras Oficiales",
    skip: "La pista actual ha sido omitida.",
    queue_empty: "La cola de reproducción está vacía.",
    queue_title: "Cola de Reproducción",
    page: "Pág.",
    of: "/",
    total: "Pistas en cola:",
    btn_rec: "Explorar Recomendaciones",
    rec_title: "Catálogo de Autoplay",
    rec_already: "Esta pista ya se encuentra programada en la cola.",
    rec_success: "El sistema Autoplay ha programado",
    rec_fail: "El sistema no pudo determinar recomendaciones viables.",
    autoplay_on: "Sistema Autoplay Infinito Activado.",
    autoplay_off: "Sistema Autoplay Infinito Desactivado.",
    stopped: "Reproducción detenida. Conexión cerrada.",
    downloading: "Iniciando Streaming en vivo...",
    requested_by: "Solicitado por",
    artist: "Artista",
    pause: "Pause",
    resume: "Resume",
    skip_btn: "Skip",
    save_btn: "Guardar",
    audio_paused: "El flujo de audio ha sido pausado.",
    audio_resumed: "El flujo de audio ha sido reanudado.",
    bot_magic: "Autoplay",
    bot_magic_liked: "Autoplay (Favorito Aleatorio)",
    admin_only: "Esta acción requiere privilegios de Administrador.",
    btn_prev: "Anterior",
    btn_next: "Siguiente",
    error_spotify: "Error interno al procesar los metadatos de Spotify.",
    premium_only: `Acceso Restringido: Esta función es exclusiva para servidores Nivel Premium.\nObtén acceso completo en [nuestro portal](${PATREON_LINK}).`,
    autoplay_limit: `Límite Alcanzado: El servidor ha consumido sus 5 pistas de Autoplay gratuitas.\nMejora tu plan en [nuestro portal](${PATREON_LINK}) para reproducción infinita.`,
    dj_required:
      "Requiere rol de DJ o permisos de Administrador para utilizar este comando.",
    filter_set: "Filtro acústico aplicado exitosamente:",
    mode247_on:
      "Modo 24/7 Activado. El bot permanecerá en el canal de forma indefinida.",
    mode247_off: "Modo 24/7 Desactivado.",
    pl_saved:
      "La cola de reproducción actual ha sido guardada como la playlist:",
    pl_loaded: "Playlist cargada y añadida a la cola de reproducción.",
    help_title: "Panel de Comandos de Musicardi",
    help_desc:
      "Aquí tienes todo lo que puedo hacer por ti. Los comandos están organizados por categorías:",
    help_cat1: "Reproducción",
    help_cat1_val:
      "`/play` - Reproducir música\n`/playalbum` - Añadir álbum de Spotify\n`/skip` - Saltar tema actual\n`/stop` - Detener bot\n`/song` - Ver panel del tema actual\n`/queue` - Ver la cola de temas\n`/shuffle` - Mezclar la cola\n`/remove` - Quitar un tema\n`/lyrics` (Premium) - Ver la letra",
    help_cat2: "Automatización",
    help_cat2_val:
      "`/autoplay` (Premium) - Activar Autoplay Inteligente\n`/search` - Búsqueda interactiva\n`/blacklist` - Bloquear palabras o canales\n`/history` - Ver temas recientes",
    help_cat3: "Favoritos",
    help_cat3_val:
      "`/like` - Guardar el tema que suena\n`/list` - Ver tu lista\n`/removeliked` - Borrar un guardado\n`/playliked` - Poner tus temas a sonar\n`/stats` - Mejores artistas del server",
    help_cat4: "Utilidad",
    help_cat4_val:
      "`/join` - Unirme al canal\n`/language` - Cambiar idioma\n`/help` - Ver este menú\n`/filter` (Premium) - Procesamiento acústico\n`/247` (Premium) - Modo permanente\n`/dj` (Admin) - Roles de control\n`/playlist` - Gestionar tus playlists\n`/profile` - Ver tu perfil y estadísticas\n`/trivia` - Iniciar juego\n`/radio` - Transmisiones 24/7",
    help_footer:
      "Tip: Usa los botones del panel /song para controlar la música más rápido.",
    np_title: "Reproducción en curso",
    sync_data: "Sincronizando Datos",
    sys_notice: "Aviso del Sistema",
    audio_ctrl: "Control de Audio",
    access_denied: "Restricción de Acceso",
    content_mgmt: "Gestión de Contenido",
    collection: "Colección",
    metrics: "Métricas",
    connection: "Conexión",
    global_cfg: "Configuración Global",
    dj_set: "Sistema DJ activado. Rol authorized:",
    dj_clear: "Sistema DJ desactivado. Todos pueden controlar el reproductor.",
    dj_no_role: "Debes especificar un rol.",
    pl_not_found:
      "No se encontró ninguna playlist con ese nombre en tu perfil.",
    results: "resultados",
    queue_all: "Añadir Todos",
    themes: "temas",
    profile_title: "Perfil de Oyente",
    profile_stats: (hours, played, likes, artist) =>
      `> **Horas reproducidas:** ${hours}h\n> **Pistas solicitadas:** ${played}\n> **Pistas guardadas:** ${likes}\n> **Artista preferido:** ${artist}`,
    trivia_start: "Music Trivia",
    trivia_desc:
      "Adivina el nombre de la pista o del artista en el chat. Tienes 45 segundos totales.",
    trivia_stop: "Debes detener la reproducción actual para iniciar la trivia.",
    trivia_no_data:
      "No hay suficientes datos en la colección global para iniciar la trivia.",
    trivia_win: (user, title, artist) =>
      `Correcto <@${user}>! Era **${title}** de **${artist}**.`,
    trivia_timeout: (title, artist) =>
      `Se acabó el tiempo. Era **${title}** de **${artist}**.`,
    radio_start: "Transmisión global iniciada:",
    mystery_track: "Pista Misteriosa",
    playing_status: "Reproduciendo: ",
    queue_ended: "Cola de Reproducción Finalizada",
    autoplay_offer_prem:
      "¿Te quedaste sin música? Activa el Autoplay Inteligente para seguir escuchando pistas similares sin interrupciones.",
    autoplay_offer_free: `¿Te quedaste sin música? Activa el Autoplay (5 pistas gratis) o adquiere Premium en [nuestro portal](${PATREON_LINK}) para reproducción infinita.`,
    btn_enable_autoplay: "Activar Autoplay",
  },
  en: {
    welcome: "Initial Setup Required",
    welcome_desc:
      "Please have an Administrator select the main language for the interface messages in this server.",
    saved: "Interface language has been set to **English**.",
    joined: "Connection established with voice channel.",
    no_voice: "You must be connected to a voice channel to use this command.",
    no_results: "No matches found for the provided query.",
    added_queue: "Tracks added to queue",
    added_spotify: "Spotify playlist processed and queued.",
    search_title: "Search Results",
    blacklist_added: "Term successfully blocked:",
    blacklist_removed: "Term unblocked:",
    blacklist_current: "Currently blocked terms:\n",
    pos_invalid: "The specified position does not exist in the queue.",
    removed: "Track removed from queue:",
    nothing_playing: "There is no track currently playing.",
    already_liked: "This track is already in your collection.",
    like_added: "Track saved to your collection:",
    list_empty: "Your track collection is empty.",
    your_likes: "Your Personal Collection",
    like_invalid: "The specified index does not exist in your collection.",
    like_removed: "Track removed from collection:",
    no_likes: "You have no saved tracks to play.",
    likes_queued: "Your entire collection has been added to the play queue.",
    stats_no_likes: "Not enough interaction data in this server.",
    stats_title: "Server Metrics",
    stats_total: "Total saved tracks",
    stats_top_user: "Top user",
    stats_top_artists: "Most saved artists",
    history_empty: "No recent playback record.",
    history_title: "Playback Record",
    queue_insufficient:
      "At least 3 tracks are required in the queue to shuffle.",
    queue_shuffled: "The play queue has been randomized.",
    lyrics_not_found: "No lyrics found in the Genius database.",
    lyrics_title: "Official Lyrics",
    skip: "The current track has been skipped.",
    queue_empty: "The play queue is empty.",
    queue_title: "Playback Queue",
    page: "Pg.",
    of: "/",
    total: "Queued tracks:",
    btn_rec: "Explore Recommendations",
    rec_title: "Autoplay Catalog",
    rec_already: "This track is already scheduled in the queue.",
    rec_success: "Autoplay system has scheduled",
    rec_fail: "System could not determine viable recommendations.",
    autoplay_on: "Infinite Autoplay System **Enabled**.",
    autoplay_off: "Infinite Autoplay System **Disabled**.",
    stopped: "Playback stopped. Connection closed.",
    downloading: "📡 Connecting live stream...",
    requested_by: "Requested by",
    artist: "Artist",
    pause: "Pause",
    resume: "Resume",
    skip_btn: "Skip",
    save_btn: "Save",
    audio_paused: "Audio stream paused.",
    audio_resumed: "Audio stream resumed.",
    bot_magic: "Autoplay",
    bot_magic_liked: "Autoplay (Random Favorite)",
    admin_only: "This action requires Administrator privileges.",
    btn_prev: "◀️ Prev",
    btn_next: "Next ▶️",
    error_spotify: "Internal error processing Spotify metadata.",
    premium_only: `**Restricted Access:** This feature is exclusive to Premium Tier servers.\nUnlock full access at [our portal](${PATREON_LINK}).`,
    autoplay_limit: `**Limit Reached:** The server has consumed its 5 free Autoplay tracks.\nUpgrade your plan at [our portal](${PATREON_LINK}) for infinite playback.`,
    dj_required:
      "Requires DJ role or Administrator privileges to use this command.",
    filter_set: "Acoustic filter successfully applied:",
    mode247_on:
      "24/7 Mode **Enabled**. The bot will remain in the channel indefinitely.",
    mode247_off: "24/7 Mode **Disabled**.",
    pl_saved: "Current playback queue has been saved as the playlist:",
    pl_loaded: "Playlist loaded and added to the playback queue.",
    help_title: "Command Panel",
    help_desc:
      "Here is everything I can do for you. Commands are organized by categories:",
    help_cat1: "Playback",
    help_cat1_val:
      "`/play` - Reproducir música\n`/playalbum` - Añadir álbum de Spotify\n`/skip` - Saltar tema actual\n`/stop` - Detener bot\n`/song` - Ver panel del tema actual\n`/queue` - Ver la cola de temas\n`/shuffle` - Mezclar la cola\n`/remove` - Quitar un tema\n`/lyrics` (Premium) - Ver la letra",
    help_cat2: "Automation",
    help_cat2_val:
      "`/autoplay` (Premium) - Toggle Autoplay\n`/search` - Interactive search\n`/blacklist` - Block words/channels\n`/history` - Recently played",
    help_cat3: "Favorites",
    help_cat3_val:
      "`/like` - Save current song\n`/list` - View your list\n`/removeliked` - Remove saved song\n`/playliked` - Play your list\n`/stats` - Top server artists",
    help_cat4: "Utility",
    help_cat4_val:
      "`/join` - Join channel\n`/language` - Change language\n`/help` - View this menu\n`/filter` (Premium) - Real-time acoustic filter\n`/247` (Premium) - Permanent connection mode\n`/dj` (Admin) - DJ Role management\n`/playlist` - Personal Playlists management\n`/profile` - View your profile and stats\n`/trivia` - Start minijuego\n`/radio` - Transmisiones 24/7",
    help_footer:
      "💡 Tip: Use the buttons on the /song panel to control the music faster.",
    np_title: "▶ Now Playing",
    sync_data: "Sincronizando Datos",
    sys_notice: "System Notice",
    audio_ctrl: "Audio Control",
    access_denied: "Access Denied",
    content_mgmt: "Content Management",
    collection: "Collection",
    metrics: "Metrics",
    connection: "Connection",
    global_cfg: "Global Configuration",
    dj_set: "DJ System enabled. Authorized role:",
    dj_clear: "DJ System disabled. Everyone can control playback.",
    dj_no_role: "You must specify a role.",
    pl_not_found: "No playlist found with that name in your profile.",
    results: "results",
    queue_all: "Queue All",
    themes: "tracks",
    profile_title: "Listener Profile",
    profile_stats: (hours, played, likes, artist) =>
      `> **Hours listened:** ${hours}h\n> **Tracks requested:** ${played}\n> **Saved tracks:** ${likes}\n> **Favorite artist:** ${artist}`,
    trivia_start: "Music Trivia",
    trivia_desc:
      "Guess the track name or artist in the chat. You have 45 seconds totally.",
    trivia_stop: "You must stop current playback to start trivia.",
    trivia_no_data: "Not enough data in the global collection to start trivia.",
    trivia_win: (user, title, artist) =>
      `🎉 Correct <@${user}>! It was **${title}** by **${artist}**.`,
    trivia_timeout: (title, artist) =>
      `⏰ Time's up. It was **${title}** by **${artist}**.`,
    radio_start: "Global broadcast started:",
    mystery_track: "❓ Mystery Track",
    playing_status: "Playing: ",
    queue_ended: "Playback Queue Ended",
    autoplay_offer_prem:
      "Out of music? Enable **Smart Autoplay** to keep listening to similar tracks seamlessly.",
    autoplay_offer_free: `Out of music? Enable **Autoplay** (5 free tracks) or upgrade to Premium at [our portal](${PATREON_LINK}) for infinite playback.`,
    btn_enable_autoplay: "Enable Autoplay",
  },
};

let globalBlacklist = [];
const globalQueues = new Map();
const guildLangs = new Map();
const premiumGuilds = new Map();

const SPAM_WORDS = [
  "quiz",
  "interview",
  "podcast",
  "reaction",
  "karaoke",
  "tutorial",
  "cover",
  "review",
  "vlog",
  "live",
  "concert",
  "unplugged",
  "drum",
  "bass",
  "guitar",
  "playthrough",
  "lesson",
  "behind",
  "making of",
  "isolated",
  "vocals",
  "instrumental",
  "how to play",
  "tablature",
  "tabs",
  "chords",
  "full album",
  "all songs",
  "greatest hits",
  "compilation",
  "mix",
  "mashup",
  "playlist",
  "meme",
  "shitpost",
  "funny",
  "riff",
  "riffs",
  "top 10",
  "top 5",
  "best of",
  "moments",
  "tiktok",
  "shorts",
  "vine",
  "parody",
  "teaser",
  "trailer",
  "promo",
  "speedrun",
  "challenge",
  "how i made",
  "can i make",
  "minutes",
  "mins",
  "8d",
  "3d",
  "16d",
  "audio espacial",
  "nightcore",
  "sped up",
  "slowed",
  "reverb",
  "sub",
  "español",
  "espanol",
  "traducida",
  "letra",
  "lyrics",
  "amv",
  "fmv",
  "bass boosted",
];

async function getTidalTracks(url) {
  try {
    const idMatch = url.match(/(?:playlist|album|track)\/([a-zA-Z0-9-]+)/);
    if (!idMatch) return [];

    const tidalId = idMatch[1];
    const isTrack = url.includes("/track/");
    const isAlbum = url.includes("/album/");
    const type = isAlbum ? "albums" : "playlists";

    let allTracks = [];
    const mobileTokens = [
      "gsFXkJqGrUNoYMQPZe4k3WKwijnrp8iGSwn3bApe",
      "4zx46pyr9o8qZNRw",
    ];

    if (isTrack) {
      const res = await request(
        `https://api.tidal.com/v1/tracks/${tidalId}?countryCode=US`,
        { headers: { "x-tidal-token": mobileTokens[0] } },
      );
      if (res.statusCode === 200) allTracks.push(await res.body.json());
    } else {
      let offset = 0;
      let hasMore = true;
      const limit = 100;

      while (hasMore && allTracks.length < 500) {
        const res = await request(
          `https://api.tidal.com/v1/${type}/${tidalId}/items?limit=${limit}&offset=${offset}&countryCode=US`,
          {
            headers: { "x-tidal-token": mobileTokens[0] },
          },
        );

        if (res.statusCode !== 200) break;

        const data = await res.body.json();
        const items = data.items.map((item) => item.item || item);
        allTracks = allTracks.concat(items);

        if (items.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
    }

    return allTracks
      .filter((t) => t && t.title)
      .map((t) => ({
        name: t.title,
        artist: t.artist?.name || t.artists?.[0]?.name || "Desconocido",
        id: t.id,
        thumbnail: t.album?.cover
          ? `https://resources.tidal.com/images/${t.album.cover.replace(/-/g, "/")}/640x640.jpg`
          : "https://i.imgur.com/Q2v1vV7.png",
      }));
  } catch (e) {
    console.error("[TIDAL PAGINATION ERROR]:", e.message);
    return [];
  }
}

async function fetchGeniusLyrics(title, artist) {
  try {
    const cleanTitle = title.replace(/\[.*?\]|\(.*?\)/g, "").trim();
    const searchQuery = `${cleanTitle} ${artist || ""}`;

    const searches = await geniusClient.songs.search(searchQuery);
    if (searches.length === 0) return null;

    const firstSong = searches[0];
    const lyrics = await firstSong.lyrics();
    return lyrics;
  } catch (error) {
    console.error("Genius Error:", error.message);
    return null;
  }
}
async function getLang(guildId) {
  if (!guildId) return "es";
  if (guildLangs.has(guildId)) return guildLangs.get(guildId);
  try {
    const res = await pool.query(
      "SELECT language FROM server_settings WHERE guild_id = $1",
      [guildId],
    );
    const l = res.rows.length > 0 ? res.rows[0].language : "es";
    guildLangs.set(guildId, l);
    return l;
  } catch (e) {
    return "es";
  }
}

async function checkPremium(guildId) {
  if (VIP_GUILDS.some((id) => String(id) === String(guildId))) return true;
  if (premiumGuilds.has(guildId)) return premiumGuilds.get(guildId);
  try {
    const res = await pool.query(
      "SELECT is_premium FROM server_settings WHERE guild_id = $1",
      [guildId],
    );
    const p = res.rows.length > 0 ? res.rows[0].is_premium : false;
    premiumGuilds.set(guildId, p);
    return p;
  } catch (e) {
    return false;
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const buildPaginatedUI = (prefix, videos, page, title, l) => {
  const itemsPerPage = 5;
  const totalPages = Math.ceil(videos.length / itemsPerPage);
  const start = page * itemsPerPage;
  const currentVideos = videos.slice(start, start + itemsPerPage);

  let desc = currentVideos
    .map((v, i) => {
      return `**${start + i + 1}.** ${v.title} \`[${v.timestamp || v.durationStr || "0:00"}]\`\n└ *${v.author?.name || v.artist || "Desconocido"}*`;
    })
    .join("\n\n");

  const embed = UI.panel()
    .setTitle(title)
    .setDescription(desc)
    .setFooter({
      text: `${videos.length} ${i18n[l].results} | ${i18n[l].page} ${page + 1}/${totalPages}`,
    });

  const row1 = new ActionRowBuilder();
  currentVideos.forEach((v, i) => {
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId(`${prefix}_add_${start + i}`)
        .setLabel(`+ ${start + i + 1}`)
        .setStyle(ButtonStyle.Secondary),
    );
  });

  const row2 = new ActionRowBuilder();
  row2.addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}_all`)
      .setLabel(i18n[l].queue_all)
      .setStyle(ButtonStyle.Primary),
  );
  row2.addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}_first`)
      .setLabel("<<")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
  );
  row2.addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}_prev`)
      .setLabel("<")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
  );
  row2.addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}_next`)
      .setLabel(">")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1 || totalPages === 0),
  );
  row2.addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}_last`)
      .setLabel(">>")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1 || totalPages === 0),
  );

  return {
    embeds: [embed],
    components:
      currentVideos.length > 0
        ? [row1, row2]
        : [new ActionRowBuilder().addComponents(row2.components[0])],
  };
};

function getQueue(guildId) {
  if (!globalQueues.has(guildId)) {
    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });

    player.on(AudioPlayerStatus.Idle, () => {
      const q = globalQueues.get(guildId);
      if (!q) return;

      if (q.currentProcess) {
        try {
          if (q.currentProcess.ytdlp) q.currentProcess.ytdlp.kill();
          if (q.currentProcess.ffmpeg) q.currentProcess.ffmpeg.kill();
        } catch (e) {}
        q.currentProcess = null;
      }

      const finishedSong = q.songs.shift();

      if (q.voiceChannel) {
        q.voiceChannel.client.rest
          .put(`/channels/${q.voiceChannel.id}/voice-status`, {
            body: { status: "" },
          })
          .catch(() => {});
      }

      if (q.progressInterval) {
        clearInterval(q.progressInterval);
        q.progressInterval = null;
      }
      if (global.gc) global.gc();

      if (q.songs.length === 0 && q.stay247) {
        q.playing = false;
        return;
      }
      playNext(guildId);
    });

    globalQueues.set(guildId, {
      songs: [],
      history: [],
      titleHistory: [],
      playedHistory: [],
      compareHistory: [],
      connection: null,
      textChannel: null,
      voiceChannel: null,
      playing: false,
      autoplay: false,
      discovery: false,
      lastSong: null,
      currentMessage: null,
      progressInterval: null,
      player: player,
      autoplayCount: 0,
      filter: null,
      stay247: false,
      djRole: null,
      currentProcess: null,
      volume: 100,
    });
  }
  return globalQueues.get(guildId);
}

async function isAuthorized(interaction, q) {
  if (interaction.member.permissions.has("Administrator")) return true;

  let roleId = q.djRole;
  if (!roleId) {
    try {
      const res = await pool.query(
        "SELECT dj_role FROM server_settings WHERE guild_id = $1",
        [interaction.guildId],
      );
      roleId = res.rows.length > 0 ? res.rows[0].dj_role : null;
      q.djRole = roleId;
    } catch (e) {}
  }

  if (!roleId) return true;
  return interaction.member.roles.cache.has(roleId);
}

const commandsDef = [
  {
    name: "play",
    description: "Reproducir (YouTube/Spotify)",
    options: [
      { type: 3, name: "query", description: "URL o búsqueda", required: true },
    ],
  },
  { name: "join", description: "Unirse al canal de voz" },
  {
    name: "search",
    description: "Búsqueda avanzada de pistas",
    options: [
      { type: 3, name: "query", description: "Búsqueda", required: true },
    ],
  },
  {
    name: "remove",
    description: "Eliminar pista de la cola",
    options: [
      {
        type: 4,
        name: "posicion",
        description: "Índice numérico",
        required: true,
      },
    ],
  },
  {
    name: "blacklist",
    description: "Gestionar filtros de seguridad",
    options: [
      {
        type: 3,
        name: "accion",
        description: "add, remove, list",
        required: true,
        choices: [
          { name: "add", value: "add" },
          { name: "remove", value: "remove" },
          { name: "list", value: "list" },
        ],
      },
      {
        type: 3,
        name: "termino",
        description: "Término a evaluar",
        required: false,
      },
    ],
  },
  { name: "like", description: "Guardar pista actual a tu colección" },
  { name: "list", description: "Visualizar tu colección personal" },
  {
    name: "removeliked",
    description: "Eliminar pista de tu colección",
    options: [
      {
        type: 4,
        name: "indice",
        description: "Índice de la lista",
        required: true,
      },
    ],
  },
  { name: "playliked", description: "Importar tu colección a la cola" },
  { name: "shuffle", description: "Mezclar cola de reproducción" },
  { name: "song", description: "Interfaz de control de reproducción" },
  {
    name: "lyrics",
    description: "Visualizar letras oficiales (Premium)",
    options: [
      {
        type: 3,
        name: "query",
        description: "Artista y pista",
        required: false,
      },
    ],
  },
  { name: "stats", description: "Métricas y estadísticas del servidor" },
  { name: "history", description: "Registro de reproducción" },
  { name: "skip", description: "Omitir pista actual" },
  { name: "queue", description: "Gestión de la cola de reproducción" },
  {
    name: "autoplay",
    description: "Alternar modo de reproduccion basado en Likes (Strict)",
  },
  {
    name: "discovery",
    description: "Alternar modo de reproduccion basado en Generos (Discovery)",
  },
  { name: "stop", description: "Detener y cerrar conexión" },
  { name: "language", description: "Configuración regional (Admin)" },
  { name: "help", description: "Visualizar panel de ayuda y comandos" },
  {
    name: "filter",
    description: "Procesamiento acústico en tiempo real (Premium)",
    options: [
      {
        type: 3,
        name: "tipo",
        description: "Tipo de filtro",
        required: true,
        choices: [
          { name: "Ninguno (Limpiar)", value: "clear" },
          { name: " Bassboost", value: "bass=g=15" },
          { name: "🎧 8D Audio", value: "apulsator=hz=0.09" },
          {
            name: " Nightcore",
            value: "asetrate=44100*1.25,aresample=44100,atempo=1",
          },
        ],
      },
    ],
  },
  { name: "247", description: "Alternar modo conexión permanente (Premium)" },
  {
    name: "dj",
    description: "Gestión de roles de control (Admin)",
    options: [
      {
        type: 3,
        name: "accion",
        description: "Acción",
        required: true,
        choices: [
          { name: "Establecer Rol", value: "set" },
          { name: "Limpiar Rol", value: "clear" },
        ],
      },
      { type: 8, name: "rol", description: "Rol objetivo", required: false },
    ],
  },
  {
    name: "playlist",
    description: "Gestión de Playlists Personales",
    options: [
      {
        type: 3,
        name: "accion",
        description: "Acción",
        required: true,
        choices: [
          { name: "Guardar Cola Actual", value: "save" },
          { name: "Reproducir Mi Playlist", value: "play" },
        ],
      },
      {
        type: 3,
        name: "nombre",
        description: "Nombre de la playlist",
        required: true,
        autocomplete: true,
      },
    ],
  },
  {
    name: "profile",
    description: "Visualizar tu perfil de oyente y tiempo de reproducción",
  },
  { name: "trivia", description: "Iniciar minijuego de adivinar pistas" },
  {
    name: "radio",
    description: "Iniciar transmisiones de radio globales 24/7",
    options: [
      {
        type: 3,
        name: "estacion",
        description: "Selecciona una estación",
        required: true,
        choices: [
          { name: "Lofi Hip Hop", value: "lofi" },
          { name: "Synthwave / Cyberpunk", value: "synth" },
          { name: "Classic Rock", value: "rock" },
        ],
      },
    ],
  },
  {
    name: "playalbum",
    description: "Buscar y reproducir un álbum oficial",
    options: [
      {
        type: 3,
        name: "query",
        description: "Nombre del álbum y artista",
        required: true,
      },
    ],
  },
];
client.once(Events.ClientReady, async (c) => {
  console.log(`[SYSTEM] Core iniciado como ${c.user.tag}`);
  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS likes ( id SERIAL PRIMARY KEY, user_id VARCHAR(50) NOT NULL, video_id VARCHAR(50) NOT NULL, title VARCHAR(255), artist VARCHAR(255) );
            CREATE TABLE IF NOT EXISTS blacklist ( id SERIAL PRIMARY KEY, term VARCHAR(255) UNIQUE NOT NULL );
            CREATE TABLE IF NOT EXISTS server_settings ( guild_id VARCHAR(50) PRIMARY KEY, language VARCHAR(5) DEFAULT 'es', is_premium BOOLEAN DEFAULT false, dj_role VARCHAR(50) );
            CREATE TABLE IF NOT EXISTS user_playlists ( id SERIAL PRIMARY KEY, user_id VARCHAR(50) NOT NULL, name VARCHAR(100) NOT NULL, songs JSONB DEFAULT '[]' );
            CREATE TABLE IF NOT EXISTS user_stats ( user_id VARCHAR(50) PRIMARY KEY, listen_time INT DEFAULT 0, songs_played INT DEFAULT 0 );
            CREATE TABLE IF NOT EXISTS user_history ( id SERIAL PRIMARY KEY, user_id VARCHAR(50) NOT NULL, video_id VARCHAR(50) NOT NULL, title VARCHAR(255), artist VARCHAR(255), played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );
            CREATE TABLE IF NOT EXISTS track_stats ( video_id VARCHAR(50) PRIMARY KEY, title VARCHAR(255), plays INT DEFAULT 0, skips INT DEFAULT 0 );
            CREATE TABLE IF NOT EXISTS user_track_stats ( user_id VARCHAR(50), video_id VARCHAR(50), title VARCHAR(255), plays INT DEFAULT 0, skips INT DEFAULT 0, PRIMARY KEY (user_id, video_id) );
        `);
    const blRes = await pool.query("SELECT term FROM blacklist");
    globalBlacklist = blRes.rows.map((row) => row.term);
    if (globalBlacklist.length === 0) {
      ["howdytoons", "parody", "short"].forEach(async (t) => {
        await pool.query(
          "INSERT INTO blacklist (term) VALUES ($1) ON CONFLICT DO NOTHING",
          [t],
        );
        globalBlacklist.push(t);
      });
    }
    await client.application.commands.set(commandsDef);
    console.log(`[SYSTEM] Base de datos y registro de comandos sincronizados.`);
  } catch (error) {
    console.error(`[ERROR]:`, error);
  }
});

client.on(Events.GuildCreate, async (guild) => {
  try {
    const channel = guild.channels.cache.find(
      (c) =>
        c.type === 0 && c.permissionsFor(guild.members.me).has("SendMessages"),
    );
    if (!channel) return;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("setlang_es")
        .setLabel("ES")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("setlang_en")
        .setLabel("EN")
        .setStyle(ButtonStyle.Secondary),
    );
    await channel.send({
      embeds: [
        UI.info(
          i18n["es"].welcome,
          i18n["es"].welcome_desc + "\n\n---\n\n" + i18n["en"].welcome_desc,
        ),
      ],
      components: [row],
    });
  } catch (e) {}
});

const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
};

function ctxMenuRoundedImage(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function getDisplayTitle(song, l) {
  if (song.isTrivia) return i18n[l].mystery_track;
  return song.realTitle || song.title;
}

function getDisplayArtist(song) {
  if (song.isTrivia) return "???";
  return song.realArtist || song.artist;
}

const createNowPlayingEmbed = (
  song,
  currentMs,
  l = "es",
  dynamicColor = 0x2b2d31,
) => {
  const timeStr = `[\`${formatTime(currentMs)}\` • \`${song.durationStr}\`](${song.url})`;

  const embed = new EmbedBuilder()
    .setColor(dynamicColor)
    .setImage("attachment://card_musicardi.png")
    .setDescription(timeStr);
  return embed;
};

const getPlaybackRows = (q, l) => {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pause_resume")
      .setLabel(
        q.player.state.status === AudioPlayerStatus.Paused ? "Resume" : "Pause",
      )
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("skip_song")
      .setLabel("Skip")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("stop_song")
      .setLabel("Stop")
      .setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("shuffle_queue")
      .setLabel("Shuffle")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("toggle_autoplay")
      .setLabel("AutoPlay")
      .setStyle(q.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("like_song")
      .setLabel("Guardar")
      .setStyle(ButtonStyle.Success),
  );
  return [row1, row2];
};

const cleanArtistName = (name) => {
  if (!name) return "";
  return name
    .replace(/VEVO$| - Topic$|官方頻道$|Oficial$|Official$/i, "")
    .trim();
};

const cleanSongName = (name) => {
  if (!name) return "";

  return name
    .toLowerCase()
    .replace(/\[.*?\]|\(.*?\)/g, "")
    .replace(
      /official video|music video|lyric video|official audio|visualizer|video oficial|hd|4k|remastered|live/gi,
      "",
    )
    .trim();
};

async function fetchLrclib(title, artist) {
  try {
    const query = new URLSearchParams({
      track_name: title,
      artist_name: artist,
    });
    const res = await request(
      `https://lrclib.net/api/search?${query.toString()}`,
    );
    const data = await res.body.json();
    if (data && data.length > 0) {
      const synced = data.find((d) => d.syncedLyrics);
      return synced || data[0];
    }
    return null;
  } catch (e) {
    return null;
  }
}

const getCompareString = (name) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\[.*?\]|\(.*?\)/g, "")
    .replace(/-.*(?:remaster|mix|edit|version|live|demo).*/gi, "")
    .replace(
      /(?:remaster|mix|edit|version|live|demo|official|video|audio|hq|hd|4k)\b/gi,
      "",
    )
    .replace(/[0-9]{4}/g, "")
    .replace(/[^a-z]/g, "");
};

const createSong = (
  video,
  artistOverride = null,
  requester = "Motor IA",
  requesterAvatar = null,
) => {
  let rawAuthor =
    typeof video.author === "string" ? video.author : video.author?.name || "";
  let artist = artistOverride || cleanArtistName(rawAuthor);

  if (
    (!artist || artist === "Desconocido" || artist === "Artista Desconocido") &&
    video.title.includes("-")
  ) {
    artist = video.title.split("-")[0].trim();
  }
  if (!artist) artist = "Artista Desconocido";

  const isWebId =
    video.videoId && /^(itunes|spotify|tidal)_/.test(String(video.videoId));

  const safeUrl =
    video.url ||
    (isWebId ? "" : `https://www.youtube.com/watch?v=${video.videoId}`);

  let thumb = video.thumbnail || video.image;
  if (!thumb && video.videoId && !isWebId) {
    thumb = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
  }
  if (!thumb || thumb.includes("ui-avatars"))
    thumb = "https://i.imgur.com/Q2v1vV7.png";

  let duration =
    video.seconds ||
    video.durationSec ||
    (video.duration ? video.duration.seconds : 0) ||
    0;

  let durationString =
    video.timestamp ||
    video.durationStr ||
    (video.duration ? video.duration.timestamp : null) ||
    "0:00";
  if ((!durationString || durationString === "0:00") && duration > 0) {
    const m = Math.floor(duration / 60);
    const s = duration % 60;
    durationString = `${m}:${s.toString().padStart(2, "0")}`;
  }

  return {
    title: video.title,
    artist: artist,
    url: safeUrl,
    thumbnail: thumb,
    durationStr: durationString,
    durationSec: duration,
    videoId: video.videoId,
    requester: requester,
    requesterAvatar: requesterAvatar,

    hasRealCover: isWebId && !thumb.includes("Q2v1vV7.png"),
  };
};

async function startProgressInterval(guildId, vibrantColor) {
  const q = globalQueues.get(guildId);
  if (!q) return;
  const l = await getLang(guildId);

  if (q.progressInterval) clearInterval(q.progressInterval);
  q.progressInterval = setInterval(async () => {
    if (
      !q.playing ||
      !q.lastSong ||
      q.player.state.status === AudioPlayerStatus.Paused
    )
      return;

    const baseMs = q.lastSong.seekTime ? q.lastSong.seekTime * 1000 : 0;
    const currentMs =
      (q.player.state.resource ? q.player.state.resource.playbackDuration : 0) +
      baseMs;

    if (q.voiceChannel) {
      let activeUserIds = [];
      q.voiceChannel.members.forEach((m) => {
        if (!m.user.bot) activeUserIds.push(m.id);
      });
      if (activeUserIds.length > 0) {
        const upsertTime = `
                    INSERT INTO user_stats (user_id, listen_time, songs_played) 
                    SELECT unnest($1::varchar[]), 10, 0
                    ON CONFLICT (user_id) DO UPDATE SET listen_time = COALESCE(user_stats.listen_time, 0) + 10
                `;
        pool
          .query(upsertTime, [activeUserIds])
          .catch((e) => console.error("[STATS TIME ERROR]:", e.message));
      }
    }

    if (q.currentMessage) {
      const embedPlay = createNowPlayingEmbed(
        q.lastSong,
        currentMs,
        l,
        vibrantColor,
      );
      const rows = getPlaybackRows(q, l);
      if (q.filter && q.filter !== "clear")
        embedPlay.setFooter({ text: `Filtro Activo: ${q.filter}` });

      q.currentMessage
        .edit({ embeds: [embedPlay], components: rows })
        .catch(() => {
          q.currentMessage = null;
        });
    }
  }, 10000);
}

async function playNext(guildId) {
  const q = globalQueues.get(guildId);
  if (!q) return;
  const l = await getLang(guildId);

  if (q.songs.length === 0) {
    if ((q.autoplay || q.discovery) && q.lastSong) {
      try {
        const isPrem = await checkPremium(guildId);
        if (!isPrem && q.autoplayCount >= 5) {
          q.autoplay = false;
          q.discovery = false;
          q.playing = false;
          if (q.textChannel)
            q.textChannel
              .send({
                embeds: [UI.info("SYSTEM", "Límite de Autoplay alcanzado.")],
              })
              .catch(() => {});
          return;
        }

        let activeModes = [];
        if (q.autoplay) activeModes.push("STRICT");
        if (q.discovery) activeModes.push("DISCOVERY");

        if (!q.batchCount) q.batchCount = 0;

        if (!q.lastSong.isAutoplay) {
          console.log(
            `\n👤 [MOTOR DUAL] Intervención humana detectada. Adaptando algoritmo a la nueva pista...`,
          );
          q.batchCount = 5;
        }

        if (!activeModes.includes(q.currentBatchType) || q.batchCount >= 5) {
          q.currentBatchType =
            activeModes[Math.floor(Math.random() * activeModes.length)];
          q.currentBatchSeed = null;
          q.batchCount = 0;
        }

        let targetQuery = "";
        let expectedArtist = "";
        let artistFallback =
          q.lastSong.realArtist || q.lastSong.artist || "Music";

        console.log(
          `\n[MOTOR DUAL] Lote: ${q.currentBatchType} | Pista: ${q.batchCount + 1}/5`,
        );

        if (q.currentBatchType === "DISCOVERY") {
          try {
            if (!q.currentBatchSeed) {
              const trackInfo = await request(
                `https://itunes.apple.com/search?term=${encodeURIComponent(artistFallback)}&entity=song&limit=1`,
              ).then((r) => r.body.json());
              q.currentBatchSeed =
                trackInfo.results && trackInfo.results.length > 0
                  ? trackInfo.results[0].primaryGenreName
                  : "Pop";
              console.log(
                `[DISCOVERY] Nuevo género fijado: ${q.currentBatchSeed}`,
              );
            }

            const genreRes = await request(
              `https://itunes.apple.com/search?term=${encodeURIComponent(q.currentBatchSeed)}&entity=song&limit=50`,
            ).then((r) => r.body.json());

            const validGenreTracks = genreRes.results.filter((t) => {
              const name = t.trackName.toLowerCase();
              const art = t.artistName.toLowerCase();
              return (
                !name.includes("cover") &&
                !name.includes("karaoke") &&
                !name.includes("tribute") &&
                !art.includes("tribute")
              );
            });

            const unheard = validGenreTracks.filter(
              (t) => !q.titleHistory.includes(cleanSongName(t.trackName)),
            );
            const randomTrack =
              unheard.length > 0
                ? unheard[Math.floor(Math.random() * unheard.length)]
                : validGenreTracks[0] || genreRes.results[0];

            expectedArtist = randomTrack.artistName;
            targetQuery = `${randomTrack.trackName} ${expectedArtist} official audio`;
          } catch (e) {
            expectedArtist = artistFallback;
            targetQuery = `${artistFallback} official audio`;
          }
        } else {
          try {
            if (!q.currentBatchSeed) {
              let activeUserIds = [];
              if (q.voiceChannel)
                q.voiceChannel.members.forEach((m) => {
                  if (!m.user.bot) activeUserIds.push(m.id);
                });

              let artistPool = [];
              if (activeUserIds.length > 0) {
                const { rows } = await pool.query(
                  "SELECT artist FROM likes WHERE user_id = ANY($1::varchar[]) GROUP BY artist",
                  [activeUserIds],
                );
                artistPool = rows.map((r) => r.artist);
              }
              if (
                artistPool.length === 0 &&
                q.playedHistory &&
                q.playedHistory.length > 0
              ) {
                artistPool = [
                  ...new Set(q.playedHistory.slice(-10).map((s) => s.artist)),
                ];
              }

              q.currentBatchSeed =
                artistPool.length > 0
                  ? artistPool[Math.floor(Math.random() * artistPool.length)]
                  : artistFallback;
              console.log(
                `[STRICT] Nuevo artista fijado: ${q.currentBatchSeed}`,
              );
            }

            expectedArtist = q.currentBatchSeed;
            const itunesRes = await request(
              `https://itunes.apple.com/search?term=${encodeURIComponent(q.currentBatchSeed)}&entity=song&attribute=artistTerm&limit=50`,
            ).then((r) => r.body.json());

            if (itunesRes.results && itunesRes.results.length > 0) {
              const strictTracks = itunesRes.results.filter((t) => {
                const isSameArtist =
                  t.artistName
                    .toLowerCase()
                    .includes(q.currentBatchSeed.toLowerCase()) ||
                  q.currentBatchSeed
                    .toLowerCase()
                    .includes(t.artistName.toLowerCase());
                const isNotCover =
                  !t.trackName.toLowerCase().includes("cover") &&
                  !t.trackName.toLowerCase().includes("tribute") &&
                  !t.artistName.toLowerCase().includes("tribute");
                return isSameArtist && isNotCover;
              });

              const unheard = strictTracks.filter(
                (t) => !q.titleHistory.includes(cleanSongName(t.trackName)),
              );
              const randomTrack =
                unheard.length > 0
                  ? unheard[Math.floor(Math.random() * unheard.length)]
                  : strictTracks[0] || itunesRes.results[0];

              targetQuery = `${randomTrack.trackName} ${q.currentBatchSeed} official audio`;
            } else {
              targetQuery = `${q.currentBatchSeed} official audio`;
            }
          } catch (e) {
            targetQuery = `${q.currentBatchSeed} official audio`;
          }
        }

        console.log(`[MOTOR] Query a YouTube: "${targetQuery}"`);
        const searchRes = await yts(targetQuery);

        if (searchRes && searchRes.videos.length > 0) {
          let validVideos = searchRes.videos.filter((v) => {
            if (q.history.includes(v.videoId)) return false;

            const vTitle = v.title.toLowerCase();
            const vAuthor = v.author.name.toLowerCase();

            if (SPAM_WORDS.some((sw) => vTitle.includes(sw))) return false;
            if (
              vTitle.includes("cover") ||
              vTitle.includes("tribute") ||
              vTitle.includes("live")
            )
              return false;

            const expArtistLower = expectedArtist.toLowerCase().split(" ")[0];
            const isOfficialChannel =
              vAuthor.endsWith("vevo") ||
              vAuthor.endsWith("- topic") ||
              vAuthor.includes("official") ||
              vAuthor.includes(expArtistLower);

            return isOfficialChannel;
          });

          if (validVideos.length === 0) {
            validVideos = searchRes.videos.filter(
              (v) =>
                !q.history.includes(v.videoId) &&
                !SPAM_WORDS.some((sw) => v.title.toLowerCase().includes(sw)) &&
                !v.title.toLowerCase().includes("cover"),
            );
          }

          let nextVideo =
            validVideos.length > 0 ? validVideos[0] : searchRes.videos[0];

          q.autoplayCount++;
          q.batchCount++;

          let autoSong = createSong(
            nextVideo,
            expectedArtist,
            i18n[l].bot_magic,
            null,
          );
          autoSong.isAutoplay = true;
          q.songs.push(autoSong);

          console.log(`[AÑADIDO] ${autoSong.artist} - ${autoSong.title}`);
          return playNext(guildId);
        } else {
          console.log(
            `[MOTOR] Sin resultados en YouTube. Forzando rotación de lote...`,
          );
          q.batchCount = 5;
          return playNext(guildId);
        }
      } catch (e) {
        console.error(`[MOTOR FATAL ERROR]:`, e);
        q.playing = false;
        return;
      }
    } else {
      q.playing = false;
      return;
    }
  }

  const song = q.songs[0];

  if (song.videoId && /^(itunes|spotify|tidal)_/.test(String(song.videoId))) {
    try {
      const searchRes = await yts(
        `${song.title} ${song.artist} official audio`,
      );
      if (searchRes && searchRes.videos.length > 0) {
        const yt = searchRes.videos[0];
        song.videoId = yt.videoId;
        song.url = yt.url;

        if (!song.durationSec || song.durationSec === 0) {
          song.durationSec = yt.seconds;
          song.durationStr = yt.timestamp || "0:00";
          if (song.durationStr === "0:00" && song.durationSec > 0) {
            const m = Math.floor(song.durationSec / 60);
            const s = song.durationSec % 60;
            song.durationStr = `${m}:${s.toString().padStart(2, "0")}`;
          }
        }
      } else {
        console.log(
          `[TRADUCTOR] No se encontró audio en YT para ${song.title}`,
        );
        q.songs.shift();
        return playNext(guildId);
      }
    } catch (e) {
      console.error("[TRADUCTOR ERROR]:", e.message);
      q.songs.shift();
      return playNext(guildId);
    }
  }

  if (!song.durationSec || song.durationSec === 0) {
    try {
      const searchRes = await yts(
        `${song.title} ${song.artist} official audio`,
      );
      if (searchRes && searchRes.videos.length > 0) {
        song.durationSec = searchRes.videos[0].seconds;
        song.durationStr = searchRes.videos[0].timestamp || "0:00";

        if (song.durationStr === "0:00" && song.durationSec > 0) {
          const m = Math.floor(song.durationSec / 60);
          const s = song.durationSec % 60;
          song.durationStr = `${m}:${s.toString().padStart(2, "0")}`;
        }
      }
    } catch (e) {
      console.error("[METADATA HEALER ERROR]:", e.message);
    }
  }

  q.lastSong = song;

  if (!song.hasRealCover && !song.isTrivia) {
    try {
      const cleanTitleForiTunes = cleanSongName(song.title);
      const query = encodeURIComponent(`${cleanTitleForiTunes} ${song.artist}`);
      const res = await request(
        `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`,
      );
      const data = await res.body.json();
      if (data.results && data.results.length > 0) {
        song.thumbnail = data.results[0].artworkUrl100.replace(
          "100x100bb",
          "600x600bb",
        );
      }
    } catch (e) {
      console.log("[ITUNES ERROR]", e.message);
    }
    song.hasRealCover = true;
  }

  if (q.textChannel && q.currentMessage) {
    q.currentMessage.delete().catch(() => {});
    q.currentMessage = null;
  }

  if (q.voiceChannel && !song.isTrivia) {
    let activeUserIds = [];
    q.voiceChannel.members.forEach((m) => {
      if (!m.user.bot) activeUserIds.push(m.id);
    });
    if (activeUserIds.length > 0) {
      if (!song.isAutoplay) {
        const upsertSongs = `
                    INSERT INTO user_stats (user_id, listen_time, songs_played) 
                    SELECT unnest($1::varchar[]), 0, 1
                    ON CONFLICT (user_id) DO UPDATE SET songs_played = COALESCE(user_stats.songs_played, 0) + 1
                `;
        pool
          .query(upsertSongs, [activeUserIds])
          .catch((e) => console.error("[STATS SONGS ERROR]:", e.message));
      }

      const historyQuery = `INSERT INTO user_history (user_id, video_id, title, artist) SELECT unnest($1::varchar[]), $2, $3, $4`;
      pool
        .query(historyQuery, [
          activeUserIds,
          song.videoId,
          song.title,
          song.artist,
        ])
        .catch(() => {});

      activeUserIds.forEach((id) => {
        io.emit("history_updated", {
          userId: id,
          videoId: song.videoId,
          title: song.title,
          artist: song.artist,
          playedAt: new Date().toISOString(),
        });
      });

      if (!song.isTrivia) {
        pool
          .query(
            `
                    INSERT INTO user_track_stats (user_id, video_id, title, plays, skips) 
                    SELECT unnest($1::varchar[]), $2, $3, 1, 0
                    ON CONFLICT (user_id, video_id) DO UPDATE SET plays = user_track_stats.plays + 1
                `,
            [activeUserIds, song.videoId, song.title],
          )
          .catch((e) => console.log("Stats Play Error:", e.message));
      }
    }
  }

  startStream(song, guildId, l);
}

async function startStream(song, guildId, l) {
  const q = globalQueues.get(guildId);
  if (!q) return;

  try {
    const ytdlpArgs = [
      "-f",
      "bestaudio",
      "-q",
      "--no-playlist",
      "--cookies",
      "cookies.txt",
      "-o",
      "-",
      song.url,
    ];
    const ytdlpProcess = spawn("yt-dlp", ytdlpArgs);

    let ffmpegArgs = [];
    if (song.seekTime) ffmpegArgs.push("-ss", song.seekTime.toString());
    ffmpegArgs.push("-i", "pipe:0", "-f", "mp3");
    if (q.filter && q.filter !== "clear") ffmpegArgs.push("-af", q.filter);
    ffmpegArgs.push("pipe:1");

    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

    ytdlpProcess.stdout.on("error", (err) => {
      if (err.code === "EPIPE") return;
    });
    ffmpegProcess.stdin.on("error", (err) => {
      if (err.code === "EPIPE") return;
    });
    ytdlpProcess.stdout.pipe(ffmpegProcess.stdin);

    q.currentProcess = { ytdlp: ytdlpProcess, ffmpeg: ffmpegProcess };

    ytdlpProcess.on("close", (code) => {
      if (code !== 0 && code !== null && q.playing) q.player.stop();
    });
    ytdlpProcess.on("error", () => {
      q.player.stop();
    });
    ffmpegProcess.on("error", () => {});

    const resource = createAudioResource(ffmpegProcess.stdout);
    q.player.play(resource);
    q.playing = true;

    if (!q.history) q.history = [];
    if (!q.titleHistory) q.titleHistory = [];
    if (!q.compareHistory) q.compareHistory = [];
    if (!q.playedHistory) q.playedHistory = [];

    q.history.push(song.videoId);
    q.titleHistory.push(cleanSongName(song.realTitle || song.title));
    q.compareHistory.push(getCompareString(song.realTitle || song.title));
    q.playedHistory.push({ title: song.title, artist: song.artist });

    if (!song.isTrivia) {
      pool
        .query(
          `
                INSERT INTO track_stats (video_id, title, plays, skips) 
                VALUES ($1, $2, 1, 0) 
                ON CONFLICT (video_id) DO UPDATE SET plays = track_stats.plays + 1
            `,
          [song.videoId, song.title],
        )
        .catch((e) => console.log("Stats Play Error:", e.message));
    }

    if (q.history.length > 1000) q.history.shift();
    if (q.titleHistory.length > 1000) q.titleHistory.shift();
    if (q.compareHistory.length > 1000) q.compareHistory.shift();
    if (q.playedHistory.length > 50) q.playedHistory.shift();

    setTimeout(() => {
      if (q.voiceChannel) {
        const statusText = song.isTrivia
          ? i18n[l].mystery_track
          : `${i18n[l].playing_status}${song.title}`;
        q.voiceChannel.client.rest
          .put(`/channels/${q.voiceChannel.id}/voice-status`, {
            body: { status: statusText.substring(0, 100) },
          })
          .catch(() => {});
      }
    }, 1000);

    (async () => {
      try {
        if (q.lastSong?.videoId !== song.videoId) return;

        const canvas = createCanvas(1280, 720);
        const ctx = canvas.getContext("2d");

        ctx.quality = "fast";
        ctx.patternQuality = "fast";
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";

        const imgBuffer = await request(song.thumbnail)
          .then((res) => res.body.arrayBuffer())
          .then((ab) => Buffer.from(ab));
        const mainImage = await loadImage(imgBuffer);

        let palette = {};
        try {
          palette = await Vibrant.from(imgBuffer).getPalette();
        } catch (error) {}

        const vibrantColorHex = palette.Vibrant
          ? palette.Vibrant.hex
          : "#57F287";
        q.vibrantHex = vibrantColorHex;
        const vibrantColorInt = parseInt(vibrantColorHex.replace("#", "0x"));
        const darkVibrantColorHex = palette.DarkVibrant
          ? palette.DarkVibrant.hex
          : "#1e1f22";

        const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
        gradient.addColorStop(0, darkVibrantColorHex);
        gradient.addColorStop(1, "#000000");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1280, 720);

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 50;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 15;
        const imgSize = 560;
        const imgX = 60;
        const imgY = (720 - imgSize) / 2;
        ctxMenuRoundedImage(ctx, imgX, imgY, imgSize, imgSize, 30);
        ctx.clip();

        if (song.isTrivia) {
          ctx.fillStyle = "#1e1f22";
          ctx.fillRect(imgX, imgY, imgSize, imgSize);
          ctx.restore();
          ctx.save();
          ctx.font = "bold 90px sans-serif";
          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";
          ctx.fillText("TRIVIA", imgX + imgSize / 2, imgY + imgSize / 2 + 30);
        } else {
          ctx.drawImage(mainImage, imgX, imgY, imgSize, imgSize);
        }
        ctx.restore();

        const textX = imgX + imgSize + 60;
        const maxWidth = 1280 - textX - 40;
        ctx.font = "bold 40px sans-serif";
        ctx.fillStyle = vibrantColorHex;
        ctx.fillText(i18n[l].np_title.toUpperCase(), textX, 180);

        ctx.font = "bold 75px sans-serif";
        ctx.fillStyle = "#FFFFFF";
        let displayTitle = getDisplayTitle(song, l);
        const words = displayTitle.split(" ");
        let line = "";
        let lines = [];
        for (let n = 0; n < words.length; n++) {
          let testLine = line + words[n] + " ";
          let metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + " ";
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        let currentY = 280;
        for (let i = 0; i < Math.min(lines.length, 2); i++) {
          let textToDraw = lines[i];
          if (i === 1 && lines.length > 2)
            textToDraw = textToDraw.replace(/\s+$/, "") + "...";
          ctx.fillText(textToDraw, textX, currentY);
          currentY += 85;
        }

        ctx.font = "55px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillText(
          `${i18n[l].artist}: ${getDisplayArtist(song)}`,
          textX,
          currentY + 20,
        );
        ctx.font = "italic 40px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.6)";

        if (song.requesterAvatar) {
          try {
            const avatarBuffer = await request(song.requesterAvatar)
              .then((res) => res.body.arrayBuffer())
              .then((ab) => Buffer.from(ab));
            const requesterAvatarImg = await loadImage(avatarBuffer);
            ctx.save();
            const avatarSize = 65;
            const avatarY = 550;
            ctxMenuRoundedImage(
              ctx,
              textX,
              avatarY,
              avatarSize,
              avatarSize,
              avatarSize / 2,
            );
            ctx.clip();
            ctx.drawImage(
              requesterAvatarImg,
              textX,
              avatarY,
              avatarSize,
              avatarSize,
            );
            ctx.restore();
            ctx.fillText(
              `${i18n[l].requested_by}: ${song.requester}`,
              textX + avatarSize + 20,
              avatarY + 45,
            );
          } catch (e) {
            ctx.fillText(
              `${i18n[l].requested_by}: ${song.requester}`,
              textX,
              595,
            );
          }
        } else {
          ctx.fillText(
            `${i18n[l].requested_by}: ${song.requester}`,
            textX,
            595,
          );
        }

        const attachment = new AttachmentBuilder(canvas.toBuffer(), {
          name: "card_musicardi.png",
        });
        const embedPlay = createNowPlayingEmbed(song, 0, l, vibrantColorInt);
        if (q.filter && q.filter !== "clear")
          embedPlay.setFooter({ text: `Filtro Activo: ${q.filter}` });
        const rows = getPlaybackRows(q, l);

        if (q.currentMessage) {
          await q.currentMessage
            .edit({
              embeds: [embedPlay],
              components: rows,
              files: [attachment],
            })
            .catch(() => {
              q.currentMessage = null;
            });
        }

        if (!q.currentMessage && q.textChannel) {
          q.currentMessage = await q.textChannel.send({
            embeds: [embedPlay],
            components: rows,
            files: [attachment],
            flags: [MessageFlags.SuppressNotifications],
          });
        }

        startProgressInterval(guildId, vibrantColorInt);
      } catch (canvasErr) {
        console.error("[CANVAS BG ERROR]:", canvasErr.message);
        startProgressInterval(guildId, 0x2b2d31);
      }
    })();
  } catch (error) {
    console.error("[STREAM ERROR CRÍTICO]:", error);
    q.songs.shift();
    playNext(guildId);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.guild) return;

  if (interaction.isAutocomplete()) {
    const commandName = interaction.commandName;
    if (commandName === "playlist") {
      const focusedValue = interaction.options.getFocused();
      const userId = interaction.user.id;
      try {
        const res = await pool.query(
          `SELECT name FROM user_playlists WHERE user_id = $1 AND LOWER(name) LIKE LOWER($2) LIMIT 10`,
          [userId, `${focusedValue}%`],
        );
        await interaction.respond(
          res.rows.map((row) => ({ name: row.name, value: row.name })),
        );
      } catch (e) {
        await interaction.respond([]);
      }
    }
    return;
  }

  try {
    if (interaction.isChatInputCommand()) {
      await interaction.deferReply().catch(() => {});
    }

    const guildId = interaction.guildId;
    const l = await getLang(guildId);
    const q = getQueue(guildId);
    const userId = interaction.user.id;
    const userName = interaction.user.globalName || interaction.user.username;
    const userAvatar = interaction.user.displayAvatarURL({
      extension: "png",
      size: 128,
      forceStatic: true,
    });

    if (interaction.isButton()) {
      if (interaction.customId.startsWith("setlang_")) {
        if (!interaction.member.permissions.has("Administrator"))
          return interaction.reply({
            embeds: [UI.error(i18n[l].admin_only)],
            flags: MessageFlags.Ephemeral,
          });
        const chosenLang = interaction.customId.split("_")[1];
        await pool.query(
          `INSERT INTO server_settings (guild_id, language) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET language = $2`,
          [guildId, chosenLang],
        );
        guildLangs.set(guildId, chosenLang);
        await interaction.update({
          embeds: [UI.success(i18n[chosenLang].saved)],
          components: [],
        });
        return;
      }

      if (interaction.customId === "skip_song") {
        if (!(await isAuthorized(interaction, q)))
          return interaction.reply({
            embeds: [UI.error(i18n[l].dj_required)],
            flags: MessageFlags.Ephemeral,
          });
        if (!q.playing)
          return interaction.reply({
            embeds: [UI.error(i18n[l].nothing_playing)],
            flags: MessageFlags.Ephemeral,
          });

        let activeUserIds = [];
        if (q.voiceChannel)
          q.voiceChannel.members.forEach((m) => {
            if (!m.user.bot) activeUserIds.push(m.id);
          });

        if (q.lastSong && activeUserIds.length > 0) {
          pool
            .query(
              `
                        INSERT INTO user_track_stats (user_id, video_id, title, plays, skips) 
                        SELECT unnest($1::varchar[]), $2, $3, 0, 1
                        ON CONFLICT (user_id, video_id) DO UPDATE SET skips = user_track_stats.skips + 1
                    `,
              [activeUserIds, q.lastSong.videoId, q.lastSong.title],
            )
            .catch(() => {});
        }

        if (q.currentProcess) {
          try {
            if (q.currentProcess.ytdlp) q.currentProcess.ytdlp.kill();
            if (q.currentProcess.ffmpeg) q.currentProcess.ffmpeg.kill();
          } catch (e) {}
          q.currentProcess = null;
        }
        q.player.stop();
        await interaction
          .reply({
            embeds: [UI.success(i18n[l].skip)],
            flags: MessageFlags.Ephemeral,
          })
          .then((m) =>
            setTimeout(() => m.delete().catch(() => {}), MSG_LIFETIME),
          );
        return;
      }

      if (interaction.customId === "toggle_autoplay") {
        if (!(await checkPremium(guildId))) {
          return interaction.reply({
            embeds: [UI.info("ACCESO", i18n[l].premium_only)],
            flags: [MessageFlags.Ephemeral],
          });
        }

        q.autoplay = !q.autoplay;
        if (q.autoplay) q.autoplayCount = 0;

        const rows = getPlaybackRows(q, l);

        await interaction.update({ components: rows }).catch(() => {});

        const statusMsg = q.autoplay
          ? "AUTOPLAY: ENABLED"
          : "AUTOPLAY: DISABLED";

        if (q.textChannel) {
          q.textChannel
            .send({ embeds: [UI.success(statusMsg)] })
            .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000))
            .catch(() => {});
        }

        io.emit("track_added", statusMsg);
        if (q.autoplay && !q.playing && q.songs.length === 0 && q.lastSong)
          playNext(guildId);
        return;
      }

      if (interaction.customId === "pause_resume") {
        if (!(await isAuthorized(interaction, q)))
          return interaction.reply({
            embeds: [UI.error(i18n[l].dj_required)],
            flags: MessageFlags.Ephemeral,
          });

        const baseMs = q.lastSong.seekTime ? q.lastSong.seekTime * 1000 : 0;
        const currentMs =
          (q.player.state.resource
            ? q.player.state.resource.playbackDuration
            : 0) + baseMs;
        const embedPlay = createNowPlayingEmbed(
          q.lastSong,
          currentMs,
          l,
          0x2b2d31,
        );

        if (q.player.state.status === AudioPlayerStatus.Playing) {
          q.player.pause();
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("pause_resume")
              .setLabel(i18n[l].resume)
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("skip_song")
              .setLabel(i18n[l].skip_btn)
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("like_song")
              .setLabel(i18n[l].save_btn)
              .setStyle(ButtonStyle.Secondary),
          );
          await interaction.update({ embeds: [embedPlay], components: [row] });
          await interaction
            .followUp({
              embeds: [UI.info(i18n[l].audio_ctrl, i18n[l].audio_paused)],
              flags: MessageFlags.Ephemeral,
            })
            .then((m) =>
              setTimeout(() => m.delete().catch(() => {}), MSG_LIFETIME),
            );
        } else if (q.player.state.status === AudioPlayerStatus.Paused) {
          q.player.unpause();
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("pause_resume")
              .setLabel(i18n[l].pause)
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("skip_song")
              .setLabel(i18n[l].skip_btn)
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("like_song")
              .setLabel(i18n[l].save_btn)
              .setStyle(ButtonStyle.Secondary),
          );
          await interaction.update({ embeds: [embedPlay], components: [row] });
          await interaction
            .followUp({
              embeds: [UI.info(i18n[l].audio_ctrl, i18n[l].audio_resumed)],
              flags: MessageFlags.Ephemeral,
            })
            .then((m) =>
              setTimeout(() => m.delete().catch(() => {}), MSG_LIFETIME),
            );
        } else {
          await interaction
            .reply({
              embeds: [UI.error(i18n[l].nothing_playing)],
              flags: MessageFlags.Ephemeral,
            })
            .then((m) =>
              setTimeout(() => m.delete().catch(() => {}), MSG_LIFETIME),
            );
        }
        return;
      }

      if (interaction.customId === "like_song") {
        if (!q.lastSong)
          return interaction.reply({
            embeds: [UI.error(i18n[l].nothing_playing)],
            flags: MessageFlags.Ephemeral,
          });

        const likeTitle = q.lastSong.isTrivia
          ? q.lastSong.realTitle
          : q.lastSong.title;
        const likeArtist = q.lastSong.isTrivia
          ? q.lastSong.realArtist
          : q.lastSong.artist;

        const check = await pool.query(
          "SELECT id FROM likes WHERE user_id = $1 AND video_id = $2",
          [userId, q.lastSong.videoId],
        );
        if (check.rows.length > 0)
          return interaction
            .reply({
              embeds: [UI.info(i18n[l].collection, i18n[l].already_liked)],
              flags: MessageFlags.Ephemeral,
            })
            .then((m) =>
              setTimeout(() => m.delete().catch(() => {}), MSG_LIFETIME),
            );
        await pool.query(
          "INSERT INTO likes (user_id, video_id, title, artist) VALUES ($1, $2, $3, $4)",
          [userId, q.lastSong.videoId, likeTitle, likeArtist],
        );
        await interaction
          .reply({
            embeds: [UI.success(`${i18n[l].like_added}\n> **${likeTitle}**`)],
            flags: MessageFlags.Ephemeral,
          })
          .then((m) =>
            setTimeout(() => m.delete().catch(() => {}), MSG_LIFETIME),
          );
        return;
      }

      if (interaction.customId === "shuffle_queue") {
        if (!(await isAuthorized(interaction, q)))
          return interaction.reply({
            embeds: [UI.error(i18n[l].dj_required)],
            flags: MessageFlags.Ephemeral,
          });
        if (q.songs.length < 3)
          return interaction
            .reply({
              embeds: [UI.error(i18n[l].queue_insufficient)],
              flags: MessageFlags.Ephemeral,
            })
            .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));

        const current = q.songs.shift();
        for (let i = q.songs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [q.songs[i], q.songs[j]] = [q.songs[j], q.songs[i]];
        }
        q.songs.unshift(current);

        await interaction
          .reply({
            embeds: [UI.success(i18n[l].queue_shuffled)],
            flags: MessageFlags.Ephemeral,
          })
          .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
        return;
      }

      if (interaction.customId === "stop_song") {
        if (!(await isAuthorized(interaction, q)))
          return interaction.reply({
            embeds: [UI.error(i18n[l].dj_required)],
            flags: [MessageFlags.Ephemeral],
          });

        if (q.progressInterval) clearInterval(q.progressInterval);
        if (q.currentMessage) q.currentMessage.delete().catch(() => {});

        q.songs = [];
        q.history = [];
        q.titleHistory = [];
        q.autoplay = false;
        q.discovery = false;
        q.autoplayCount = 0;
        q.batchCount = 0;
        q.lastSong = null;

        if (q.currentProcess) {
          try {
            if (q.currentProcess.ytdlp) q.currentProcess.ytdlp.kill();
            if (q.currentProcess.ffmpeg) q.currentProcess.ffmpeg.kill();
          } catch (e) {}
          q.currentProcess = null;
        }

        q.player.stop();
        if (q.connection) q.connection.destroy();
        q.connection = null;
        q.playing = false;
        q.currentMessage = null;
        q.stay247 = false;
        q.filter = null;

        await interaction
          .reply({
            embeds: [UI.info(i18n[l].connection, i18n[l].stopped)],
            flags: [MessageFlags.Ephemeral],
          })
          .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
        return;
      }

      return;
    }

    if (!interaction.isChatInputCommand()) return;
    const command = interaction.commandName;

    if (["skip", "stop", "remove", "filter", "247"].includes(command)) {
      if (!(await isAuthorized(interaction, q))) {
        await interaction.editReply({
          embeds: [UI.error(i18n[l].dj_required)],
        });
        setTimeout(
          () => interaction.deleteReply().catch(() => {}),
          MSG_LIFETIME,
        );
        return;
      }
    }

    if (command === "skip") {
      if (!q.playing)
        return interaction.editReply({
          embeds: [UI.error(i18n[l].nothing_playing)],
        });

      let activeUserIds = [];
      if (q.voiceChannel)
        q.voiceChannel.members.forEach((m) => {
          if (!m.user.bot) activeUserIds.push(m.id);
        });

      if (q.lastSong && activeUserIds.length > 0) {
        pool
          .query(
            `
                    INSERT INTO user_track_stats (user_id, video_id, title, plays, skips) 
                    SELECT unnest($1::varchar[]), $2, $3, 0, 1
                    ON CONFLICT (user_id, video_id) DO UPDATE SET skips = user_track_stats.skips + 1
                `,
            [activeUserIds, q.lastSong.videoId, q.lastSong.title],
          )
          .catch(() => {});
      }

      if (q.currentProcess) {
        try {
          if (q.currentProcess.ytdlp) q.currentProcess.ytdlp.kill();
          if (q.currentProcess.ffmpeg) q.currentProcess.ffmpeg.kill();
        } catch (e) {}
        q.currentProcess = null;
      }

      q.player.stop();
      interaction.editReply({ embeds: [UI.success(i18n[l].skip)] });
      setTimeout(() => interaction.deleteReply().catch(() => {}), MSG_LIFETIME);
      return;
    }

    if (
      [
        "play",
        "join",
        "search",
        "playliked",
        "playlist",
        "trivia",
        "radio",
        "playalbum",
      ].includes(command)
    ) {
      const vc = interaction.member.voice.channel;
      if (!vc) {
        await interaction.editReply({ embeds: [UI.error(i18n[l].no_voice)] });
        setTimeout(
          () => interaction.deleteReply().catch(() => {}),
          MSG_LIFETIME,
        );
        return;
      }

      const permissions = vc.permissionsFor(interaction.client.user);
      if (!permissions.has("Connect") || !permissions.has("Speak")) {
        await interaction.editReply({
          embeds: [
            UI.error(
              "No tengo permisos suficientes para unirme o hablar en ese canal de voz.",
            ),
          ],
        });
        setTimeout(
          () => interaction.deleteReply().catch(() => {}),
          MSG_LIFETIME,
        );
        return;
      }

      q.textChannel = interaction.channel;
      q.voiceChannel = vc;

      if (
        !q.connection ||
        q.connection.state.status === VoiceConnectionStatus.Destroyed
      ) {
        q.connection = joinVoiceChannel({
          channelId: vc.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });
        q.connection.on(VoiceConnectionStatus.Ready, () => {
          q.connection.subscribe(q.player);
        });
      }
    }

    if (command === "play") {
      const query = interaction.options.getString("query");

      if (query.includes("spotify.com")) {
        try {
          const preview = await getPreview(query).catch(() => null);
          const defaultThumb =
            preview?.image || "https://i.imgur.com/Q2v1vV7.png";

          const tracks = await getTracks(query);
          for (const track of tracks) {
            const artist =
              track.artist ||
              (track.artists ? track.artists[0].name : "Unknown");

            const thumb =
              track.album?.images?.[0]?.url ||
              track.coverArt?.sources?.[0]?.url ||
              defaultThumb;

            q.songs.push({
              title: track.name,
              artist: artist,
              videoId: `spotify_${Math.random().toString(36).substring(2, 9)}`,
              url: query,
              thumbnail: thumb,
              durationStr: "0:00",
              durationSec: 0,
              requester: userName,
              requesterAvatar: userAvatar,
              hasRealCover: thumb !== "https://i.imgur.com/Q2v1vV7.png",
            });
          }
          interaction.editReply({
            embeds: [
              UI.success(
                `${i18n[l].added_queue}\n> **${tracks.length} pistas de Spotify**`,
              ),
            ],
          });
          if (!q.playing) playNext(guildId);
        } catch (e) {
          interaction.editReply({ embeds: [UI.error(i18n[l].error_spotify)] });
        }
      } else if (query.includes("tidal.com")) {
        try {
          const tracks = await getTidalTracks(query);
          if (tracks.length === 0)
            return interaction.editReply({
              embeds: [
                UI.error(
                  "No se pudieron extraer las pistas de este enlace de Tidal.",
                ),
              ],
            });

          for (const track of tracks) {
            q.songs.push({
              title: track.name,
              artist: track.artist,
              videoId: `tidal_${track.id}`,
              url: query,
              thumbnail: track.thumbnail || "https://i.imgur.com/Q2v1vV7.png",
              durationStr: "0:00",
              durationSec: 0,
              requester: userName,
              requesterAvatar: userAvatar,
              hasRealCover:
                track.thumbnail &&
                track.thumbnail !== "https://i.imgur.com/Q2v1vV7.png",
            });
          }
          interaction.editReply({
            embeds: [
              UI.success(
                `${i18n[l].added_queue}\n> **${tracks.length} pistas de Tidal**`,
              ),
            ],
          });
          if (!q.playing) playNext(guildId);
        } catch (e) {
          interaction.editReply({
            embeds: [UI.error("Error al procesar el enlace de Tidal.")],
          });
        }
      } else {
        const r = await yts(query);
        if (!r.videos.length)
          return interaction.editReply({
            embeds: [UI.error(i18n[l].no_results)],
          });
        q.songs.push(createSong(r.videos[0], null, userName, userAvatar));
        if (!q.playing) playNext(guildId);
        interaction.editReply({
          embeds: [
            UI.success(`${i18n[l].added_queue}\n> **${r.videos[0].title}**`),
          ],
        });
      }
      setTimeout(() => interaction.deleteReply().catch(() => {}), MSG_LIFETIME);
    }

    if (command === "playalbum") {
      const query =
        interaction.options.getString("query") ||
        interaction.options.getString("url");
      if (!query)
        return interaction.editReply({
          embeds: [UI.error("Por favor ingresa el nombre del álbum.")],
        });

      try {
        const searchRes = await request(
          `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=25`,
        );
        const searchData = await searchRes.body.json();

        if (!searchData.results || searchData.results.length === 0) {
          return interaction
            .editReply({ embeds: [UI.error(i18n[l].no_results)] })
            .then(() =>
              setTimeout(
                () => interaction.deleteReply().catch(() => {}),
                MSG_LIFETIME,
              ),
            );
        }

        const options = searchData.results.map((album) => {
          return new StringSelectMenuOptionBuilder()
            .setLabel(album.collectionName.substring(0, 100))
            .setDescription(
              `${album.artistName} • ${album.trackCount} pistas`.substring(
                0,
                100,
              ),
            )
            .setValue(album.collectionId.toString());
        });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("select_album")
          .setPlaceholder("🎵 Selecciona el álbum correcto...")
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const albumMsg = await interaction.editReply({
          embeds: [
            UI.info(
              "Búsqueda de Álbum",
              `Se encontraron **${searchData.results.length}** resultados para \`${query}\`. Selecciona el correcto en el menú de abajo:`,
            ),
          ],
          components: [row],
        });

        const collector = albumMsg.createMessageComponentCollector({
          filter: (i) => i.customId === "select_album" && i.user.id === userId,
          time: MSG_LIFETIME,
        });

        collector.on("collect", async (i) => {
          const albumId = i.values[0];
          const selectedAlbum = searchData.results.find(
            (a) => a.collectionId.toString() === albumId,
          );

          const albumName = selectedAlbum.collectionName;
          const artistName = selectedAlbum.artistName;
          const coverUrl = selectedAlbum.artworkUrl100.replace(
            "100x100bb",
            "600x600bb",
          );

          await i.update({
            embeds: [
              UI.success(
                `Procesando álbum oficial: **${albumName}** de **${artistName}**\n> Extrayendo pistas de la base de datos...`,
              ),
            ],
            components: [],
          });

          try {
            const tracksRes = await request(
              `https://itunes.apple.com/lookup?id=${albumId}&entity=song`,
            );
            const tracksData = await tracksRes.body.json();

            const tracks = tracksData.results.filter(
              (t) => t.wrapperType === "track",
            );

            if (tracks.length === 0) {
              return i.editReply({
                embeds: [
                  UI.error("No se pudieron obtener las pistas de este álbum."),
                ],
              });
            }

            await i.editReply({
              embeds: [
                UI.success(
                  `Álbum confirmado: **${albumName}**\n> Añadiendo **${tracks.length} pistas** a la cola. La primera comenzará al instante...`,
                ),
              ],
            });

            const firstTrack = tracks[0];
            const r1 = await yts(
              `${firstTrack.trackName} ${firstTrack.artistName} official audio`,
            );
            if (r1.videos[0]) {
              const songObj = createSong(
                r1.videos[0],
                firstTrack.artistName,
                userName,
                userAvatar,
              );
              songObj.title = firstTrack.trackName;
              songObj.thumbnail = coverUrl;
              songObj.hasRealCover = true;
              q.songs.push(songObj);

              if (!q.playing) playNext(guildId);
            }

            const processRestOfAlbum = async () => {
              for (let j = 1; j < tracks.length; j++) {
                const track = tracks[j];
                try {
                  const r = await yts(
                    `${track.trackName} ${track.artistName} official audio`,
                  );
                  if (r.videos[0]) {
                    const songObj = createSong(
                      r.videos[0],
                      track.artistName,
                      userName,
                      userAvatar,
                    );
                    songObj.title = track.trackName;
                    songObj.thumbnail = coverUrl;
                    songObj.hasRealCover = true;
                    q.songs.push(songObj);
                  }
                } catch (err) {
                  console.error("[PLAYALBUM BACKGROUND ERROR]:", err.message);
                }
                await new Promise((res) => setTimeout(res, 1500));
              }
            };

            processRestOfAlbum();
          } catch (e) {
            console.error("[PLAYALBUM FETCH ERROR]:", e);
            i.editReply({
              embeds: [
                UI.error(
                  "Ocurrió un error al obtener las canciones del álbum.",
                ),
              ],
            });
          }
          setTimeout(() => albumMsg.delete().catch(() => {}), MSG_LIFETIME);
        });

        collector.on("end", (collected, reason) => {
          if (reason === "time" && collected.size === 0) {
            albumMsg.delete().catch(() => {});
          }
        });
      } catch (e) {
        console.error("[PLAYALBUM ERROR]:", e);
        interaction
          .editReply({
            embeds: [UI.error("Ocurrió un error interno al buscar el álbum.")],
          })
          .then(() =>
            setTimeout(
              () => interaction.deleteReply().catch(() => {}),
              MSG_LIFETIME,
            ),
          );
      }
    }

    if (command === "join")
      return interaction
        .editReply({ embeds: [UI.success(i18n[l].joined)] })
        .then(() =>
          setTimeout(
            () => interaction.deleteReply().catch(() => {}),
            MSG_LIFETIME,
          ),
        );

    if (command === "search") {
      const query = interaction.options.getString("query");
      const r = await yts(query);
      const videos = r.videos.slice(0, 25);
      if (!videos.length) {
        interaction.editReply({ embeds: [UI.error(i18n[l].no_results)] });
        setTimeout(
          () => interaction.deleteReply().catch(() => {}),
          MSG_LIFETIME,
        );
        return;
      }

      let page = 0;
      const searchMsg = await interaction.editReply(
        buildPaginatedUI("src", videos, page, i18n[l].search_title, l),
      );
      const collector = searchMsg.createMessageComponentCollector({
        filter: (i) => i.customId.startsWith("src_") && i.user.id === userId,
        time: MSG_LIFETIME,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "src_first") page = 0;
        else if (i.customId === "src_prev") page--;
        else if (i.customId === "src_next") page++;
        else if (i.customId === "src_last")
          page = Math.ceil(videos.length / 5) - 1;
        else if (i.customId === "src_all") {
          videos.forEach((v) =>
            q.songs.push(createSong(v, null, userName, userAvatar)),
          );
          if (!q.playing) playNext(guildId);
          await i.update({
            embeds: [
              UI.success(
                `${i18n[l].added_queue}\n> **${videos.length} ${i18n[l].themes}**`,
              ),
            ],
            components: [],
          });
          return;
        } else if (i.customId.startsWith("src_add_")) {
          const idx = parseInt(i.customId.split("_")[2]);
          const video = videos[idx];
          q.songs.push(createSong(video, null, userName, userAvatar));
          if (!q.playing) playNext(guildId);

          const row1 = ActionRowBuilder.from(i.message.components[0]);
          row1.components[idx % 5]
            .setDisabled(true)
            .setStyle(ButtonStyle.Success)
            .setLabel("✅");
          await i.update({ components: [row1, i.message.components[1]] });
          return;
        }
        await i.update(
          buildPaginatedUI("src", videos, page, i18n[l].search_title, l),
        );
      });
      collector.on("end", () => {
        searchMsg.delete().catch(() => {});
      });
    }

    if (command === "remove") {
      const index = interaction.options.getInteger("posicion") - 1;
      if (index < 0 || !q.songs[index])
        return interaction.editReply({
          embeds: [UI.error(i18n[l].pos_invalid)],
        });
      const removed = q.songs.splice(index, 1);
      interaction.editReply({
        embeds: [UI.success(`${i18n[l].removed}\n> **${removed[0].title}**`)],
      });
      setTimeout(() => interaction.deleteReply().catch(() => {}), MSG_LIFETIME);
    }

    if (command === "blacklist") {
      const action = interaction.options.getString("accion");
      const term = interaction.options.getString("termino");
      if (action === "add" && term) {
        await pool.query(
          "INSERT INTO blacklist (term) VALUES ($1) ON CONFLICT DO NOTHING",
          [term.toLowerCase()],
        );
        globalBlacklist.push(term.toLowerCase());
        interaction.editReply({
          embeds: [UI.success(`${i18n[l].blacklist_added} \`${term}\``)],
        });
      } else if (action === "remove" && term) {
        await pool.query("DELETE FROM blacklist WHERE term = $1", [
          term.toLowerCase(),
        ]);
        globalBlacklist = globalBlacklist.filter(
          (x) => x !== term.toLowerCase(),
        );
        interaction.editReply({
          embeds: [UI.success(`${i18n[l].blacklist_removed} \`${term}\``)],
        });
      } else {
        interaction.editReply({
          embeds: [
            UI.info(
              i18n[l].content_mgmt,
              `${i18n[l].blacklist_current}\n> ${globalBlacklist.join("\n> ")}`,
            ),
          ],
        });
      }
      setTimeout(() => interaction.deleteReply().catch(() => {}), MSG_LIFETIME);
    }

    if (command === "like") {
      if (!q.lastSong)
        return interaction.editReply({
          embeds: [UI.error(i18n[l].nothing_playing)],
        });

      const likeTitle = q.lastSong.isTrivia
        ? q.lastSong.realTitle
        : q.lastSong.title;
      const likeArtist = q.lastSong.isTrivia
        ? q.lastSong.realArtist
        : q.lastSong.artist;

      const check = await pool.query(
        "SELECT id FROM likes WHERE user_id = $1 AND video_id = $2",
        [userId, q.lastSong.videoId],
      );
      if (check.rows.length > 0)
        return interaction.editReply({
          embeds: [UI.info(i18n[l].collection, i18n[l].already_liked)],
        });
      await pool.query(
        "INSERT INTO likes (user_id, video_id, title, artist) VALUES ($1, $2, $3, $4)",
        [userId, q.lastSong.videoId, likeTitle, likeArtist],
      );
      interaction.editReply({
        embeds: [UI.success(`${i18n[l].like_added}\n> **${likeTitle}**`)],
      });
      setTimeout(() => interaction.deleteReply().catch(() => {}), MSG_LIFETIME);
    }

    if (command === "list") {
      const res = await pool.query(
        "SELECT title FROM likes WHERE user_id = $1 ORDER BY id ASC",
        [userId],
      );
      if (res.rows.length === 0)
        return interaction.editReply({
          embeds: [UI.error(i18n[l].list_empty)],
        });
      const text = res.rows
        .map((s, i) => `**${i + 1}.** ${s.title}`)
        .join("\n");
      interaction.editReply({
        embeds: [UI.info(i18n[l].your_likes, text.substring(0, 4000))],
      });
    }

    if (command === "removeliked") {
      const index = interaction.options.getInteger("indice") - 1;
      const res = await pool.query(
        "SELECT id, title FROM likes WHERE user_id = $1 ORDER BY id ASC",
        [userId],
      );
      if (index < 0 || !res.rows[index])
        return interaction.editReply({
          embeds: [UI.error(i18n[l].like_invalid)],
        });
      await pool.query("DELETE FROM likes WHERE id = $1", [res.rows[index].id]);
      interaction.editReply({
        embeds: [
          UI.success(`${i18n[l].like_removed}\n> **${res.rows[index].title}**`),
        ],
      });
      setTimeout(() => interaction.deleteReply().catch(() => {}), MSG_LIFETIME);
    }

    if (command === "playliked") {
      const res = await pool.query(
        'SELECT video_id as "videoId", title, artist FROM likes WHERE user_id = $1 ORDER BY id ASC',
        [userId],
      );
      if (res.rows.length === 0)
        return interaction.editReply({ embeds: [UI.error(i18n[l].no_likes)] });
      for (const s of res.rows) {
        q.songs.push({
          title: s.title,
          artist: s.artist,
          videoId: s.videoId,
          url: `https://www.youtube.com/watch?v=${s.videoId}`,
          requester: userName,
          requesterAvatar: userAvatar,
          hasRealCover: false,
        });
      }
      interaction.editReply({ embeds: [UI.success(i18n[l].likes_queued)] });
      if (!q.playing) playNext(guildId);
      setTimeout(() => interaction.deleteReply().catch(() => {}), MSG_LIFETIME);
    }

    if (command === "shuffle") {
      if (q.songs.length < 3)
        return interaction.editReply({
          embeds: [UI.error(i18n[l].queue_insufficient)],
        });
      const current = q.songs.shift();
      for (let i = q.songs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [q.songs[i], q.songs[j]] = [q.songs[j], q.songs[i]];
      }
      q.songs.unshift(current);
      interaction.editReply({ embeds: [UI.success(i18n[l].queue_shuffled)] });
      setTimeout(() => interaction.deleteReply().catch(() => {}), MSG_LIFETIME);
    }

    if (command === "song") {
      if (!q.playing || !q.lastSong)
        return interaction.editReply({
          embeds: [UI.error(i18n[l].nothing_playing)],
        });
      const fetchedMsg = await interaction.fetchReply();
      if (q.currentMessage && q.currentMessage.id !== fetchedMsg.id)
        q.currentMessage.delete().catch(() => {});
      q.currentMessage = fetchedMsg;

      const baseMs = q.lastSong.seekTime ? q.lastSong.seekTime * 1000 : 0;
      const currentMs =
        (q.player.state.resource
          ? q.player.state.resource.playbackDuration
          : 0) + baseMs;

      try {
        const canvas = createCanvas(1280, 720);
        const ctx = canvas.getContext("2d");
        ctx.quality = "best";
        ctx.patternQuality = "best";
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const imgBuffer = await request(q.lastSong.thumbnail)
          .then((res) => res.body.arrayBuffer())
          .then((ab) => Buffer.from(ab));
        const mainImage = await loadImage(imgBuffer);

        let palette = {};
        try {
          palette = await Vibrant.from(imgBuffer).getPalette();
        } catch (error) {}

        const vibrantColorHex = palette.Vibrant
          ? palette.Vibrant.hex
          : "#57F287";
        const vibrantColorInt = parseInt(vibrantColorHex.replace("#", "0x"));
        const darkVibrantColorHex = palette.DarkVibrant
          ? palette.DarkVibrant.hex
          : "#1e1f22";

        const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
        gradient.addColorStop(0, darkVibrantColorHex);
        gradient.addColorStop(1, "#000000");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1280, 720);

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 50;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 15;
        const imgSize = 560;
        const imgX = 60;
        const imgY = (720 - imgSize) / 2;
        ctxMenuRoundedImage(ctx, imgX, imgY, imgSize, imgSize, 30);
        ctx.clip();

        if (q.lastSong.isTrivia) {
          ctx.fillStyle = "#1e1f22";
          ctx.fillRect(imgX, imgY, imgSize, imgSize);
          ctx.restore();
          ctx.save();
          ctx.font = "bold 90px sans-serif";
          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";
          ctx.fillText("TRIVIA", imgX + imgSize / 2, imgY + imgSize / 2 + 30);
        } else {
          ctx.drawImage(mainImage, imgX, imgY, imgSize, imgSize);
        }
        ctx.restore();

        const textX = imgX + imgSize + 60;
        const maxWidth = 1280 - textX - 40;
        ctx.font = "bold 40px sans-serif";
        ctx.fillStyle = vibrantColorHex;
        ctx.fillText(i18n[l].np_title.toUpperCase(), textX, 180);

        ctx.font = "bold 75px sans-serif";
        ctx.fillStyle = "#FFFFFF";
        let displayTitle = getDisplayTitle(q.lastSong, l);
        const words = displayTitle.split(" ");
        let line = "";
        let lines = [];
        for (let n = 0; n < words.length; n++) {
          let testLine = line + words[n] + " ";
          let metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + " ";
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        let currentY = 280;
        for (let i = 0; i < Math.min(lines.length, 2); i++) {
          let textToDraw = lines[i];
          if (i === 1 && lines.length > 2)
            textToDraw = textToDraw.replace(/\s+$/, "") + "...";
          ctx.fillText(textToDraw, textX, currentY);
          currentY += 85;
        }

        ctx.font = "55px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillText(
          `${i18n[l].artist}: ${getDisplayArtist(q.lastSong)}`,
          textX,
          currentY + 20,
        );
        ctx.font = "italic 40px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText(
          `${i18n[l].requested_by}: ${q.lastSong.requester}`,
          textX,
          595,
        );

        const attachment = new AttachmentBuilder(canvas.toBuffer(), {
          name: "card_musicardi.png",
        });
        const embedPlay = createNowPlayingEmbed(
          q.lastSong,
          currentMs,
          l,
          vibrantColorInt,
        );
        const rows = getPlaybackRows(q, l);

        await interaction.editReply({
          embeds: [embedPlay],
          components: rows,
          files: [attachment],
        });
        startProgressInterval(guildId, vibrantColorInt);
      } catch (error) {
        console.error("[CANVAS ERROR EN /SONG]:", error);
        await interaction.editReply({
          embeds: [UI.error("Error al generar el panel visual.")],
        });
      }
      return;
    }

    if (command === "lyrics") {
      if (!(await checkPremium(guildId)))
        return interaction.editReply({
          embeds: [UI.info(i18n[l].access_denied, i18n[l].premium_only)],
        });

      let queryTitle = interaction.options.getString("query") || "";
      let queryArtist = "";

      if (!queryTitle) {
        if (q.lastSong) {
          queryTitle = cleanSongName(q.lastSong.realTitle || q.lastSong.title);
          queryArtist = cleanArtistName(
            q.lastSong.realArtist || q.lastSong.artist,
          );
        } else {
          return interaction.editReply({
            embeds: [UI.error(i18n[l].nothing_playing)],
          });
        }
      }

      try {
        const geniusText = await fetchGeniusLyrics(queryTitle, queryArtist);

        if (!geniusText)
          return interaction.editReply({
            embeds: [UI.error(i18n[l].lyrics_not_found)],
          });

        const safeText =
          geniusText.length > 4000
            ? geniusText.substring(0, 4000) +
              "...\n\n*(Letra truncada por límite de Discord)*"
            : geniusText;

        interaction.editReply({
          embeds: [UI.info(`${i18n[l].lyrics_title}: ${queryTitle}`, safeText)],
        });
      } catch (e) {
        interaction.editReply({ embeds: [UI.error(i18n[l].no_results)] });
      }
    }

    if (command === "stats") {
      const members = await interaction.guild.members.fetch();
      const memberIds = Array.from(members.keys());

      const totalRes = await pool.query(
        "SELECT COUNT(*) FROM likes WHERE user_id = ANY($1::varchar[])",
        [memberIds],
      );
      if (totalRes.rows[0].count == 0)
        return interaction.editReply({
          embeds: [UI.info(i18n[l].metrics, i18n[l].stats_no_likes)],
        });

      const topUserRes = await pool.query(
        "SELECT user_id, COUNT(*) as count FROM likes WHERE user_id = ANY($1::varchar[]) GROUP BY user_id ORDER BY count DESC LIMIT 1",
        [memberIds],
      );
      const topArtistsRes = await pool.query(
        "SELECT artist, COUNT(*) as count FROM likes WHERE user_id = ANY($1::varchar[]) GROUP BY artist ORDER BY count DESC LIMIT 10",
        [memberIds],
      );

      let statsMsg = `> **${i18n[l].stats_total}** ${totalRes.rows[0].count}\n`;
      if (topUserRes.rows.length > 0)
        statsMsg += `> **${i18n[l].stats_top_user}** <@${topUserRes.rows[0].user_id}> (${topUserRes.rows[0].count})\n\n`;
      statsMsg += `**${i18n[l].stats_top_artists}**\n`;
      topArtistsRes.rows.forEach((row, index) => {
        statsMsg += `\`${(index + 1).toString().padStart(2, "0")}.\` ${row.artist} — ${row.count} likes\n`;
      });
      interaction.editReply({
        embeds: [UI.info(i18n[l].stats_title, statsMsg)],
      });
    }

    if (command === "history") {
      if (q.playedHistory.length === 0)
        return interaction.editReply({
          embeds: [UI.error(i18n[l].history_empty)],
        });
      const historyText = q.playedHistory
        .map(
          (s, i) =>
            `\`${(i + 1).toString().padStart(2, "0")}.\` ${s.title} - ${s.artist}`,
        )
        .join("\n");
      interaction.editReply({
        embeds: [UI.info(i18n[l].history_title, historyText)],
      });
    }

    if (command === "queue") {
      if (q.songs.length === 0)
        return interaction.editReply({
          embeds: [UI.error(i18n[l].queue_empty)],
        });
      let page = 0;
      const itemsPerPage = 10;

      const generateEmbed = (p) => {
        const start = p * itemsPerPage;
        const end = start + itemsPerPage;
        const currentSongs = q.songs.slice(start, end);
        const totalPages = Math.ceil(q.songs.length / itemsPerPage);
        const list = currentSongs
          .map(
            (s, i) =>
              `\`${(start + i + 1).toString().padStart(2, "0")}.\` **${s.title}**\n└ *${i18n[l].requested_by}: ${s.requester}*`,
          )
          .join("\n");
        return UI.panel()
          .setTitle(i18n[l].queue_title)
          .setDescription(list)
          .setFooter({
            text: `${i18n[l].page} ${p + 1} ${i18n[l].of} ${totalPages > 0 ? totalPages : 1} | ${i18n[l].total} ${q.songs.length} ${i18n[l].themes}`,
          });
      };

      const generateButtons = (p) => {
        const totalPages = Math.ceil(q.songs.length / itemsPerPage);
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("q_prev")
            .setLabel(i18n[l].btn_prev)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(p === 0),
          new ButtonBuilder()
            .setCustomId("q_next")
            .setLabel(i18n[l].btn_next)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(p >= totalPages - 1 || totalPages === 0),
          new ButtonBuilder()
            .setCustomId("q_rec")
            .setLabel(i18n[l].btn_rec)
            .setStyle(ButtonStyle.Success),
        );
      };

      const qMsg = await interaction.editReply({
        embeds: [generateEmbed(page)],
        components: [generateButtons(page)],
      });
      const collector = qMsg.createMessageComponentCollector({
        filter: (i) => ["q_prev", "q_next", "q_rec"].includes(i.customId),
        time: MSG_LIFETIME,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "q_prev") {
          page--;
          await i.update({
            embeds: [generateEmbed(page)],
            components: [generateButtons(page)],
          });
        } else if (i.customId === "q_next") {
          page++;
          await i.update({
            embeds: [generateEmbed(page)],
            components: [generateButtons(page)],
          });
        } else if (i.customId === "q_rec") {
          await i.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

          const artists = q.songs.map((s) => s.artist);
          let seed = artists[Math.floor(Math.random() * artists.length)];
          if (!seed && q.lastSong) seed = q.lastSong.artist;
          if (!seed) seed = "Music";

          const r = await yts(`"${seed}" "Topic"`);
          let validVideos = r.videos.slice(0, 30).filter((v) => {
            const isNewID =
              !q.history.includes(v.videoId) &&
              !q.songs.some((s) => s.videoId === v.videoId);
            const vAuthor = v.author.name.toLowerCase();
            const isOfficialChannel =
              vAuthor.endsWith(" - topic") ||
              vAuthor.endsWith("vevo") ||
              vAuthor === seed.toLowerCase();
            return (
              isNewID &&
              !globalBlacklist.some((term) =>
                v.title.toLowerCase().includes(term.toLowerCase()),
              ) &&
              !SPAM_WORDS.some((sw) => v.title.toLowerCase().includes(sw)) &&
              isOfficialChannel &&
              v.seconds > 90 &&
              v.seconds <= 900
            );
          });

          if (validVideos.length < 15) {
            const fallbackRes = await yts(`"${seed}" official audio`);
            const fallbackVids = fallbackRes.videos.slice(0, 30).filter((v) => {
              const isNewID =
                !q.history.includes(v.videoId) &&
                !q.songs.some((s) => s.videoId === v.videoId);
              const vAuthor = v.author.name.toLowerCase();
              const isOfficialChannel =
                vAuthor.endsWith(" - topic") ||
                vAuthor.endsWith("vevo") ||
                vAuthor.includes(seed.toLowerCase());
              return (
                isNewID &&
                !SPAM_WORDS.some((sw) => v.title.toLowerCase().includes(sw)) &&
                isOfficialChannel &&
                v.seconds > 90 &&
                v.seconds <= 900
              );
            });
            validVideos = validVideos.concat(fallbackVids);
          }

          validVideos = [
            ...new Map(validVideos.map((v) => [v.videoId, v])).values(),
          ];
          let recs = validVideos.sort(() => Math.random() - 0.5).slice(0, 25);

          if (recs.length === 0)
            return i.editReply({ embeds: [UI.error(i18n[l].rec_fail)] });

          let recPage = 0;
          const recMsg = await i.editReply(
            buildPaginatedUI("rec", recs, recPage, i18n[l].rec_title, l),
          );
          const recCollector = recMsg.createMessageComponentCollector({
            filter: (btnI) => btnI.customId.startsWith("rec_"),
            time: MSG_LIFETIME,
          });

          recCollector.on("collect", async (btnI) => {
            if (btnI.customId === "rec_first") recPage = 0;
            else if (btnI.customId === "rec_prev") recPage--;
            else if (btnI.customId === "rec_next") recPage++;
            else if (btnI.customId === "rec_last")
              recPage = Math.ceil(recs.length / 5) - 1;
            else if (btnI.customId === "rec_all") {
              recs.forEach((v) => {
                if (!q.songs.some((s) => s.videoId === v.videoId)) {
                  q.songs.push(
                    createSong(
                      v,
                      null,
                      `${i18n[l].bot_magic} (${btnI.user.username})`,
                      userAvatar,
                    ),
                  );
                }
              });
              if (!q.playing) playNext(guildId);
              await btnI.update({
                embeds: [
                  UI.success(
                    `${i18n[l].added_queue}\n> **${recs.length} ${i18n[l].themes}**`,
                  ),
                ],
                components: [],
              });
              return;
            } else if (btnI.customId.startsWith("rec_add_")) {
              const idx = parseInt(btnI.customId.split("_")[2]);
              const video = recs[idx];
              if (q.songs.some((s) => s.videoId === video.videoId)) {
                await btnI.reply({
                  content: i18n[l].rec_already,
                  flags: MessageFlags.Ephemeral,
                });
                return;
              }
              const adderName = btnI.user.globalName || btnI.user.username;
              q.songs.push(
                createSong(
                  video,
                  null,
                  `${i18n[l].bot_magic} (${adderName})`,
                  userAvatar,
                ),
              );
              const updatedRow = ActionRowBuilder.from(
                btnI.message.components[0],
              );
              updatedRow.components[idx % 5]
                .setDisabled(true)
                .setStyle(ButtonStyle.Success)
                .setLabel("✅");
              await btnI.update({
                components: [updatedRow, btnI.message.components[1]],
              });
              await qMsg
                .edit({
                  embeds: [generateEmbed(page)],
                  components: [generateButtons(page)],
                })
                .catch(() => {});
              if (!q.playing) playNext(guildId);
              return;
            }
            await btnI.update(
              buildPaginatedUI("rec", recs, recPage, i18n[l].rec_title, l),
            );
          });
        }
      });
      collector.on("end", () => {
        qMsg.delete().catch(() => {});
      });
      return;
    }

    if (command === "autoplay") {
      if (!(await checkPremium(guildId)))
        return interaction
          .editReply({
            embeds: [UI.info("ACCESS DENIED", i18n[l].premium_only)],
          })
          .catch(() => {});

      q.autoplay = !q.autoplay;
      if (q.autoplay) q.autoplayCount = 0;

      const status = q.autoplay ? "ENABLED" : "DISABLED";
      interaction
        .editReply({ embeds: [UI.success(`AUTOPLAY: ${status}`)] })
        .catch(() => {});

      io.emit("track_added", `AUTOPLAY: ${status}`);
      if (q.autoplay && !q.playing && q.songs.length === 0 && q.lastSong)
        playNext(guildId);
      return;
    }

    if (command === "discovery") {
      if (!(await checkPremium(guildId)))
        return interaction
          .editReply({
            embeds: [UI.info("ACCESS DENIED", i18n[l].premium_only)],
          })
          .catch(() => {});

      q.discovery = !q.discovery;
      if (q.discovery) q.autoplayCount = 0;

      const status = q.discovery ? "ENABLED" : "DISABLED";
      interaction
        .editReply({ embeds: [UI.success(`DISCOVERY: ${status}`)] })
        .catch(() => {});

      io.emit("track_added", `DISCOVERY: ${status}`);
      if (q.discovery && !q.playing && q.songs.length === 0 && q.lastSong)
        playNext(guildId);
      return;
    }

    if (command === "stop") {
      if (q.progressInterval) clearInterval(q.progressInterval);
      if (q.currentMessage) q.currentMessage.delete().catch(() => {});

      q.songs = [];
      q.history = [];
      q.titleHistory = [];
      q.autoplay = false;
      q.discovery = false;
      q.autoplayCount = 0;
      q.batchCount = 0;
      q.lastSong = null;

      if (q.currentProcess) {
        try {
          if (q.currentProcess.ytdlp) q.currentProcess.ytdlp.kill();
          if (q.currentProcess.ffmpeg) q.currentProcess.ffmpeg.kill();
        } catch (e) {}
        q.currentProcess = null;
      }

      q.player.stop();
      if (q.connection) q.connection.destroy();
      q.connection = null;
      q.playing = false;
      q.currentMessage = null;
      q.stay247 = false;
      q.filter = null;

      interaction
        .editReply({ embeds: [UI.info(i18n[l].connection, i18n[l].stopped)] })
        .catch(() => {});
      setTimeout(() => interaction.deleteReply().catch(() => {}), MSG_LIFETIME);
      return;
    }

    if (command === "dj") {
      if (!interaction.member.permissions.has("Administrator"))
        return interaction.editReply({
          embeds: [UI.error(i18n[l].admin_only)],
        });
      const action = interaction.options.getString("accion");
      if (action === "set") {
        const role = interaction.options.getRole("rol");
        if (!role)
          return interaction.editReply({
            embeds: [UI.error(i18n[l].dj_no_role)],
          });
        await pool.query(
          `UPDATE server_settings SET dj_role = $1 WHERE guild_id = $2`,
          [role.id, guildId],
        );
        q.djRole = role.id;
        interaction.editReply({
          embeds: [UI.success(`${i18n[l].dj_set} <@&${role.id}>`)],
        });
      } else {
        await pool.query(
          `UPDATE server_settings SET dj_role = NULL WHERE guild_id = $1`,
          [guildId],
        );
        q.djRole = null;
        interaction.editReply({ embeds: [UI.success(i18n[l].dj_clear)] });
      }
      return;
    }

    if (command === "247") {
      if (!(await checkPremium(guildId)))
        return interaction.editReply({
          embeds: [UI.info(i18n[l].access_denied, i18n[l].premium_only)],
        });
      q.stay247 = !q.stay247;
      return interaction
        .editReply({
          embeds: [
            UI.success(q.stay247 ? i18n[l].mode247_on : i18n[l].mode247_off),
          ],
        })
        .then(() =>
          setTimeout(
            () => interaction.deleteReply().catch(() => {}),
            MSG_LIFETIME,
          ),
        );
    }

    if (command === "filter") {
      if (!(await checkPremium(guildId)))
        return interaction.editReply({
          embeds: [UI.info(i18n[l].access_denied, i18n[l].premium_only)],
        });
      const type = interaction.options.getString("tipo");
      q.filter = type;
      if (q.playing && q.lastSong) {
        q.songs.unshift(q.lastSong);
        if (q.currentProcess) {
          try {
            if (q.currentProcess.ytdlp) q.currentProcess.ytdlp.kill();
            if (q.currentProcess.ffmpeg) q.currentProcess.ffmpeg.kill();
          } catch (e) {}
        }
        q.player.stop();
      }
      return interaction
        .editReply({
          embeds: [UI.success(`${i18n[l].filter_set} \`${type}\``)],
        })
        .then(() =>
          setTimeout(
            () => interaction.deleteReply().catch(() => {}),
            MSG_LIFETIME,
          ),
        );
    }

    if (command === "playlist") {
      const action = interaction.options.getString("accion");
      const name = interaction.options.getString("nombre").trim();
      if (action === "save") {
        if (q.songs.length === 0)
          return interaction.editReply({
            embeds: [UI.error(i18n[l].queue_empty)],
          });
        const plData = JSON.stringify(
          q.songs.map((s) => ({
            title: s.title,
            url: s.url,
            videoId: s.videoId,
            artist: s.artist,
            requester: s.requester,
            requesterAvatar: s.requesterAvatar,
          })),
        );
        await pool.query(
          `INSERT INTO user_playlists (user_id, name, songs) VALUES ($1, $2, $3)`,
          [userId, name, plData],
        );
        interaction.editReply({
          embeds: [UI.success(`${i18n[l].pl_saved}\n> **${name}**`)],
        });
      } else {
        const res = await pool.query(
          `SELECT songs FROM user_playlists WHERE user_id = $1 AND name = $2 LIMIT 1`,
          [userId, name],
        );
        if (res.rows.length === 0)
          return interaction.editReply({
            embeds: [UI.error(i18n[l].pl_not_found)],
          });
        const plSongs = res.rows[0].songs;
        plSongs.forEach((s) =>
          q.songs.push(
            createSong(s, s.artist, `${s.requester} (PL)`, s.requesterAvatar),
          ),
        );
        interaction.editReply({
          embeds: [
            UI.success(
              `${i18n[l].pl_loaded}\n> **${name}** (${plSongs.length} pistas)`,
            ),
          ],
        });
        if (!q.playing) playNext(guildId);
      }
      return;
    }

    if (command === "profile") {
      const res = await pool.query(
        "SELECT listen_time, songs_played FROM user_stats WHERE user_id = $1",
        [userId],
      );
      const likesRes = await pool.query(
        "SELECT COUNT(*) FROM likes WHERE user_id = $1",
        [userId],
      );
      const topRes = await pool.query(
        "SELECT artist, COUNT(*) as count FROM likes WHERE user_id = $1 GROUP BY artist ORDER BY count DESC LIMIT 1",
        [userId],
      );

      const stats =
        res.rows.length > 0 ? res.rows[0] : { listen_time: 0, songs_played: 0 };
      const hours = (stats.listen_time / 3600).toFixed(1);
      const likesCount = likesRes.rows[0].count;
      const topArtist = topRes.rows.length > 0 ? topRes.rows[0].artist : "N/A";

      let desc = i18n[l].profile_stats(
        hours,
        stats.songs_played,
        likesCount,
        topArtist,
      );
      return interaction.editReply({
        embeds: [UI.info(i18n[l].profile_title, desc)],
      });
    }

    if (command === "trivia") {
      if (q.playing)
        return interaction.editReply({
          embeds: [UI.error(i18n[l].trivia_stop)],
        });

      await interaction.editReply({
        embeds: [UI.info(i18n[l].sync_data, i18n[l].trivia_start + "...")],
      });

      const res = await pool.query(
        "SELECT artist FROM likes GROUP BY artist ORDER BY RANDOM() LIMIT 1",
      );
      if (res.rows.length === 0)
        return interaction
          .editReply({ embeds: [UI.error(i18n[l].trivia_no_data)] })
          .then(() =>
            setTimeout(
              () => interaction.deleteReply().catch(() => {}),
              MSG_LIFETIME,
            ),
          );
      const targetArtist = res.rows[0].artist;

      const searchRes = await yts(`"${targetArtist}" "Topic"`);
      let validVideos = searchRes.videos.slice(0, 20).filter((v) => {
        const vAuthor = v.author.name.toLowerCase();
        const isOfficialChannel =
          vAuthor.endsWith(" - topic") ||
          vAuthor.endsWith("vevo") ||
          vAuthor.includes(targetArtist.toLowerCase());
        return (
          !SPAM_WORDS.some((sw) => v.title.toLowerCase().includes(sw)) &&
          isOfficialChannel &&
          v.seconds > 60 &&
          v.seconds <= 900
        );
      });

      if (validVideos.length === 0)
        return interaction
          .editReply({ embeds: [UI.error(i18n[l].rec_fail)] })
          .then(() =>
            setTimeout(
              () => interaction.deleteReply().catch(() => {}),
              MSG_LIFETIME,
            ),
          );

      const video = validVideos[Math.floor(Math.random() * validVideos.length)];
      const targetTitle = cleanSongName(video.title);

      let triviaSong = createSong(video, "???", "Trivia Master", null);
      triviaSong.isTrivia = true;
      triviaSong.realTitle = targetTitle;
      triviaSong.realArtist = targetArtist;

      triviaSong.seekTime =
        video.seconds > 60
          ? Math.floor(Math.random() * (video.seconds - 45))
          : 0;

      q.songs.push(triviaSong);
      playNext(guildId);

      await interaction.editReply({
        embeds: [UI.info(i18n[l].trivia_start, i18n[l].trivia_desc)],
      });

      const filter = (m) => !m.author.bot;
      const collector = interaction.channel.createMessageCollector({
        filter,
        time: 45000,
      });

      let thinkTimeout = setTimeout(() => {
        if (q.playing && q.lastSong && q.lastSong.isTrivia) {
          q.player.pause();
          const thinkMsg =
            l === "es"
              ? "🤔 El audio se detuvo. ¡Tienen los últimos 15 segundos para adivinar!"
              : "🤔 Audio paused. You have the last 15 seconds to guess!";
          interaction.channel
            .send({
              embeds: [UI.info("Modo Pensar / Thinking Mode", thinkMsg)],
            })
            .then((m) => setTimeout(() => m.delete().catch(() => {}), 15000))
            .catch(() => {});
        }
      }, 30000);

      collector.on("collect", (m) => {
        const guess = m.content.toLowerCase().trim();
        const tTitle = targetTitle.toLowerCase();
        const tArtist = targetArtist.toLowerCase();

        if (
          guess.length >= 3 &&
          (tTitle.includes(guess) ||
            tArtist.includes(guess) ||
            guess.includes(tTitle) ||
            guess.includes(tArtist))
        ) {
          clearTimeout(thinkTimeout);
          collector.stop("won");
          m.reply(
            i18n[l].trivia_win(m.author.id, targetTitle, targetArtist),
          ).catch(() => {});
          q.player.stop();
        }
      });

      collector.on("end", (collected, reason) => {
        clearTimeout(thinkTimeout);
        if (reason !== "won") {
          interaction.channel
            .send(i18n[l].trivia_timeout(targetTitle, targetArtist))
            .catch(() => {});
          q.player.stop();
        }
      });
      return;
    }

    if (command === "radio") {
      const station = interaction.options.getString("estacion");
      const stations = {
        lofi: "jfKfPfyJRdk",
        synth: "4xDzrUhVKVA",
        rock: "kYptMEEIfd0",
      };
      const r = await yts({ videoId: stations[station] });
      if (r) {
        q.songs = [];
        q.songs.push(createSong(r, "Radio Station", userName, userAvatar));
        q.stay247 = true;
        if (!q.playing) playNext(guildId);
        interaction
          .editReply({
            embeds: [UI.success(`${i18n[l].radio_start} \`${station}\``)],
          })
          .then(() =>
            setTimeout(
              () => interaction.deleteReply().catch(() => {}),
              MSG_LIFETIME,
            ),
          );
      }
      return;
    }

    if (command === "help") {
      const helpEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(i18n[l].help_title)
        .setDescription(i18n[l].help_desc)
        .addFields(
          { name: `${i18n[l].help_cat1}`, value: i18n[l].help_cat1_val },
          { name: `${i18n[l].help_cat2}`, value: i18n[l].help_cat2_val },
          { name: `${i18n[l].help_cat3}`, value: i18n[l].help_cat3_val },
          { name: `${i18n[l].help_cat4}`, value: i18n[l].help_cat4_val },
        )
        .setFooter({ text: i18n[l].help_footer });

      return interaction.editReply({ embeds: [helpEmbed] });
    }

    if (command === "language") {
      if (!interaction.member.permissions.has("Administrator"))
        return interaction.editReply({
          embeds: [UI.error(i18n[l].admin_only)],
        });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("setlang_es")
          .setLabel("Español")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("setlang_en")
          .setLabel("English")
          .setStyle(ButtonStyle.Secondary),
      );

      return interaction.editReply({
        embeds: [
          UI.info(
            "Configuración de Idioma / Language Setup",
            "Selecciona el idioma del bot para este servidor:\nSelect the bot language for this server:",
          ),
        ],
        components: [row],
      });
    }
  } catch (error) {
    console.error("[CRITICAL COMMAND ERROR]:", error);
    if (interaction.isChatInputCommand() || interaction.isButton()) {
      const errorEmbed = UI.error(
        "Ocurrió un error interno procesando este comando.",
      );

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
      } else {
        await interaction
          .reply({ embeds: [errorEmbed], ephemeral: true })
          .catch(() => {});
      }
    }
  }
});

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  const guildId = oldState.guild.id;
  const q = globalQueues.get(guildId);
  if (!q || !q.connection) return;

  if (
    oldState.channelId &&
    !newState.channelId &&
    newState.id === client.user.id
  ) {
    if (q.progressInterval) clearInterval(q.progressInterval);
    if (q.currentMessage) q.currentMessage.delete().catch(() => {});

    if (q.currentProcess) {
      try {
        if (q.currentProcess.ytdlp) q.currentProcess.ytdlp.kill();
        if (q.currentProcess.ffmpeg) q.currentProcess.ffmpeg.kill();
      } catch (e) {}
      q.currentProcess = null;
    }

    q.songs = [];
    q.history = [];
    q.titleHistory = [];
    q.autoplay = false;
    q.discovery = false;
    q.autoplayCount = 0;
    q.batchCount = 0;
    q.lastSong = null;

    q.player.stop();
    if (q.connection.state.status !== VoiceConnectionStatus.Destroyed)
      q.connection.destroy();
    q.connection = null;
    q.playing = false;
    q.currentMessage = null;
    q.stay247 = false;
    q.filter = null;
    return;
  }

  const botChannelId = q.connection.joinConfig.channelId;
  const botChannel =
    oldState.guild.channels.cache.get(botChannelId) ||
    newState.guild.channels.cache.get(botChannelId);

  if (botChannel) {
    const humans = botChannel.members.filter((m) => !m.user.bot).size;

    if (humans === 0 && !q.stay247) {
      if (q.progressInterval) clearInterval(q.progressInterval);
      if (q.currentMessage) q.currentMessage.delete().catch(() => {});

      q.songs = [];
      q.autoplay = false;
      q.discovery = false;
      q.autoplayCount = 0;
      q.batchCount = 0;
      q.lastSong = null;

      if (q.currentProcess) {
        try {
          if (q.currentProcess.ytdlp) q.currentProcess.ytdlp.kill();
          if (q.currentProcess.ffmpeg) q.currentProcess.ffmpeg.kill();
        } catch (e) {}
        q.currentProcess = null;
      }

      q.player.stop();
      if (q.connection.state.status !== VoiceConnectionStatus.Destroyed)
        q.connection.destroy();
      q.connection = null;
      q.playing = false;
      q.currentMessage = null;
      q.filter = null;

      if (q.textChannel) {
        const l = guildLangs.get(guildId) || "es";
        const msg =
          l === "es"
            ? "ECO-MODE: Canal vacío. Reproducción detenida."
            : "ECO-MODE: Channel empty. Playback stopped.";
        q.textChannel
          .send({ embeds: [UI.info("SYSTEM", msg)] })
          .then((m) =>
            setTimeout(() => m.delete().catch(() => {}), MSG_LIFETIME),
          )
          .catch(() => {});
      }
    }
  }
});

process.on("unhandledRejection", (error) => {
  if (error.message && error.message.includes("Cannot perform IP discovery"))
    return;
  if (error.message && error.message.includes("InteractionNotReplied")) return;
  if (error.message && error.message.includes("Unknown interaction")) return;

  console.error("[ANTI-CRASH] Promesa sin manejar:", error);
});

process.on("uncaughtException", (error) => {
  if (error.message && error.message.includes("EADDRINUSE")) {
    console.error(
      "\n❌ [ERROR CRÍTICO]: El puerto 3001 ya está en uso. Cierra el bot viejo antes de iniciar uno nuevo.\n",
    );
    process.exit(1);
  }
  console.error("[ANTI-CRASH] Excepción no capturada:", error);
});

const { Server } = require("socket.io");

const io = new Server(3001, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  const findUserVoiceChannel = (userId) => {
    for (const guild of client.guilds.cache.values()) {
      const member = guild.members.cache.get(userId);
      if (member && member.voice.channel) {
        return { guild: guild, channel: member.voice.channel, member: member };
      }
    }
    return null;
  };

  const getTargetQueue = (userId, guildId) => {
    if (guildId && guildId !== "select" && globalQueues.has(guildId)) {
      return { guildId, q: globalQueues.get(guildId) };
    }
    for (const [id, q] of globalQueues.entries()) {
      if (q.voiceChannel && q.voiceChannel.members.has(userId))
        return { guildId: id, q };
    }
    for (const [id, q] of globalQueues.entries()) {
      if (q.playing) return { guildId: id, q };
    }
    return null;
  };

  const getUserQueue = (userId) => {
    for (const [id, q] of globalQueues.entries()) {
      if (q.voiceChannel && q.voiceChannel.members.has(userId))
        return { guildId: id, q };
    }
    return null;
  };

  socket.on("get_status", async (req) => {
    const { userId, guildId } = req;
    let data = null;

    if (guildId && guildId !== "select" && globalQueues.has(guildId)) {
      data = { guildId, q: globalQueues.get(guildId) };
    } else {
      for (const [id, q] of globalQueues.entries()) {
        if (q.voiceChannel && q.voiceChannel.members.has(userId)) {
          data = { guildId: id, q };
          break;
        }
      }

      if (!data) {
        for (const [id, q] of globalQueues.entries()) {
          if (
            q.playing &&
            q.lastSong &&
            q.lastSong.requesterAvatar &&
            q.lastSong.requesterAvatar.includes(userId)
          ) {
            data = { guildId: id, q };
            break;
          }
        }
      }

      if (!data) {
        const activeQueues = Array.from(globalQueues.entries()).filter(
          ([id, q]) => q.playing,
        );
        if (activeQueues.length > 0) {
          data = { guildId: activeQueues[0][0], q: activeQueues[0][1] };
        }
      }
    }

    if (!data) return socket.emit("sync_status", { playing: false });

    const currentMs = data.q.player.state.resource
      ? data.q.player.state.resource.playbackDuration +
        (data.q.lastSong?.seekTime ? data.q.lastSong.seekTime * 1000 : 0)
      : 0;

    const nextSongs = data.q.songs.slice(1, 16).map((s, idx) => ({
      queueId: idx + 1,
      title: s.title,
      artist: s.artist,
      thumbnail: s.thumbnail,
      videoId: s.videoId,
    }));

    let voiceMembers = [];
    if (data.q.voiceChannel) {
      data.q.voiceChannel.members.forEach((m) => {
        if (!m.user.bot)
          voiceMembers.push({
            id: m.user.id,
            name: m.user.globalName || m.user.username,
            avatar: m.user.displayAvatarURL({ extension: "png", size: 64 }),
          });
      });
    }

    let isLiked = false;
    let userHours = "0.0";
    let userPlays = 0;

    try {
      if (data.q.lastSong && data.q.lastSong.videoId) {
        const likeCheck = await pool.query(
          "SELECT 1 FROM likes WHERE user_id = $1 AND video_id = $2",
          [userId, data.q.lastSong.videoId],
        );
        isLiked = likeCheck.rowCount > 0;
      }

      const statsRes = await pool.query(
        "SELECT listen_time, songs_played FROM user_stats WHERE user_id = $1",
        [userId],
      );
      if (statsRes.rows.length > 0) {
        userHours = (statsRes.rows[0].listen_time / 3600).toFixed(1);
        userPlays = statsRes.rows[0].songs_played;
      }
    } catch (e) {
      console.error("Error al chequear stats/likes:", e.message);
    }

    socket.emit("sync_status", {
      playing: true,
      isPaused: data.q.player.state.status === AudioPlayerStatus.Paused,
      song: data.q.lastSong,
      discovery: data.q.discovery,
      autoplay: data.q.autoplay,
      currentMs: currentMs,
      guildName: data.q.voiceChannel?.guild.name || "Servidor",
      queueLength: data.q.songs.length - 1,
      queueList: nextSongs,
      isLiked: isLiked,
      color: data.q.vibrantHex || "#57F287",
      volume: data.q.volume || 100,
      voiceMembers: voiceMembers,
      listenHours: userHours,
      songsPlayed: userPlays,
    });
  });

  socket.on("cmd_pause", (userId) => {
    const data = getUserQueue(userId);
    if (!data || !data.q.playing) return;
    if (data.q.player.state.status === AudioPlayerStatus.Playing)
      data.q.player.pause();
    else if (data.q.player.state.status === AudioPlayerStatus.Paused)
      data.q.player.unpause();
  });

  socket.on("cmd_toggle_autoplay", (userId) => {
    const data = getUserQueue(userId);
    if (data) {
      data.q.autoplay = !data.q.autoplay;
      io.emit(
        "track_added",
        `AUTOPLAY: ${data.q.autoplay ? "ENABLED" : "DISABLED"}`,
      );
    }
  });

  socket.on("cmd_toggle_discovery", (userId) => {
    const data = getUserQueue(userId);
    if (data) {
      data.q.discovery = !data.q.discovery;
      io.emit(
        "track_added",
        `DISCOVERY: ${data.q.discovery ? "ENABLED" : "DISABLED"}`,
      );
    }
  });

  socket.on("cmd_volume", ({ userId, vol }) => {
    const data = getUserQueue(userId);
    if (!data || !data.q) return;
    data.q.volume = vol;
    if (data.q.player.state.resource && data.q.player.state.resource.volume) {
      data.q.player.state.resource.volume.setVolume(vol / 100);
    }
  });

  socket.on("cmd_skip", (userId) => {
    const data = getUserQueue(userId);
    if (!data || !data.q.playing) return;

    let activeUserIds = [];
    if (data.q.voiceChannel)
      data.q.voiceChannel.members.forEach((m) => {
        if (!m.user.bot) activeUserIds.push(m.id);
      });

    if (data.q.lastSong && activeUserIds.length > 0) {
      pool
        .query(
          `
                INSERT INTO user_track_stats (user_id, video_id, title, plays, skips) 
                SELECT unnest($1::varchar[]), $2, $3, 0, 1
                ON CONFLICT (user_id, video_id) DO UPDATE SET skips = user_track_stats.skips + 1
            `,
          [activeUserIds, data.q.lastSong.videoId, data.q.lastSong.title],
        )
        .catch(() => {});
    }

    if (data.q.currentProcess) {
      try {
        if (data.q.currentProcess.ytdlp) data.q.currentProcess.ytdlp.kill();
        if (data.q.currentProcess.ffmpeg) data.q.currentProcess.ffmpeg.kill();
      } catch (e) {}
      data.q.currentProcess = null;
    }
    data.q.player.stop();
  });

  socket.on("cmd_like", async (userId) => {
    try {
      const data = Array.from(globalQueues.values()).find(
        (q) => q.voiceChannel && q.voiceChannel.members.has(userId),
      );
      if (!data || !data.lastSong) return;
      const s = data.lastSong;

      await pool.query(
        `INSERT INTO likes (user_id, video_id, title, artist) 
                 SELECT $1::text, $2::text, $3::text, $4::text 
                 WHERE NOT EXISTS (SELECT 1 FROM likes WHERE user_id = $1::text AND video_id = $2::text)`,
        [userId, s.videoId, s.title, s.artist],
      );
      socket.emit("sync_status", { isLiked: true, videoId: s.videoId });
    } catch (e) {
      console.error("Error en Like:", e.message);
    }
  });

  socket.on("cmd_seek", ({ userId, targetSec }) => {
    const data = getUserQueue(userId);
    if (!data || !data.q.playing || !data.q.lastSong) return;

    data.q.lastSong.seekTime = targetSec;
    data.q.songs.unshift(data.q.lastSong);

    if (data.q.currentProcess) {
      try {
        if (data.q.currentProcess.ytdlp) data.q.currentProcess.ytdlp.kill();
        if (data.q.currentProcess.ffmpeg) data.q.currentProcess.ffmpeg.kill();
      } catch (e) {}
      data.q.currentProcess = null;
    }
    data.q.player.stop();
  });

  socket.on("cmd_search", async (query) => {
    try {
      const searchRes = await request(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=6`,
      );
      const data = await searchRes.body.json();

      if (data.results && data.results.length > 0) {
        const cleanedVideos = data.results.map((track) => ({
          title: track.trackName,
          author: track.artistName,
          videoId: `itunes_${track.trackId}`,
          thumbnail: track.artworkUrl100.replace("100x100bb", "600x600bb"),
          seconds: Math.floor(track.trackTimeMillis / 1000),
        }));
        socket.emit("search_results", cleanedVideos);
      } else {
        socket.emit("search_results", []);
      }
    } catch (e) {
      socket.emit("search_results", []);
    }
  });

  const handleRecommendations = async (userId) => {
    try {
      const allArtistsRes = await pool.query(
        "SELECT artist FROM likes WHERE user_id = $1 GROUP BY artist",
        [userId],
      );
      if (allArtistsRes.rows.length === 0) {
        socket.emit("recommendations_data", { type: "empty" });
        socket.emit("recommendations_results", []);
        return;
      }

      const randomArtists = allArtistsRes.rows
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      let combinedRecs = [];

      for (const row of randomArtists) {
        try {
          const searchRes = await request(
            `https://itunes.apple.com/search?term=${encodeURIComponent(row.artist)}&entity=song&attribute=artistTerm&limit=50`,
          );
          const data = await searchRes.body.json();

          if (data.results && data.results.length > 0) {
            const strictTracks = data.results.filter(
              (t) =>
                t.artistName.toLowerCase().includes(row.artist.toLowerCase()) ||
                row.artist.toLowerCase().includes(t.artistName.toLowerCase()),
            );

            const shuffledTracks = strictTracks.sort(() => Math.random() - 0.5);

            let addedCount = 0;
            for (const track of shuffledTracks) {
              if (addedCount >= 4) break;
              if (!combinedRecs.some((r) => r.title === track.trackName)) {
                combinedRecs.push({
                  title: track.trackName,
                  author: track.artistName,
                  videoId: `itunes_${track.trackId}`,
                  thumbnail: track.artworkUrl100.replace(
                    "100x100bb",
                    "600x600bb",
                  ),
                  seconds: Math.floor(track.trackTimeMillis / 1000),
                });
                addedCount++;
              }
            }
          }
        } catch (err) {
          console.error("[ITUNES REC ERROR]", err.message);
        }
      }

      combinedRecs = combinedRecs.sort(() => Math.random() - 0.5).slice(0, 8);

      socket.emit("recommendations_data", {
        type: "personalized",
        seed: randomArtists
          .map((r) => r.artist)
          .slice(0, 2)
          .join(", "),
        tracks: combinedRecs,
      });
      socket.emit("recommendations_results", combinedRecs);
    } catch (e) {
      socket.emit("recommendations_data", { type: "error" });
      socket.emit("recommendations_results", []);
    }
  };

  socket.on("get_recommendations", handleRecommendations);
  socket.on("cmd_get_recommendations", handleRecommendations);

  socket.on(
    "cmd_play_playlist",
    async ({ userId, playlistId, userName, userAvatar }) => {
      try {
        const res = await pool.query(
          "SELECT songs FROM user_playlists WHERE id = $1 AND user_id = $2",
          [playlistId, userId],
        );
        if (res.rows.length === 0) return;

        const plSongs = res.rows[0].songs;
        const data = getUserQueue(userId);
        let targetGuildId, targetVc;

        if (data) {
          targetGuildId = data.guildId;
        } else {
          const vcInfo = findUserVoiceChannel(userId);
          if (!vcInfo) return;
          targetGuildId = vcInfo.guild.id;
          targetVc = vcInfo.channel;
        }

        const q = getQueue(targetGuildId);

        if (
          !q.connection ||
          q.connection.state.status === VoiceConnectionStatus.Destroyed
        ) {
          if (targetVc) {
            q.connection = joinVoiceChannel({
              channelId: targetVc.id,
              guildId: targetGuildId,
              adapterCreator: targetVc.guild.voiceAdapterCreator,
            });
            q.connection.on(VoiceConnectionStatus.Ready, () => {
              q.connection.subscribe(q.player);
            });
            q.voiceChannel = targetVc;
          }
        }

        plSongs.forEach((s) => {
          q.songs.push(
            createSong(s, s.artist, `${userName} (Web PL)`, userAvatar),
          );
        });
        if (!q.playing) playNext(targetGuildId);
      } catch (e) {
        console.error("[WEB PL PLAY ERROR]:", e);
      }
    },
  );

  socket.on("cmd_filter", ({ userId, filterType }) => {
    const data = getUserQueue(userId);
    if (!data || !data.q) return;

    data.q.filter = filterType;

    if (data.q.playing && data.q.lastSong) {
      data.q.songs.unshift(data.q.lastSong);
      if (data.q.currentProcess) {
        try {
          if (data.q.currentProcess.ytdlp) data.q.currentProcess.ytdlp.kill();
          if (data.q.currentProcess.ffmpeg) data.q.currentProcess.ffmpeg.kill();
        } catch (e) {}
        data.q.currentProcess = null;
      }
      data.q.player.stop();
    }
  });

  socket.on("get_lyrics", async (userId) => {
    try {
      let targetQueue = null;
      for (const q of globalQueues.values()) {
        if (q.voiceChannel && q.voiceChannel.members.has(userId)) {
          targetQueue = q;
          break;
        }
      }

      if (!targetQueue || !targetQueue.lastSong) {
        return socket.emit("lyrics_data", {
          error: "No hay ninguna canción reproduciéndose.",
        });
      }

      const song = targetQueue.lastSong;
      let syncedLyrics = null;
      let plainLyrics = null;

      try {
        const cleanTitle = song.title.replace(/\[.*?\]|\(.*?\)/g, "").trim();
        const lrclibUrl = new URL("https://lrclib.net/api/get");
        lrclibUrl.searchParams.append("track_name", cleanTitle);
        if (song.artist)
          lrclibUrl.searchParams.append("artist_name", song.artist);

        const response = await fetch(lrclibUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.syncedLyrics) syncedLyrics = data.syncedLyrics;
          else if (data.plainLyrics) plainLyrics = data.plainLyrics;
        }
      } catch (e) {
        console.log("Fallo al conectar con Lrclib:", e.message);
      }

      if (syncedLyrics)
        return socket.emit("lyrics_data", {
          title: song.title,
          synced: syncedLyrics,
          lyrics: null,
        });
      if (plainLyrics)
        return socket.emit("lyrics_data", {
          title: song.title,
          synced: null,
          lyrics: plainLyrics,
        });

      const geniusText = await fetchGeniusLyrics(song.title, song.artist);
      if (geniusText)
        return socket.emit("lyrics_data", {
          title: song.title,
          synced: null,
          lyrics: geniusText,
        });

      socket.emit("lyrics_data", {
        title: song.title,
        error: "Lo sentimos, no pudimos encontrar la letra de esta canción.",
      });
    } catch (error) {
      socket.emit("lyrics_data", {
        error: "Error interno al buscar la letra.",
      });
    }
  });

  socket.on("cmd_reorder_queue", ({ userId, guildId, newQueueIds }) => {
    let data = null;
    if (guildId && guildId !== "select" && globalQueues.has(guildId)) {
      data = { guildId, q: globalQueues.get(guildId) };
    } else {
      for (const [id, q] of globalQueues.entries()) {
        if (q.voiceChannel && q.voiceChannel.members.has(userId)) {
          data = { guildId: id, q };
          break;
        }
      }
    }

    if (!data || !data.q || data.q.songs.length <= 1) return;

    const currentSong = data.q.songs[0];
    let newSongs = [];
    let usedQueueIds = new Set();

    for (const qId of newQueueIds) {
      if (data.q.songs[qId]) {
        newSongs.push(data.q.songs[qId]);
        usedQueueIds.add(qId);
      }
    }

    for (let i = 1; i < data.q.songs.length; i++) {
      if (!usedQueueIds.has(i)) {
        newSongs.push(data.q.songs[i]);
      }
    }

    data.q.songs = [currentSong, ...newSongs];
  });

  socket.on("cmd_remove_queue", (data) => {
    try {
      const { userId, trackIndex } = data;
      let targetQueue = null;
      for (const [gId, q] of globalQueues.entries()) {
        if (
          q &&
          q.voiceChannel &&
          q.voiceChannel.members &&
          q.voiceChannel.members.has(userId)
        ) {
          targetQueue = q;
          break;
        }
      }

      if (!targetQueue || !targetQueue.songs) return;
      const realIndex = trackIndex + 1;

      if (realIndex < targetQueue.songs.length) {
        targetQueue.songs.splice(realIndex, 1);
      }
    } catch (error) {
      console.error("[ERROR cmd_remove_queue]:", error.message);
    }
  });

  socket.on("cmd_add_queue", async (data) => {
    try {
      const { userId, video, userName, userAvatar } = data;
      let targetQueue = null;
      let targetGuildId = null;

      for (const [gId, q] of globalQueues.entries()) {
        if (
          q &&
          q.voiceChannel &&
          q.voiceChannel.members &&
          q.voiceChannel.members.has(userId)
        ) {
          targetQueue = q;
          targetGuildId = gId;
          break;
        }
      }

      if (!targetQueue || !targetGuildId) {
        return socket.emit("fallback_to_play", data);
      }

      const song = {
        title: video.title,
        artist: video.author || video.artist,
        videoId: video.videoId,
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
        thumbnail: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
        requester: userName,
        requesterAvatar: userAvatar,
        durationSec: 0,
      };

      targetQueue.songs.push(song);
      if (targetQueue.songs.length === 1 && !targetQueue.playing) {
        playNext(targetGuildId);
      }

      socket.nsp.emit("track_added", song.title);
    } catch (error) {
      console.error("[ERROR cmd_add_queue]:", error.message);
    }
  });

  socket.on(
    "cmd_play_specific",
    async ({ userId, guildId, video, userName, userAvatar }) => {
      io.emit("track_added", video.title || "Pista añadida");
      let data = getTargetQueue(userId, guildId);
      let targetGuildId = null;
      let targetVc = null;
      let targetTextChannel = null;

      if (data) {
        targetGuildId = data.guildId;
      } else {
        const vcInfo = findUserVoiceChannel(userId);
        if (!vcInfo) return;
        targetGuildId = vcInfo.guild.id;
        targetVc = vcInfo.channel;
        targetTextChannel = vcInfo.guild.channels.cache.find(
          (c) =>
            c.type === 0 &&
            c.permissionsFor(vcInfo.guild.members.me).has("SendMessages"),
        );
      }

      const q = getQueue(targetGuildId);

      if (
        !q.connection ||
        q.connection.state.status === VoiceConnectionStatus.Destroyed
      ) {
        if (targetVc) {
          q.connection = joinVoiceChannel({
            channelId: targetVc.id,
            guildId: targetGuildId,
            adapterCreator: targetVc.guild.voiceAdapterCreator,
          });
          q.connection.on(VoiceConnectionStatus.Ready, () => {
            q.connection.subscribe(q.player);
          });
          q.voiceChannel = targetVc;
          q.textChannel = targetTextChannel || q.textChannel;
        }
      }

      let finalVideo = video;

      if (video.videoId && String(video.videoId).startsWith("itunes_")) {
        try {
          const searchRes = await yts(
            `${video.title} ${video.author} official audio`,
          );
          if (searchRes && searchRes.videos.length > 0) {
            finalVideo = searchRes.videos[0];
            finalVideo.title = video.title;
            finalVideo.author = { name: video.author };
            finalVideo.thumbnail = video.thumbnail;
            finalVideo.seconds = video.seconds;
          }
        } catch (e) {}
      } else if (
        video.seconds === undefined &&
        video.durationSec === undefined
      ) {
        try {
          const searchRes = await yts(
            `${video.title} ${video.author || ""} official audio`,
          );
          if (searchRes && searchRes.videos.length > 0) {
            finalVideo = searchRes.videos[0];
            finalVideo.title = video.title;
            if (video.author) finalVideo.author = { name: video.author };
          }
        } catch (e) {}
      }

      const newSong = createSong(finalVideo, null, userName, userAvatar);

      if (video.videoId && String(video.videoId).startsWith("itunes_")) {
        newSong.thumbnail = video.thumbnail;
        newSong.hasRealCover = true;
      }

      q.songs.push(newSong);
      if (!q.playing) playNext(targetGuildId);
    },
  );

  socket.on("get_user_guilds", async (userId) => {
    if (!userId) return;
    let sharedGuilds = [];

    for (const guild of client.guilds.cache.values()) {
      try {
        let member = guild.members.cache.get(userId);
        if (!member) {
          member = await guild.members.fetch(userId).catch(() => null);
        }

        if (member) {
          sharedGuilds.push({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ extension: "png", size: 128 }) || null,
          });
        }
      } catch (e) {
        console.error("[GUILD FETCH ERROR]:", e.message);
      }
    }
    socket.emit("user_guilds_result", sharedGuilds);
  });

  socket.on("get_preferences", async (userId) => {
    try {
      const res = await pool.query(
        "SELECT * FROM user_preferences WHERE user_id = $1",
        [userId],
      );
      if (res.rows.length > 0) {
        socket.emit("preferences_data", res.rows[0]);
      } else {
        socket.emit("preferences_data", {
          incognito: false,
          low_res_covers: false,
          default_filter: "clear",
          accent_color: "#a855f7",
        });
      }
    } catch (e) {
      console.error("Error get_preferences:", e);
    }
  });

  socket.on("save_preferences", async ({ userId, prefs }) => {
    try {
      await pool.query(
        `
                INSERT INTO user_preferences (user_id, incognito, low_res_covers, default_filter, accent_color) 
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (user_id) DO UPDATE SET 
                incognito = $2, low_res_covers = $3, default_filter = $4, accent_color = $5
            `,
        [
          userId,
          prefs.incognito,
          prefs.low_res_covers,
          prefs.default_filter,
          prefs.accent_color,
        ],
      );
    } catch (e) {
      console.error("Error save_preferences:", e);
    }
  });
});

client.login(process.env.TOKEN);

module.exports = {
  apps : [{
    name: "musicardi-bot",
    script: "./index.js",
    watch: true,
    ignore_watch: ["node_modules", "downloads", "*.mp3", "*.webm"],
    node_args: "--expose-gc --max-old-space-size=450"
  }]
}
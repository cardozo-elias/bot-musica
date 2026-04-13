const { spawn } = require("child_process");

const FRONTEND_PATH = "C:\\Users\\User2\\musicardi-web";
const BOT_PATH = "C:\\Users\\User2\\mi-bot-musica";

console.log("🚀 [SYSTEM] Iniciando Musicardi Automation...");

const bot = spawn("node", ["index.js"], {
  cwd: BOT_PATH,
  stdio: "inherit",
  shell: true,
});

const tunnel = spawn(
  "npx",
  ["cloudflared", "tunnel", "--url", "http://localhost:3001"],
  { shell: true },
);

let vercelActualizado = false;

const handleData = (data) => {
  if (vercelActualizado) return;

  const output = data.toString();
  const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);

  if (urlMatch) {
    const newUrl = urlMatch[0];
    vercelActualizado = true;

    console.log(`\n🔗 [TUNNEL] ¡Nueva URL detectada!: ${newUrl}`);
    console.log("📡 [VERCEL] Actualizando variables de entorno...");

    const rmEnv = spawn(
      "vercel",
      [
        "env",
        "rm",
        "NEXT_PUBLIC_BOT_URL",
        "production",
        "-y",
        "--cwd",
        FRONTEND_PATH,
      ],
      { shell: true, stdio: "inherit" },
    );

    rmEnv.on("close", () => {
      const addEnv = spawn(
        "vercel",
        [
          "env",
          "add",
          "NEXT_PUBLIC_BOT_URL",
          "production",
          "--cwd",
          FRONTEND_PATH,
        ],
        { shell: true },
      );

      addEnv.stdin.write(newUrl);
      addEnv.stdin.end();

      addEnv.on("close", () => {
        console.log("✅ [VERCEL] Variable actualizada con éxito.");
        console.log("📦 [VERCEL] Lanzando Re-despliegue rápido...");

        spawn("vercel", ["--prod", "--force", "--cwd", FRONTEND_PATH], {
          shell: true,
          stdio: "inherit",
        });
      });
    });
  }
};

tunnel.stdout.on("data", handleData);
tunnel.stderr.on("data", handleData);

process.on("SIGINT", () => {
  bot.kill();
  tunnel.kill();
  process.exit();
});

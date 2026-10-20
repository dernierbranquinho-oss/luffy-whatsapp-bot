
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const qrcode = require("qrcode-terminal");

async function iniciarBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Luffy Solutions", "Safari", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("Leia este QR Code com o WhatsApp:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("Bot LUFFY SOLUTIONS conectado!");
    }

    if (connection === "close") {
      const code =
        lastDisconnect?.error?.output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        setTimeout(() => iniciarBot(), 5000);
      } else {
        console.log("Sessão terminada. É necessário ligar novamente.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const jid = msg.key.remoteJid;
      if (!jid || jid === "status@broadcast" || jid.endsWith("@g.us")) continue;

      const conteudo = msg.message.conversation ||
        msg.message.extendedTextMessage?.text || "";

      const comando = conteudo.trim().toLowerCase();
      let resposta = "";

      switch (comando) {
        case "menu":
        case "ajuda":
          resposta =
            "🏴‍☠️ *LUFFY SOLUTIONS*\n" +
            "Mais megas, mais liberdade!\n\n" +
            "☀️ T - Pacotes diários\n" +
            "🔥 E - Diários Elite\n" +
            "📅 S - Semanais\n" +
            "🗓️ M - Mensais\n" +
            "💎 DM - Diamond\n" +
            "💳 P - Pagamentos\n" +
            "🌐 SITE - Nosso site";
          break;

        case "t":
          resposta = "☀️ *PACOTES DIÁRIOS*\nConsulte os preços no nosso site ou escreva SITE.";
          break;

        case "e":
          resposta = "🔥 *PACOTES DIÁRIOS ELITE*\nConsulte os preços no nosso site ou escreva SITE.";
          break;

        case "s":
          resposta = "📅 *PACOTES SEMANAIS*\n⚠️ NB: Para MB semanais não pode ter Txuna Crédito.\nConsulte os preços no site.";
          break;

        case "m":
          resposta = "🗓️ *PACOTES MENSAIS*\n⚠️ NB: Para MB mensais não pode ter Txuna Crédito.\nConsulte os preços no site.";
          break;

        case "dm":
          resposta = "💎 *PACOTES DIAMOND*\nConsulte os pacotes disponíveis no site.";
          break;

        case "p":
          resposta =
            "💳 *FORMAS DE PAGAMENTO*\n\n" +
            "M-Pesa: 850694701\nTitular: Jesualde\n\n" +
            "e-Mola: 877236004\nTitular: Emilio\n\n" +
            "Após pagar, guarde o SMS da transação e envie o comprovativo.";
          break;

        case "site":
          resposta = "🌐 *LUFFY SOLUTIONS*\nConsulte o nosso site oficial para escolher o seu pacote.";
          break;

        default:
          resposta = "";
      }

      if (resposta) {
        await sock.sendMessage(jid, { text: resposta });
      }
    }
  });
}

iniciarBot().catch(console.error);


const express = require("express");
const QRCode = require("qrcode");
const pino = require("pino");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const app = express();
app.use(express.urlencoded({ extended: false }));

const PORT = process.env.PORT || 3000;
const PAGE_PASSWORD = process.env.PAGE_PASSWORD;

let qrData = "";
let connected = false;

app.get("/", (req, res) => {
  res.type("html").send(`
    <h2>LUFFY SOLUTIONS — Bot</h2>
    <form method="POST" action="/login">
      <input type="password" name="password"
        placeholder="Palavra-passe" required>
      <button type="submit">Entrar</button>
    </form>
  `);
});

app.post("/login", async (req, res) => {
  if (!PAGE_PASSWORD || req.body.password !== PAGE_PASSWORD) {
    return res.status(401).send("Palavra-passe incorreta ou não configurada.");
  }

  if (connected) {
    return res.send("Bot já conectado ao WhatsApp.");
  }

  if (!qrData) {
    return res.send("QR Code ainda não disponível. Tenta novamente daqui a pouco.");
  }

  const image = await QRCode.toDataURL(qrData);

  res.type("html").send(`
    <h2>Associar WhatsApp</h2>
    <p>WhatsApp > Dispositivos associados > Associar dispositivo</p>
    <img src="${image}" width="300">
    <p>Não partilhes este QR Code.</p>
  `);
});

app.get("/status", (req, res) => {
  res.json({ connected, qrAvailable: Boolean(qrData) });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor LUFFY SOLUTIONS iniciado.");
});

async function iniciarBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    browser: ["Luffy Solutions", "Safari", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) qrData = qr;

    if (connection === "open") {
      connected = true;
      qrData = "";
      console.log("Bot conectado!");
    }

    if (connection === "close") {
      connected = false;
      qrData = "";

      const code = lastDisconnect?.error?.output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        setTimeout(iniciarBot, 5000);
      } else {
        console.log("Sessão terminada. É necessário associar novamente.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const jid = msg.key.remoteJid;
      if (!jid || jid === "status@broadcast" || jid.endsWith("@g.us")) continue;

      const text = (
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        ""
      ).trim().toLowerCase();

      const respostas = {
        menu: "🏴‍☠️ LUFFY SOLUTIONS\nMais megas, mais liberdade!\n\nT - Diários\nE - Diários Elite\nS - Semanais\nM - Mensais\nDM - Diamond\nP - Pagamentos\nSITE - Nosso site",
        ajuda: "Escreve MENU para ver os comandos.",
        t: "☀️ PACOTES DIÁRIOS\nConsulte a tabela de preços da LUFFY SOLUTIONS.",
        e: "🔥 PACOTES DIÁRIOS ELITE\nConsulte a tabela de preços.",
        s: "📅 PACOTES SEMANAIS\n⚠️ Não pode ter Txuna Crédito.",
        m: "🗓️ PACOTES MENSAIS\n⚠️ Não pode ter Txuna Crédito.",
        dm: "💎 PACOTES DIAMOND\nConsulte os pacotes disponíveis.",
        p: "💳 PAGAMENTOS\nM-Pesa: 850694701 — Jesualde\ne-Mola: 877236004 — Emilio\n\nGuarda o SMS da transação e envia o comprovativo.",
        site: "🌐 LUFFY SOLUTIONS\nConsulte o nosso site oficial."
      };

      if (respostas[text]) {
        await sock.sendMessage(jid, { text: respostas[text] });
      }
    }
  });
}

iniciarBot().catch(console.error);

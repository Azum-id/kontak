const { default: makeWASocket } = require("@adiwajshing/baileys");
const { DisconnectReason, useSingleFileAuthState } = require("@adiwajshing/baileys");
const { state } = useSingleFileAuthState("./login.json");
const P = require("pino");
const fs = require("fs");

function connectToWhatsApp() {
  const sock = makeWASocket({
    logger: P({ level: "silent" }),
    markOnlineOnConnect: false,
    printQRInTerminal: true,
    auth: state,
  });
  sock.sendMessage;
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      var _a, _b;
      const shouldReconnect =
        ((_b = (_a = lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0
          ? void 0
          : _b.statusCode) !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("[+] Connection Started!");
    }
  });

  sock.ev.on("messages.upsert", (m) => {
    m.messages.forEach((message) => {
      listen_sw(sock, message).catch((e) => {
        console.error(e);
      });
    });
  });
}

const getGroup = async (sock) => {
  if (!fs.existsSync("./group_id.txt")) {
    const group_metadata = await sock.groupCreate("Hasil Kontak", []);
    fs.writeFileSync("./group_id.txt", group_metadata.id);
    return group_metadata.id;
  } else {
    return fs.readFileSync("./group_id.txt", "utf-8");
  }
};

const isInDb = (nowa) => {
  if (!fs.existsSync("./nowas.txt")) {
    fs.writeFileSync("./nowas.txt", "");
  }

  const nowas = fs.readFileSync("./nowas.txt", "utf-8").split("\n");
  if (!nowas.includes(nowa)) {
    nowas.push(nowa);

    fs.writeFileSync("./nowas.txt", nowas.join("\n"));
    return false;
  } else {
    return true;
  }
};

const listen_sw = async (sock, message) => {
  if (message.key.remoteJid !== "status@broadcast" || message.key.fromMe) {
    return;
  }

  const senderNumber = message.key.participant;

  if (isInDb(senderNumber)) {
    return;
  }

  const groupId = await getGroup(sock);
  //   split sender number remove @s.whatsapp.net
  const senderNumberSplit = senderNumber.split("@")[0];
  const text = `*Unsaved Contact*

No : ${senderNumberSplit}
Username : *${message.pushName}*
Url : https://wa.me/${senderNumberSplit} 

Please Check Your Contact List!`;

  console.log(`[+] New Unsaved Contact!`);
  // log detail
  console.log(`[|] No: ${senderNumberSplit}`);
  console.log(`[|] Username: ${message.pushName}`);

  await sock.sendMessage(groupId, { text });
  console.log(`[+] Send to ${groupId}!`);
};

connectToWhatsApp();

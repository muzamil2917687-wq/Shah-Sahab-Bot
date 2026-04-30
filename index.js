const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pino = require('pino');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

const genAI = new GoogleGenerativeAI("AIzaSyD..."); 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
    });

    if (!sock.authState.creds.registered) {
        console.log("-----------------------------------------");
        const phoneNumber = await question('Apna WhatsApp Number dalo (923001234567): ');
        const code = await sock.requestPairingCode(phoneNumber.trim());
        console.log('\x1b[32m%s\x1b[0m', `TUMHARA CODE HEI: ${code}`);
        console.log("-----------------------------------------");
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') console.log('Shah Sahab Online!');
        if (connection === 'close') startBot();
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`Tum Shah Sahab ho. Malik: Muzamil. Roman Urdu mein jawab do: ${text}`);
        await sock.sendMessage(msg.key.remoteJid, { text: result.response.text() });
    });
}
startBot();

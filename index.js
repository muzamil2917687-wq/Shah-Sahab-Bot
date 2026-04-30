const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pino = require('pino');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// Shah Sahab ki Gemini Key
const genAI = new GoogleGenerativeAI("AIzaSyD..."); 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // QR code band kar diya
        logger: pino({ level: 'silent' })
    });

    // Pairing Code System
    if (!sock.authState.creds.registered) {
        const phoneNumber = await question('Apna WhatsApp Number dalo (Country code ke sath, e.g., 923001234567): ');
        const code = await sock.requestPairingCode(phoneNumber.trim());
        console.log('\x1b[32m%s\x1b[0m', `TUMHARA PAIRING CODE: ${code}`);
        console.log('WhatsApp -> Linked Devices -> Link with phone number instead par ja kar ye code dalo.');
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('Shah Sahab Online Hain!');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!text) return;

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Tumhara naam Shah Sahab hai. Tum aik sakht lehjay walay aqalmand bot ho. Muzamil tumhara malik hai. Jawab Roman Urdu mein do. Sawal: ${text}`;
            const result = await model.generateContent(prompt);
            await sock.sendMessage(msg.key.remoteJid, { text: result.response.text() });
        } catch (e) {
            console.log("Error:", e);
        }
    });
}

startBot();

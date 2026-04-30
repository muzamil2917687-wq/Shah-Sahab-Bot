const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pino = require('pino');
const readline = require('readline');

// Terminal se number maangne ke liye
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// Shah Sahab ki Gemini Key
const genAI = new GoogleGenerativeAI("AIzaSyDu_WJZEJth6feEhpCPPKKdm0ytSJHlo3Y"); 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // Pairing Code System (Agar login na ho)
    if (!sock.authState.creds.registered) {
        console.log("-----------------------------------------");
        const phoneNumber = "16575201143"; // Tumhara number
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log('\x1b[32m%s\x1b[0m', `TUMHARA PAIRING CODE HEI: ${code}`);
            console.log("-----------------------------------------");
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('\x1b[36m%s\x1b[0m', 'Shah Sahab Online Hain!');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!text) return;

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Tumhara naam Shah Sahab hai. Tum aik sakht lehjay walay lekin aqalmand bot ho. Muzamil tumhara malik hai. Jawab Roman Urdu mein do. User ka sawal: ${text}`;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            await sock.sendMessage(msg.key.remoteJid, { text: response.text() });
        } catch (e) {
            console.log("Gemini Error:", e.message);
        }
    });
}

startBot();

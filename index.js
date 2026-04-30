const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pino = require('pino');

// Shah Sahab ki Personal Key
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

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'close') startBot();
        if (connection === 'open') console.log('Shah Sahab Online Hain!');
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

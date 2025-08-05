const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { upload } = require('./mega');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

async function forceSendMessages(sock, id, maxRetries = 3) {
    let attempts = 0;
    let success = false;

    while (attempts < maxRetries && !success) {
        try {
            console.log(`Attempt ${attempts + 1} to send messages...`);
            
            const rf = __dirname + `/temp/${id}/creds.json`;
            const mega_url = await upload(fs.createReadStream(rf), `${sock.user.id}.json`);
            const sessionId = "Pheazy~" + mega_url.replace('https://mega.nz/file/', '');

            // Wait for connection to be fully open
            await new Promise(resolve => {
                const checkConnection = () => {
                    if (sock.user && sock.user.id) resolve();
                    else setTimeout(checkConnection, 500);
                };
                checkConnection();
            });

            const sessionMsg = await sock.sendMessage(sock.user.id, { text: sessionId });

            await sock.sendMessage(
                sock.user.id,
                {
                    text: "✅ *Session created!*\n\n" +
                          "🔐 Check above for your session ID.\n" +
                          "⚠️ Do NOT share it with anyone!",
                    contextInfo: { quoted: sessionMsg }
                }
            );

            success = true;
            console.log("Messages sent successfully!");
        } catch (error) {
            attempts++;
            console.error(`Attempt ${attempts} failed:`, error);
            if (attempts < maxRetries) await delay(2000 * attempts);
        }
    }

    return success;
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function MALVIN_XD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                generateHighQualityLinkPreview: true,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                syncFullHistory: false,
                browser: Browsers.macOS("Safari"),
            });

            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "open") {
                    console.log("Connected, forcing message send...");
                    await delay(1000);
                    
                    const sent = await forceSendMessages(sock, id);
                    if (sent) {
                        await delay(2000);
                        sock.ws.close();
                        removeFile(`./temp/${id}`);
                    } else {
                        console.error("Failed to send messages after retries!");
                    }
                } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                    await delay(10000);
                    MALVIN_XD_PAIR_CODE();
                }
            });
        } catch (err) {
            console.log("service error:", err);
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: "Service error" });
            }
        }
    }

    return MALVIN_XD_PAIR_CODE();
});

router.get('/force-send/:sessionId', async (req, res) => {
    const sessionId = req.params.sessionId;
    const sessionDir = `./temp/${sessionId}`;

    try {
        const { state } = await useMultiFileAuthState(sessionDir);
        const sock = makeWASocket({
            auth: { creds: state.creds, keys: state.keys },
            logger: pino({ level: "silent" })
        });

        const success = await forceSendMessages(sock, sessionId);
        res.send({ success });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

module.exports = router;

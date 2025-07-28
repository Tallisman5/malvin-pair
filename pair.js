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

            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection == "open") {
                    await delay(5000);

                    let rf = __dirname + `/temp/${id}/creds.json`;
                    function generateRandomText() {
                        const prefix = "3EB";
                        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                        let randomText = prefix;
                        for (let i = prefix.length; i < 22; i++) {
                            const randomIndex = Math.floor(Math.random() * characters.length);
                            randomText += characters.charAt(randomIndex);
                        }
                        return randomText;
                    }
                    const randomText = generateRandomText();
                    try {
                        // Upload session file, generate message text
                        const mega_url = await upload(fs.createReadStream(rf), `${sock.user.id}.json`);
                        const string_session = mega_url.replace('https://mega.nz/file/', '');
                        let md = "Pheazy~" + string_session;

                        // Send session ID message
                        let sessionMsg = await sock.sendMessage(sock.user.id, { text: md });
                        console.log("Session ID message sent:", sessionMsg);

                        // Prepare info message
                        let desc = `*Hey there, Pheazy User!* 👋🏻

Thanks for using *Pheazy-MD* — your session has been successfully created!

🔐 *Session ID:* Sent above  
⚠️ *Keep it safe!* Do NOT share this ID with anyone.

——————

*✅ Stay Updated:*  
Join our official WhatsApp Channel:  
https://whatsapp.com/channel/0029VbAyBkC8vd1HcCc1Rr1E

*💻 Source Code:*  
Fork & explore the project on GitHub:  
https://github.com/Tallisman5/Pheazy-MD

——————

> *© Powered by ♀️ Lord-Pheazy*
Stay cool and hack smart. ✌🏻`;

                        // Send info message, quoting the session message
                        let infoMsg = await sock.sendMessage(sock.user.id, {
                            text: desc,
                            contextInfo: {
                                externalAdReply: {
                                    title: "ᴍᴀʟᴠɪɴ-xᴅ",
                                    thumbnailUrl: "https://files.catbox.moe/bqs70b.jpg",
                                    sourceUrl: "https://whatsapp.com/channel/0029VbA6MSYJUM2TVOzCSb2A",
                                    mediaType: 1,
                                    renderLargerThumbnail: true,
                                }
                            }
                        }, { quoted: sessionMsg });
                        console.log("Info message sent:", infoMsg);

                        // Wait before closing to ensure delivery
                        await delay(5000);

                        await sock.ws.close();
                        await removeFile('./temp/' + id);
                        console.log(`👤 ${sock.user.id} Connected ✅ Restarting process...`);
                        await delay(10);
                        process.exit();

                    } catch (e) {
                        // Log and send error message, delay before socket close
                        console.error("Error sending messages:", e);
                        try {
                            let errorMsg = await sock.sendMessage(sock.user.id, { text: "Error: " + e.toString() });
                            console.log("Error message sent:", errorMsg);
                            await delay(3000);
                        } catch (e2) {
                            console.error("Failed to send error message:", e2);
                        }
                        await sock.ws.close();
                        await removeFile('./temp/' + id);
                        await delay(10);
                        process.exit();
                    }
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10);
                    MALVIN_XD_PAIR_CODE();
                }
            });
        } catch (err) {
            console.log("service restated");
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: "❗ Service Unavailable" });
            }
        }
    }

    return await MALVIN_XD_PAIR_CODE();
});

module.exports = router;
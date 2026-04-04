const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    delay,
    downloadContentFromMessage
} = require('@whiskeysockets/baileys');
const pino     = require('pino');
const fs       = require('fs');
const { exec } = require('child_process');
const yts      = require('yt-search');

const MEU_NUMERO = "5548991846401";
const DONO2 = "554899391608";
const PREFIXO    = ".";
const GEMINI_API_KEY  = process.env.GEMINI_API_KEY || 'AIzaSyCdu_RdnjLlZK81XTRYBXbXcNL2j4tJw_Q';
const AUTOMOD_ENABLED = true;

// ─── Logger ───────────────────────────────────────────────────────────────────
const cores = { reset:'[0m', verde:'[32m', vermelho:'[31m', amarelo:'[33m', ciano:'[36m', magenta:'[35m', cinza:'[90m', branco:'[37m' };
function agora() { return new Date().toLocaleTimeString('pt-BR'); }
const log = {
    info:    (m) => console.log(`${cores.ciano}[${agora()}]${cores.reset} ${cores.branco}ℹ️  ${m}${cores.reset}`),
    ok:      (m) => console.log(`${cores.verde}[${agora()}]${cores.reset} ${cores.verde}✅ ${m}${cores.reset}`),
    erro:    (m) => console.log(`${cores.vermelho}[${agora()}]${cores.reset} ${cores.vermelho}❌ ${m}${cores.reset}`),
    aviso:   (m) => console.log(`${cores.amarelo}[${agora()}]${cores.reset} ${cores.amarelo}⚠️  ${m}${cores.reset}`),
    cmd:     (m) => console.log(`${cores.magenta}[${agora()}]${cores.reset} ${cores.magenta}🔧 ${m}${cores.reset}`),
    msg:     (m) => console.log(`${cores.ciano}[${agora()}]${cores.reset} ${cores.ciano}💬 ${m}${cores.reset}`),
    mem:     ()  => { const u = process.memoryUsage(); return `RAM: ${Math.round(u.rss/1024/1024)}MB`; }
};


// ─── Fontes estilizadas ───────────────────────────────────────────────────────
const fontes = {
    bold: s => [...s].map(c => {
        const n = c.codePointAt(0);
        if (n >= 65 && n <= 90)  return String.fromCodePoint(n - 65 + 0x1D400);
        if (n >= 97 && n <= 122) return String.fromCodePoint(n - 97 + 0x1D41A);
        if (n >= 48 && n <= 57)  return String.fromCodePoint(n - 48 + 0x1D7CE);
        return c;
    }).join(''),

    italic: s => [...s].map(c => {
        const n = c.codePointAt(0);
        if (n >= 65 && n <= 90)  return String.fromCodePoint(n - 65 + 0x1D434);
        if (n >= 97 && n <= 122) return String.fromCodePoint(n - 97 + 0x1D44E);
        return c;
    }).join(''),

    mono: s => [...s].map(c => {
        const n = c.codePointAt(0);
        if (n >= 65 && n <= 90)  return String.fromCodePoint(n - 65 + 0x1D670);
        if (n >= 97 && n <= 122) return String.fromCodePoint(n - 97 + 0x1D68A);
        if (n >= 48 && n <= 57)  return String.fromCodePoint(n - 48 + 0x1D7F6);
        return c;
    }).join(''),

    bubble: s => [...s].map(c => {
        const n = c.codePointAt(0);
        if (n >= 65 && n <= 90)  return String.fromCodePoint(n - 65 + 0x24B6);
        if (n >= 97 && n <= 122) return String.fromCodePoint(n - 97 + 0x24D0);
        if (n >= 49 && n <= 57)  return String.fromCodePoint(n - 49 + 0x2460);
        if (n === 48) return '\u24EA';
        return c;
    }).join(''),

    flip: s => {
        const map = {a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ƃ',h:'ɥ',i:'ᴉ',j:'ɾ',k:'ʞ',
                     l:'l',m:'ɯ',n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',
                     w:'ʍ',x:'x',y:'ʎ',z:'z'};
        return [...s.toLowerCase()].map(c => map[c] || c).reverse().join('');
    },

    smallcaps: s => {
        const map = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ғ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',
                     l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'q',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',
                     w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'};
        return [...s.toLowerCase()].map(c => map[c] || c).join('');
    },

    wide: s => [...s].map(c => c + '\u200A').join('').trim(),

    gothic: s => [...s].map(c => {
        const n = c.codePointAt(0);
        if (n >= 65 && n <= 90)  return String.fromCodePoint(n - 65 + 0x1D504);
        if (n >= 97 && n <= 122) return String.fromCodePoint(n - 97 + 0x1D51E);
        return c;
    }).join(''),

    double: s => [...s].map(c => {
        const n = c.codePointAt(0);
        if (n >= 65 && n <= 90)  return String.fromCodePoint(n - 65 + 0x1D538);
        if (n >= 97 && n <= 122) return String.fromCodePoint(n - 97 + 0x1D552);
        if (n >= 48 && n <= 57)  return String.fromCodePoint(n - 48 + 0x1D7D8);
        return c;
    }).join(''),
};

// ─── AutoMod IA (Gemini FREE) ─────────────────────────────────────────────────
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const PROMPT_SYSTEM = 'Você é moderador de grupo escolar brasileiro. Responda APENAS com JSON válido, sem markdown nem explicação: {"flagged":true/false,"motivo":"string"}. Sinalize SOMENTE conteúdo genuinamente grave: apologia ao nazismo, simbologia nazista, conteúdo pedófilo/CSAM, discurso de ódio extremo. Não sinalize ofensas comuns de adolescentes.';

async function automodTexto(texto) {
    if (!GEMINI_API_KEY) return { flagged: false };
    try {
        const res = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: PROMPT_SYSTEM }] },
                contents: [{ parts: [{ text: texto }] }],
                generationConfig: { maxOutputTokens: 80, temperature: 0 }
            })
        });
        const data = await res.json();
        const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"flagged":false}';
        return JSON.parse(txt.replace(/```json|```/g,'').trim());
    } catch { return { flagged: false }; }
}

async function automodImagem(buffer, mediaType = 'image/jpeg') {
    if (!GEMINI_API_KEY) return { flagged: false };
    try {
        const base64 = buffer.toString('base64');
        const res = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: PROMPT_SYSTEM }] },
                contents: [{
                    parts: [
                        { inline_data: { mime_type: mediaType, data: base64 } },
                        { text: 'Analise esta imagem/figurinha.' }
                    ]
                }],
                generationConfig: { maxOutputTokens: 80, temperature: 0 }
            })
        });
        const data = await res.json();
        const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"flagged":false}';
        return JSON.parse(txt.replace(/```json|```/g,'').trim());
    } catch { return { flagged: false }; }
}

// ─── Ship meter ───────────────────────────────────────────────────────────────
function shipMeter(pct) {
    const filled = Math.round(pct / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    let emoji = pct >= 80 ? '💞' : pct >= 50 ? '💛' : pct >= 30 ? '🙂' : '💔';
    return { bar, emoji };
}

// ─── Horóscopo ────────────────────────────────────────────────────────────────
const signos = {
    aries:       { emoji: '♈', data: '21/03–19/04' },
    touro:       { emoji: '♉', data: '20/04–20/05' },
    gemeos:      { emoji: '♊', data: '21/05–20/06' },
    cancer:      { emoji: '♋', data: '21/06–22/07' },
    leao:        { emoji: '♌', data: '23/07–22/08' },
    virgem:      { emoji: '♍', data: '23/08–22/09' },
    libra:       { emoji: '♎', data: '23/09–22/10' },
    escorpiao:   { emoji: '♏', data: '23/10–21/11' },
    sagitario:   { emoji: '♐', data: '22/11–21/12' },
    capricornio: { emoji: '♑', data: '22/12–19/01' },
    aquario:     { emoji: '♒', data: '20/01–18/02' },
    peixes:      { emoji: '♓', data: '19/02–20/03' },
};
const frasesDia = [
    'Hoje é um ótimo dia para novas conexões!',
    'Cuidado com decisões impulsivas.',
    'A sorte está do seu lado hoje!',
    'Momento de reflexão e crescimento interior.',
    'Fique atento às oportunidades que surgirão.',
    'Invista em quem você ama.',
    'Dia favorável para negócios e finanças.',
    'Cuide da sua saúde mental hoje.',
    'Uma surpresa agradável está a caminho.',
    'Confie nos seus instintos hoje.',
];

// ─── Frases motivacionais ─────────────────────────────────────────────────────
const frasesMoti = [
    '"A persistência é o caminho do êxito." – Chaplin',
    '"O sucesso nasce do querer." – José de Alencar',
    '"Comece onde você está." – Arthur Ashe',
    '"Acredite em si mesmo." – anônimo',
    '"Grandes conquistas exigem grandes riscos." – anônimo',
    '"Não espere por oportunidades, crie-as." – anônimo',
    '"A vida é 10% o que acontece comigo e 90% como reajo." – Charles Swindoll',
    '"Você é mais corajoso do que acredita." – A.A. Milne',
    '"Errar é humano, persistir é divino." – anônimo',
    '"O único lugar onde o sucesso vem antes do trabalho é no dicionário." – Vidal Sassoon',
];

// ─────────────────────────────────────────────────────────────────────────────
async function iniciarBot() {
    console.clear();
    console.log(`[35m
╔══════════════════════════════════╗
║   🔥  BOT DA 82  🔥              ║
║   v5.0 — Baileys + Node.js       ║
╚══════════════════════════════════╝[0m`);
    const { state, saveCreds } = await useMultiFileAuthState('./sessao-bot');
    const { version }          = await fetchLatestBaileysVersion();

    log.info(`Iniciando Bot da 82... ${log.mem()}`);
    const sock = makeWASocket({
        version,
        auth:              state,
        logger:            pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser:           ['Ubuntu', 'Chrome', '20.0.04'],
        getMessage: async (key) => {
            return { conversation: '' };
        }
    });

    if (!sock.authState.creds.registered) {
        const numeroLimpo = MEU_NUMERO.replace(/[^0-9]/g, '');
        log.aviso('Sessão não registrada — solicitando código de pareamento...');
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(numeroLimpo);
                log.ok(`CÓDIGO DE PAREAMENTO: ${code}`);
                console.log(`\n========================================`);
                console.log(`🔥 COLE ESSE CÓDIGO NO WHATSAPP: ${code}`);
                console.log(`========================================\n`);
            } catch (err) {
                log.erro('Erro ao solicitar código: ' + err.message);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'open')  log.ok(`Bot da 82 conectado! ${log.mem()}`);
        if (connection === 'connecting') log.info('Conectando ao WhatsApp...');
        if (connection === 'close') {
            const motivo = lastDisconnect?.error?.output?.statusCode;
            log.aviso(`Conexão encerrada. Código: ${motivo}`);
            if (motivo !== DisconnectReason.loggedOut) { log.info('Reconectando em 5s...'); setTimeout(() => iniciarBot(), 5000); }
            else log.erro('Sessão encerrada. Delete sessao-bot e reinicie.');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const from   = m.key.remoteJid;
        const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
        const nome   = m.pushName || 'Usuário';
        const isGrupo = from.endsWith('@g.us');

        let texto = (
            m.message.conversation ||
            m.message.extendedTextMessage?.text ||
            m.message.imageMessage?.caption ||
            m.message.videoMessage?.caption || ''
        ).trim();

        // ─── AUTOMOD IA (só em grupos) ─────────────────────────────────────
        if (AUTOMOD_ENABLED && isGrupo) {
            try {
                let flagResult = { flagged: false };

                // 1) analisa texto
                if (texto) flagResult = await automodTexto(texto);

                // 2) analisa imagem / sticker se texto passou
                if (!flagResult.flagged) {
                    const imgMsg = m.message.imageMessage || m.message.stickerMessage;
                    if (imgMsg) {
                        const tipo  = m.message.stickerMessage ? 'sticker' : 'image';
                        const mtype = m.message.stickerMessage ? 'image/webp' : 'image/jpeg';
                        const stream = await downloadContentFromMessage(imgMsg, tipo);
                        let buf = Buffer.from([]);
                        for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
                        flagResult = await automodImagem(buf, mtype);
                    }
                }

                if (flagResult.flagged) {
                    const autor = m.key.participant || from;
                    log.aviso(`[AUTOMOD] Flagged de ${nome}: ${flagResult.motivo}`);
                    // tenta deletar (precisa que o bot seja admin)
                    try { await sock.sendMessage(from, { delete: m.key }); } catch {}
                    await sock.sendMessage(from, {
                        text: `🚨 *[AUTOMOD]* Mensagem de @${autor.split('@')[0]} removida.\n⚠️ *Motivo:* ${flagResult.motivo}\n\n_Conteúdo violou as regras do grupo._`,
                        mentions: [autor]
                    });
                    return;
                }
            } catch (e) { log.erro(`[AUTOMOD] ${e.message}`); }
        }
        // ───────────────────────────────────────────────────────────────────

        if (!texto.startsWith(PREFIXO)) return;

        const args    = texto.slice(1).trim().split(/ +/);
        const comando = args.shift().toLowerCase();
        if (!comando) return; // ignora mensagens com só o prefixo
        log.msg(`[${isGrupo ? 'GRUPO' : 'PRIV'}] ${nome} → .${comando} ${args.join(' ')}`);

        try {
            switch (comando) {

// ════════════════════════════════════════
//               MENU
// ════════════════════════════════════════
case 'menu':
case 'help':
case 'ajuda': {
    const menu =
`╔══════════════════════════════╗
║   🔥  *B O T   D A   8 2*  🔥  ║
╚══════════════════════════════╝
   ⚡ *Prefixo:* ${PREFIXO}   •   ✅ *Online*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼️  *MÍDIA & FIGURINHAS*
┣ *.fig* — figurinha de foto/vídeo
┣ *.musica* [nome] — baixa MP3
┗ *.video* [nome] — baixa MP4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💕  *SHIP & DIVERSÃO*
┣ *.ship* [nome1] [nome2] — casal
┣ *.ship2* [nome1] [nome2] — ship épico
┣ *.dado* [lados] — rola dado
┣ *.moeda* — cara ou coroa
┣ *.piada* — piada aleatória
┣ *.escolhe* op1|op2 — sorteia
┗ *.rps* pedra/papel/tesoura

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨  *FONTES & TEXTO*
┣ *.fonte bold* [texto]
┣ *.fonte italic* [texto]
┣ *.fonte mono* [texto]
┣ *.fonte bubble* [texto]
┣ *.fonte flip* [texto]
┣ *.fonte smallcaps* [texto]
┣ *.fonte wide* [texto]
┣ *.fonte gothic* [texto]
┗ *.fonte double* [texto]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️  *AUTOMOD IA*
┗ Analisa textos, fotos e figurinhas automaticamente contra conteúdo nazista, pedofilia e ódio extremo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔮  *EXTRAS*
┣ *.moti* — frase motivacional
┣ *.horoscopo* [signo]
┣ *.calc* [conta] — calculadora
┣ *.ping* — latência
┣ *.rep* [texto] — repetir
┣ *.tt* [texto] — CAPS
┣ *.aulas* — horário da semana
┣ *.pessoas82* — lista da turma 82
┗ *.regras* — regras

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_© Bot da 82 — Todos os direitos reservados_`;

    const bannerPath = './menu.jpg';
    if (fs.existsSync(bannerPath)) {
        await sock.sendMessage(from, {
            image: fs.readFileSync(bannerPath),
            caption: menu
        }, { quoted: m });
    } else {
        await sock.sendMessage(from, { text: menu }, { quoted: m });
    }
    break;
}

// ════════════════════════════════════════
//          STICKER MAKER (FOTO/VÍDEO)
// ════════════════════════════════════════
case 'fig':
case 'f':
case 'sticker': {
    const isQuoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const target   = m.message.imageMessage || m.message.videoMessage ||
                     isQuoted?.imageMessage  || isQuoted?.videoMessage;

    if (!target) {
        await sock.sendMessage(from, { text: '⚠️ Responda a uma foto ou vídeo com *.fig*!' }, { quoted: m });
        break;
    }

    await sock.sendMessage(from, { text: `⏳ Criando figurinha pra você, ${nome}...` }, { quoted: m });

    try {
        const isVideo  = !!(m.message.videoMessage || isQuoted?.videoMessage);
        const stream   = await downloadContentFromMessage(target, isVideo ? 'video' : 'image');
        let buffer     = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        const ts     = Date.now();
        const input  = `./tmp_${ts}${isVideo ? '.mp4' : '.jpg'}`;
        const output = `./tmp_${ts}.webp`;
        fs.writeFileSync(input, buffer);

        const filter     = `scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0`;
        const ffmpegCmd  = isVideo
            ? `ffmpeg -i "${input}" -vcodec libwebp -fs 0.8M -filter_complex "${filter}" -loop 0 -preset default -an -vsync 0 -t 7 "${output}" -y`
            : `ffmpeg -i "${input}" -vcodec libwebp -filter_complex "${filter}" "${output}" -y`;

        exec(ffmpegCmd, async (err) => {
            if (err) {
                await sock.sendMessage(from, { text: '❌ Erro no processamento. ffmpeg instalado?' });
            } else {
                try {
                    const { Image } = require('node-webpmux');
                    const img = new Image();
                    await img.load(output);

                    const json = {
                        'sticker-pack-id':        `bot82-${ts}`,
                        'sticker-pack-name':       `Pedido por: ${nome}`,
                        'sticker-pack-publisher':  'Criado Por Bot da 82 🔥',
                        'emojis':                  ['🔥']
                    };

                    const exifHeader = Buffer.from([
                        0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,
                        0x01,0x00,0x41,0x57,0x07,0x00,
                        0x00,0x00,0x00,0x00, // tamanho (preenchido abaixo)
                        0x18,0x00,0x00,0x00  // offset
                    ]);
                    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf-8');
                    const exif       = Buffer.concat([exifHeader, jsonBuffer]);
                    exif.writeUIntLE(jsonBuffer.length, 14, 4);

                    img.exif = exif;
                    const stickerFinal = await img.save(null);
                    await sock.sendMessage(from, { sticker: stickerFinal }, { quoted: m });
                } catch (e) {
                    // fallback sem exif
                    await sock.sendMessage(from, { sticker: fs.readFileSync(output) }, { quoted: m });
                }
            }
            try { fs.unlinkSync(input);  } catch {}
            try { fs.unlinkSync(output); } catch {}
        });
    } catch (e) {
        console.error(e);
        await sock.sendMessage(from, { text: '❌ Erro interno.' });
    }
    break;
}

// ════════════════════════════════════════
//               MÚSICA (YouTube)
// ════════════════════════════════════════
case 'musica':
case 'play':
case 'mp3': {
    if (!args.length) { await sock.sendMessage(from, { text: '⚠️ Use: *.musica* [nome]\nEx: .musica Matuê 777' }, { quoted: m }); break; }
    const busca = await yts(args.join(' '));
    const v = busca.videos[0];
    if (!v) { await sock.sendMessage(from, { text: '❌ Não encontrei nada no YouTube.' }, { quoted: m }); break; }
    await sock.sendMessage(from, { image: { url: v.thumbnail }, caption: `🎧 *${v.title}*\n📺 ${v.author.name}\n⏱️ ${v.timestamp}\n\n⏳ Baixando...` }, { quoted: m });
    const ts = Date.now();
    const audioFile = `./tmp_${ts}.mp3`;
    exec(`yt-dlp -x --audio-format mp3 -o "${audioFile}" "${v.url}"`, async (err) => {
        if (err) { await sock.sendMessage(from, { text: '❌ Erro no download.' }); return; }
        await sock.sendMessage(from, { audio: { url: audioFile }, mimetype: 'audio/mp4' }, { quoted: m });
        try { fs.unlinkSync(audioFile); } catch {}
    });
    break;
}

// ════════════════════════════════════════
//               VÍDEO (YouTube)
// ════════════════════════════════════════
case 'video':
case 'mp4': {
    if (!args.length) { await sock.sendMessage(from, { text: '⚠️ Use: *.video* [nome]' }, { quoted: m }); break; }
    const busca = await yts(args.join(' '));
    const v = busca.videos[0];
    if (!v) { await sock.sendMessage(from, { text: '❌ Não encontrei nada.' }, { quoted: m }); break; }
    await sock.sendMessage(from, { image: { url: v.thumbnail }, caption: `🎬 *${v.title}*\n⏱️ ${v.timestamp}\n\n⏳ Baixando vídeo...` }, { quoted: m });
    const ts = Date.now();
    const videoFile = `./tmp_${ts}.mp4`;
    exec(`yt-dlp -f "best[ext=mp4][filesize<50M]" -o "${videoFile}" "${v.url}"`, async (err) => {
        if (err) { await sock.sendMessage(from, { text: '❌ Vídeo muito grande ou indisponível.' }); return; }
        await sock.sendMessage(from, { video: { url: videoFile }, caption: `🎬 ${v.title}` }, { quoted: m });
        try { fs.unlinkSync(videoFile); } catch {}
    });
    break;
}

// ════════════════════════════════════════
//               SHIP 1
// ════════════════════════════════════════
case 'ship': {
    const p1 = args[0];
    const p2 = args.slice(1).join(' ');
    if (!p1 || !p2) {
        await sock.sendMessage(from, { text: '⚠️ Use: *.ship* [nome1] [nome2]\nEx: .ship João Maria' }, { quoted: m });
        break;
    }
    const pct = Math.floor(Math.random() * 101);
    const { bar, emoji } = shipMeter(pct);
    await sock.sendMessage(from, {
        text:
`💕 *SHIP METER* 💕

👤 *${p1}*
${emoji} [${bar}] *${pct}%*
👤 *${p2}*

${pct >= 80 ? '🔥 Combinação PERFEITA! Vai fundo!' :
  pct >= 60 ? '💛 Bastante compatíveis!' :
  pct >= 40 ? '😊 Têm futuro, se se esforçarem!' :
  pct >= 20 ? '😬 Vai ser difícil...' :
              '💔 Melhor ficarem como amigos.'}`
    }, { quoted: m });
    break;
}

// ════════════════════════════════════════
//               SHIP 2 (épico)
// ════════════════════════════════════════
case 'ship2': {
    const p1 = args[0];
    const p2 = args.slice(1).join(' ');
    if (!p1 || !p2) {
        await sock.sendMessage(from, { text: '⚠️ Use: *.ship2* [nome1] [nome2]' }, { quoted: m });
        break;
    }
    const pct  = Math.floor(Math.random() * 101);
    const { bar, emoji } = shipMeter(pct);
    const shipName = p1.slice(0, Math.ceil(p1.length/2)) + p2.slice(Math.floor(p2.length/2));
    const titulos  = ['Duo Lendário','Par do Destino','Casal dos Sonhos','Força da Natureza','Match Épico'];
    const titulo   = titulos[Math.floor(Math.random() * titulos.length)];
    await sock.sendMessage(from, {
        text:
`✨ *SHIP ÉPICO* ✨
━━━━━━━━━━━━━━━━━
💫 *Nome do Casal:* ${shipName}
🏆 *Título:* ${titulo}

👤 ${p1}  ${emoji}  ${p2} 👤
[${bar}] *${pct}%*

❤️ *Compatibilidade:*
${pct >= 80 ? '🔥🔥🔥 LENDÁRIO — Feitos um pro outro!' :
  pct >= 60 ? '💞💞 ALTO — Grande conexão!' :
  pct >= 40 ? '💛 MÉDIO — Tem potencial!' :
  pct >= 20 ? '😐 BAIXO — Precisam trabalhar.' :
              '💔 TERRÍVEL — Melhor não.'}
━━━━━━━━━━━━━━━━━`
    }, { quoted: m });
    break;
}

// ════════════════════════════════════════
//               FONTES
// ════════════════════════════════════════
case 'fonte': {
    const tipo  = args.shift()?.toLowerCase();
    const texto2 = args.join(' ');
    const lista  = Object.keys(fontes).join(', ');

    if (!tipo || !fontes[tipo]) {
        await sock.sendMessage(from, {
            text: `✨ *Fontes disponíveis:*\n${lista}\n\nUse: *.fonte bold* [texto]`
        }, { quoted: m });
        break;
    }
    if (!texto2) {
        await sock.sendMessage(from, { text: '⚠️ Digite um texto após o tipo!' }, { quoted: m });
        break;
    }
    const resultado = fontes[tipo](texto2);
    await sock.sendMessage(from, { text: resultado }, { quoted: m });
    break;
}

// ════════════════════════════════════════
//               MOTIVACIONAL
// ════════════════════════════════════════
case 'moti':
case 'motivacao':
case 'frase': {
    const frase = frasesMoti[Math.floor(Math.random() * frasesMoti.length)];
    await sock.sendMessage(from, {
        text: `🌟 *Frase do Momento:*\n\n_${frase}_`
    }, { quoted: m });
    break;
}

// ════════════════════════════════════════
//               HORÓSCOPO
// ════════════════════════════════════════
case 'horoscopo':
case 'signo': {
    const s = args[0]?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if (!s || !signos[s]) {
        await sock.sendMessage(from, {
            text: `🔮 *Signos disponíveis:*\n${Object.keys(signos).join(', ')}\n\nUse: *.horoscopo* aries`
        }, { quoted: m });
        break;
    }
    const { emoji, data } = signos[s];
    const frase = frasesDia[Math.floor(Math.random() * frasesDia.length)];
    const sorte = Math.floor(Math.random() * 100) + 1;
    const cores = ['Vermelho','Azul','Verde','Amarelo','Roxo','Rosa','Laranja','Branco','Preto'];
    const cor   = cores[Math.floor(Math.random() * cores.length)];
    await sock.sendMessage(from, {
        text:
`${emoji} *${s.charAt(0).toUpperCase()+s.slice(1)}* (${data})

📅 *Previsão de hoje:*
_${frase}_

🍀 *Número da sorte:* ${sorte}
🎨 *Cor favorável:* ${cor}
⭐ *Energia:* ${'★'.repeat(Math.ceil(sorte/20))}${'☆'.repeat(5-Math.ceil(sorte/20))}`
    }, { quoted: m });
    break;
}

// ════════════════════════════════════════
//               DADO
// ════════════════════════════════════════
case 'dado': {
    const lados = parseInt(args[0]) || 6;
    if (lados < 2 || lados > 1000) { await sock.sendMessage(from, { text: '❌ Lados entre 2 e 1000!' }, { quoted: m }); break; }
    const n = Math.floor(Math.random() * lados) + 1;
    await sock.sendMessage(from, { text: `🎲 Dado de *${lados}* lados → você tirou *${n}*!` }, { quoted: m });
    break;
}

// ════════════════════════════════════════
//               MOEDA
// ════════════════════════════════════════
case 'moeda':
case 'flip': {
    const lado = Math.random() < 0.5 ? '🌝 *CARA*' : '🌚 *COROA*';
    await sock.sendMessage(from, { text: `🪙 A moeda girou e caiu em: ${lado}!` }, { quoted: m });
    break;
}

// ════════════════════════════════════════
//               PIADA
// ════════════════════════════════════════
case 'piada':
case 'joke': {
    const piadas = [
        'Por que o computador foi ao médico? Porque estava com vírus! 🦠',
        'O que o zero disse pro oito? Bonito cinto! 😂',
        'Por que o livro de matemática é triste? Tem muitos problemas! 📚',
        'Por que o esqueleto não briga? Não tem estômago pra isso! 💀',
        'O que a impressora falou pra outra? Você me deixa sem palavras! 🖨️',
        'Por que o peixe não usa computador? Porque tem medo da net! 🐟',
        'O que o Drácula disse ao entrar no banco? Quero abrir uma conta corrente! 🧛',
        'Por que o sol foi à escola? Para ficar mais brilhante! ☀️',
        'O que o oceano disse pra praia? Nada, só deu uma acenada! 🌊',
        'Por que o elefante não usa computador? Porque tem medo do mouse! 🐘',
    ];
    await sock.sendMessage(from, { text: `😂 *Piada do Momento:*\n\n${piadas[Math.floor(Math.random() * piadas.length)]}` }, { quoted: m });
    break;
}

// ════════════════════════════════════════
//               ESCOLHE
// ════════════════════════════════════════
case 'escolhe':
case 'sorteia': {
    const opcoes = args.join(' ').split('|').map(o => o.trim()).filter(Boolean);
    if (opcoes.length < 2) { await sock.sendMessage(from, { text: '⚠️ Use: *.escolhe* op1|op2|op3' }, { quoted: m }); break; }
    const escolha = opcoes[Math.floor(Math.random() * opcoes.length)];
    await sock.sendMessage(from, { text: `🎯 De *${opcoes.length}* opções, eu escolho:\n\n*${escolha}*` }, { quoted: m });
    break;
}

// ════════════════════════════════════════
//               PEDRA PAPEL TESOURA
// ════════════════════════════════════════
case 'rps': {
    const jogadas = ['pedra', 'papel', 'tesoura'];
    const emojis  = { pedra: '🪨', papel: '📄', tesoura: '✂️' };
    const jogador = args[0]?.toLowerCase();
    if (!jogadas.includes(jogador)) { await sock.sendMessage(from, { text: '⚠️ Use: *.rps* pedra | papel | tesoura' }, { quoted: m }); break; }
    const bot = jogadas[Math.floor(Math.random() * 3)];
    let res;
    if (jogador === bot) res = '🤝 Empate!';
    else if ((jogador==='pedra'&&bot==='tesoura')||(jogador==='papel'&&bot==='pedra')||(jogador==='tesoura'&&bot==='papel')) res = '🏆 Você *ganhou*!';
    else res = '💀 Você *perdeu*!';
    await sock.sendMessage(from, { text: `✂️🪨📄 *Pedra Papel Tesoura*\n\nVocê: ${emojis[jogador]} *${jogador}*\nBot:  ${emojis[bot]} *${bot}*\n\n${res}` }, { quoted: m });
    break;
}

// ════════════════════════════════════════
//               PING
// ════════════════════════════════════════
case 'ping': {
    const t = Date.now();
    await sock.sendMessage(from, { text: '🏓 Calculando...' }, { quoted: m });
    await sock.sendMessage(from, { text: `🏓 *Pong!*\n⚡ Latência: *${Date.now()-t}ms*\n✅ Bot da 82 online!` });
    break;
}

// ════════════════════════════════════════
//               CALCULADORA
// ════════════════════════════════════════
case 'calc':
case 'calcular': {
    if (!args.length) { await sock.sendMessage(from, { text: '⚠️ Use: *.calc* [expressão]\nEx: .calc 2+2*10' }, { quoted: m }); break; }
    const expr = args.join('').replace(/[^0-9+\-*/().%\s]/g, '');
    try {
        const resultado = Function('"use strict"; return (' + expr + ')')();
        if (!isFinite(resultado)) throw new Error();
        await sock.sendMessage(from, { text: `🧮 *${expr} = ${resultado}*` }, { quoted: m });
    } catch { await sock.sendMessage(from, { text: '❌ Expressão inválida.' }, { quoted: m }); }
    break;
}

// ════════════════════════════════════════
//               REP / TT
// ════════════════════════════════════════
case 'rep':
case 'repita': {
    if (!args.length) { await sock.sendMessage(from, { text: '⚠️ Use: *.rep* [texto]' }, { quoted: m }); break; }
    await sock.sendMessage(from, { text: args.join(' ') }, { quoted: m });
    break;
}
case 'tt':
case 'caps': {
    if (!args.length) { await sock.sendMessage(from, { text: '⚠️ Use: *.tt* [texto]' }, { quoted: m }); break; }
    await sock.sendMessage(from, { text: args.join(' ').toUpperCase() }, { quoted: m });
    break;
}

// ════════════════════════════════════════
//               REGRAS
// ════════════════════════════════════════
case 'aulas':
case 'horario': {
    const horario =
`📚 *HORÁRIO DE AULAS — 8° ANO* 📚
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *SEGUNDA-FEIRA*
┣ 1ª » 📖 Português
┣ 2ª » 📖 Português
┣ 3ª » 🏛️ História
┣ 4ª » 🌍 Geografia
┣ 5ª » ➕ Matemática
┗ 6ª » ➕ Matemática

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *TERÇA-FEIRA*
┣ 1ª » 🔬 Ciências
┣ 2ª » 📖 Português
┣ 3ª » 📖 Português
┣ 4ª » ➕ Matemática
┣ 5ª » ⚽ Educação Física
┗ 6ª » 🌍 Geografia

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *QUARTA-FEIRA*
┣ 1ª » ⚽ Educação Física
┣ 2ª » ⚽ Educação Física
┣ 3ª » 🔬 Ciências
┣ 4ª » 🌐 Inglês
┣ 5ª » ➕ Matemática
┗ 6ª » ➕ Matemática

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *QUINTA-FEIRA*
┣ 1ª » 🎨 Artes
┣ 2ª » 📖 Português
┣ 3ª » 📖 Português
┣ 4ª » 🙏 Ensino Religioso
┣ 5ª » 🌐 Inglês
┗ 6ª » 🌍 Geografia

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *SEXTA-FEIRA*
┣ 1ª » 🏛️ História
┣ 2ª » 🏛️ História
┣ 3ª » 🎨 Artes _(talvez)_
┣ 4ª » 🔬 Ciências
┣ 5ª » 🔬 Ciências
┗ 6ª » ➕ Matemática

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_🎓 Turma 82 • 2026_`;

    // Manda no pv de quem pediu
    const quemPediu = from.endsWith('@g.us')
        ? (m.key.participant || from)
        : from;
    log.cmd(`[AULAS] Enviando pv para: ${quemPediu}`);
    try {
        await sock.sendMessage(quemPediu, { text: horario });
        log.ok(`[AULAS] ✅ Horário enviado no pv de ${quemPediu}`);
    } catch(e) {
        log.erro(`[AULAS] ❌ Falha ao enviar pv: ${e.message}`);
    }

    // Confirma no chat de origem
    try {
        await sock.sendMessage(from, { text: '📚 Aulas enviadas no seu pv!! ⭐' }, { quoted: m });
    } catch(e) {
        log.erro(`[AULAS] ❌ Falha ao confirmar: ${e.message}`);
    }
    break;
}

case 'id': {
    await sock.sendMessage(from, {
        text: `🆔 *ID deste chat:*
${from}`
    }, { quoted: m });
    break;
}

case 'pessoas82':
case 'turma':
case 'lista': {
    const lista =
`🎓 *TURMA 82 — 2026*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👑 *REPRESENTAÇÃO*
┣ ⭐ Franco — +55 48 9204-1180
┗ ⭐ Yasmin Belmont — +55 48 9137-3799
   _vice representante_

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⭐ *ADMINS*
┣ Adrielly — +55 48 8847-5258
┣ Kauan — +55 48 9391-3608
┣ Luiz — +55 48 9616-3056
┗ Mailo — +55 48 9942-8228

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 *MEMBROS*
┣ Alcides — +55 48 8846-9121
┣ Aline — +55 48 7400-5187
┣ Ana Vitória — +55 48 8418-7452
┣ Antonia — +55 48 8819-0177
┣ Caio Gabriel — +55 49 8846-7566
┣ Christian — +55 48 8811-0653
┣ Esther — _sem número_
┣ Felipe — +55 48 8800-3239
┣ Isaque — +55 48 9112-7517
┣ Mariana — +55 48 8460-8197
┣ Maria — +55 48 8417-1068
┣ Matheus — +55 48 8873-0551
┣ Paulo — +55 48 9971-3173
┣ Ruan — +55 48 9647-3271
┣ Vitória — +55 41 9165-5215
┗ Yasmin — +55 48 8878-3277

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *Bot da 82* — +55 48 9184-6401
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Total: 23 pessoas • Turma 82 • 2026_`;

    await sock.sendMessage(from, { text: lista }, { quoted: m });
    break;
}
case 'regras': {
    await sock.sendMessage(from, {
        text: `📜 *Regras do Grupo*\n\n1️⃣ Respeite todos os membros\n2️⃣ Sem spam ou flood\n3️⃣ Sem conteúdo +18 sem aviso\n4️⃣ Sem links suspeitos\n5️⃣ Não divulgue outros grupos sem autorização\n6️⃣ Polêmica → resolva no privado\n\n_Quem descumprir leva ban sem aviso. 🔨_`
    }, { quoted: m });
    break;
}

// ════════════════════════════════════════
//               DEFAULT
// ════════════════════════════════════════
default: {
    await sock.sendMessage(from, {
        text: `❓ Comando *.${comando}* não encontrado.\nDigite *.menu* para ver todos os comandos.`
    }, { quoted: m });
    break;
}

            }
        } catch (err) {
            log.erro(`.${comando} → ${err.message}`);
            await sock.sendMessage(from, { text: '⚠️ Ocorreu um erro ao executar o comando.' }).catch(() => {});
        }
    });
}

iniciarBot().catch(console.error);

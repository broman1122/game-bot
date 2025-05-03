require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Partials } = require('discord.js');
const fs = require('fs');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

const token = process.env.DISCORD_TOKEN;

let playerPoints = new Map(); // Using Map for player points tracking
let gameActive = false;
let players = [];
let playerHearts = {};
let currentPlayerIndex = 0;
const minPlayers = 3;

// Emoji riddles and flags for games
const emojiRiddles = [
    { emoji: '🍎📱', answer: 'ابل' },
    { emoji: '🎬🍿', answer: 'سينما' },
    { emoji: '🚗💨', answer: 'سيارة' },
    { emoji: '🐍💻', answer: 'بايثون' },
    { emoji: '☕💻', answer: 'قهوة' },
];

const flags = [
    { emoji: '🇸🇦', answer: 'السعودية' },
    { emoji: '🇪🇬', answer: 'مصر' },
    { emoji: '🇯🇵', answer: 'اليابان' },
    { emoji: '🇫🇷', answer: 'فرنسا' },
];

// Sentences for speed typing game
const sentences = [
    'انا احب البرمجة',
    'ديسكورد ممتع',
    'مرحبا بكم في السيرفر',
    'اللعب مع الاصدقاء ممتع'
];

client.once('ready', () => {
    console.log(تم تسجيل الدخول باسم ${client.user.tag});
});

// === Help Command ===
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const args = message.content.trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // Display help
    if (command === '-مساعدة') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('🕹️ قائمة الألعاب')
            .setDescription('استخدم الأوامر التالية للعب:')
            .addFields(
                { name: '💣 لعبة القنبلة', value: '-بومب' },
                { name: '⌨️ الكتابة السريعة', value: '-كتابة' },
                { name: '🔤 حروف', value: '-حروف' },
                { name: '🎭 صراحة أم تحدي', value: '-صراحة' },
                { name: '🕵️ من كتب هذه الرسالة؟', value: '-من_كتب' },
                { name: '💎 نقاطي', value: '-نقاطي' },
                { name: '!ترتيب', value: 'أفضل اللاعبين' },
                { name: '!ايموجي', value: 'لعبة تخمين الإيموجي' },
                { name: '!علم', value: 'احزر الدولة من العلم' },
                { name: '!روليت', value: 'لعبة الروليت' },
                { name: '!مافيا', value: 'لعبة المافيا' }
            )
            .setColor(0x00FFFF)
            .setFooter({ text: 'استمتع باللعب!' });

        await message.channel.send({ embeds: [helpEmbed] });
    }

    // Display user points
    if (command === '-نقاطي') {
        const points = playerPoints.get(message.author.id) || 0;
        await message.channel.send(📊 نقاطك هي: ${points});
    }

    // === Emoji Riddle ===
    if (command === '!ايموجي') {
        const riddle = emojiRiddles[Math.floor(Math.random() * emojiRiddles.length)];
        message.channel.send(❓ **لعبة الإيموجي:** خمن الكلمة!\n${riddle.emoji});

        const filter = m => m.channel.id === message.channel.id && m.content.toLowerCase() === riddle.answer;
        message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
            .then(collected => {
                const winner = collected.first().author;
                playerPoints.set(winner.id, (playerPoints.get(winner.id) || 0) + 1);
                message.channel.send(${winner} صحيح! نقطة!);
            })
            .catch(() => message.channel.send(انتهى الوقت! الجواب: ${riddle.answer}));
    }

    // === Speed Typing ===
    if (command === '-كتابة') {
        const text = sentences[Math.floor(Math.random() * sentences.length)];
        await message.channel.send(📝 اكتب هذا بأسرع ما يمكن:\n\n${text});

        const filter = msg => msg.content === text && !msg.author.bot;
        const collector = message.channel.createMessageCollector({ filter, time: 30000 });

        collector.on('collect', msg => {
            playerPoints.set(msg.author.id, (playerPoints.get(msg.author.id) || 0) + 1);
            msg.reply('✅ أحسنت!');
            collector.stop();
        });

        collector.on('end', c => {
            if (c.size === 0) message.channel.send('⌛ لم يقم أحد بكتابة الجملة بشكل صحيح.');
        });
    }

    // === Roulette Game ===
    if (command === '!روليت') {
        const players = message.guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
        const winner = players[Math.floor(Math.random() * players.length)];
        playerPoints.set(winner.id, (playerPoints.get(winner.id) || 0) + 1);
        message.channel.send(الروليت اختارت: ${winner}! نقطة!);
    }

    // === Mafia Game ===
    if (command === '!مافيا') {
        const roles = ['مافيا', 'شرطي', 'مدني', 'مدني'];
        const players = message.guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
        const selected = players.sort(() => 0.5 - Math.random()).slice(0, roles.length);
        selected.forEach((player, i) => {
            player.send(دورك في المافيا: ${roles[i]}).catch(() => message.channel.send(لا يمكن إرسال خاص لـ ${player}));
        });
        message.channel.send('تم توزيع الأدوار!');
    }

    // === Flag Guessing Game ===
    if (command === '!علم') {
        const flag = flags[Math.floor(Math.random() * flags.length)];
        message.channel.send(🌍 **احزر الدولة:**\n${flag.emoji});

        const filter = m => m.channel.id === message.channel.id && m.content.toLowerCase() === flag.answer;
        message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
            .then(collected => {
                const winner = collected.first().author;
                playerPoints.set(winner.id, (playerPoints.get(winner.id) || 0) + 1);
                message.channel.send(${winner} صحيح! نقطة!);
            })
            .catch(() => message.channel.send(انتهى الوقت! الجواب: ${flag.answer}));
    }

    // === Help Command ===
    if (command === '!مساعدة') {
        message.channel.send(`
أوامر البوت:
!نقاطي → اعرف نقاطك
!ترتيب → أفضل اللاعبين
!ايموجي → لعبة تخمين الإيموجي
!روليت → لعبة الروليت
!مافيا → توزيع أدوار المافيا
!علم → احزر اسم الدولة من العلم
!سريع → اكتب الجملة بسرعة
!احسب → عد الأحرف في الجملة
!متجر → فتح المتجر
!شراء → شراء رول خاص
        `);
    }

    // === Player Points Ranking ===
    if (command === '!ترتيب') {
        const sorted = Array.from(playerPoints.entries()).sort((a, b) => b[1] - a[1]);
        if (!sorted.length) {
            message.channel.send('لا توجد نقاط حتى الآن!');
            return;
        }
        let msg = '🏆 الترتيب:\n';
        for (const [userId, score] of sorted.slice(0, 5)) {
            const user = await client.users.fetch(userId);
            msg += ${user.username}: ${score} نقطة\n;
        }
        message.channel.send(msg);
    }
});

// === Start Bot ===
client.login(token);

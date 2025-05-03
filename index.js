const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

const points = new Map();

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

const sentences = [
    'انا احب البرمجة',
    'ديسكورد ممتع',
    'مرحبا بكم في السيرفر',
    'اللعب مع الاصدقاء ممتع'
];

client.once('ready', () => {
    console.log(تم تسجيل الدخول باسم ${client.user.tag});
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const args = message.content.trim().split(/ +/g);
    const command = args.shift().toLowerCase();

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

    if (command === '!نقاطي') {
        const userPoints = points.get(message.author.id) || 0;
        message.channel.send(${message.author} لديك ${userPoints} نقطة!);
    }

    if (command === '!ترتيب') {
        const sorted = Array.from(points.entries()).sort((a, b) => b[1] - a[1]);
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

    if (command === '!ايموجي') {
        const riddle = emojiRiddles[Math.floor(Math.random() * emojiRiddles.length)];
        message.channel.send(❓ **لعبة الإيموجي:** خمن الكلمة!\n${riddle.emoji});

        const filter = m => m.channel.id === message.channel.id && m.content.toLowerCase() === riddle.answer;
        message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
            .then(collected => {
                const winner = collected.first().author;
                points.set(winner.id, (points.get(winner.id) || 0) + 1);
                message.channel.send(${winner} صحيح! نقطة!);
            })
            .catch(() => message.channel.send(انتهى الوقت! الجواب: ${riddle.answer}));
    }

    if (command === '!روليت') {
        const players = message.guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
        const winner = players[Math.floor(Math.random() * players.length)];
        points.set(winner.id, (points.get(winner.id) || 0) + 1);
        message.channel.send(الروليت اختارت: ${winner}! نقطة!);
    }

    if (command === '!مافيا') {
        const roles = ['مافيا', 'شرطي', 'مدني', 'مدني'];
        const players = message.guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
        const selected = players.sort(() => 0.5 - Math.random()).slice(0, roles.length);
        selected.forEach((player, i) => {
            player.send(دورك في المافيا: ${roles[i]}).catch(() => message.channel.send(لا يمكن إرسال خاص لـ ${player}));
        });
        message.channel.send('تم توزيع الأدوار!');
    }

    if (command === '!علم') {
        const flag = flags[Math.floor(Math.random() * flags.length)];
        message.channel.send(🌍 **احزر الدولة:**\n${flag.emoji});

        const filter = m => m.channel.id === message.channel.id && m.content.toLowerCase() === flag.answer;
        message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
            .then(collected => {
                const winner = collected.first().author;
                points.set(winner.id, (points.get(winner.id) || 0) + 1);
                message.channel.send(${winner} صحيح! نقطة!);
            })
            .catch(() => message.channel.send(انتهى الوقت! الجواب: ${flag.answer}));
    }

    if (command === '!سريع') {
        const sentence = sentences[Math.floor(Math.random() * sentences.length)];
        message.channel.send(⚡ اكتب الجملة بسرعة:\n\${sentence}\``);

        const filter = m => m.channel.id === message.channel.id && m.content === sentence;
        message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] })
            .then(collected => {
                const winner = collected.first().author;
                points.set(winner.id, (points.get(winner.id) || 0) + 1);
                message.channel.send(${winner} أسرع شخص! نقطة!);
            })
            .catch(() => message.channel.send('انتهى الوقت! ولا أحد كتبها.'));
    }

    if (command === '!احسب') {
        const text = args.join(' ').replace(/ /g, '');
        message.channel.send(🔢 عدد الأحرف: ${text.length});
    }

    if (command === '!متجر') {
        message.channel.send(`
🛍️ *المتجر:*
- شراء رول خاص: 90 نقطة
اكتب الأمر \!شراء\ لشراء الرول إذا عندك نقاط كافية!
        `);
    }

    if (command === '!شراء') {
        const userPoints = points.get(message.author.id) || 0;
        const roleName = 'VIP';
        if (userPoints < 90) {
            message.channel.send(${message.author} تحتاج 90 نقطة! نقاطك الحالية: ${userPoints});
            return;
        }
        let role = message.guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            role = await message.guild.roles.create({ name: roleName });
        }
        message.member.roles.add(role);
        points.set(message.author.id, userPoints - 90);
        message.channel.send(${message.author} مبروك! حصلت على رول **${roleName}** وتم خصم 90 نقطة!);
    }
});

client.login(process.env.DISCORD_TOKEN);

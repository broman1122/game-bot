const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { config } = require('dotenv');
config(); // لتحميل متغيرات البيئة من .env

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// تخزين النقاط
const playerPoints = {};

// عند تشغيل البوت
client.once('ready', () => {
  console.log(`[✅] البوت جاهز! تم تسجيل الدخول كـ ${client.user.tag}`);
});

// عند استقبال رسالة
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // أمر المساعدة
  if (message.content === '-مساعدة') {
    const embed = new EmbedBuilder()
      .setTitle('🕹️ قائمة الألعاب')
      .setDescription('استخدم الأوامر التالية للعب:')
      .addFields(
        { name: '⌨️ الكتابة السريعة', value: '`-كتابة`' },
        { name: '🔤 حروف', value: '`-حروف`' },
        { name: '📊 نقاطك', value: '`-نقاطي`' }
      )
      .setColor(0x00FFFF)
      .setFooter({ text: '🤖 البوت مقدم من جابر' });

    await message.channel.send({ embeds: [embed] });
  }

  // أمر النقاط
  if (message.content === '-نقاطي') {
    const points = playerPoints[message.author.id] || 0;
    await message.channel.send(`📊 نقاطك هي: ${points}`);
  }

  // لعبة الكتابة السريعة
  if (message.content === '-كتابة') {
    const الجمل = [
      'البرمجة ممتعة',
      'أنا أحب البوتات',
      'الذكاء الاصطناعي مذهل',
      'جرب كتابة هذا النص',
      'تعلم البرمجة مفيد'
    ];

    const عشوائية = الجمل[Math.floor(Math.random() * الجمل.length)];
    await message.channel.send(`📝 اكتب هذا بأسرع ما يمكن:\n\n${عشوائية}`);

    const filter = r => r.author.id !== client.user.id;
    const collector = message.channel.createMessageCollector({ filter, time: 30000 });

    collector.on('collect', msg => {
      if (msg.content === عشوائية) {
        playerPoints[msg.author.id] = (playerPoints[msg.author.id] || 0) + 1;
        msg.reply('✅ أحسنت! حصلت على نقطة.');
        collector.stop();
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        message.channel.send('⌛ لم يقم أحد بكتابة الجملة بشكل صحيح.');
      }
    });
  }

  // لعبة الحروف
  if (message.content === '-حروف') {
    const الكلمات = ['برمجة', 'ذكاء', 'كود', 'خوارزمية', 'تطبيق'];
    const عشوائية = الكلمات[Math.floor(Math.random() * الكلمات.length)];
    const الطول = عشوائية.length;

    await message.channel.send(`🤔 كم عدد أحرف هذه الكلمة؟\n\n${عشوائية}`);

    const filter = m => !isNaN(m.content) && m.author.id !== client.user.id;
    const collector = message.channel.createMessageCollector({ filter, time: 30000 });

    collector.on('collect', msg => {
      if (parseInt(msg.content) === الطول) {
        playerPoints[msg.author.id] = (playerPoints[msg.author.id] || 0) + 1;
        msg.reply('✅ أحسنت! العدد صحيح.');
        collector.stop();
      } else {
        msg.reply('❌ غير صحيح، حاول مجددًا.');
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        message.channel.send(`⌛ انتهى الوقت! الكلمة كانت: ${عشوائية}`);
      }
    });
  }
});

client.login(process.env.DISCORD_TOKEN);

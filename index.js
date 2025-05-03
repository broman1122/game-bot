require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const token = process.env.DISCORD_TOKEN;

let playerPoints = {};
let gameActive = false;
let players = [];
let playerHearts = {};
let currentPlayerIndex = 0;
const minPlayers = 3;

// === Bot Ready ===
client.once('ready', () => {
  console.log(`Bot is online as ${client.user.tag}`);
});

// === Help Command ===
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content === '-مساعدة') {
    const helpEmbed = new EmbedBuilder()
      .setTitle('🕹️ قائمة الألعاب')
      .setDescription('استخدم الأوامر التالية للعب:')
      .addFields(
        { name: '💣 لعبة القنبلة', value: '`-بومب`' },
        { name: '⌨️ الكتابة السريعة', value: '`-كتابة`' },
        { name: '🔤 حروف', value: '`-حروف`' },
        { name: '🎭 صراحة أم تحدي', value: '`-صراحة`' },
        { name: '🕵️ من كتب هذه الرسالة؟', value: '`-من_كتب`' },
        { name: '💎 نقاطي', value: '`-نقاطي`' }
      )
      .setColor(0x00FFFF)
      .setFooter({ text: 'استمتع باللعب!' });

    await message.channel.send({ embeds: [helpEmbed] });
  }

  // نقاطي
  if (message.content === '-نقاطي') {
    const points = playerPoints[message.author.id] || 0;
    await message.channel.send(`📊 نقاطك هي: ${points}`);
  }

  // لعبة القنبلة
  if (message.content === '-بومب' && !gameActive) {
    gameActive = true;
    players = [];
    playerHearts = {};

    const joinBtn = new ButtonBuilder()
      .setCustomId('join')
      .setLabel('انضم')
      .setStyle(ButtonStyle.Success);

    const leaveBtn = new ButtonBuilder()
      .setCustomId('leave')
      .setLabel('غادر')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(joinBtn, leaveBtn);
    const embed = new EmbedBuilder()
      .setTitle('💣 لعبة القنبلة بدأت!')
      .setDescription('اضغط على زر الانضمام خلال 30 ثانية.')
      .setColor(0xFF0000);

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async i => {
      if (i.customId === 'join') {
        if (!players.includes(i.user.id)) {
          players.push(i.user.id);
          playerHearts[i.user.id] = 2;
          await i.reply({ content: `✅ ${i.user.username} انضم`, ephemeral: true });
        } else {
          await i.reply({ content: '❗ أنت بالفعل منضم', ephemeral: true });
        }
      } else if (i.customId === 'leave') {
        players = players.filter(p => p !== i.user.id);
        delete playerHearts[i.user.id];
        await i.reply({ content: '❌ غادرت اللعبة', ephemeral: true });
      }
    });

    collector.on('end', async () => {
      if (players.length >= minPlayers) {
        await message.channel.send('🚀 اللعبة تبدأ الآن!');
        // Lägg till mer spellogik här om du vill
      } else {
        gameActive = false;
        await message.channel.send('❌ تم إلغاء اللعبة لعدم وجود عدد كافٍ من اللاعبين.');
      }
    });
  }

  // كتابة
  if (message.content === '-كتابة') {
    const sentences = [
      'البرمجة ممتعة',
      'الذكاء الاصطناعي مذهل',
      'أنا أحب البوتات',
      'جرب كتابة هذا النص'
    ];
    const text = sentences[Math.floor(Math.random() * sentences.length)];
    await message.channel.send(`📝 اكتب هذا بأسرع ما يمكن:\n\n${text}`);

    const filter = msg => msg.content === text && !msg.author.bot;
    const collector = message.channel.createMessageCollector({ filter, time: 30000 });

    collector.on('collect', msg => {
      playerPoints[msg.author.id] = (playerPoints[msg.author.id] || 0) + 1;
      msg.reply('✅ أحسنت!');
      collector.stop();
    });

    collector.on('end', c => {
      if (c.size === 0) message.channel.send('⌛ لم يقم أحد بكتابة الجملة بشكل صحيح.');
    });
  }

  // حروف
  if (message.content === '-حروف') {
    const words = ['ذكاء', 'برمجة', 'كود', 'شيفرة', 'خوارزمية'];
    const chosen = words[Math.floor(Math.random() * words.length)];
    await message.channel.send(`🤔 كم عدد أحرف هذه الكلمة؟\n\n${chosen}`);

    const filter = msg => !isNaN(msg.content) && !msg.author.bot;
    const collector = message.channel.createMessageCollector({ filter, time: 30000 });

    collector.on('collect', msg => {
      if (parseInt(msg.content) === chosen.length) {
        playerPoints[msg.author.id] = (playerPoints[msg.author.id] || 0) + 1;
        msg.reply('✅ صحيح!');
        collector.stop();
      } else {
        msg.reply('❌ خطأ، حاول مجددًا!');
      }
    });

    collector.on('end', c => {
      if (c.size === 0) message.channel.send(`⌛ انتهى الوقت! الكلمة كانت: ${chosen}`);
    });
  }

  // صراحة أو تحدي
  if (message.content === '-صراحة') {
    const type = Math.random() > 0.5 ? 'صراحة' : 'تحدي';
    const list = type === 'صراحة'
      ? ['ما هو أكبر سر لك؟', 'هل تحب شخصاً؟', 'ما هو أكبر خوفك؟']
      : ['أرسل رسالة غريبة', 'غيّر اسمك لمدة ساعة', 'قل نكتة سخيفة'];

    const selected = list[Math.floor(Math.random() * list.length)];
    await message.channel.send(`🎭 ${type}:\n\n${selected}`);
  }

  // من كتب
  if (message.content === '-من_كتب') {
    const members = message.guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
    const random = members[Math.floor(Math.random() * members.length)];
    await message.channel.send(`🤔 من كتب هذه الرسالة؟\n\n${random.username}`);
  }
});

// === Start Bot ===
client.login(token);


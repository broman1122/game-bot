require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const token = process.env.DISCORD_TOKEN;

let playerPoints = {};
let gameActive = false;
let players = [];
let playerHearts = {};
let currentPlayerIndex = 0;
const minPlayers = 3;
let guessingGameActive = false;

client.once('ready', () => {
  console.log(تم تسجيل الدخول باسم ${client.user.tag});
});

// === Help Command ===
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content === '-مساعدة') {
    const helpEmbed = new EmbedBuilder()
      .setTitle('🕹️ قائمة الألعاب')
      .setDescription('استخدم الأوامر التالية للعب:')
      .addFields(
        { name: '💣 لعبة القنبلة', value: '-بومب' },
        { name: '⌨️ الكتابة السريعة', value: '-كتابة' },
        { name: '🔤 حروف', value: '-حروف' },
        { name: '🎭 صراحة أم تحدي', value: '-صراحة' },
        { name: '🕵️ من كتب هذه الرسالة؟', value: '-من_كتب' },
        { name: '🧩 لعبة الإيموجي', value: '-إيموجي' },
        { name: '🎰 روليت', value: '-روليت' },
        { name: '🕵️‍♂️ مافيا', value: '-مافيا' },
        { name: '💸 المتجر (شراء رتبة)', value: '-متجر' },
        { name: '💎 نقاطي', value: '-نقاطي' },
        { name: '🎯 لعبة الأرقام', value: '-أرقام' }
      )
      .setColor(0x00FFFF)
      .setFooter({ text: 'استمتع باللعب!' });

    await message.channel.send({ embeds: [helpEmbed] });
  }

  // نقاطي
  if (message.content === '-نقاطي') {
    const points = playerPoints[message.author.id] || 0;
    await message.channel.send(📊 نقاطك هي: ${points});
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
          await i.reply({ content: ✅ ${i.user.username} انضم, ephemeral: true });
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
        // هنا يمكن إضافة منطق اللعب و تحديد الفائز
        // عند الفوز، إضافة نقطة للفائز
        const winner = players[Math.floor(Math.random() * players.length)];
        playerPoints[winner] = (playerPoints[winner] || 0) + 1; // إضافة نقطة للفائز
        await message.channel.send(<@${winner}> فاز في لعبة القنبلة! حصل على نقطة.);
        gameActive = false;
      } else {
        gameActive = false;
        await message.channel.send('❌ تم إلغاء اللعبة لعدم وجود عدد كافٍ من اللاعبين.');
      }
    });
  }

  // لعبة الإيموجي
  if (message.content === '-إيموجي') {
    const emojis = ['😀', '😂', '😎', '😍', '😢', '😡', '😱', '🤔'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    await message.channel.send(🧩 حدد الإيموجي: ${randomEmoji});

    const filter = msg => msg.content === randomEmoji && !msg.author.bot;
    const collector = message.channel.createMessageCollector({ filter, time: 30000 });

    collector.on('collect', msg => {
      playerPoints[msg.author.id] = (playerPoints[msg.author.id] || 0) + 1; // إضافة نقطة عند الفوز
      msg.reply('✅ أحسنت في اختيار الإيموجي!');
      collector.stop();
    });

    collector.on('end', c => {
      if (c.size === 0) message.channel.send('⌛ انتهى الوقت دون أن يجيب أحد.');
    });
  }

  // شراء رتبة
  if (message.content === '-متجر') {
    const points = playerPoints[message.author.id] || 0;

    if (points >= 90) {
      // هنا يمكنك إضافة كود لمنح اللاعب رتبة معينة في السيرفر
      playerPoints[message.author.id] -= 90;
      await message.channel.send(🎉 تم شراء الرتبة بنجاح! لديك الآن ${playerPoints[message.author.id]} نقطة.);
    } else {
      await message.channel.send(❌ لديك ${points} نقطة، تحتاج إلى 90 نقطة لشراء الرتبة.);
    }
  }

  // روليت
  if (message.content === '-روليت') {
    const outcomes = ['💰 فزت بـ 50 نقطة!', '🎉 فزت بـ 100 نقطة!', '❌ خسرنا! حاول مجددًا!', '💸 فزت بـ 200 نقطة!'];
    const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    if (randomOutcome.includes('فزت')) {
      const pointsToAdd = parseInt(randomOutcome.split(' ')[2]);
      playerPoints[message.author.id] = (playerPoints[message.author.id] || 0) + pointsToAdd; // إضافة نقاط عند الفوز
    }

    await message.channel.send(randomOutcome);
  }

  // لعبة الأرقام
  if (message.content === '-أرقام' && !guessingGameActive) {
    guessingGameActive = true;
    const randomNumber = Math.floor(Math.random() * 100) + 1; // رقم عشوائي من 1 إلى 100

    const filter = msg => !msg.author.bot && !isNaN(msg.content) && parseInt(msg.content) >= 1 && parseInt(msg.content) <= 100;

    await message.channel.send('🎯 لعبة الأرقام بدأت! حدد رقم بين 1 و 100!');
    
    const collector = message.channel.createMessageCollector({ filter, time: 30000 });

    collector.on('collect', msg => {
      const guess = parseInt(msg.content);
      if (guess === randomNumber) {
        playerPoints[msg.author.id] = (playerPoints[msg.author.id] || 0) + 1; // إضافة نقطة عند الفوز
        msg.reply(🎉 أحسنت! الرقم كان ${randomNumber}! حصلت على نقطة.);
        collector.stop();
      }
    });

    collector.on('end', c => {
      if (c.size === 0) {
        message.channel.send('⌛ انتهى الوقت دون أن يخمن أحد الرقم.');
      }
      guessingGameActive = false;
    });
  }

  // مافيا
  if (message.content === '-مافيا') {
    const roles = ['مافيا', 'ضحية', 'محقق'];
    const playerRole = roles[Math.floor(Math.random() * roles.length)];
    await message.channel.send(🎭 دورك في لعبة المافيا هو: ${playerRole});

    // إذا كان اللاعب مافيا، يفوز ويحصل على نقطة
    if (playerRole === 'مافيا') {
      playerPoints[message.author.id] = (playerPoints[message.author.id] || 0) + 1; // إضافة نقطة للفائز
      await message.channel.send(🎉 أنت المافيا وفزت في اللعبة! حصلت على نقطة.);
    }
  }

  // من كتب
  if (message.content === '-من_كتب') {
    const members = message.guild.members.cache.filter(m => !m.user.bot).map(m => m.user);
    const random = members[Math.floor(Math.random() * members.length)];
    await message.channel.send(🤔 من كتب هذه الرسالة؟\n\n${random.username});
  }
});

// === Start Bot ===
client.login(token);

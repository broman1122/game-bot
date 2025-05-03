const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const { token } = require('./config'); // Här ska du ha din token i config.js
const quiz = JSON.parse(fs.readFileSync('quiz.json', 'utf8'));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let gameActive = false;
let players = [];
let playerHearts = {};
let playerPoints = {}; // För poäng
let currentPlayerIndex = 0;
const maxPlayers = 15;
const minPlayers = 3;

client.once('ready', () => {
  console.log('Bot is online!');
});

client.on('messageCreate', async message => {
  if (message.content === '-مساعدة') {
    const helpEmbed = new EmbedBuilder()
      .setTitle('🕹️ قائمة الألعاب')
      .setDescription('استخدم الأوامر التالية للعب:')
      .addFields(
        { name: '💣 لعبة القنبلة', value: '`-بومب`' },
        { name: '⌨️ الكتابة السريعة', value: '`-كتابة`' },
        { name: '🏳️ علم أي دولة؟', value: '`-علم`' },
        { name: '🧠 ذاكرة الإيموجي', value: '`-ايموجي`' },
        { name: '🔢 خمن الرقم', value: '`-رقم`' },
        { name: '🎭 صراحة أم تحدي', value: '`-صراحة`' },
        { name: '🕵️ من كتب هذه الرسالة؟', value: '`-من_كتب`' },
        { name: '🎰 روليت', value: '`-روليت`' },
        { name: '🔤 حروف', value: '`-حروف`' },
        { name: '💎 نقاطي', value: '`-نقاطي`' }
      )
      .setColor(0x00FFFF)
      .setFooter({ text: 'استمتع باللعب!' });

    await message.channel.send({ embeds: [helpEmbed] });
  }

  // نقاطي command (Show Player's Points)
  if (message.content === '-نقاطي') {
    if (playerPoints[message.author.id]) {
      await message.channel.send(`📊 نقاطك هي: ${playerPoints[message.author.id]}`);
    } else {
      await message.channel.send('💡 لم تلعب أي لعبة بعد!');
    }
  }

  // Bomb game logic
  if (message.content === '-بومب' && !gameActive) {
    gameActive = true;
    players = [];
    playerHearts = {};
    currentPlayerIndex = 0;

    const joinButton = new ButtonBuilder()
      .setCustomId('join_bomb_game')
      .setLabel('انضم للعبة')
      .setStyle(ButtonStyle.Success);

    const leaveButton = new ButtonBuilder()
      .setCustomId('leave_bomb_game')
      .setLabel('غادر اللعبة')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder()
      .addComponents(joinButton, leaveButton);

    let embed = new EmbedBuilder()
      .setTitle('بدء اللعبة!')
      .setDescription('انقر على الأزرار للانضمام أو مغادرة اللعبة.')
      .setColor(0x00FF00)
      .addFields({ name: 'اللاعبين', value: 'لا يوجد لاعبون بعد', inline: true })
      .setFooter({ text: 'الرجاء الانضمام خلال 30 ثواني' });

    const gameMessage = await message.channel.send({ embeds: [embed], components: [row] });

    const filter = interaction => ['join_bomb_game', 'leave_bomb_game'].includes(interaction.customId);
    const collector = gameMessage.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'join_bomb_game') {
        if (!players.includes(interaction.user.id)) {
          players.push(interaction.user.id);
          playerHearts[interaction.user.id] = 2;
          await interaction.reply({ content: `${interaction.user.tag} انضم إلى اللعبة!`, ephemeral: true });
        } else {
          await interaction.reply({ content: 'أنت بالفعل في اللعبة!', ephemeral: true });
        }
      } else if (interaction.customId === 'leave_bomb_game') {
        players = players.filter(id => id !== interaction.user.id);
        delete playerHearts[interaction.user.id];
        await interaction.reply({ content: `${interaction.user.tag} غادر اللعبة!`, ephemeral: true });
      }
    });

    collector.on('end', async () => {
      if (players.length >= minPlayers) {
        await message.channel.send('اللعبة ستبدأ قريباً!');
        setTimeout(() => {
          startGame(message.channel);
        }, 10000);
      } else {
        gameActive = false;
        await message.channel.send(`تم إلغاء اللعبة بسبب قلة اللاعبين. يجب أن ينضم على الأقل ${minPlayers} لاعبين.`);
      }
    });
  }

  // Stop bomb game
  if (message.content === '-ايقاف' && gameActive) {
    gameActive = false;
    players = [];
    playerHearts = {};
    await message.channel.send('تم إيقاف اللعبة.');
  }

  // Roulette game
  if (message.content === '-روليت') {
    const choices = ['🎉 فزت!', '❌ خسرت!'];
    const result = choices[Math.floor(Math.random() * choices.length)];
    await message.channel.send(result);
  }

  // حروف game
  if (message.content === '-حروف') {
    const words = [
      'برمجة', 'مطور', 'تعلم', 'دردشة', 'ذكاء', 'كود', 'نظام', 'خوارزمية', 'شيفرة', 'لغات'
    ];

    const randomWord = words[Math.floor(Math.random() * words.length)];
    const wordLength = randomWord.length;

    await message.channel.send(`هل يمكنك تخمين عدد الأحرف في الكلمة التالية؟ \n\n${randomWord}`);

    const filter = response => response.author.id !== client.user.id && !isNaN(response.content);
    const collector = message.channel.createMessageCollector({ filter, time: 30000 });

    collector.on('collect', (msg) => {
      const guess = parseInt(msg.content);
      if (guess === wordLength) {
        msg.reply('أحسنت! لقد خمنت عدد الأحرف بشكل صحيح!');
        collector.stop();
      } else {
        msg.reply('حاول مجدداً! عدد الأحرف غير صحيح.');
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        message.channel.send(`لم يتمكن أي شخص من الإجابة في الوقت المحدد! الكلمة كانت: ${randomWord} وعدد الأحرف هو: ${wordLength}`);
      }
    });
  }

  // Type Racer game
  if (message.content === '-كتابة') {
    const sentences = [
      'هذا نص اختبار',
      'البرمجة ممتعة',
      'تعلم البرمجة هو مهارة حياتية',
      'الدردشة مع الروبوت ممتعة جداً!',
      'أنا أحب البرمجة والألعاب!'
    ];

    const randomSentence = sentences[Math.floor(Math.random() * sentences.length)];

    await message.channel.send(`أكتب هذه الجملة بأسرع ما يمكن: \n\n${randomSentence}`);

    const filter = response => response.author.id !== client.user.id;
    const collector = message.channel.createMessageCollector({ filter, time: 30000 });

    collector.on('collect', async (msg) => {
      if (msg.content === randomSentence) {
        await msg.reply('تهانينا! لقد كتبت الجملة بشكل صحيح.');
        collector.stop();
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        message.channel.send('لم يقم أحد بكتابة الجملة بشكل صحيح في الوقت المحدد!');
      }
    });
  }

  // Truth or Dare game
  if (message.content === '-صراحة') {
    const options = ['صراحة', 'تحدي'];
    const choice = options[Math.floor(Math.random() * options.length)];

    if (choice === 'صراحة') {
      const questions = [
        'ما هو أكبر سر لديك؟',
        'هل تحب شخصاً سراً؟',
        'ما هو أكثر شيء تخاف منه؟',
        'هل سبق لك أن كذبت على صديقك المقرب؟',
        'من هو الشخص الذي تعجب به بشكل سرّي؟',
        'هل سبق لك أن فعلت شيئاً غير قانوني؟'
      ];

      const question = questions[Math.floor(Math.random() * questions.length)];
      await message.channel.send(`اختياري كان صراحة: \n\n${question}`);
    } else {
      const dares = [
        'أرسل رسالة عشوائية لجميع أعضاء الخادم.',
        'اطلب من شخص آخر تحديد شيء غريب لتفعله.',
        'اتصل بشخص وأخبره أنك اشتريت طعاماً غريباً!',
        'قم بكتابة جملة غريبة في المحادثة.',
        'اطلب من شخص آخر أن يقوم بمشاركة صورة غريبة.'
      ];

      const dare = dares[Math.floor(Math.random() * dares.length)];
      await message.channel.send(`اختياري كان تحدي: \n\n${dare}`);
    }
  }

  // Who Wrote This Message game
  if (message.content === '-من_كتب') {
    const members = message.guild.members.cache.filter(member => !member.user.bot).map(member => member.user.id);
    const randomMemberId = members[Math.floor(Math.random() * members.length)];
    const randomMember = await client.users.fetch(randomMemberId);

    const messageToSend = await message.channel.send(`${randomMember.tag} كتب هذه الرسالة؟`);

    const filter = response => response.author.id !== client.user.id;
    const collector = message.channel.createMessageCollector({ filter, time: 300

                                                              

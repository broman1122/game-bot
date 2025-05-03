const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const { token } = require('./config');  // Här ska du ha din token i config.js
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
        { name: '🕵️ من كتب هذه الرسالة؟', value: '`-من_كتب`' }
      )
      .setColor(0x00FFFF)
      .setFooter({ text: 'استمتع باللعب!' });

    await message.channel.send({ embeds: [helpEmbed] });
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
});

async function startGame(channel) {
  if (players.length > 0) {
    askQuestion(channel);
  }
}

async function askQuestion(channel) {
  if (players.length === 1) {
    const winner = players[0];
    const winnerUser = await client.users.fetch(winner);
    const winnerEmbed = new EmbedBuilder()
      .setTitle('🎉 لدينا فائز! 🎉')
      .setDescription(`<@${winner}> هو اللاعب الأخير الفائز باللعبة!`)
      .setColor(0xFFD700);
    await channel.send({ embeds: [winnerEmbed] });
    gameActive = false;
    return;
  }

  currentPlayerIndex = Math.floor(Math.random() * players.length);
  const player = players[currentPlayerIndex];
  const question = quiz[Math.floor(Math.random() * quiz.length)];
  const user = await client.users.fetch(player);
  await channel.send({ content: `<@${player}>\nاكمل الجملة الاتية: ${question.partial}` });

  const filter = response => response.author.id === player && response.content.toLowerCase() === question.complete.toLowerCase();
  const collector = channel.createMessageCollector({ filter, time: 15000 });

  collector.on('collect', async response => {
    await response.reply('صحيح! الانتقال إلى اللاعب التالي.');
    currentPlayerIndex = Math.floor(Math.random() * players.length);
    collector.stop();
    askQuestion(channel);
  });

  collector.on('end', async collected => {
    if (!collected.size) {
      playerHearts[player]--;
      if (playerHearts[player] <= 0) {
        await channel.send(`<@${player}> فقد كل القلوب وتم طرده من اللعبة.`);
        players = players.filter(id => id !== player);
        delete playerHearts[player];
      } else {
        await channel.send(`<@${player}> لم يجب بشكل صحيح أو في الوقت المحدد وخسر قلب.`);
      }
      currentPlayerIndex = Math.floor(Math.random() * players.length);
      askQuestion(channel);
    }
  });
}

// Help command
client.login(token).catch(err => {
  console.error('Error logging in:', err);
});

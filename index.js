const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  EmbedBuilder
} = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const token = process.env.TOKEN || ''; // för Render
const quiz = JSON.parse(fs.readFileSync('quiz.json', 'utf8'));
let points = fs.existsSync('points.json') ? JSON.parse(fs.readFileSync('points.json', 'utf8')) : {};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

let gameActive = false;
let players = [];
let playerHearts = {};
let currentPlayerIndex = 0;
const maxPlayers = 15;
const minPlayers = 3;

client.once('ready', () => {
  console.log(`✅ Inloggad som ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // 🆘 Hjälpkommando
  if (message.content === '-مساعدة') {
    return message.channel.send(`
📜 **الأوامر المتاحة:**
\`-بومب\` ➤ لبدء لعبة القنبلة
\`-ايقاف\` ➤ لإيقاف اللعبة الحالية
\`-النقاط\` ➤ لعرض نقاطك
\`-مافيا\` ➤ (قريبًا)
    `);
  }

  // 📊 Poängvisning
  if (message.content === '-النقاط') {
    const userPoints = points[message.author.id] || 0;
    return message.channel.send(`🎯 نقاطك: ${userPoints}`);
  }

  // 🚫 Stoppa spelet
  if (message.content === '-ايقاف' && gameActive) {
    gameActive = false;
    players = [];
    playerHearts = {};
    currentPlayerIndex = 0;
    return message.channel.send('❌ تم إيقاف اللعبة.');
  }

  // 💣 Starta bombspelet
  if (message.content === '-بومب' && !gameActive) {
    gameActive = true;
    players = [];
    playerHearts = {};

    const joinButton = new ButtonBuilder()
      .setCustomId('join_bomb_game')
      .setLabel('انضم للعبة')
      .setStyle(ButtonStyle.Success);
    const leaveButton = new ButtonBuilder()
      .setCustomId('leave_bomb_game')
      .setLabel('غادر اللعبة')
      .setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(joinButton, leaveButton);

    const embed = new EmbedBuilder()
      .setTitle('🎮 بدء اللعبة!')
      .setDescription('انقر على الأزرار للانضمام أو مغادرة اللعبة.')
      .setColor(0x00FF00)
      .addFields({ name: 'اللاعبين', value: 'لا يوجد لاعبون بعد', inline: true })
      .setFooter({ text: '⏳ الرجاء الانضمام خلال 30 ثانية' });

    const gameMessage = await message.channel.send({ embeds: [embed], components: [row] });

    const filter = i => ['join_bomb_game', 'leave_bomb_game'].includes(i.customId);
    const collector = gameMessage.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async interaction => {
      if (!gameActive) return await interaction.reply({ content: '❗ اللعبة انتهت.', ephemeral: true });

      if (interaction.customId === 'join_bomb_game') {
        if (!players.includes(interaction.user.id) && players.length < maxPlayers) {
          players.push(interaction.user.id);
          playerHearts[interaction.user.id] = 2;
        }
      } else {
        players = players.filter(id => id !== interaction.user.id);
        delete playerHearts[interaction.user.id];
      }

      const playerMentions = players.map(id => `<@${id}>`).join(', ') || 'لا يوجد لاعبون بعد';
      embed.spliceFields(0, 1, {
        name: 'اللاعبين',
        value: `${playerMentions}\nعدد اللاعبين: ${players.length}/${maxPlayers}`,
        inline: true
      });

      await gameMessage.edit({ embeds: [embed] });
      await interaction.reply({ content: '✅ تم التحديث.', ephemeral: true });
    });

    collector.on('end', async () => {
      if (players.length >= minPlayers) {
        await message.channel.send({
          embeds: [new EmbedBuilder()
            .setTitle('🚀 اللعبة ستبدأ قريباً!')
            .setDescription('🕐 ستبدأ اللعبة خلال 10 ثواني...')
            .setColor(0xFF0000)]
        });
        setTimeout(() => startGame(message.channel), 10000);
      } else {
        gameActive = false;
        await message.channel.send('❌ تم إلغاء اللعبة، عدد اللاعبين غير كافي.');
      }
    });
  }
});

async function startGame(channel) {
  if (players.length > 0) await askQuestion(channel);
}

async function askQuestion(channel) {
  if (players.length === 1) {
    const winner = players[0];
    const winnerUser = await client.users.fetch(winner);

    // 📈 Lägg till poäng
    points[winner] = (points[winner] || 0) + 1;
    fs.writeFileSync('points.json', JSON.stringify(points, null, 2));

    const winnerEmbed = new EmbedBuilder()
      .setTitle('🎉 لدينا فائز! 🎉')
      .setDescription(`<@${winner}> هو الفائز!\nالقلوب المتبقية: ${playerHearts[winner]}\nالنقاط الكلية: ${points[winner]}`)
      .setColor(0xFFD700)
      .setThumbnail(winnerUser.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'jaBER sTUDIE', iconURL: channel.guild.iconURL({ dynamic: true }) });

    await channel.send({ embeds: [winnerEmbed] });
    gameActive = false;
    return;
  }

  currentPlayerIndex = Math.floor(Math.random() * players.length);
  const player = players[currentPlayerIndex];
  const question = quiz[Math.floor(Math.random() * quiz.length)];
  const user = await client.users.fetch(player);
  const imageBuffer = await generateImage(question.partial, user.username);
  const attachment = new AttachmentBuilder(imageBuffer, { name: 'question.png' });

  await channel.send({ content: `<@${player}> اكمل الجملة:\n❤️ القلوب: ${playerHearts[player]}`, files: [attachment] });

  const filter = m => m.author.id === player && m.content.toLowerCase() === question.complete.toLowerCase();
  const collector = channel.createMessageCollector({ filter, time: 15000 });

  collector.on('collect', async response => {
    await response.reply('✅ صحيح! التالي...');
    collector.stop();
    await askQuestion(channel);
  });

  collector.on('end', async collected => {
    if (!collected.size) {
      playerHearts[player]--;
      if (playerHearts[player] <= 0) {
        await channel.send(`<@${player}> خسر كل القلوب وتم طرده.`);
        players = players.filter(id => id !== player);
        delete playerHearts[player];
      } else {
        await channel.send(`<@${player}> لم يجب وخسر قلب. القلوب المتبقية: ${playerHearts[player]}`);
      }
      await askQuestion(channel);
    }
  });
}

async function generateImage(partialText, playerName) {
  const canvas = createCanvas(1024, 512);
  const ctx = canvas.getContext('2d');
  const background = await loadImage('./image.png');
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 48px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(partialText, 330, 320);
  ctx.font = 'bold 36px Arial';
  ctx.fillText(playerName, 850, 460);
  return canvas.toBuffer();
}

client.login(token).catch(err => {
  console.error('Login error:', err);
  process.exit(1);
});

// Anti-crash
process.on('unhandledRejection', (reason, p) => console.log('Unhandled Rejection:', reason));
process.on('uncaughtException', (err, origin) => console.log('Uncaught Exception:', err))

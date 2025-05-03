const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const { token, roleId } = require('./config');
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
const maxPlayers = 15; // max players can join game
const minPlayers = 3; // mini players can join game

client.once('ready', () => {
  console.log(`
╚══════╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═╝ ╚═════╝ 
        `);
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(`Code by Wick Studio`);
  console.log(`discord.gg/wicks`);
});

client.on('messageCreate', async message => {
  if ((message.content === '-بومب' || message.content === '-ايقاف') && !message.member.roles.cache.has(roleId)) {
    return message.reply('ليس لديك الإذن لاستخدام هذا الأمر.');
  }

  if (message.content === '-بومب' && !gameActive) {
    try {
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
      const collector = gameMessage.createMessageComponentCollector({ filter, time: 30000 }); // time seconds before start the game

      collector.on('collect', async interaction => {
        try {
          if (!gameActive) {
            await interaction.reply({ content: 'اللعبة قد انتهت بالفعل أو لم تبدأ بعد.', ephemeral: true });
            return;
          }
          if (interaction.customId === 'join_bomb_game') {
            if (players.length >= maxPlayers) {
              await interaction.reply({ content: `عذرًا، لا يمكن الانضمام للعبة. الحد الأقصى لعدد اللاعبين هو ${maxPlayers}.`, ephemeral: true });
              return;
            }
            if (!players.includes(interaction.user.id)) {
              players.push(interaction.user.id);
              playerHearts[interaction.user.id] = 2;
              const playerMentions = players.map(id => `<@${id}>`).join(', ');
              embed.spliceFields(0, 1, { name: 'اللاعبين', value: `${playerMentions || 'لا يوجد لاعبون بعد'}\n\nعدد اللاعبين: ${players.length}/${maxPlayers}`, inline: true });
              await gameMessage.edit({ embeds: [embed] });
              await interaction.reply({ content: `${interaction.user.tag} انضم إلى اللعبة!`, ephemeral: true });
            } else {
              await interaction.reply({ content: `أنت بالفعل في اللعبة!`, ephemeral: true });
            }
          } else if (interaction.customId === 'leave_bomb_game') {
            if (!players.includes(interaction.user.id)) {
              await interaction.reply({ content: 'أنت لست في اللعبة!', ephemeral: true });
              return;
            }
            players = players.filter(id => id !== interaction.user.id);
            delete playerHearts[interaction.user.id];
            const playerMentions = players.map(id => `<@${id}>`).join(', ');
            embed.spliceFields(0, 1, { name: 'اللاعبين', value: `${playerMentions || 'لا يوجد لاعبون بعد'}\n\nعدد اللاعبين: ${players.length}/${maxPlayers}`, inline: true });
            await gameMessage.edit({ embeds: [embed] });
            await interaction.reply({ content: `${interaction.user.tag} غادر اللعبة!`, ephemeral: true });
          }
        } catch (err) {
          console.error('Error handling join/leave interaction:', err);
          interaction.reply({ content: 'حدث خطأ أثناء معالجة الإجراء الخاص بك.', ephemeral: true });
        }
      });

      collector.on('end', async () => {
        try {
          if (players.length >= minPlayers) {
            const startEmbed = new EmbedBuilder()
              .setTitle('اللعبة ستبدأ قريباً!')
              .setDescription('ستبدأ اللعبة في 10 ثواني...')
              .setColor(0xFF0000);

            await message.channel.send({ embeds: [startEmbed] });

            setTimeout(() => {
              try {
                startGame(message.channel);
              } catch (err) {
                console.error('Error starting game:', err);
                message.channel.send('حدث خطأ أثناء بدء اللعبة.');
              }
            }, 10000);
          } else {
            gameActive = false;
            await message.channel.send(`لم ينضم عدد كافٍ من اللاعبين إلى اللعبة. تم إلغاء اللعبة. يجب أن ينضم على الأقل ${minPlayers} لاعبين.`);
          }
        } catch (err) {
          console.error('Error ending join/leave collector:', err);
          message.channel.send('حدث خطأ.');
        }
      });
    } catch (err) {
      console.error('Error starting game:', err);
      message.channel.send('حدث خطأ أثناء بدء اللعبة.');
    }
  }

  if (message.content === '-ايقاف' && gameActive) {
    try {
      gameActive = false;
      players = [];
      playerHearts = {};
      currentPlayerIndex = 0;
      await message.channel.send('تم إيقاف اللعبة.');
    } catch (err) {
      console.error('Error stopping game:', err);
      message.channel.send('حدث خطأ أثناء إيقاف اللعبة.');
    }
  }
});

async function startGame(channel) {
  try {
    if (players.length > 0) {
      askQuestion(channel);
    }
  } catch (err) {
    console.error('Error starting game:', err);
    channel.send('حدث خطأ أثناء بدء اللعبة.');
  }
}

async function askQuestion(channel) {
  try {
    if (players.length === 1) {
      const winner = players[0];
      const winnerUser = await client.users.fetch(winner);
      const winnerEmbed = new EmbedBuilder()
        .setTitle('🎉 لدينا فائز! 🎉')
        .setDescription(`<@${winner}> هو اللاعب الأخير الفائز باللعبة!\n\nعدد القلوب المتبقية: ${playerHearts[winner]}`)
        .setColor(0xFFD700)
        .setThumbnail(winnerUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Bomb Game', iconURL: channel.guild.iconURL({ dynamic: true }) });

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

    await channel.send({ content: `<@${player}>\nاكمل الجملة الاتية\nعدد القلوب المتبقية: ${playerHearts[player]}`, files: [attachment] });

    const filter = response => response.author.id === player && response.content.toLowerCase() === question.complete.toLowerCase();
    const collector = channel.createMessageCollector({ filter, time: 15000 });

    collector.on('collect', async response => {
      try {
        await response.reply('صحيح! الانتقال إلى اللاعب التالي.');
        currentPlayerIndex = Math.floor(Math.random() * players.length);
        collector.stop();
        askQuestion(channel);
      } catch (err) {
        console.error('Error handling correct answer:', err);
        response.reply('حدث خطأ أثناء معالجة الإجابة الصحيحة.');
      }
    });

    collector.on('end', async collected => {
      try {
        if (!collected.size) {
          playerHearts[player]--;
          if (playerHearts[player] <= 0) {
            await channel.send(`<@${player}> فقد كل القلوب وتم طرده من اللعبة.`);
            players = players.filter(id => id !== player);
            delete playerHearts[player];
          } else {
            await channel.send(`<@${player}> لم يجب بشكل صحيح أو في الوقت المحدد وخسر قلب. القلوب المتبقية: ${playerHearts[player]}`);
          }
          currentPlayerIndex = Math.floor(Math.random() * players.length);
          askQuestion(channel);
        }
      } catch (err) {
        console.error('Error handling incorrect answer or timeout:', err);
        channel.send('حدث خطأ أثناء معالجة الإجابة الخاطئة أو انتهاء الوقت.');
      }
    });
  } catch (err) {
    console.error('Error asking question:', err);
    channel.send('حدث خطأ أثناء طرح السؤال.');
  }
}

async function generateImage(partialText, playerName) {
  try {
    const canvas = createCanvas(1024, 512);
    const ctx = canvas.getContext('2d');
    const background = await loadImage('./image.png');

    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(partialText, 330, 320);

    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(playerName, 850, 460);

    return canvas.toBuffer();
  } catch (err) {
    console.error('Error generating image:', err);
    throw new Error('حدث خطأ أثناء إنشاء الصورة.');
  }
}

client.login(token).catch(err => {
  console.error('Error logging in:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
  console.log(' [antiCrash] :: Unhandled Rejection/Catch');
  console.log(reason, p);
});
process.on("uncaughtException", (err, origin) => {
  console.log(' [antiCrash] :: Uncaught Exception/Catch');
  console.log(err, origin);
});
process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.log(' [antiCrash] :: Uncaught Exception/Catch (MONITOR)');
  console.log(err, origin);
});

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const TRUTH_QUESTIONS = [
  'ما هو أكبر سر لك؟',
  'هل تحب شخصاً؟',
  'ما هو أكثر شيء تخاف منه؟',
  'هل سبق أن كذبت على صديقك المقرب؟',
  'من هو الشخص الذي تعجب به؟',
  'هل سبق أن فعلت شيئاً غير قانوني؟'
];

const DARES = [
  'غيّر اسمك لمدة ساعة',
  'أرسل رسالة غريبة في الشات',
  'قل شيئاً مضحكاً الآن',
  'اطلب من عضو اختيار تحدي لك',
  'قل الحقيقة لآخر من كتب في الشات'
];

client.once('ready', () => {
  console.log(`${client.user.tag} جاهز للعمل!`);
});

client.on('messageCreate', async message => {
  if (message.content === '-صراحة') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('truth')
          .setLabel('🎭 صراحة')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('dare')
          .setLabel('🎭 تحدي')
          .setStyle(ButtonStyle.Danger)
      );

    const embed = new EmbedBuilder()
      .setTitle('🎭 لعبة صراحة أو تحدي')
      .setDescription('اختر أحد الخيارين بالضغط على الزر المناسب:')
      .setColor(0xF39C12);

    const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = sentMessage.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async interaction => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: '❌ هذه اللعبة ليست لك!', ephemeral: true });
      }

      let result;
      if (interaction.customId === 'truth') {
        const question = TRUTH_QUESTIONS[Math.floor(Math.random() * TRUTH_QUESTIONS.length)];
        result = new EmbedBuilder()
          .setTitle('🎭 صراحة')
          .setDescription(question)
          .setColor(0x3498DB);
      } else if (interaction.customId === 'dare') {
        const dare = DARES[Math.floor(Math.random() * DARES.length)];
        result = new EmbedBuilder()
          .setTitle('🎭 تحدي')
          .setDescription(dare)
          .setColor(0xE74C3C);
      }

      await interaction.update({ embeds: [result], components: [] });
      collector.stop();
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        sentMessage.edit({ content: '⌛ انتهى الوقت! لم يتم اختيار أي شيء.', components: [] });
      }
    });
  }
});

client.login(process.env.DISCORD_TOKEN);

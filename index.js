import discord
from discord.ext import commands
import random

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True
intents.guilds = True
intents.members = True

bot = commands.Bot(command_prefix='!', intents=intents)

points = {}

emoji_riddles = [
    {"emoji": "🍎📱", "answer": "ابل"},
    {"emoji": "🎬🍿", "answer": "سينما"},
    {"emoji": "🚗💨", "answer": "سيارة"},
    {"emoji": "🐍💻", "answer": "بايثون"},
    {"emoji": "☕💻", "answer": "قهوة"},
]

flags = [
    {"emoji": "🇸🇦", "answer": "السعودية"},
    {"emoji": "🇪🇬", "answer": "مصر"},
    {"emoji": "🇯🇵", "answer": "اليابان"},
    {"emoji": "🇫🇷", "answer": "فرنسا"},
]

sentences = [
    "انا احب البرمجة",
    "ديسكورد ممتع",
    "مرحبا بكم في السيرفر",
    "اللعب مع الاصدقاء ممتع"
]

@bot.event
async def on_ready():
    print(f"تم تسجيل الدخول باسم {bot.user}")

@bot.command()
async def مساعدة(ctx):
    help_text = """
أوامر البوت:
!نقاطي → اعرف نقاطك
!ترتيب → أفضل اللاعبين
!ايموجي → لعبة تخمين الإيموجي
!روليت → لعبة الروليت (اختيار عشوائي للفائز)
!مافيا → توزيع أدوار المافيا
!علم → احزر اسم الدولة من العلم
!سريع → اكتب الجملة بسرعة
!احسب → عد الأحرف في الجملة
!متجر → فتح المتجر
!شراء → شراء رول خاص
"""
    await ctx.send(help_text)

@bot.command()
async def نقاطي(ctx):
    user = str(ctx.author.id)
    user_points = points.get(user, 0)
    await ctx.send(f"{ctx.author.mention} لديك {user_points} نقطة!")

@bot.command()
async def ترتيب(ctx):
    if not points:
        await ctx.send("لا توجد نقاط حتى الآن!")
        return
    sorted_points = sorted(points.items(), key=lambda x: x[1], reverse=True)
    msg = "🏆 الترتيب:\n"
    for user_id, score in sorted_points[:5]:
        user = await bot.fetch_user(int(user_id))
        msg += f"{user.name}: {score} نقطة\n"
    await ctx.send(msg)

@bot.command()
async def ايموجي(ctx):
    await ctx.send("❓ *لعبة الإيموجي:* خمن الكلمة من الإيموجي المرسوم!")
    riddle = random.choice(emoji_riddles)
    answer = riddle["answer"]
    await ctx.send(f"{riddle['emoji']}")

    def check(m):
        return m.channel == ctx.channel and m.content.lower() == answer

    try:
        msg = await bot.wait_for('message', timeout=15.0, check=check)
        user_id = str(msg.author.id)
        points[user_id] = points.get(user_id, 0) + 1
        await ctx.send(f"{msg.author.mention} صحيح! نقطة!")
    except:
        await ctx.send(f"انتهى الوقت! الجواب: {answer}")

@bot.command()
async def روليت(ctx):
    await ctx.send("🎲 *لعبة الروليت:* سنختار فائز عشوائيًا الآن!")
    players = [member for member in ctx.guild.members if not member.bot]
    winner = random.choice(players)
    user_id = str(winner.id)
    points[user_id] = points.get(user_id, 0) + 1
    await ctx.send(f"الروليت اختارت: {winner.mention}! نقطة!")

@bot.command()
async def مافيا(ctx):
    await ctx.send("🎭 *لعبة المافيا:* سيتم توزيع أدوار على اللاعبين في الخاص، لا تفصح عن دورك!")
    roles = ["مافيا", "شرطي", "مدني", "مدني"]
    players = [member for member in ctx.guild.members if not member.bot]
    selected = random.sample(players, min(len(players), len(roles)))
    assigned = zip(selected, roles)
    for member, role in assigned:
        try:
            await member.send(f"دورك في المافيا: {role}")
        except:
            await ctx.send(f"لا يمكن إرسال خاص لـ {member.mention}")
    await ctx.send("تم توزيع الأدوار!")

@bot.command()
async def علم(ctx):
    await ctx.send("🌍 *لعبة احزر العلم:* اكتب اسم الدولة لهذا العلم!")
    flag = random.choice(flags)
    answer = flag["answer"]
    await ctx.send(flag["emoji"])

    def check(m):
        return m.channel == ctx.channel and m.content.lower() == answer

    try:
        msg = await bot.wait_for('message', timeout=15.0, check=check)
        user_id = str(msg.author.id)
        points[user_id] = points.get(user_id, 0) + 1
        await ctx.send(f"{msg.author.mention} صحيح! نقطة!")
    except:
        await ctx.send(f"انتهى الوقت! الجواب: {answer}")

@bot.command()
async def سريع(ctx):
    await ctx.send("⚡ *لعبة السرعة:* كن أول من يكتب الجملة التالية!")
    sentence = random.choice(sentences)
    await ctx.send(f"{sentence}")

    def check(m):
        return m.channel == ctx.channel and m.content == sentence

    try:
        msg = await bot.wait_for('message', timeout=15.0, check=check)
        user_id = str(msg.author.id)
        points[user_id] = points.get(user_id, 0) + 1
        await ctx.send(f"{msg.author.mention} أسرع شخص! نقطة!")
    except:
        await ctx.send("انتهى الوقت! ولا أحد كتبها.")

@bot.command()
async def احسب(ctx, *, message):
    await ctx.send("🔢 *احسب الأحرف:* سأخبرك بعدد الأحرف (بدون مسافات) في جملتك.")
    count = len(message.replace(" ", ""))
    await ctx.send(f"عدد الأحرف: {count}")

@bot.command()
async def متجر(ctx):
    await ctx.send("""
🛍️ *المتجر:*
- شراء رول خاص: 90 نقطة
اكتب الأمر !شراء لشراء الرول إذا عندك نقاط كافية!
""")

@bot.command()
async def شراء(ctx):
    user_id = str(ctx.author.id)
    user_points = points.get(user_id, 0)
    role_name = "VIP"

    if user_points < 90:
        await ctx.send(f"{ctx.author.mention} تحتاج 90 نقطة! نقاطك الحالية: {user_points}")
        return

    role = discord.utils.get(ctx.guild.roles, name=role_name)
    if not role:
        role = await ctx.guild.create_role(name=role_name)
    
    await ctx.author.add_roles(role)
    points[user_id] -= 90
    await ctx.send(f"{ctx.author.mention} مبروك! حصلت على رول *{role_name}* وتم خصم 90 نقطة!")

bot.run('YOUR_BOT_TOKEN')

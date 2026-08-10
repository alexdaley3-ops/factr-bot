/**
 * index.js
 * Factr — drop-in group-chat fact-checking bot.
 *
 * Trigger it in any channel it's in with:
 *   !factr <claim>
 *   @Factr is it true that <claim>?
 *
 * It replies with a shareable verdict card: a verdict emoji, the rating,
 * who reviewed it, and a source link — the "screenshot moment" that drives
 * organic spread when it settles an argument.
 */

require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { checkClaim, extractClaim } = require("./factcheck");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const VERDICT_COLOR = {
  TRUE: 0x2ecc71,
  FALSE: 0xe74c3c,
  MIXED: 0xf1c40f,
  UNVERIFIED: 0x95a5a6,
  "SEE SOURCES": 0x3498db,
};

client.once("ready", () => {
  console.log(`Factr is online as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const mentionsBot = message.mentions.has(client.user);
  const isCommand = /^!factr\b/i.test(message.content);
  if (!mentionsBot && !isCommand) return;

  const claim = extractClaim(message.content, client.user.id);
  if (!claim) {
    await message.reply("Give me a claim to check — e.g. `!factr the Great Wall of China is visible from space`.");
    return;
  }

  const thinking = await message.reply("🔍 Checking that one…");

  try {
    const result = await checkClaim(claim, {
      googleApiKey: process.env.GOOGLE_FACTCHECK_API_KEY,
      tavilyApiKey: process.env.TAVILY_API_KEY,
    });

    if (!result) {
      await thinking.edit(
        `❓ **No fact-check on file for:** "${claim}"\nNo fact-checking organization has reviewed this specific claim yet. Treat it as unverified.`
      );
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(VERDICT_COLOR[result.verdict.label] ?? 0x95a5a6)
      .setTitle(`${result.verdict.emoji} FACTR VERDICT: ${result.verdict.label}`)
      .setDescription(`**Claim:** ${claim}`)
      .addFields(
        result.rating ? [{ name: "Rating", value: result.rating, inline: true }] : [],
        result.publisher ? [{ name: "Reviewed by", value: result.publisher, inline: true }] : []
      )
      .setFooter({ text: "factr · settling arguments with sources since today" });

    if (result.snippet) embed.addFields({ name: "Summary", value: result.snippet });
    if (result.url) embed.setURL(result.url);

    await thinking.edit({ content: null, embeds: [embed] });
  } catch (err) {
    console.error(err);
    await thinking.edit("⚠️ Something broke while checking that — try again in a moment.");
  }
});

client.login(process.env.DISCORD_TOKEN);

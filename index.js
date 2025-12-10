require("dotenv").config();
const fs = require("fs");
const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    REST,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder
} = require("discord.js");
const http = require("http");
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running");
}).listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ——— РЕГИСТРАЦИЯ СЛЭШ КОМАНДЫ ——— //
const commands = [
    new SlashCommandBuilder()
        .setName("changelog")
        .setDescription("Создать патчноут для приложения")
        .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log("Slash-команда зарегистрирована.");
    } catch (err) {
        console.error(err);
    }
})();

// ——— БОТ ЗАПУЩЕН ——— //
client.once("ready", () => {
    console.log(`${client.user.tag} работает!`);
});

// ——— ОБРАБОТКА СЛЭШ КОМАНДЫ ——— //
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "changelog") {
        const modal = new ModalBuilder()
            .setCustomId("logModal")
            .setTitle("Создать Changelog");

        const addedInput = new TextInputBuilder()
            .setCustomId("added")
            .setLabel("Добавлено:")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const fixedInput = new TextInputBuilder()
            .setCustomId("fixed")
            .setLabel("Исправлено:")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const changedInput = new TextInputBuilder()
            .setCustomId("changed")
            .setLabel("Изменено:")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(addedInput),
            new ActionRowBuilder().addComponents(fixedInput),
            new ActionRowBuilder().addComponents(changedInput)
        );

        await interaction.showModal(modal);
    }
});

// ——— ОБРАБОТКА МОДАЛКИ ——— //
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== "logModal") return;

    // загрузка текущего патча
    const patchData = JSON.parse(fs.readFileSync("patch.json", "utf8"));
    const currentPatch = patchData.patch;

    const added = interaction.fields.getTextInputValue("added");
    const fixed = interaction.fields.getTextInputValue("fixed");
    const changed = interaction.fields.getTextInputValue("changed");

    // следующий патч
    function nextVersion(v) {
        const parts = v.split(".").map(n => parseInt(n));
        parts[2]++; // увеличиваем последний разряд
        return parts.join(".");
    }

    const newPatch = nextVersion(currentPatch);
    patchData.patch = newPatch;
    fs.writeFileSync("patch.json", JSON.stringify(patchData, null, 4));

    const embed = new EmbedBuilder()
        .setTitle(`Патч ${newPatch}`)
        .setColor(0x5865F2)
        .setTimestamp();

    let desc = "";

    if (added) desc += `**Добавлено:**\n∙ ${added.split("\n").join("\n∙ ")}\n\n`;
    if (fixed) desc += `**Исправлено:**\n∙ ${fixed.split("\n").join("\n∙ ")}\n\n`;
    if (changed) desc += `**Изменено:**\n∙ ${changed.split("\n").join("\n∙ ")}\n\n`;

    embed.setDescription(desc.trim());

    const channel = await client.channels.fetch(process.env.CHANNEL_ID);
    await channel.send({ content: "@everyone", embeds: [embed] });

    await interaction.reply({ content: "Changelog опубликован!", ephemeral: true });
});

client.login(process.env.TOKEN);


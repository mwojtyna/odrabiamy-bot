import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import config from "../config/config.json";
import { scrape } from "../main";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("zad")
		.setDescription("Odpowiada na kanale 'odpowiedzi' z screenem zadania.")
		.addStringOption(option =>
			option.setName("rodzaj_książki")
				.setDescription("Wybierz rodzaj książki")
				.setRequired(true)
				.addChoice("podręcznik", "pdr")
				.addChoice("ćwiczenia/zbiór zadań", "cw"))
		.addIntegerOption(option =>
			option.setName("strona")
				.setDescription("Wpisz numer strony")
				.setRequired(true))
		.addStringOption(option =>
			option.setName("zadanie")
				.setDescription("Wpisz numer zadania")
				.setRequired(true)),

	async execute(interaction: CommandInteraction<CacheType>) {
		// Read values from command
		const subject = config[interaction.channelId.toString()];
		const bookType = interaction.options.getString("rodzaj_książki");
		const page = interaction.options.getInteger("strona")!;
		const exercise = interaction.options.getString("zadanie")!;

		if (!subject.hasOwnProperty(bookType))
			throw new Error("Nie ma takiej książki!");
		
		// Animate response message
		let finished = false;
		await interaction.reply("Ściąganie odpowiedzi");
		for (let i = 0; i < 6; i++) {
			interaction.editReply("Ściąganie odpowiedzi" + ".".repeat(i % 3 + 1));
		};

		// Scrape and display
		const [screenShots, error] = await scrape(subject[bookType], page, exercise);
		finished = true;

		if(error !== "") {
			await interaction.channel?.send(error);
			return;
		}

		await interaction.channel?.send({ files: screenShots });
		if (screenShots.length > 1)
			await interaction.channel?.send("Wyświetlono wiele odpowiedzi, ponieważ na podanej stronie występuje więcej niż jedno zadanie z podanym numerem.");
	}
}
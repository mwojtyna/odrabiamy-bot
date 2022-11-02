import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import fs from "fs-extra";
import path from "path";

import { Command } from "../main";
import { scrape } from "../scrape";
import config from "../config/config.json";

interface BookJSON {
	url: string;
	trailingDot?: boolean;
}
let isBeingUsed = false;

export = {
	data: new SlashCommandBuilder()
		.setName("zad")
		.setDescription("Odpowiada ze screenem zadania")
		.addIntegerOption(option =>
			option
				.setName("strona")
				.setDescription("Wpisz numer strony")
				.setRequired(true)
				.setMinValue(1)
		)
		.addStringOption(option =>
			option.setName("zadanie").setDescription("Wpisz numer zadania").setRequired(true)
		),

	async execute(interaction: CommandInteraction<CacheType>) {
		if (isBeingUsed) {
			await interaction.reply("Bot jest już używany przez inną osobę!");
			return;
		}

		isBeingUsed = true;

		// Read values from command
		const book = config[interaction.channelId as keyof typeof config] as BookJSON;
		const page = interaction.options.get("strona")!.value as number;
		const exercise = interaction.options.get("zadanie")!.value as string;

		// Check user input
		if (!book) {
			await interaction.reply("Komenda nie jest dostępna w tym kanale!");
			isBeingUsed = false;
			return;
		}
		if (/[~!@$%^&*()+=,/';:"?><[\]\\{}|`#]/gm.test(exercise)) {
			await interaction.reply("Błędny numer zadania!");
			isBeingUsed = false;
			return;
		}

		// Respond and animate message
		await interaction.reply("Ściąganie odpowiedzi");
		for (let i = 0; i < 30; i++) {
			interaction.editReply("Ściąganie odpowiedzi" + ".".repeat((i % 3) + 1));
		}

		// Scrape and display
		const { screenshots, error } = await scrape(
			book.url,
			page,
			exercise,
			!!book.trailingDot,
			interaction
		);

		if (error) {
			await interaction.channel?.send(`\`\`\`diff\n-${error!.message}\`\`\``);
			isBeingUsed = false;
		} else {
			await interaction.channel?.send({ files: screenshots });
			if (screenshots!.length > 1)
				await interaction.channel?.send(
					"Wyświetlono wiele odpowiedzi, ponieważ na podanej stronie występuje więcej niż jedno zadanie z podanym numerem."
				);

			fs.emptyDirSync(path.join(process.cwd(), "screenshots"));
			isBeingUsed = false;
		}
	}
} as Command;

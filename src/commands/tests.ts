import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import { Command } from "../main";
import tests from "../tests";

export = {
	data: new SlashCommandBuilder().setName("tests").setDescription("Wyświetla listę testów"),
	channels: ["1037012798850486366"],
	devOnly: true,

	async execute(interaction: CommandInteraction<CacheType>) {
		let out = "```\n";
		tests.forEach((test, i) => {
			out += `${test.name} [${i}]\n`;
		});
		out += "```";

		await interaction.reply(out);
	}
} as Command;

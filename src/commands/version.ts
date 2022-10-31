import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import { Command } from "../main";

export = {
	data: new SlashCommandBuilder()
		.setName("version")
		.setDescription("Wypisuje obecną wersję bota"),

	async execute(interaction: CommandInteraction<CacheType>) {
		await interaction.reply(process.env.npm_package_version!);
	}
} as Command;

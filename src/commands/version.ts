import { SlashCommandBuilder } from "@discordjs/builders";
import type { CacheType, CommandInteraction } from "discord.js";
import type { Command } from "../main";

export const command = {
	data: new SlashCommandBuilder()
		.setName("version")
		.setDescription("Wypisuje obecną wersję bota"),

	async execute(interaction: CommandInteraction<CacheType>) {
		await interaction.reply(process.env.npm_package_version!);
	},
} as Command;

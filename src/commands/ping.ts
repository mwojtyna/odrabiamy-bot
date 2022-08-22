import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import { Command } from "../main";

export = {
	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Odpowiada 'pong'"),

	async execute(interaction: CommandInteraction<CacheType>) {
		await interaction.reply("pong");
	},
} as Command;
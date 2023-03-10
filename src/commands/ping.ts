import { SlashCommandBuilder } from "@discordjs/builders";
import type { CacheType, CommandInteraction } from "discord.js";
import type { Command } from "../main";

export const command = {
	data: new SlashCommandBuilder().setName("ping").setDescription("Odpowiada 'pong'"),

	async execute(interaction: CommandInteraction<CacheType>) {
		await interaction.reply("pong");
	},
} as Command;

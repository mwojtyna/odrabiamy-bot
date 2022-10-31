import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, Client, Collection, CommandInteraction } from "discord.js";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";
import clc from "cli-color";
import express from "express";

export type Command = {
	data: SlashCommandBuilder;
	execute: (interaction: CommandInteraction<CacheType>) => Promise<void>;
};

(async () => {
	dotenv.config({ path: process.env.NODE_ENV === "production" ? ".env" : ".env.dev" });

	// Setup bot
	const client = new Client({ intents: "Guilds" });
	client.once("ready", () => {
		// Setup healthcheck endpoint
		const app = express();
		app.listen(3000, () => console.log(clc.green(`ready (${process.env.NODE_ENV})`)));

		app.get("/", (_, res) => {
			res.sendStatus(200);
		});
	});

	// Retrieve commands
	const commands = new Collection<string, Command>();
	const files = fs
		.readdirSync(path.resolve(__dirname, "./commands"))
		.filter(file => file.endsWith(".ts"));

	for (const file of files) {
		const command = (await import(`./commands/${file}`)) as Command;
		commands.set(command.data.name, command);
	}

	// Execute commands
	client.on("interactionCreate", async interaction => {
		if (interaction.guildId !== process.env.GUILD_ID || !interaction.isCommand()) {
			return;
		}

		const command = commands.get(interaction.commandName);
		if (!command) {
			return;
		}

		try {
			await command.execute(interaction);
		} catch (err: any) {
			let aux = err.stack.split("\n");
			aux.splice(0, 2); //removing the line that we force to generate the error (var err = new Error();) from the message
			aux = aux.join("\n");

			await interaction.channel?.send({
				content: "Błąd (main.ts):\n\n" + err.message + "\n\n" + aux
			});
		}
	});

	await client.login(process.env.TOKEN);
})();

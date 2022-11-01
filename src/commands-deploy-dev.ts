import { REST } from "@discordjs/rest";
import { RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from "discord-api-types/v10";
import fs from "fs-extra";
import path from "path";
import clc from "cli-color";
import dotenv from "dotenv";

import { Command } from "./main";

//** Run 'npx ts-node src/commands-deploy.ts' to register commands */

(async () => {
	dotenv.config({ path: path.join(process.cwd(), ".env-dev") });

	const files = fs
		.readdirSync(path.join(__dirname, "commands"))
		.filter(file => file.endsWith(".ts"));

	const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
	for (const file of files) {
		const command = (await import(`./commands/${file}`)) as Command;
		commands.push(command.data.toJSON());
	}

	console.log(commands);
	console.log("\nCommands found: " + commands.map(command => command.name).join(", "));

	const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
	try {
		await rest.put(Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID), {
			body: commands
		});
		console.log(clc.green("Registered commands (dev guild)."));
	} catch (error) {
		console.error(clc.red(`Error registering commands (dev guild):\n${error}`));
	}
})();
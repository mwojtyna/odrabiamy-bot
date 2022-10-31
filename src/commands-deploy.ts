import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";
import clc from "cli-color";

import { Command } from "./main";

//** Run 'npx ts-node src/commands-deploy.ts' to register commands */

(async () => {
	dotenv.config({ path: process.env.NODE_ENV === "production" ? ".env" : ".env.dev" });

	const commands = [];
	const files = fs
		.readdirSync(path.resolve(`${__dirname}/commands`, "."))
		.filter(file => file.endsWith(".ts"));
	console.log("Commands found: " + files);

	for (const file of files) {
		const command = (await import(`./commands/${file}`)) as Command;
		commands.push(command.data.toJSON());
	}
	console.log(commands);

	const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
	rest.put(Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID), {
		body: commands
	})
		.then(() => console.log(clc.green("Registered commands.")))
		.catch(err => console.error(clc.red(`Error registering commands:\n${err}`)));
})();

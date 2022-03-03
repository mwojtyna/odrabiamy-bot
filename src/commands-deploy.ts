import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { token, appID, guildID } from "./config/auth.json";
import * as fs from "fs";
import path from "path";
import { Command } from "./main";

//** Run 'npx ts-node src/commands-deploy.ts' to register commands. Bot must be running first */

(async () => {
	const commands: any = [];
	const files = fs.readdirSync(path.resolve(`${__dirname}/commands`, ".")).filter(file => file.endsWith(".ts"));
	console.log("Commands found: " + files);

	for (const file of files) {
		const command = await import(`./commands/${file}`) as Command;
		commands.push(command.data.toJSON());
	}
	console.log(commands);

	const rest = new REST({ version: "10" }).setToken(token);
	rest.put(Routes.applicationGuildCommands(appID, guildID), { body: commands })
		.then(() => console.log("Registered commands."))
		.catch((err) => console.error(`Error registering commands.\n\n${err}`));
})();

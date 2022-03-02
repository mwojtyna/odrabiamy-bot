import * as fs from "fs";
import path from "path"

import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, Client, Collection, CommandInteraction, Intents } from "discord.js";
import { token } from "./config/discord.json";

import pup from "puppeteer";
import config from "./config/config.json";

//-----------------------------------------------
type MockCommand = {
	channelName: keyof typeof config;
	type: keyof typeof config.Matematyka.pdr | typeof config.Matematyka.cw;
	page: number,
	exercise: string
}
const cmd: MockCommand = {
	channelName: "Matematyka",
	type: "pdr",
	page: 53,
	exercise: "2"
};
// ---------------------------------------------

// ---------- DISCORD ---------
export type Command = {
	data: SlashCommandBuilder,
	execute: (interaction: CommandInteraction<CacheType>) => Promise<void>
}

(async () => {
	// Setup bot
	const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
	client.once("ready", () => console.log("ready"));

	// Retrieve commands
	const commands = new Collection<string, Command>();
	const files = fs.readdirSync(path.resolve(__dirname, "./commands")).filter(file => file.endsWith(".ts"));
	for (const file of files) {
		const command = await import(`./commands/${file}`) as Command;
		commands.set(command.data.name, command);
	}
	
	// Execute commands
	client.on("interactionCreate", async interaction => {
		if (!interaction.isCommand())
			return;

		const command = commands.get(interaction.commandName);

		if (!command)
			return;

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: `Coś się zepsuło :(\n\n${error}` });
		}
	})
	
	await client.login(token);
})();

// ---------- SCRAPING ----------
async function scrape(cmd: MockCommand) {

	// Setup browser
	const width = 1800;
	const height = 1300;
	const website = "https://odrabiamy.pl/";

	const browser = await pup.launch({
		devtools: true,
		args: [`--window-size=${width},${height}`,],
		defaultViewport: { width: width, height: height }
	});

	const [webPage] = await browser.pages();
	await webPage.goto(website);

	// Allow cookies
	await webPage.click("#qa-rodo-accept");

	// Go to correct webpage
	await webPage.goto(webPage.url() + config[cmd.channelName][cmd.type] + `strona-${cmd.page}`);

	// Choose exercise and take screenshot
	const exerciseCleaned = cmd.exercise.replace(".", "\\.");
	const exerciseBtns = await webPage.$$(`#qa-exercise-no-${exerciseCleaned}`);

	if (exerciseBtns.length === 0)
		throw new Error("Nie znaleziono takiego zadania!");

	await webPage.waitForTimeout(100);
	for (let i = 0; i < exerciseBtns.length; i++) {
		exerciseBtns[i].click();
		await webPage.waitForTimeout(500);
		await takeScreenshot(`screenshots/${cmd.channelName}-${cmd.type.toString()} zad.${cmd.exercise}${exerciseBtns.length > 1 ? `-${i + 1}` : ""} str.${cmd.page}.png`, webPage);
	}
}
async function takeScreenshot(path: string, webPage: pup.Page) {
	await webPage.screenshot({ path: path, fullPage: true });
}

async function print(object: any, webPage: pup.Page) {
	webPage.evaluate(object => console.log(object), object);
}
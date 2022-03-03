import * as fs from "fs";
import path from "path"

import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, Client, Collection, CommandInteraction, Intents } from "discord.js";
import { token, userName, password } from "./config/auth.json";

import pup from "puppeteer";
import pupE from "puppeteer-extra"
import stealthPlugin from "puppeteer-extra-plugin-stealth"

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
		} catch (error: any) {
			console.error(error);
			await interaction.reply({ content: "Błąd:\n\n" + error.message });
		}
	})

	await client.login(token);
})();

// ---------- SCRAPING ----------
export async function scrape(bookUrl: string, page: number, exercise: string): Promise<[string[], string]> {
	try {
		// Setup browser
		const width = 1800;
		const height = 1300;
		const website = "https://odrabiamy.pl/";
		const browser = await pupE
		.use(stealthPlugin())
		.launch({
			// devtools: true,
			// headless: false,
			userDataDir: "./user_data",
			args: [`--window-size=${width},${height}`,],
			defaultViewport: { width: width, height: height }
		});

		const [webPage] = await browser.pages();
		await webPage.goto(website);

		// Allow cookies
		if (await webPage.$("#qa-rodo-accept") !== null)
			await webPage.click("#qa-rodo-accept");

		// Login if not logged in
		if (webPage.url() !== "https://odrabiamy.pl/moje") {
			await webPage.click("#qa-login-button");
			await webPage.waitForNavigation();
			await webPage.type('input[type="email"]', userName);
			await webPage.type('input[type="password"]', password);
			await webPage.click("#qa-login");
			await webPage.waitForNavigation();
		}

		// Go to correct webpage
		await webPage.goto(website + bookUrl + `strona-${page}`, {"waitUntil" : "networkidle0"});

		// Choose exercise and take screenshot
		const exerciseCleaned = exercise.replace(".", "\\.");
		const exerciseBtns = await webPage.$$(`#qa-exercise-no-${exerciseCleaned}`);

		if (exerciseBtns.length === 0)
			return [[], "Nie znaleziono takiego zadania!"];

		const screenShotNames: string[] = [];
		for (let i = 0; i < exerciseBtns.length; i++) {
			await exerciseBtns[i].click();
			await webPage.waitForTimeout(500);
			const screenShotName = `screenshots/screen-${i + 1}.png`;
			screenShotNames.push(screenShotName);
			await webPage.screenshot({ path: screenShotName, fullPage: true });
		}

		await webPage.close();
		return [screenShotNames, ""];
	}
	catch (err: any) {
		return [[], "Błąd:\n\n" + err.message]
	}
}

async function print(object: any, webPage: pup.Page) {
	webPage.evaluate(object => console.log(object), object);
}
import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import config from "../config/config.json";
import { userName, password } from "../config/auth.json";
import pupE from "puppeteer-extra"
import stealthPlugin from "puppeteer-extra-plugin-stealth"
import fs from "fs";
import fsp from "fs/promises";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("zad")
		.setDescription("Odpowiada na kanale 'odpowiedzi' z screenem zadania.")
		.addStringOption(option =>
			option.setName("rodzaj")
				.setDescription("Wybierz rodzaj książki")
				.setRequired(true)
				.addChoice("podręcznik", "pdr")
				.addChoice("ćwiczenia/zbiór zadań", "cw"))
		.addIntegerOption(option =>
			option.setName("strona")
				.setDescription("Wpisz numer strony")
				.setRequired(true)
				.setMinValue(1))
		.addStringOption(option =>
			option.setName("zadanie")
				.setDescription("Wpisz numer zadania")
				.setRequired(true)),

	async execute(interaction: CommandInteraction<CacheType>) {

		// Read values from command
		const subject = config[interaction.channelId.toString()];
		const bookType = interaction.options.getString("rodzaj");
		const page = interaction.options.getInteger("strona")!;
		const exercise = interaction.options.getString("zadanie")!;

		if (!subject) {
			interaction.reply("Komenda nie jest dostępna w tym kanale!");
			return;
		}
		if (!subject.hasOwnProperty(bookType)) {
			interaction.reply("Nie ma takiej książki!");
			return;
		}

		// Animate response message
		await interaction.reply("Ściąganie odpowiedzi");
		for (let i = 0; i < 12; i++) {
			interaction.editReply("Ściąganie odpowiedzi" + ".".repeat(i % 3 + 1));
		};

		// Scrape and display
		const [screenShots, error] = await scrape(subject[bookType], page, exercise);

		if (error !== "") {
			await interaction.channel?.send(error);
			return;
		}

		await interaction.channel?.send({ files: screenShots });
		if (screenShots.length > 1)
			await interaction.channel?.send("Wyświetlono wiele odpowiedzi, ponieważ na podanej stronie występuje więcej niż jedno zadanie z podanym numerem.");

		// Main logic
		async function scrape(bookUrl: string, page: number, exercise: string): Promise<[string[], string]> {
			try {
				// Setup browser
				const width = 1200;
				const height = 1200;
				const website = "https://odrabiamy.pl/";
				const cookiesPath = "src/config/cookies.json";

				const browser = await pupE
					.use(stealthPlugin())
					.launch({
						// devtools: true,
						// headless: false,
						userDataDir: "./user_data",
						args: [
							`--window-size=${width},${height}`,
							'--no-sandbox',
							'--disable-setuid-sandbox',
							'--disable-dev-shm-usage',
							'--disable-accelerated-2d-canvas',
							'--no-first-run',
							'--no-zygote',
							// '--single-process', // <- this one doesn't works in Windows
							'--disable-gpu'
						],
						defaultViewport: { width: width, height: height }
					});

				const [webPage] = await browser.pages();
				await webPage.goto(website);

				// Allow cookies if needed
				if (await webPage.$("#qa-rodo-accept") !== null)
					await webPage.click("#qa-rodo-accept");

				// Read cookies from file
				if (fs.existsSync(cookiesPath)) {
					const cookiesString = await fsp.readFile(cookiesPath);
					const cookies = JSON.parse(cookiesString.toString());
					await webPage.setCookie(...cookies);
				}
				else {
					// ! USE ONLY ON LOCAL MACHINE
					// Login if not logged in
					if (webPage.url() !== "https://odrabiamy.pl/moje") {
						await webPage.click("#qa-login-button");
						await webPage.waitForNavigation();
						await webPage.type('input[type="email"]', userName);
						await webPage.type('input[type="password"]', password);
						await webPage.click("#qa-login");
						await webPage.waitForNavigation();
					}
				}
				// Output cookies to reuse in server instance
				if (!fs.existsSync(cookiesPath)) {
					const cookies = await webPage.cookies();
					await fsp.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
				}

				// Go to correct webpage
				await webPage.goto(website + bookUrl + `strona-${page}`, { "waitUntil": "networkidle0" });

				// Choose exercise and take screenshot
				const exerciseCleaned = exercise.replaceAll(".", "\\.");
				const exerciseBtns = await webPage.$$(`#qa-exercise-no-${exerciseCleaned}`);

				if (exerciseBtns.length === 0)
					return [[], "Nie znaleziono takiego zadania!"];

				const screenShotNames: string[] = [];
				for (let i = 0; i < exerciseBtns.length; i++) {
					await exerciseBtns[i].click();
					await webPage.waitForTimeout(1000);
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
	}
}

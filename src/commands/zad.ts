import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import pup from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs-extra";

import { Command } from "../main";
import config from "../config/config.json";
import { userName, password } from "../config/auth.json";

let beingUsed = false;
export = {
	data: new SlashCommandBuilder()
		.setName("zad")
		.setDescription("Odpowiada na kanałach 'komendy' z screenem zadania.")
		.addStringOption(option =>
			option.setName("rodzaj_książki")
				.setDescription("Wybierz rodzaj książki")
				.setRequired(true)
				.addChoices(
					{ name: "podręcznik", value: "pdr" },
					{ name: "ćwiczenia/zbiór zadań", value: "cw" }
				))
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
		if (beingUsed) {
			await interaction.reply("Bot jest już używany przez inną osobę!");
			return;
		}

		// Lock command when it's being used by someone else
		beingUsed = true;

		// Read values from command
		const subject = config[interaction.channelId.toString()];
		const bookType = interaction.options.get("rodzaj_książki")!.value as string;
		const page = interaction.options.get("strona")!.value as number;
		const exercise = interaction.options.get("zadanie")!.value as string;
		if (!subject) {
			await interaction.reply("Komenda nie jest dostępna w tym kanale!");
			return;
		}
		if (!Object.prototype.hasOwnProperty.call(subject, bookType!)) {
			await interaction.reply("Nie ma takiej książki!");
			return;
		}

		// Respond and animate message
		await interaction.reply("Ściąganie odpowiedzi");
		for (let i = 0; i < 12; i++) {
			interaction.editReply("Ściąganie odpowiedzi" + ".".repeat(i % 3 + 1));
		}

		// Scrape and display
		const { screenshots, error, loggedIn } = await scrape(subject[bookType], page, exercise);
		if (error) {
			await interaction.channel?.send(error!);
			beingUsed = false;
			return;
		}

		// Final response
		await interaction.channel?.send({ files: screenshots });
		if (loggedIn) interaction.channel?.send("Pliki cookies wygasły, zalogowano się ponownie.");
		if (screenshots!.length > 1)
			await interaction.channel?.send("Wyświetlono wiele odpowiedzi, ponieważ na podanej stronie występuje więcej niż jedno zadanie z podanym numerem.");

		fs.emptyDirSync("screenshots/");
		beingUsed = false;

		// SCRAPING
		interface ScrapeResult {
			screenshots?: string[];
			error?: string;
			loggedIn?: boolean;
		}
		async function scrape(bookUrl: string, page: number, exercise: string): Promise<ScrapeResult> {
			// Setup browser
			const width = 1200;
			const height = 1200;
			const website = "https://odrabiamy.pl/";

			const browser = await pup
				.use(stealthPlugin())
				.launch({
					// devtools: true,
					// headless: false,
					userDataDir: "./user_data",
					args: [
						`--window-size=${width},${height}`,
						"--no-sandbox",
						"--disable-setuid-sandbox",
						"--disable-dev-shm-usage",
						"--disable-accelerated-2d-canvas",
						"--no-first-run",
						"--no-zygote",
						// '--single-process', // <- this one doesn't works on Windows
						"--disable-gpu"
					],
					defaultViewport: { width: width, height: height }
				});

			const [webPage] = await browser.pages();
			await webPage.goto(website);

			try {
				let loggedIn = false;

				// Allow cookies if needed
				if (await webPage.$("#qa-rodo-accept") !== null)
					await webPage.click("#qa-rodo-accept");

				// Login if not logged in or cookies expired
				if (webPage.url() !== "https://odrabiamy.pl/moje") {
					await webPage.click("[data-testid='login-button']");
					await webPage.waitForNavigation();
					await webPage.type("input[type='email']", userName);
					await webPage.type("input[type='password']", password);
					await webPage.click("#qa-login");
					await webPage.waitForNavigation();
					loggedIn = true;
				}

				// Go to correct page
				await webPage.goto(website + bookUrl + `strona-${page}`, { "waitUntil": "networkidle0" });

				// Parse exercise number
				if (/[~!@$%^&*()+=,/';:"?><[\]\\{}|`#]/gm.test(exercise)) {
					await browser.close();
					return { error: "Błędny numer zadania!" };
				}

				let exerciseCleaned = exercise;
				if (exerciseCleaned.charAt(exerciseCleaned.length - 1) === "." && !subject["trailingDot"])
					exerciseCleaned = exerciseCleaned.slice(0, -1);
				else if (exerciseCleaned.charAt(exerciseCleaned.length - 1) !== "." && subject["trailingDot"])
					exerciseCleaned += ".";

				exerciseCleaned = exerciseCleaned.replaceAll(".", "\\.");

				// Select exercise and take screenshots
				const exerciseBtns = await webPage.$$(`#qa-exercise-no-${exerciseCleaned}`);
				if (exerciseBtns.length === 0) {
					await browser.close();
					return { error: "Nie znaleziono zadania o podanym numerze." };
				}

				const screenshotNames: string[] = [];
				for (let i = 0; i < exerciseBtns.length; i++) {
					await exerciseBtns[i].click();
					await webPage.waitForNavigation({ waitUntil: "networkidle0" });
					await webPage.waitForTimeout(1000);

					if (!fs.existsSync("screenshots/")) fs.mkdirSync("screenshots/");

					const screenshotName = `screenshots/screen-${i + 1}.png`;
					screenshotNames.push(screenshotName);
					await webPage.screenshot({ path: screenshotName, fullPage: true });
				}

				await browser.close();
				return { screenshots: screenshotNames, loggedIn: loggedIn };
			}
			catch (err: any) {
				await browser.close();
				return { error: "Błąd:\n\n" + err.message };
			}
		}
	}
} as Command;

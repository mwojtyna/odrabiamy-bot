import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import pup from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs-extra";
import path from "path";

import { Command } from "../main";
import config from "../config/config.json";

let isBeingUsed = false;
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
		if (isBeingUsed) {
			await interaction.reply("Bot jest już używany przez inną osobę!");
			return;
		}

		isBeingUsed = true;

		// Read values from command
		const subject = config[interaction.channelId.toString()];
		const bookType = interaction.options.get("rodzaj_książki")!.value as string;
		const page = interaction.options.get("strona")!.value as number;
		const exercise = interaction.options.get("zadanie")!.value as string;
		if (!subject) {
			await interaction.reply("Komenda nie jest dostępna w tym kanale!");
			isBeingUsed = false;
			return;
		}
		if (!(bookType in subject)) {
			await interaction.reply("Nie ma takiej książki!");
			isBeingUsed = false;
			return;
		}
		if (/[~!@$%^&*()+=,/';:"?><[\]\\{}|`#]/gm.test(exercise)) {
			await interaction.reply("Błędny numer zadania!");
			isBeingUsed = false;
			return;
		}

		// Respond and animate message
		await interaction.reply("Ściąganie odpowiedzi");
		for (let i = 0; i < 18; i++) {
			interaction.editReply("Ściąganie odpowiedzi" + ".".repeat(i % 3 + 1));
		}

		// Scrape and display
		const { screenshots, error } = await scrape(subject[bookType], page, exercise);
		if (error) {
			await interaction.channel?.send(error!);
			isBeingUsed = false;
			return;
		}

		// Final response
		await interaction.channel?.send({ files: screenshots });
		if (screenshots!.length > 1)
			await interaction.channel?.send("Wyświetlono wiele odpowiedzi, ponieważ na podanej stronie występuje więcej niż jedno zadanie z podanym numerem.");

		screenshots?.forEach(s => fs.rmSync(s));
		isBeingUsed = false;

		// SCRAPING
		interface ScrapeResult {
			screenshots?: string[];
			error?: string;
		}
		async function scrape(bookUrl: string, page: number, exercise: string): Promise<ScrapeResult> {
			// Setup browser
			const width = 1200;
			const height = 1200;
			const website = "https://odrabiamy.pl/";
			const cookiesPath = path.resolve(__dirname, "../config/cookies.json");

			const browser = await pup
				.use(stealthPlugin())
				.launch({
					// devtools: true,
					// headless: false,
					args: [
						`--window-size=${width},${height}`,
						"--no-sandbox",
						"--disable-setuid-sandbox",
						"--disable-dev-shm-usage",
						"--disable-accelerated-2d-canvas",
						"--no-first-run",
						"--no-zygote",
						"--single-process", // <- this one doesn't works on Windows
						// "--disable-gpu"
					],
					defaultViewport: { width: width, height: height }
				});

			const date = new Date();
			console.log(`\n------ ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}, ${date.getDay()}.${date.getMonth()}.${date.getFullYear()} ------`);
			console.log("1. started chrome " + await browser.version());

			try {
				// Load page
				const [webPage] = await browser.pages();
				await webPage.goto(website);
				console.log("2. website loaded");

				// Load cookies
				if (fs.existsSync(cookiesPath)) {
					const cookiesString = await fs.readFile(cookiesPath, { encoding: "utf-8" });
					const cookies = JSON.parse(cookiesString);
					await webPage.setCookie(...cookies);
					await webPage.reload();
					console.log("3. cookies loaded: " + cookiesPath);
				}

				// Allow cookies
				if (await webPage.$("#qa-rodo-accept") !== null) {
					await webPage.click("#qa-rodo-accept");
					console.log("4. cookies accepted");
					await new Promise(r => setTimeout(r, 500));
				}

				console.log("5. url: " + webPage.url());
				// Login if not logged in or cookies expired
				if (webPage.url() !== "https://odrabiamy.pl/moje") {
					await webPage.click("[data-testid='login-button']");
					await webPage.waitForNavigation();
					await webPage.type("input[type='email']", process.env.EMAIL);
					await webPage.type("input[type='password']", process.env.PASSWORD);
					await webPage.click("#qa-login");
					await webPage.waitForNavigation();
					interaction.channel?.send("Pliki cookies wygasły, zalogowano się ponownie.");
					console.log("6. logged in");

					// Set cookies after login
					const cookies = await webPage.cookies();
					fs.writeFile(path.resolve(__dirname, "../config/cookies.json"), JSON.stringify(cookies, null, 2));
					console.log("7. cookies set");
				}

				// Go to correct page
				await webPage.goto(website + bookUrl + `strona-${page}`, { waitUntil: "domcontentloaded" });
				console.log("8. changed page");

				// Parse exercise number
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
				console.log("9. found exercise buttons");

				const screenshotNames: string[] = [];
				for (let i = 0; i < exerciseBtns.length; i++) {
					await exerciseBtns[i].click();
					console.log("10. clicked exercise button " + i);
					await webPage.waitForNavigation({ waitUntil: "domcontentloaded" });
					await new Promise(r => setTimeout(r, 1000));
					console.log("11. exercise loaded");

					if (!fs.existsSync("screenshots/")) {
						fs.mkdirSync("screenshots/");
					}

					// Make sure screenshot file names are unique
					const screenshotName = `screenshots/screen-${new Date().getTime()}.png`;

					screenshotNames.push(screenshotName);
					await webPage.screenshot({ path: screenshotName, fullPage: true });
					console.log("12. took screenshot");
				}

				await browser.close();
				console.log("13. browser closed");
				return { screenshots: screenshotNames };
			}
			catch (err: any) {
				await browser.close();

				let aux = err.stack.split("\n");
				aux.splice(0, 2); //removing the line that we force to generate the error (var err = new Error();) from the message
				aux = aux.join("\n");

				return { error: "Błąd (zad.ts):\n\n" + err.message + "\n\n" + aux };
			}
		}
	}
} as Command;

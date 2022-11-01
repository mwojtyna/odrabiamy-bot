import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import { ElementHandle, Page, executablePath } from "puppeteer";
import pup from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs-extra";
import path from "path";

import { Command } from "../main";
import config from "../config/config.json";

interface BookJSON {
	url: string;
	trailingDot?: boolean;
}

let isBeingUsed = false;
const getCurrentTime = () => {
	const date = new Date();
	return (
		`${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}, ${date.getDate()}` +
		`.${date.getMonth() + 1}.${date.getFullYear()}`
	);
};

export = {
	data: new SlashCommandBuilder()
		.setName("zad")
		.setDescription("Odpowiada ze screenem zadania")
		.addIntegerOption(option =>
			option
				.setName("strona")
				.setDescription("Wpisz numer strony")
				.setRequired(true)
				.setMinValue(1)
		)
		.addStringOption(option =>
			option.setName("zadanie").setDescription("Wpisz numer zadania").setRequired(true)
		),

	async execute(interaction: CommandInteraction<CacheType>) {
		if (isBeingUsed) {
			await interaction.reply("Bot jest już używany przez inną osobę!");
			return;
		}

		isBeingUsed = true;

		// Read values from command
		const book = config[interaction.channelId as keyof typeof config] as BookJSON;
		const page = interaction.options.get("strona")!.value as number;
		const exercise = interaction.options.get("zadanie")!.value as string;

		// Check user input
		if (!book) {
			await interaction.reply("Komenda nie jest dostępna w tym kanale!");
			isBeingUsed = false;
			return;
		}
		if (/[~!@$%^&*()+=,/';:"?><[\]\\{}|`#]/gm.test(exercise)) {
			await interaction.reply("Błędny numer zadania!");
			isBeingUsed = false;
			return;
		}

		// Parse exercise number
		let exerciseParsed = exercise;
		if (exerciseParsed.charAt(exerciseParsed.length - 1) === "." && !book.trailingDot)
			exerciseParsed = exerciseParsed.slice(0, -1);
		else if (exerciseParsed.charAt(exerciseParsed.length - 1) !== "." && book.trailingDot)
			exerciseParsed += ".";

		exerciseParsed = exerciseParsed.replaceAll(".", "\\.");

		// Respond and animate message
		await interaction.reply("Ściąganie odpowiedzi");
		for (let i = 0; i < 30; i++) {
			interaction.editReply("Ściąganie odpowiedzi" + ".".repeat((i % 3) + 1));
		}

		// Scrape and display
		const { screenshots, error } = await scrape(book.url, page, exerciseParsed);
		if (error) {
			await interaction.channel?.send(error!);
			isBeingUsed = false;
		} else {
			await interaction.channel?.send({ files: screenshots });
			if (screenshots!.length > 1)
				await interaction.channel?.send(
					"Wyświetlono wiele odpowiedzi, ponieważ na podanej stronie występuje więcej niż jedno zadanie z podanym numerem."
				);

			fs.emptyDirSync(path.resolve(__dirname, "../../screenshots"));
			isBeingUsed = false;

			console.log(`Completed at: ${getCurrentTime()}`);
		}

		// SCRAPING
		async function hardClick(
			element: ElementHandle<Element> | null,
			webPage: Page
		): Promise<void> {
			// Sometimes built-in click() method doesn't work
			// https://github.com/puppeteer/puppeteer/issues/1805#issuecomment-418965009
			if (!element) return;

			await element.focus();
			await webPage.keyboard.type("\n");
		}

		interface ScrapeResult {
			screenshots?: string[];
			error?: string;
		}
		async function scrape(
			bookUrl: string,
			page: number,
			exercise: string
		): Promise<ScrapeResult> {
			// Setup browser
			const width = 1200;
			const height = 1200;
			const website = "https://odrabiamy.pl/";
			const cookiesPath = path.resolve(__dirname, "../config/cookies.json");

			const browser = await pup.use(stealthPlugin()).launch({
				// devtools: true,
				// slowMo: 100,
				headless: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD !== undefined,
				executablePath: executablePath(),
				args: [
					`--window-size=${width},${height}`,
					"--no-sandbox",
					// "--disable-setuid-sandbox",
					// "--disable-dev-shm-usage",
					// "--disable-accelerated-2d-canvas",
					// "--no-first-run",
					// "--no-zygote",
					process.platform === "linux" && process.arch === "arm64"
						? "--single-process"
						: ""
					// "--disable-gpu"
				],
				defaultViewport: { width: width, height: height }
			});

			console.log(`\n------ ${getCurrentTime()}  ------`);
			console.log("1. started chrome " + (await browser.version()));

			try {
				// Load page
				const [webPage] = await browser.pages();

				// Load cookies
				if (fs.existsSync(cookiesPath)) {
					const cookiesString = fs.readFileSync(cookiesPath, {
						encoding: "utf-8"
					});
					const cookies = JSON.parse(cookiesString);
					await webPage.setCookie(...cookies);
					console.log("2. cookies loaded: " + cookiesPath);
				}
				await webPage.goto(website);
				console.log("3. website loaded");

				// Allow cookies
				const cookiesAcceptID = "#qa-rodo-accept";
				const cookiesAccept = await webPage.waitForSelector(cookiesAcceptID);
				await hardClick(cookiesAccept, webPage);
				await webPage.waitForSelector(cookiesAcceptID, {
					hidden: true
				});
				console.log("4. cookies accepted");

				// Login if not logged in or cookies expired
				console.log("5. url: " + webPage.url());
				if (webPage.url() !== "https://odrabiamy.pl/moje") {
					await webPage.click("[data-testid='login-button']");
					await webPage.waitForNavigation();
					await webPage.type("input[type='email']", process.env.EMAIL);
					await webPage.type("input[type='password']", process.env.PASSWORD);
					await webPage.click("#qa-login");

					// Inform if captcha is detected
					try {
						const captcha = await webPage.waitForSelector("iframe[src*='recaptcha']", {
							timeout: 1000
						});
						if (captcha) {
							await browser.close();
							return {
								error: "Wykryto captchę, nie można się zalogować"
							};
						}
					} catch (error) {
						// Do nothing if captcha is not detected
						false;
					}

					await webPage.waitForNavigation();

					interaction.channel?.send("Pliki cookies wygasły, zalogowano się ponownie.");
					console.log("6. logged in");

					// Save cookies after login
					const cookies = await webPage.cookies();
					fs.writeFile(
						path.resolve(__dirname, "../config/cookies.json"),
						JSON.stringify(cookies, null, 2)
					);
					console.log("7. cookies saved");
				}

				// Close any pop-ups
				let popupCloseElement: ElementHandle<Element> | null = null;
				try {
					popupCloseElement = await webPage.waitForSelector(
						"[data-testid='close-button']",
						{ timeout: 3000 }
					);
				} catch (error) {
					console.log("8. didn't find popup to close");
				}
				if (popupCloseElement) {
					await hardClick(popupCloseElement, webPage);
					console.log("8. popup closed");
				}

				// Go to correct page
				await webPage.goto(website + bookUrl + `strona-${page}`);
				console.log("9. changed page: " + webPage.url());

				// Wait for exercises to load
				await webPage.waitForResponse(response => response.url().includes("visits"));
				console.log("10.a visits response");
				await webPage.waitForResponse(response => response.url().includes("exercises"));
				console.log("10.b exercises response");
				await webPage.waitForResponse(response => response.url().includes("visits"));
				console.log("10.c visits response");

				// Select exercise and take screenshots
				const exerciseSelector = `#qa-exercise-no-${exercise} > a`;
				const exerciseBtns = await webPage.$$(exerciseSelector);

				if (exerciseBtns.length === 0) {
					const similarExercises = await webPage.$$(`#qa-exercise-no-${exercise}a > a`);
					if (similarExercises.length > 0) {
						await browser.close();
						return {
							error:
								"Nie znaleziono zadania " +
								exercise +
								" na stronie " +
								page +
								", ale znaleziono podpunkty tego zadania."
						};
					} else {
						await browser.close();
						return {
							error:
								"Nie znaleziono zadania " + exercise + " na stronie " + page + "."
						};
					}
				}

				console.log("10. found exercise buttons");

				const screenshotNames: string[] = [];
				for (let i = 0; i < exerciseBtns.length; i++) {
					// Only this click works
					await webPage.$$eval(
						exerciseSelector,
						(elements, i) => (elements[i] as HTMLElement).click(),
						i
					);
					console.log("11. clicked exercise button " + i);

					// Wait for the solution to load
					await webPage.waitForResponse(response => response.url().includes("visits"));
					console.log("12. exercise loaded");

					const screenshotName = `screenshots/screen-${i}.png`;
					screenshotNames.push(screenshotName);

					const solutionElement = (await webPage.$("#qa-exercise"))!;
					await solutionElement.screenshot({ path: screenshotName });
					console.log("13. took screenshot");
				}

				await browser.close();
				console.log("14. browser closed");
				return { screenshots: screenshotNames };
			} catch (err: any) {
				await browser.close();
				isBeingUsed = false;

				let aux = err.stack.split("\n");
				aux.splice(0, 2); // removing the line that we force to generate the error (var err = new Error();) from the message
				aux = aux.join("\n");

				return {
					error: "Błąd (zad.ts):\n\n" + err.message + "\n\n" + aux
				};
			}
		}
	}
} as Command;

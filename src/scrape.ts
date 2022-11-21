import { CacheType, CommandInteraction } from "discord.js";
import { ElementHandle, executablePath } from "puppeteer";
import pup from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs-extra";
import path from "path";
import async from "async";
import timestamp from "time-stamp";

export enum ErrorType {
	UnhandledError,
	PageNotFoundError,
	ExerciseNotFoundError,
	ExerciseNotFoundButSubexercisesFoundError,
	IndividualExerciseError
}
export class ScrapeError {
	type: ErrorType;
	message: string;
	constructor(message: string, errorType: ErrorType) {
		this.type = errorType;
		this.message = message;
	}
}

interface ScrapeResult {
	screenshots?: string[];
	error?: ScrapeError;
}
export async function scrape(
	bookUrl: string,
	page: number,
	exercise: string,
	trailingDot: boolean,
	interaction: CommandInteraction<CacheType>,
	headless: boolean,
	throttleNetwork?: boolean
): Promise<ScrapeResult> {
	console.log(`\n------ ${timestamp("HH:mm:ss, DD.MM.YYYY")} ------`);
	const timer = process.hrtime();

	// Setup browser
	const width = 1200;
	const height = 1200;
	const website = "https://odrabiamy.pl/";
	const cookiesPath = path.join(__dirname, "config/cookies.json");

	const browser = await pup.use(stealthPlugin()).launch({
		// devtools: true,
		// slowMo: 100,
		headless: headless,
		executablePath: executablePath(),
		args: [
			`--window-size=${width},${height}`,
			"--no-sandbox",
			"--disable-canvas-aa",
			"--disable-2d-canvas-clip-aa",
			"--disable-gl-drawing-for-tests",
			"--disable-dev-shm-usage",
			"--no-zygote",
			"--use-gl=desktop",
			"--enable-webgl",
			"--hide-scrollbars",
			"--mute-audio",
			"--no-first-run",
			"--disable-infobars",
			"--disable-breakpad",
			"--disable-setuid-sandbox",
			process.platform === "linux" && process.arch === "arm64" ? "--single-process" : ""
		],
		defaultViewport: { width: width, height: height }
	});

	log("1. started chrome " + (await browser.version()), timer);

	try {
		// Load page
		const [webPage] = await browser.pages();

		// Simulate bad internet for tests
		if (throttleNetwork) {
			const client = await webPage.target().createCDPSession();
			await client.send("Network.emulateNetworkConditions", {
				offline: false,
				downloadThroughput: (450 * 1024) / 8,
				uploadThroughput: (150 * 1024) / 8,
				latency: 150
			});
		}

		// Load cookies
		if (fs.existsSync(cookiesPath)) {
			const cookiesString = fs.readFileSync(cookiesPath, {
				encoding: "utf-8"
			});
			const cookies = JSON.parse(cookiesString);
			await webPage.setCookie(...cookies);
			log("2. cookies loaded: " + cookiesPath, timer);
		}
		await webPage.goto(website);
		log("3. website loaded: " + webPage.url(), timer);

		try {
			// Allow cookies
			const cookiesAcceptID = "#qa-rodo-accept";
			const cookiesAccept = await webPage.waitForSelector(cookiesAcceptID, { timeout: 5000 });
			log("4.a cookies accept found", timer);

			await cookiesAccept!.evaluate(node => (node as HTMLButtonElement).click());
			await webPage.waitForSelector(cookiesAcceptID, { hidden: true, timeout: 5000 });
			log("4.b cookies accept clicked", timer);
		} catch (error) {
			log("4.a cookies accept not found or not clicked properly", timer);
		}

		// Login if not logged in or cookies expired
		if (webPage.url() !== "https://odrabiamy.pl/moje") {
			await webPage.click("[data-testid='login-button']");
			await webPage.waitForNavigation();
			await webPage.type("input[type='email']", process.env.EMAIL);
			await webPage.type("input[type='password']", process.env.PASSWORD);
			await webPage.click("#qa-login");

			// Check for captcha
			try {
				await webPage.waitForNavigation({ timeout: 5000 });
			} catch (error) {
				if (headless) {
					await browser.close();
					return {
						// Has to be UnhandledError in order to fail tests
						error: new ScrapeError(
							"Wykryto captchę, nie można się zalogować",
							ErrorType.UnhandledError
						)
					};
				} else {
					// If not headless, wait for user to solve captcha
					await webPage.waitForNavigation();
				}
			}

			interaction.channel?.send("Pliki cookies wygasły, zalogowano się ponownie.");
			log("5. logged in", timer);

			// Save cookies after login
			const cookies = await webPage.cookies();
			fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
			log("6. cookies saved", timer);
		}

		// Close any pop-ups
		let popupCloseElement: ElementHandle<Element> | null = null;
		try {
			popupCloseElement = await webPage.waitForSelector("[data-testid='close-button']", {
				timeout: 5000
			});
			log("7.a popup found", timer);
		} catch (error) {
			log("7. didn't find popup to close", timer);
		}
		if (popupCloseElement) {
			await popupCloseElement.evaluate(node => (node as HTMLButtonElement).click());
			log("7.b popup closed", timer);
		}

		// Go to correct page
		await webPage.goto(website + bookUrl + `strona-${page}`);
		log("8. changed page: " + webPage.url(), timer);

		// Wait for exercises to load
		try {
			await webPage.waitForResponse(response => response.url().includes("exercises"), {
				timeout: 5000
			});
			log("9.a exercises response", timer);
		} catch (error) {
			// If exercises don't load, check if account is not blocked
			if (await webPage.$("#qa-premium-blockade")) {
				await browser.close();
				return {
					// Has to be UnhandledError in order to fail tests
					error: new ScrapeError(
						"Konto zostało tymczasowo zablokowane :(",
						ErrorType.UnhandledError
					)
				};
			}

			await browser.close();
			return {
				error: new ScrapeError(
					`Nie znaleziono zadań na stronie ${page}. Jeśli w książce na takiej stronie znajdują się zadania, możliwe jest, że nie są jeszcze rozwiązane w odrabiamy.pl`,
					ErrorType.PageNotFoundError
				)
			};
		}
		await webPage.waitForResponse(response => response.url().includes("visits"));
		log("9.b visits response", timer);

		// Parse exercise number (has to be here because of tests)
		let exerciseParsed = exercise;
		if (
			exerciseParsed.charAt(exerciseParsed.length - 1) === "." &&
			exerciseParsed.charAt(exerciseParsed.length - 2) !== "." &&
			!trailingDot
		)
			exerciseParsed = exerciseParsed.slice(0, -1);
		else if (exerciseParsed.charAt(exerciseParsed.length - 1) !== "." && trailingDot)
			exerciseParsed += ".";

		// Find exercise buttons
		const exerciseSelector = `[id='qa-exercise-no-${exerciseParsed}'] > a`;
		const exerciseBtns = await webPage.$$(exerciseSelector);
		const individualExerciseBtns = await async.filter(exerciseBtns, async btn => {
			const paragraphs = await btn.$$("p");
			const individualText = await async.filter(paragraphs, async p => {
				const innerText = await p.evaluate(node => node.innerText);
				return innerText.includes("Indywidualne");
			});

			return individualText.length > 0;
		});

		if (exerciseBtns.length === 0) {
			const subexercises = await webPage.$$(`[id^='qa-exercise-no-${exerciseParsed}']`);
			const ids = await async.map(subexercises, async (btn: ElementHandle<Element>) => {
				const id = await btn.evaluate(node => node.id);
				return id.split(exerciseParsed)[1];
			});

			if (subexercises.length > 0) {
				await browser.close();
				return {
					error: new ScrapeError(
						`Nie znaleziono zadania ${exercise} na stronie ${page}, ale znaleziono podpunkt${
							ids.length > 1 ? "y" : ""
						} ${ids.join(", ")} tego zadania`,
						ErrorType.ExerciseNotFoundButSubexercisesFoundError
					)
				};
			} else {
				await browser.close();
				return {
					error: new ScrapeError(
						`Nie znaleziono zadania ${exercise} na stronie ${page}`,
						ErrorType.ExerciseNotFoundError
					)
				};
			}
		}

		log("9. found exercise buttons", timer);

		// Screenshot each exercise solution
		const screenshotNames: string[] = [];
		for (let i = 0; i < exerciseBtns.length; i++) {
			// Skip 'individual' exercises
			if (exerciseBtns.length === 1 && individualExerciseBtns.length === 1) {
				await browser.close();
				return {
					error: new ScrapeError(
						`Zadanie ${exercise} na stronie ${page} jest do rozwiązania indywidualnego. Nie ma rozwiązania w odrabiamy.pl`,
						ErrorType.IndividualExerciseError
					)
				};
			} else if (individualExerciseBtns.includes(exerciseBtns[i])) {
				continue;
			}

			// Only this click works
			await exerciseBtns[i].evaluate(node => (node as HTMLAnchorElement).click());
			log("10. clicked exercise button " + i, timer);

			// Wait for the solution to load
			if (i > 0) {
				await webPage.waitForResponse(response => response.url().includes("exercises"));
				log("11.a exercises response", timer);
			}
			await webPage.waitForResponse(response => response.url().includes("visits"));
			log("11.b solution loaded", timer);

			// Wait for images to load
			const solutionElement = await webPage.$("#qa-exercise");
			await solutionElement!.$$eval("img", async imgs => {
				await Promise.all(
					imgs.map(img => {
						if (img.complete) return;
						return new Promise((resolve, reject) => {
							img.addEventListener("load", resolve);
							img.addEventListener("error", reject);
						});
					})
				);
			});
			log("11.c images loaded", timer);

			const screenshotName = `screenshots/screen-${i}.jpg`;
			screenshotNames.push(screenshotName);

			await solutionElement!.screenshot({ path: screenshotName });
			log("12. took screenshot", timer);
		}

		await browser.close();
		log("13. browser closed", timer);
		console.log(`Completed at: ${timestamp("HH:mm:ss, DD.MM.YYYY")}`);
		return { screenshots: screenshotNames };
	} catch (err: any) {
		await browser.close();

		let aux = err.stack.split("\n");
		aux.splice(0, 2); // removing the line that we force to generate the error (var err = new HandledError();) from the message
		aux = aux.join("\n");

		return {
			error: new ScrapeError(
				"Błąd (zad.ts):\n\n" + err.message + "\n\n" + aux,
				ErrorType.UnhandledError
			)
		};
	}
}

function log(msg: string, timer: [number, number]): void {
	console.log(`[${parseFloat(process.hrtime(timer).join(".")).toFixed(3)}] ${msg}`);
}

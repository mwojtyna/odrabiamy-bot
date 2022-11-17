import { CacheType, CommandInteraction } from "discord.js";
import { ElementHandle, Page, executablePath } from "puppeteer";
import pup from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs-extra";
import path from "path";
import async from "async";

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
	headless: boolean
): Promise<ScrapeResult> {
	console.log(`\n------ ${getCurrentTime()} ------`);

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
			// "--disable-setuid-sandbox",
			// "--disable-dev-shm-usage",
			// "--disable-accelerated-2d-canvas",
			// "--no-first-run",
			// "--no-zygote",
			process.platform === "linux" && process.arch === "arm64" ? "--single-process" : ""
			// "--disable-gpu"
		],
		defaultViewport: { width: width, height: height }
	});

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

		try {
			// Allow cookies
			const cookiesAcceptID = "#qa-rodo-accept";
			const cookiesAccept = await webPage.waitForSelector(cookiesAcceptID, { timeout: 5000 });
			await hardClick(cookiesAccept, webPage);
			await webPage.waitForSelector(cookiesAcceptID, {
				hidden: true
			});
			console.log("4. cookies accepted");
		} catch (error) {
			console.log("4. cookies accept not found");
		}

		// Login if not logged in or cookies expired
		console.log("5. url: " + webPage.url());
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
			console.log("6. logged in");

			// Save cookies after login
			const cookies = await webPage.cookies();
			fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
			console.log("7. cookies saved");
		}

		// Close any pop-ups
		let popupCloseElement: ElementHandle<Element> | null = null;
		try {
			popupCloseElement = await webPage.waitForSelector("[data-testid='close-button']", {
				timeout: 3000
			});
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
		try {
			await webPage.waitForResponse(response => response.url().includes("visits"), {
				timeout: 5000
			});
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
		console.log("10.a visits response");
		await webPage.waitForResponse(response => response.url().includes("exercises"));
		console.log("10.b exercises response");
		await webPage.waitForResponse(response => response.url().includes("visits"));
		console.log("10.c 2nd visits response");

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

		// Select exercise and take screenshots
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
						} ${ids.join(", ")} tego zadania.`,
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

		console.log("10. found exercise buttons");

		const screenshotNames: string[] = [];
		for (let i = 0; i < exerciseBtns.length; i++) {
			// Skip individual exercises
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
			await exerciseBtns[i].evaluate(node => (node as HTMLElement).click());
			console.log("11. clicked exercise button " + i);

			// Wait for the solution to load
			await webPage.waitForResponse(response => response.url().includes("visits"));
			console.log("12. exercise loaded");

			const screenshotName = `screenshots/screen-${i}.jpg`;
			screenshotNames.push(screenshotName);

			const solutionElement = (await webPage.$("#qa-exercise"))!;
			await solutionElement.screenshot({ path: screenshotName });
			console.log("13. took screenshot");
		}

		await browser.close();
		console.log("14. browser closed");
		console.log(`Completed at: ${getCurrentTime()}`);
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

function getCurrentTime() {
	const date = new Date();
	return (
		`${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}, ${date.getDate()}` +
		`.${date.getMonth() + 1}.${date.getFullYear()}`
	);
}
async function hardClick(element: ElementHandle<Element> | null, webPage: Page): Promise<void> {
	// Sometimes built-in click() method doesn't work
	// https://github.com/puppeteer/puppeteer/issues/1805#issuecomment-418965009
	if (!element) return;

	await element.focus();
	await webPage.keyboard.type("\n");
}

import { CacheType, CommandInteraction } from "discord.js";
import { ElementHandle, Page, executablePath } from "puppeteer";
import pup from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs-extra";
import path from "path";

async function hardClick(element: ElementHandle<Element> | null, webPage: Page): Promise<void> {
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
export async function scrape(
	bookUrl: string,
	page: number,
	exercise: string,
	interaction: CommandInteraction<CacheType>
): Promise<ScrapeResult> {
	// Setup browser
	const width = 1200;
	const height = 1200;
	const headless = process.env.NODE_ENV === "production";
	const website = "https://odrabiamy.pl/";
	const cookiesPath = path.join(__dirname, "config/cookies.json");

	const browser = await pup.use(stealthPlugin()).launch({
		// devtools: true,
		// slowMo: 100,
		headless,
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
				if (captcha && headless) {
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
			await browser.close();
			return {
				error: "Nie znaleziono zadania " + exercise + " na stronie " + page + "."
			};
		}
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
					error: "Nie znaleziono zadania " + exercise + " na stronie " + page + "."
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

		let aux = err.stack.split("\n");
		aux.splice(0, 2); // removing the line that we force to generate the error (var err = new Error();) from the message
		aux = aux.join("\n");

		return {
			error: "Błąd (zad.ts):\n\n" + err.message + "\n\n" + aux
		};
	}
}

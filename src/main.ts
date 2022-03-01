import pup from "puppeteer";
import config from "./config.json";

const width = 1800;
const height = 1300;
const website = "https://odrabiamy.pl/";

// Main function
(async () => {

	// Setup browser
	const browser = await pup.launch({
		devtools: true,
		args: [`--window-size=${width},${height}`,],
		defaultViewport: { width: width, height: height }
	});
	const [page] = await browser.pages();
	await page.goto(website);

	// Allow cookies
	await page.click("#qa-rodo-accept");

	// await page.evaluate((config) => console.log(config.bookIDs), config);
	// await page.screenshot({ path: "page.png", fullPage: true });
})();
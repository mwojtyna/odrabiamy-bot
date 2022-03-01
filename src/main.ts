import pup from "puppeteer";
import config from "./config.json";

const width = 1800;
const height = 1300;
const website = "https://odrabiamy.pl/";

// TODO: Get from discord
type Command = {
	channelName: keyof typeof config.bookIDs;
	type: keyof typeof config.bookIDs.Biologia;
	page: number,
	exercise: string
}
const cmd: Command = {
	channelName: "Matematyka",
	type: "pdr",
	page: 75,
	exercise: "5"
};

// Main function
(async () => {

	// Setup browser
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
	await webPage.goto(webPage.url() + config.bookIDs[cmd.channelName][cmd.type] + `strona-${cmd.page}`);

	// Choose exercise
	const exerciseBtn = await webPage.$(`#qa-exercise-no-${cmd.exercise}`);
	exerciseBtn?.click();

	// await webPage.evaluate((config, cmd) => console.log(config.bookIDs[cmd.channelName][cmd.args]), config, cmd);
	// await webPage.screenshot({ path: "page.png", fullPage: true });
})();

async function print(object: any, page: pup.Page) {
	page.evaluate(object => console.log(object), object);
}
import pup from "puppeteer";
import config from "./config.json";

const width = 1800;
const height = 1300;
const website = "https://odrabiamy.pl/";

// TODO: Get from discord
type Command = {
	channelName: keyof typeof config.bookIDs;
	args: keyof typeof config.bookIDs.Biologia;
}
const cmd: Command = {
	channelName: "Angielski gr.1",
	args: "pdr"
};

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

	// Go to book's page
	await page.goto(website + config.bookIDs[cmd.channelName][cmd.args]);

	// await page.evaluate((config, cmd) => console.log(config.bookIDs[cmd.channelName][cmd.args]), config, cmd);
	// await page.screenshot({ path: "page.png", fullPage: true });
})();
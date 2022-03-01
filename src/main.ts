import pup from "puppeteer";
import config from "./config.json";

const width = 1800;
const height = 1300;
const website = "https://odrabiamy.pl/";

// TODO: Get from discord
type Command = {
	channelName: keyof typeof config.bookIDs;
	type: keyof typeof config.bookIDs.Matematyka.pdr | typeof config.bookIDs.Matematyka.cw;
	page: number,
	exercise: string
}
const cmd: Command = {
	channelName: "Angielski gr.1",
	type: "cw",
	page: 67,
	exercise: "2"
};

// Main function
(async () => {

	// Setup browser
	const browser = await pup.launch({
		// devtools: true,
		args: [`--window-size=${width},${height}`,],
		defaultViewport: { width: width, height: height }
	});
	const [webPage] = await browser.pages();
	await webPage.goto(website);

	// Allow cookies
	await webPage.click("#qa-rodo-accept");

	// Go to correct webpage
	await webPage.goto(webPage.url() + config.bookIDs[cmd.channelName][cmd.type] + `strona-${cmd.page}`);

	// Choose exercise and take screenshot
	const exerciseBtns = await webPage.$$(`#qa-exercise-no-${cmd.exercise}`);

	if(exerciseBtns.length === 0)
		throw new Error("Nie znaleziono takiego zadania!");

	await webPage.waitForTimeout(100);
	for (let i = 0; i < exerciseBtns.length; i++) {
		exerciseBtns[i].click();
		await webPage.waitForTimeout(500);
		await takeScreenshot(`screenshots/${cmd.channelName}-${cmd.type.toString()} zad.${cmd.exercise}${exerciseBtns.length > 1 ? `-${i + 1}` : ""} str.${cmd.page}.png`, webPage);
	}
})();

async function takeScreenshot(path: string, webPage: pup.Page) {
	await webPage.screenshot({ path: path, fullPage: true });
}
async function print(object: any, webPage: pup.Page) {
	webPage.evaluate(object => console.log(object), object);
}
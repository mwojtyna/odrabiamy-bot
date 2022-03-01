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
	channelName: "Biologia",
	type: "pdr",
	page: 87,
	exercise: ""
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

	// ---------- FINDING PAGE ----------
	// Go to book's page
	await webPage.goto(website + config.bookIDs[cmd.channelName][cmd.type]);

	// Press page dropdown arrow
	const arrow = await webPage.$(".css-55y1ai-indicatorContainer");
	await arrow?.click();
	
	// Get page btn index
	const firstPageNum = await webPage.$eval("#react-select-5-option-0", e => parseInt(e.textContent!.split(" ")[1]))
	const pages: number[] = await webPage.$$eval('div[id^=react-select-5-option-]', divs => divs.map(div => parseInt(div.textContent!.split(" ")[1])));
	const pageIndex = await getCorrectPage(webPage, pages, firstPageNum, cmd.page);
	print(`pageIndex: ${pageIndex}, page: ${pages[pageIndex]}`, webPage);

	// Click page btn
	const pageBtn = await webPage.$(`#react-select-5-option-${pageIndex}`);
	pageBtn?.click();

	// await page.evaluate((config, cmd) => console.log(config.bookIDs[cmd.channelName][cmd.args]), config, cmd);
	// await page.screenshot({ path: "page.png", fullPage: true });
})();

async function getCorrectPage(webPage: pup.Page, pages: number[], firstPageNum: number, bookPage: number): Promise<number> {
	const diffs: number[] = [];
	for (let i = 1; i < pages.length; i++) {
		diffs.push(pages[i] - pages[i - 1])
	}

	print(pages, webPage);
	print(diffs, webPage);

	let result = firstPageNum;
	for (let i = 0; i < pages.length; i++) {
		if(result === bookPage)
			return i;

		result += diffs[i];
	}

	throw new Error("Nie znaleziono podanej strony!");
	// return -1;
}
async function print(object: any, page: pup.Page) {
	page.evaluate(object => console.log(object), object);
}
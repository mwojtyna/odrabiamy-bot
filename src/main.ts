import pup from "puppeteer"

(async () => {
	const width = 1700
	const height = 1200

	const browser = await pup.launch({
		headless: false,
		args: [`--window-size=${width},${height}`],
		defaultViewport: { width: width, height: height }
	});

	const page = await browser.newPage();
	await page.goto("https://odrabiamy.pl/");
})();
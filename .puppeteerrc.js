/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
	browserRevision: "1036745",
	cacheDirectory: __dirname + "/node_modules/puppeteer/.local-chromium"
	// Downloading chromium for m1 macs is not working
};

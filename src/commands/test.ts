import { CacheType, CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { Command } from "../main";
import { scrape } from "../scrape";
import fs from "fs-extra";
import path from "path";

import { HandledError, UnhandledError } from "../scrape";

interface Test {
	name: string;
	bookUrl: string;
	page: number;
	exercise: string;
	trailingDot?: true;
	expectHandledError?: true;
	logIn?: true;
}
const tests: Test[] = [
	// Normal cases
	{ name: "Normal exercise", bookUrl: "matematyka/ksiazka-13007/", page: 292, exercise: "1" },
	{
		name: "Normal exercise (login)",
		bookUrl: "matematyka/ksiazka-13007/",
		page: 292,
		exercise: "1",
		logIn: true
	},
	{
		name: "Subexercise",
		bookUrl: "jezyk-niemiecki/ksiazka-13067/",
		page: 44,
		exercise: "4a"
	},
	{ name: "Very long exercise", bookUrl: "matematyka/ksiazka-13007/", page: 293, exercise: "6" },
	{ name: "Two exercises", bookUrl: "matematyka/ksiazka-13007/", page: 264, exercise: "3" },
	{ name: "Hard to load", bookUrl: "geografia/ksiazka-13105/", page: 12, exercise: "1" },
	{
		name: "Trailing dot (no dot)",
		bookUrl: "fizyka/ksiazka-12009/",
		page: 12,
		exercise: "1.28",
		trailingDot: true
	},
	{
		name: "Trailing dot (with dot)",
		bookUrl: "fizyka/ksiazka-12009/",
		page: 12,
		exercise: "1.28.",
		trailingDot: true
	},

	// Errors
	{
		name: "Error: exercise not found",
		bookUrl: "matematyka/ksiazka-13007/",
		page: 292,
		exercise: "6",
		expectHandledError: true
	},
	{
		name: "Error: exercise not found, but subexercises exist",
		bookUrl: "jezyk-niemiecki/ksiazka-13067/",
		page: 44,
		exercise: "4",
		expectHandledError: true
	},
	{
		name: "Error: page not found",
		bookUrl: "matematyka/ksiazka-13007/",
		page: 2921,
		exercise: "6",
		expectHandledError: true
	}
];

export = {
	data: new SlashCommandBuilder()
		.setName("test")
		.setDescription("Testuje bota")
		.addIntegerOption(option => option.setName("od").setDescription("Od").setRequired(false))
		.addIntegerOption(option => option.setName("do").setDescription("Do").setRequired(false)),
	channels: ["1037012798850486366"],
	devOnly: true,

	async execute(interaction: CommandInteraction<CacheType>) {
		const from = (interaction.options.get("od")?.value ?? 0) as number;
		const to = (interaction.options.get("do")?.value ?? tests.length - 1) as number;

		if (to + 1 > tests.length) {
			await interaction.reply("End index out of range.");
			return;
		}

		await interaction.reply("Starting tests...");

		// Backup cookies
		const cookiesPath = path.join(process.cwd(), "src/config/cookies.json");
		const cookiesBackupPath = path.join(process.cwd(), "src/config/cookies.json.bak");
		fs.copyFileSync(cookiesPath, cookiesBackupPath);

		// Run tests
		const results: boolean[] = [];
		for (let i = from; i < (from === to ? from + 1 : tests.slice(from, to + 1).length); i++) {
			const test = tests[i];
			const message = await interaction.channel?.send(`\`Starting test '${test.name}'...\``);

			if (test.logIn) {
				fs.rmSync(cookiesPath, { force: true });
			}

			const { screenshots, error } = await scrape(
				test.bookUrl,
				test.page,
				test.exercise,
				!!test.trailingDot,
				interaction
			);
			if (
				error instanceof UnhandledError ||
				(error instanceof HandledError && !test.expectHandledError)
			) {
				await message?.edit(
					`\`\`\`diff\n-Test '${test.name}' failed with error:\n\n ${error.message}\`\`\``
				);
				results.push(false);
			} else if (!error || error instanceof HandledError) {
				await message?.edit({
					content: `\`\`\`diff\n+Test '${test.name}' passed.\`\`\``,
					files: screenshots
				});
				results.push(true);
			}

			if (test.logIn) {
				fs.copyFileSync(cookiesBackupPath, cookiesPath, fs.constants.COPYFILE_FICLONE);
			}
		}

		// Restore cookies
		fs.moveSync(cookiesBackupPath, cookiesPath, { overwrite: true });

		await interaction.channel?.send(
			results.includes(false) ? "```diff\n-Tests failed.```" : "```diff\n+Tests passed.```"
		);
	}
} as Command;

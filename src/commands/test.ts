import { CacheType, CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { Command } from "../main";
import { scrape } from "../scrape";
import fs from "fs-extra";
import path from "path";

import { ErrorType } from "../scrape";
import tests from "../test-list";

export = {
	data: new SlashCommandBuilder()
		.setName("test")
		.setDescription("Testuje bota")
		.addIntegerOption(option => option.setName("od").setDescription("Od").setRequired(false))
		.addIntegerOption(option => option.setName("do").setDescription("Do").setRequired(false))
		.addBooleanOption(option =>
			option
				.setName("non-headless")
				.setDescription("Otwórz w oknie graficznym")
				.setRequired(false)
		),
	channels: ["1037012798850486366"],
	devOnly: true,

	async execute(interaction: CommandInteraction<CacheType>) {
		const from = (interaction.options.get("od")?.value ?? 0) as number;
		const to = (interaction.options.get("do")?.value ?? tests.length - 1) as number;
		const nonHeadless = (interaction.options.get("non-headless")?.value ?? false) as boolean;

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
		const results: Map<number, boolean> = new Map<number, boolean>();
		for (let i = from; i < (from === to ? from + 1 : to + 1); i++) {
			const test = tests[i];
			const message = await interaction.channel?.send(
				`\`Starting test ${i} '${test.name}'...\``
			);

			if (test.logIn) {
				fs.rmSync(cookiesPath, { force: true });
			}

			const { screenshots, error } = await scrape(
				test.bookUrl,
				test.page,
				test.exercise,
				!!test.trailingDot,
				interaction,
				!nonHeadless,
				!!test.throttleNetwork
			);

			if (
				error &&
				test.expectedErrorType &&
				error.type !== ErrorType.UnhandledError &&
				error.type !== test.expectedErrorType
			) {
				await message?.edit(
					`\`\`\`diff\n-Test ${i} '${test.name}' failed with ${
						ErrorType[error.type]
					}:\n\n${error.message}
					\n-Expected error of type ${ErrorType[test.expectedErrorType!]}\`\`\``
				);
				results.set(i, false);
			} else if (
				error &&
				error.type === test.expectedErrorType &&
				error.message !== test.expectedErrorMessage
			) {
				await message?.edit(
					`\`\`\`diff\n-Test ${i} '${test.name}' failed with message
					\n'${error.message}'
					\n-Expected error message:
					\n'${test.expectedErrorMessage}'\`\`\``
				);
				results.set(i, false);
			} else if (
				error?.type === ErrorType.UnhandledError ||
				(error && !test.expectedErrorType)
			) {
				await message?.edit(
					`\`\`\`diff\n-Test ${i} '${test.name}' failed with ${
						ErrorType[error.type]
					}:\n\n${error.message}\`\`\``
				);
				results.set(i, false);
			} else if (!error || error.type === test.expectedErrorType) {
				await message?.edit(`\`\`\`diff\n+Test ${i} '${test.name}' passed.\`\`\``);
				if (screenshots) await interaction.channel?.send({ files: screenshots });

				results.set(i, true);
			}

			if (test.logIn) {
				fs.copyFileSync(cookiesBackupPath, cookiesPath, fs.constants.COPYFILE_FICLONE);
			}
		}

		// Restore cookies
		fs.moveSync(cookiesBackupPath, cookiesPath, { overwrite: true });

		// Remove screenshots
		fs.emptyDirSync(path.join(process.cwd(), "screenshots"));

		// prettier-ignore
		await interaction.channel?.send(
			Array.from(results.values()).includes(false)
				? `\`\`\`diff\n-Tests failed (id: ${Array.from(results.entries())
					.map((pair) => pair[0])
					.filter(i => !results.get(i))
					.join(", ")}).\`\`\``
				: "```diff\n+Tests passed.```"
		);
	}
} as Command;

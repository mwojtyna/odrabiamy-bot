import { ErrorType } from "./scrape";

export interface Test {
	name: string;
	bookUrl: string;
	page: number;
	exercise: string;
	trailingDot?: true;
	expectedErrorType?: ErrorType;
	logIn?: true;
}
const tests: Test[] = [
	// Normal cases
	{
		name: "Normal exercise (login)",
		bookUrl: "matematyka/ksiazka-13007/",
		page: 292,
		exercise: "1",
		logIn: true
	},
	{ name: "Normal exercise", bookUrl: "matematyka/ksiazka-13007/", page: 292, exercise: "1" },
	{
		name: "Exercise with dot",
		bookUrl: "matematyka/ksiazka-13128/",
		page: 86,
		exercise: "3.65"
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
	{
		name: "Exercise with emojis",
		bookUrl: "matematyka/ksiazka-13128/",
		page: 86,
		exercise: "3.71"
	},

	// Errors
	{
		name: "Error: exercise not found",
		bookUrl: "matematyka/ksiazka-13007/",
		page: 86,
		exercise: "3.90",
		expectedErrorType: ErrorType.ExerciseNotFoundError
	},
	{
		name: "Error: exercise not found (with dot)",
		bookUrl: "matematyka/ksiazka-13007/",
		page: 292,
		exercise: "6",
		expectedErrorType: ErrorType.ExerciseNotFoundError
	},
	{
		name: "Error: exercise not found, but subexercises exist",
		bookUrl: "jezyk-niemiecki/ksiazka-13067/",
		page: 44,
		exercise: "4",
		expectedErrorType: ErrorType.ExerciseNotFoundButSubexercisesFoundError
	},
	{
		name: "Error: page not found",
		bookUrl: "matematyka/ksiazka-13007/",
		page: 2921,
		exercise: "6",
		expectedErrorType: ErrorType.PageNotFoundError
	}
];

export default tests;

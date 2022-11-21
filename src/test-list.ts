import { ErrorType } from "./scrape";

export interface Test {
	name: string;
	bookUrl: string;
	page: number;
	exercise: string;
	trailingDot?: true;
	logIn?: true;
	throttleNetwork?: true;
	expectedErrorType?: ErrorType;
	expectedErrorMessage?: string;
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
		name: "Throttled network",
		bookUrl: "matematyka/ksiazka-13007/",
		page: 137,
		exercise: "7",
		throttleNetwork: true
	},
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
	{
		name: "Exercise with more than 1 trailing dot",
		bookUrl: "jezyk-niemiecki/ksiazka-11861/",
		page: 95,
		exercise: "Höre..."
	},
	{
		name: "Exercise with a question mark",
		bookUrl: "biologia/ksiazka-12997/",
		page: 85,
		exercise: "? Pomyśl"
	},

	// Errors
	{
		name: "Error: exercise not found",
		bookUrl: "matematyka/ksiazka-13007/",
		page: 86,
		exercise: "3.90",
		expectedErrorType: ErrorType.ExerciseNotFoundError,
		expectedErrorMessage: "Nie znaleziono zadania 3.90 na stronie 86"
	},
	{
		name: "Error: exercise not found (with dot)",
		bookUrl: "matematyka/ksiazka-13007/",
		page: 292,
		exercise: "6",
		expectedErrorType: ErrorType.ExerciseNotFoundError,
		expectedErrorMessage: "Nie znaleziono zadania 6 na stronie 292"
	},
	{
		name: "Error: exercise not found, but subexercises exist",
		bookUrl: "jezyk-niemiecki/ksiazka-13067/",
		page: 44,
		exercise: "4",
		expectedErrorType: ErrorType.ExerciseNotFoundButSubexercisesFoundError,
		expectedErrorMessage:
			"Nie znaleziono zadania 4 na stronie 44, ale znaleziono podpunkt a tego zadania"
	},
	{
		name: "Error: page not found",
		bookUrl: "matematyka/ksiazka-13007/",
		page: 2921,
		exercise: "6",
		expectedErrorType: ErrorType.PageNotFoundError,
		expectedErrorMessage:
			"Nie znaleziono zadań na stronie 2921. Jeśli w książce na takiej stronie znajdują się zadania, możliwe jest, że nie są jeszcze rozwiązane w odrabiamy.pl"
	},
	{
		name: "Error: individual exercise",
		bookUrl: "jezyk-niemiecki/ksiazka-11861/",
		page: 28,
		exercise: "2b",
		expectedErrorType: ErrorType.IndividualExerciseError,
		expectedErrorMessage:
			"Zadanie 2b na stronie 28 jest do rozwiązania indywidualnego. Nie ma rozwiązania w odrabiamy.pl"
	}
];

export default tests;

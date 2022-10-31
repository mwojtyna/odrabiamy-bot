declare global {
	namespace NodeJS {
		interface ProcessEnv {
			TOKEN: string;
			APP_ID: string;
			GUILD_ID: string;
			EMAIL: string;
			PASSWORD: string;
			NODE_ENV: "development" | "production";
		}
	}
}

// Required for type definition to work
export {};

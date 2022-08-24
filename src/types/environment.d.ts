declare global {
	namespace NodeJS {
		interface ProcessEnv {
			TOKEN: string;
			APP_ID: string;
			GUILD_ID: string;
			USERNAME: string;
			PASSWORD: string;
		}
	}
}

// Required for type definition to work
export {};
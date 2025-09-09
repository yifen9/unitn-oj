declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
				APP_ENV?: string;
				AUTH_ALLOWED_DOMAIN?: string;
				AUTH_TOKEN_TTL_SECONDS?: string;
				AUTH_SESSION_TTL_SECONDS?: string;
				RESEND_API_KEY?: string;
				RESEND_FROM?: string;
				TURNSTILE_SITE_KEY?: string;
				TURNSTILE_SECRET?: string;
			};
		}
	}
}

export {};

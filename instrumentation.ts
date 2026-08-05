import * as Sentry from "@sentry/nextjs";

// Server-side error reporting only. Dormant until SENTRY_DSN is set.
export function register() {
	if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN) {
		Sentry.init({
			dsn: process.env.SENTRY_DSN,
			environment: process.env.VERCEL_ENV || "development",
			tracesSampleRate: 0,
		});
	}
}

export const onRequestError = Sentry.captureRequestError;

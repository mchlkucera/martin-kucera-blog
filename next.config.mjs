/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		// Required for instrumentation.ts (Sentry) on Next 14
		instrumentationHook: true,
	},
};

export default nextConfig;

import "@/styles/globals.css";
import "@/styles/input.css";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
	title: "Martin Kucera",
	description: "Blog by Martin Kucera",
	icons: {
		icon: "/favicon.ico",
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="cs">
			<body>
				{/* Umami Analytics - Privacy-focused, GDPR compliant */}
				{process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
					<Script
						src={
							process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL ||
							"https://cloud.umami.is/script.js"
						}
						data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
						strategy="afterInteractive"
					/>
				)}
				{children}
			</body>
		</html>
	);
}

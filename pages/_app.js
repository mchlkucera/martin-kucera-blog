import "../styles/globals.css";
import "../styles/input.css";
import Script from "next/script";

function MyApp({ Component, pageProps }) {
	return (
		<>
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
			<Component {...pageProps} />
		</>
	);
}

export default MyApp;

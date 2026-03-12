import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
	subsets: ["latin"],
	variable: "--font-noto-sans-kr",
	display: "swap",
});

export const metadata: Metadata = {
	title: "FlowOS Mission Control",
	description: "Real-time monitoring dashboard for FlowOS Mac Mini nodes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ko" className={notoSansKr.variable}>
			<body className="antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}

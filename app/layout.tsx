import type { Metadata } from "next";
import { headers } from 'next/headers';
import "./globals.css";
import './fonts.css';
import './cyberpunk.css';
import './terminal.css';
import './reader.css';
import './netrunner.css';
import './stacks.css';
import './workspace.css';
import './controls.css';
import './edgerunners.css';


const siteMetadata: Metadata = {
  title: "Magnus Laser — Mesa del DM",
  description: "Tu mesa. Tus reglas. Herramientas de dirección de partida y generadores aleatorios cyberpunk, en una sola pantalla.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') || 'localhost:3000';
  const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
  const image = `${protocol}://${host}/og.png`;
  return {
    ...siteMetadata,
    openGraph: {
      title: 'Magnus Laser — Tu mesa. Tus reglas.',
      description: siteMetadata.description!,
      locale: 'es_ES',
      type: 'website',
      images: [{
        url: image,
        width: 1730,
        height: 909,
        type: 'image/png',
        alt: 'Logo de Magnus Laser en cian y naranja sobre su ciudad cyberpunk. Tu mesa. Tus reglas.',
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Magnus Laser — Mesa del DM',
      images: [image],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}

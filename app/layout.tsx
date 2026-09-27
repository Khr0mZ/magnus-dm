import type { Metadata } from "next";
import { assetPath } from '../lib/asset-path';
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
    icon: assetPath('/favicon.png'),
    shortcut: assetPath('/favicon.png'),
  },
};

export function generateMetadata(): Metadata {
  const siteUrl = new URL(process.env.MAGNUS_SITE_URL || 'https://khr0mz.github.io/magnus-dm/');
  const image = new URL('og.png', siteUrl).href;
  return {
    ...siteMetadata,
    metadataBase: siteUrl,
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

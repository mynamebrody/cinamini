import type { Metadata } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://cinamini.app"
const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL || "https://ik.imagekit.io/cinamini"

export const siteConfig = {
  name: "cinamini",
  description: "Daily movie puzzle games for cinema enthusiasts. Test your film knowledge with Retitled, Budget Bracket, and more!",
  url: BASE_URL,
  ogImage: `${IMAGEKIT_URL}/og-images/homepage.jpg`,
  keywords: "movie games, daily puzzles, film trivia, cinema games, movie challenges",
  authors: [{ name: "Brody Berson" }],
}

export const gameMetadata = {
  retitled: {
    title: "Retitled - Daily Movie Title Puzzle",
    description: "Can you guess the movie from its reimagined title? Play Retitled, the daily movie title puzzle game!",
    ogImage: `${IMAGEKIT_URL}/og-images/retitled.jpg`,
    ogImageAlt: `${BASE_URL}/api/og?game=retitled`,
  },
  "budget-bracket": {
    title: "Budget Bracket - Movie Budget Guessing Game",
    description: "Test your knowledge of movie budgets! Compare and guess which films cost more to make.",
    ogImage: `${IMAGEKIT_URL}/og-images/budget-bracket.jpg`,
    ogImageAlt: `${BASE_URL}/api/og?game=budget-bracket`,
  },
  "cast-climb": {
    title: "Cast Climb - Actor Connection Puzzle",
    description: "Connect actors through their shared movies. Challenge yourself with Cast Climb!",
    ogImage: `${IMAGEKIT_URL}/og-images/cast-climb.jpg`,
    ogImageAlt: `${BASE_URL}/api/og?game=cast-climb`,
  },
  "poster-pixels": {
    title: "Poster Pixels - Movie Poster Recognition",
    description: "Can you identify the movie from a pixelated poster? Test your visual memory!",
    ogImage: `${IMAGEKIT_URL}/og-images/poster-pixels.jpg`,
    ogImageAlt: `${BASE_URL}/api/og?game=poster-pixels`,
  },
}

export function constructMetadata({
  title = siteConfig.name,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  icons = [
    { rel: "icon", url: "/favicon.ico", sizes: "any" },
    { rel: "icon", url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { rel: "icon", url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    { rel: "apple-touch-icon", url: "/favicon/apple-touch-icon.png" },
    { rel: "manifest", url: "/favicon/site.webmanifest" },
  ],
  noIndex = false,
}: {
  title?: string
  description?: string
  image?: string
  icons?: any
  noIndex?: boolean
} = {}): Metadata {
  return {
    title,
    description,
    keywords: siteConfig.keywords,
    authors: siteConfig.authors,
    openGraph: {
      title,
      description,
      url: siteConfig.url,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: "@cinamini.app",
    },
    icons,
    metadataBase: new URL(siteConfig.url),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  }
}
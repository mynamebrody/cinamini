/**
 * Client-safe country utilities
 */

export const SUPPORTED_COUNTRIES = {
  'FR': { name: 'France', flag: '🇫🇷', priority: 1 },
  'ES': { name: 'Spain', flag: '🇪🇸', priority: 1 },
  'DE': { name: 'Germany', flag: '🇩🇪', priority: 1 },
  'IT': { name: 'Italy', flag: '🇮🇹', priority: 1 },
  'JP': { name: 'Japan', flag: '🇯🇵', priority: 2 },
  'KR': { name: 'South Korea', flag: '🇰🇷', priority: 2 },
  'CN': { name: 'China', flag: '🇨🇳', priority: 2 },
  'BR': { name: 'Brazil', flag: '🇧🇷', priority: 2 },
  'RU': { name: 'Russia', flag: '🇷🇺', priority: 3 },
  'IN': { name: 'India', flag: '🇮🇳', priority: 3 },
  'MX': { name: 'Mexico', flag: '🇲🇽', priority: 2 },
  'AR': { name: 'Argentina', flag: '🇦🇷', priority: 3 },
  'NL': { name: 'Netherlands', flag: '🇳🇱', priority: 2 },
  'SE': { name: 'Sweden', flag: '🇸🇪', priority: 3 },
  'NO': { name: 'Norway', flag: '🇳🇴', priority: 3 },
  'FI': { name: 'Finland', flag: '🇫🇮', priority: 3 },
  'DK': { name: 'Denmark', flag: '🇩🇰', priority: 3 },
  'PL': { name: 'Poland', flag: '🇵🇱', priority: 3 },
  'TR': { name: 'Turkey', flag: '🇹🇷', priority: 3 }
} as const

export type CountryCode = keyof typeof SUPPORTED_COUNTRIES

export function getCountryName(countryCode: string): string {
  return SUPPORTED_COUNTRIES[countryCode as CountryCode]?.name || 'Unknown'
}


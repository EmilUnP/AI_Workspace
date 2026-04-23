# Language Flags Guide

This guide explains how to use language flags in the eduator.ai project. Language flags can be displayed either as **flag emojis** (🇬🇧) or **flag images** from an external service.

## Table of Contents

- [Constants Location](#constants-location)
- [Flag Emojis](#flag-emojis)
- [Flag Images](#flag-images)
- [Code Examples](#code-examples)
- [Reusable Components](#reusable-components)

---

## Constants Location

All language flag constants are available from the `@eduator/config` package:

```typescript
import {
  LANGUAGE_TO_COUNTRY_CODE,
  LANGUAGE_FLAG_EMOJIS,
  LANGUAGES_WITH_FLAGS,
} from '@eduator/config'
```

**File:** `packages/config/src/constants.ts`

---

## Flag Emojis

Flag emojis are Unicode characters that display country flags. They're lightweight and don't require external requests.

### Using Flag Emojis

```typescript
import { LANGUAGE_FLAG_EMOJIS } from '@eduator/config'

// Get flag emoji for a language
const englishFlag = LANGUAGE_FLAG_EMOJIS['en'] // Returns: '🇬🇧'
const spanishFlag = LANGUAGE_FLAG_EMOJIS['es'] // Returns: '🇪🇸'

// Display in component
function LanguageBadge({ languageCode }: { languageCode: string }) {
  const flag = LANGUAGE_FLAG_EMOJIS[languageCode] || '🌐'
  return <span>{flag} {languageCode}</span>
}
```

### Available Flag Emojis

| Language Code | Flag Emoji | Country |
|--------------|------------|---------|
| `en` | 🇬🇧 | Great Britain |
| `az` | 🇦🇿 | Azerbaijan |
| `ru` | 🇷🇺 | Russia |
| `tr` | 🇹🇷 | Turkey |
| `de` | 🇩🇪 | Germany |
| `fr` | 🇫🇷 | France |
| `es` | 🇪🇸 | Spain |
| `it` | 🇮🇹 | Italy |
| `pt` | 🇵🇹 | Portugal |
| `zh` | 🇨🇳 | China |
| `ja` | 🇯🇵 | Japan |
| `ko` | 🇰🇷 | South Korea |
| `ar` | 🇸🇦 | Saudi Arabia |
| `hi` | 🇮🇳 | India |

---

## Flag Images

Flag images are loaded from [flagcdn.com](https://flagcdn.com), providing high-quality SVG/PNG flags. These require an external HTTP request but offer better visual quality.

### Using Flag Images

```typescript
import { LANGUAGE_TO_COUNTRY_CODE } from '@eduator/config'
import Image from 'next/image'

// Get country code for a language
const countryCode = LANGUAGE_TO_COUNTRY_CODE['en'] // Returns: 'gb'

// Flag URL format: https://flagcdn.com/w40/{countryCode}.png
// Available sizes: w20, w40, w80, w160, w320, w640

function FlagImage({ languageCode, size = 24 }: { languageCode: string; size?: number }) {
  const countryCode = LANGUAGE_TO_COUNTRY_CODE[languageCode] || 'gb'
  return (
    <Image
      src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
      alt={countryCode}
      width={size}
      height={Math.round(size * 0.75)}
      className="rounded-sm object-cover"
      unoptimized
    />
  )
}
```

### Next.js Configuration

Make sure `flagcdn.com` is added to your Next.js image domains in `next.config.js`:

```javascript
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
    ],
  },
}
```

---

## Code Examples

### Example 1: Language Selector with Flag Emojis

```typescript
'use client'

import { LANGUAGE_FLAG_EMOJIS, LANGUAGES_WITH_FLAGS } from '@eduator/config'

export function LanguageSelector() {
  return (
    <select className="border rounded px-3 py-2">
      {LANGUAGES_WITH_FLAGS.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flagEmoji} {lang.name}
        </option>
      ))}
    </select>
  )
}
```

### Example 2: Language Badge with Flag Image

```typescript
'use client'

import { LANGUAGE_TO_COUNTRY_CODE } from '@eduator/config'
import Image from 'next/image'

interface LanguageBadgeProps {
  languageCode: string
  showName?: boolean
  size?: number
}

export function LanguageBadge({ 
  languageCode, 
  showName = false,
  size = 24 
}: LanguageBadgeProps) {
  const countryCode = LANGUAGE_TO_COUNTRY_CODE[languageCode] || 'gb'
  const languageName = LANGUAGES_WITH_FLAGS.find(l => l.code === languageCode)?.name

  return (
    <div className="flex items-center gap-2">
      <Image
        src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
        alt={countryCode}
        width={size}
        height={Math.round(size * 0.75)}
        className="rounded-sm object-cover"
        unoptimized
      />
      {showName && languageName && <span>{languageName}</span>}
    </div>
  )
}
```

### Example 3: Multiple Language Flags Display

```typescript
'use client'

import { LANGUAGE_FLAG_EMOJIS } from '@eduator/config'

interface LanguageFlagsProps {
  languageCodes: string[]
  maxDisplay?: number
}

export function LanguageFlags({ languageCodes, maxDisplay = 3 }: LanguageFlagsProps) {
  const flagsToShow = languageCodes.slice(0, maxDisplay)
  const remaining = languageCodes.length - maxDisplay

  return (
    <div className="flex items-center gap-1">
      {flagsToShow.map((code) => (
        <span key={code} title={code}>
          {LANGUAGE_FLAG_EMOJIS[code] || '🌐'}
        </span>
      ))}
      {remaining > 0 && (
        <span className="text-sm text-gray-500">+{remaining}</span>
      )}
    </div>
  )
}

// Usage
<LanguageFlags languageCodes={['en', 'es', 'fr', 'de']} maxDisplay={3} />
```

### Example 4: Language Picker Dropdown

```typescript
'use client'

import { LANGUAGES_WITH_FLAGS } from '@eduator/config'
import Image from 'next/image'

export function LanguagePicker({ 
  selectedLanguage, 
  onLanguageChange 
}: { 
  selectedLanguage: string
  onLanguageChange: (code: string) => void 
}) {
  return (
    <div className="relative">
      <select
        value={selectedLanguage}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="appearance-none border rounded px-4 py-2 pr-8"
      >
        {LANGUAGES_WITH_FLAGS.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  )
}
```

---

## Reusable Components

### FlagIcon Component (Using Images)

```typescript
// components/ui/flag-icon.tsx
'use client'

import { LANGUAGE_TO_COUNTRY_CODE } from '@eduator/config'
import Image from 'next/image'

interface FlagIconProps {
  languageCode: string
  size?: number
  className?: string
}

export function FlagIcon({ languageCode, size = 24, className = '' }: FlagIconProps) {
  const countryCode = LANGUAGE_TO_COUNTRY_CODE[languageCode.toLowerCase()] || 'gb'
  
  return (
    <Image
      src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
      alt={`${countryCode} flag`}
      width={size}
      height={Math.round(size * 0.75)}
      className={`rounded-sm object-cover ${className}`}
      unoptimized
    />
  )
}
```

### FlagEmoji Component

```typescript
// components/ui/flag-emoji.tsx
'use client'

import { LANGUAGE_FLAG_EMOJIS } from '@eduator/config'

interface FlagEmojiProps {
  languageCode: string
  className?: string
}

export function FlagEmoji({ languageCode, className = '' }: FlagEmojiProps) {
  const flag = LANGUAGE_FLAG_EMOJIS[languageCode.toLowerCase()] || '🌐'
  return <span className={className}>{flag}</span>
}
```

---

## Helper Functions

### Get Country Code from Language Code

```typescript
import { LANGUAGE_TO_COUNTRY_CODE } from '@eduator/config'

export function getCountryCode(languageCode: string): string {
  return LANGUAGE_TO_COUNTRY_CODE[languageCode.toLowerCase()] || 'gb'
}

// Usage
const countryCode = getCountryCode('en') // Returns: 'gb'
```

### Get Flag Emoji from Language Code

```typescript
import { LANGUAGE_FLAG_EMOJIS } from '@eduator/config'

export function getFlagEmoji(languageCode: string): string {
  return LANGUAGE_FLAG_EMOJIS[languageCode.toLowerCase()] || '🌐'
}

// Usage
const flag = getFlagEmoji('es') // Returns: '🇪🇸'
```

### Get Flag Image URL

```typescript
import { LANGUAGE_TO_COUNTRY_CODE } from '@eduator/config'

export function getFlagImageUrl(languageCode: string, size: 'w20' | 'w40' | 'w80' | 'w160' = 'w40'): string {
  const countryCode = LANGUAGE_TO_COUNTRY_CODE[languageCode.toLowerCase()] || 'gb'
  return `https://flagcdn.com/${size}/${countryCode.toLowerCase()}.png`
}

// Usage
const flagUrl = getFlagImageUrl('en', 'w80') // Returns: 'https://flagcdn.com/w80/gb.png'
```

---

## Best Practices

1. **Use Flag Emojis for:**
   - Simple displays with minimal styling
   - When you need fast rendering without external requests
   - Mobile-first applications where bandwidth matters

2. **Use Flag Images for:**
   - High-quality displays where visual fidelity matters
   - When you need consistent sizing across platforms
   - When flag emoji support might be inconsistent

3. **Always provide fallbacks:**
   ```typescript
   const flag = LANGUAGE_FLAG_EMOJIS[code] || '🌐'
   const countryCode = LANGUAGE_TO_COUNTRY_CODE[code] || 'gb'
   ```

4. **Use TypeScript for type safety:**
   ```typescript
   type LanguageCode = 'en' | 'es' | 'fr' | 'de' | // ...
   function getFlag(code: LanguageCode): string { ... }
   ```

---

## Existing Usage in Codebase

- **Emoji Flags:** `packages/ui/src/utils/teacher-dashboard.ts` → `LANGUAGE_FLAGS`
- **Image Flags:** Multiple files use `flagcdn.com` with local `LANGUAGE_TO_COUNTRY` mappings
- **Components:** `exam-creator.tsx`, `teacher-dashboard-client.tsx`, `shared-content-list.tsx`

---

## Additional Resources

- [FlagCDN Documentation](https://flagcdn.com/)
- [ISO 3166-1 Country Codes](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)
- [Unicode Flag Emojis](https://unicode.org/emoji/charts/flag-emoji.html)
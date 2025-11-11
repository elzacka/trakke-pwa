# Privacy Compliance - GDPR

## Overview
This application complies with Norwegian privacy regulations (Personopplysningsloven) and GDPR by ensuring no personal data is transmitted to servers outside the EU.

## Implementation

### Fonts - Local Hosting
All fonts are now hosted locally to prevent data transmission to Google servers in the USA:

#### Material Symbols Outlined
- **Source**: Downloaded from Google's Material Design Icons repository
- **Location**: `/public/fonts/MaterialSymbolsOutlined.woff2`
- **Size**: ~3.6MB (variable font with all icons)
- **Format**: WOFF2 (modern, compressed)

#### Exo 2 Font Family
- **Source**: Downloaded from Google Fonts GitHub repository
- **Location**: `/public/fonts/Exo2-Variable.ttf`
- **Size**: ~297KB (variable font, weights 100-900)
- **Format**: TrueType (variable font)
- **Character Support**: Full Latin Extended including Norwegian å, ø, æ

### Benefits
1. **Privacy**: No external requests to Google Fonts or Google servers
2. **Performance**: Fonts cached locally with service worker
3. **Offline**: App works completely offline
4. **GDPR compliance**: No personal data (IP addresses, user agents) sent to USA

### Font Loading Strategy
- `font-display: swap` for text fonts (Exo 2) - prevents layout shift
- `font-display: block` for icon font - prevents icon flash
- All fonts loaded via `@font-face` in `/src/styles/index.css`

## Verification
To verify no external font requests:
1. Open browser DevTools (Network tab)
2. Filter by "Font" or "googleapis.com"
3. Confirm no requests to external font CDNs

## Maintenance
When updating fonts:
1. Download new font files from respective repositories
2. Replace files in `/public/fonts/`
3. Update `@font-face` declarations if needed
4. Test offline functionality

## References
- Personopplysningsloven: https://lovdata.no/dokument/NL/lov/2018-06-15-38
- GDPR Article 44-49: International data transfers
- Datatilsynet guidance on third-party services

# Tråkke PWA Icons

The PWA uses properly formatted maskable icons following 2025 best practices.

## Required Icons

- `icon-192.png` (192x192 pixels) - Android, smaller displays
- `icon-512.png` (512x512 pixels) - Android, splash screens, larger displays
- `apple-icon-180.png` (180x180 pixels) - iOS-specific app icon
- `favicon-196.png` (196x196 pixels) - Standard favicon

## Icon Design Specifications

### Branding Elements
- **Symbol**: Material Symbols "forest" icon (three stylized trees)
- **Color**: Tråkke green (#3e4533)
- **Background**: White (#ffffff)
- **Padding**: 20% (40% radius safe zone for maskable icons)
- **Design**: Icon-only, no text (follows PWA best practices)

### Maskable Icon Requirements
- 40% radius safe zone ensures icon content is visible across all platforms
- Platform-specific masks:
  - iOS: Rounded squares (20% radius)
  - Android: Circles (50% radius)
  - Samsung: Squircles (40% radius)

### Design Consistency
The PWA icons use the same forest symbol as the app header logo:
- Material Symbols "forest" icon (FILL0, wght200, GRAD0, opsz48)
- Tråkke green color (#3e4533)
- White background for better visibility across platforms

## Generating Icons

Icons are generated using the industry-standard `pwa-asset-generator` tool:

```bash
npx pwa-asset-generator temp/forest_320dp_3E4533_FILL0_wght200_GRAD0_opsz48.svg public --icon-only --favicon --type png --background "#ffffff" --padding "20%"
```

This command:
- Takes the source SVG from the `temp` folder
- Generates all required icon sizes with proper maskable formatting
- Applies 20% padding for 40% radius safe zone
- Creates platform-specific icons (iOS, favicon)

## Icon Format Requirements

### Technical Specifications

| Size | Usage | Purpose |
|------|-------|---------|
| 192x192 | Standard icon, Android home screen | any + maskable |
| 512x512 | Splash screens, high-res displays | any + maskable |
| 180x180 | iOS app icon | iOS-specific |
| 196x196 | Standard favicon | Browser favicon |

### Quality Requirements
- **Format**: PNG with transparency support
- **Color Space**: sRGB
- **Bit Depth**: 24-bit (8 bits per channel)
- **Compression**: Standard PNG compression
- **Transparency**: Full alpha channel support

## Manifest Configuration

Icons are configured in `vite.config.ts` following 2025 best practices with separate `purpose` entries:

```typescript
icons: [
  { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
]
```

**Note**: Separate entries for `purpose: "any"` and `purpose: "maskable"` are recommended over combined `purpose: "any maskable"` (MDN guidelines 2025).

## Verification

After generating icons, verify they appear correctly:

1. **Check file sizes**:
   ```bash
   ls -lh public/*.png
   ```
   All files should exist with reasonable sizes (3-10 KB)

2. **Visual inspection**:
   - Open all PNG files
   - Verify white background
   - Verify forest symbol is centered and clear
   - Verify adequate padding around symbol
   - Verify Tråkke green color (#3e4533)

3. **Test in PWA**:
   ```bash
   npm run build
   npm run preview
   ```
   - Open in browser
   - Install PWA
   - Check installed icon on home screen/desktop

## Platform-Specific Notes

### Android
- Uses both 192px and 512px icons
- 512px used for splash screens
- Maskable icon support with circular mask
- Safe zone ensures symbol is never cropped

### iOS
- Uses `apple-icon-180.png` for app icon
- Falls back to standard PWA icons if needed
- iOS automatically applies rounded corners

### Desktop (Chrome/Edge/Firefox)
- Uses 192px or 512px depending on context
- 512px preferred for taskbar/dock
- Maskable icons ensure consistent appearance

## Source Files

- **SVG Source**: `temp/forest_320dp_3E4533_FILL0_wght200_GRAD0_opsz48.svg` - Material Symbols forest icon
- **Generator**: `pwa-asset-generator` - Industry-standard PWA icon generation tool

## Updating Icons

When updating the Tråkke icon design:

1. Update the source SVG in the `temp` folder
2. Regenerate all icons using the `pwa-asset-generator` command above
3. Test across platforms (Android, iOS, Desktop)
4. Commit updated icon files

## Troubleshooting

### Icons not appearing
- Clear browser cache and service worker
- Rebuild PWA: `npm run build`
- Check manifest.json references correct icon paths

### Icons cropped on some platforms
- Verify 20% padding is applied during generation
- Check that icon content fits within 40% radius safe zone
- Regenerate with `pwa-asset-generator` if needed

### Icons too large/small
- Verify PNG dimensions match requirements
- Check file sizes - optimize if needed
- Ensure aspect ratio is 1:1 (square)

## GDPR Compliance

Icons are generated locally using:
- Local SVG source file (no external requests)
- `pwa-asset-generator` npm package (runs locally)
- No data sent to external services

This ensures full GDPR compliance with no user data leakage during icon generation.

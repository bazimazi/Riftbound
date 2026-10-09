# Eclipse sanctuary

The Eclipse presentation uses an original rift observatory illustration, generated with the built-in imagegen tool. `eclipse-sanctuary.png` is the original 1536 × 1024 artwork. `eclipse-sanctuary.webp` is the optimized runtime copy (357 KB), encoded at quality 90. The original generated file remains in the Codex generated-images folder.

The same scene supplies the lobby backdrop and Canvas character showcase. Existing hero sprites, transformations, animations and foot anchors are preserved. The WebP is embedded by Vite for offline play, including `file://` builds. Existing `sanctuary.png` remains available as the previous artwork.

`src/client/styles/eclipse.css` defines the indigo, violet and antique gold theme for the sanctuary, progression, collections and combat HUD. Outfit is bundled locally; display titles use the system Georgia serif. Decorative motion follows both the game motion setting and the operating system preference. Phone layouts scroll as one page; desktop layouts fit the viewport. The arsenal and objectives share a flow container so an expanded arsenal cannot obscure a contract.

## Final prompt

Use case: stylized-concept. Asset type: background illustration for the character-select sanctuary of Riftbound, a dark fantasy survival roguelite. Create a premium atmospheric painterly game environment in a wide landscape 1536x1024 composition. An ancient circular rift observatory, a monumental broken stone arch forming a luminous violet portal in the middle, jagged mountains and ruined gothic towers in the distance, a huge pale eclipsed moon high behind the arch, blue-black mist, small warm gold lanterns beside the stone steps, sparse floating embers, intricate weathered architecture and abandoned banners. A flat circular stone platform in the lower middle is EMPTY for a game character to be composited later. Balanced near-symmetrical composition, middle third must be readable as a cropped portrait background. Soft hand-painted shapes, rich atmospheric depth, art-directed indigo, muted amethyst, charcoal and warm antique gold, restrained luminosity, beautiful illustrated fantasy videogame key art. Foreground edges and far left/right are very dark to allow readable interface overlays. No characters, no creatures, no letters, no UI, no text, no watermark.

## Verification

`npm run test:ui` checks twelve heroes across nine screen sizes, full arsenal/objective separation, and existing paged dialog layouts, help and focus behavior. `npm run test:client` verifies the production build offline on desktop and phone. The game simulation and save format are unchanged.

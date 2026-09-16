# Art-generation prompt: Growthbound: The Last Signal

For generating supplementary 2D art (title screen illustration, guild emblem icons, Guardian portraits, marketing/social images) with an image-generation model. The live game itself renders hexes/units procedurally in-canvas (see `src/render/HexCanvas.tsx`) — these prompts are for static illustrative assets around that.

**Do not** reference Polytopia, its tribes, or any other existing game by name in the actual generation prompt — the phrasing below describes the *feeling*, not a copy target, and leans on the brief's own Filipino-inspired fantasy direction so the identity stays original and legally clean.

## Style anchor (prefix for every prompt below)

> Clean stylized 2.5D fantasy game art, low-poly geometric forms with soft rounded edges, warm golden-hour lighting, vivid but harmonious color palette (sun-baked gold, jade green, deep teal, terracotta), bold clean silhouettes readable at small size, gentle ambient occlusion instead of hard shadows, no text, no watermark, no UI elements. Southeast Asian island-fantasy influence: rice-terrace stepped architecture, outrigger-boat (bangka) silhouettes, capiz-shell translucent lantern shapes, monsoon-storm atmosphere in the distance. Charming and hopeful, not grim or gritty.

## 1. Title / key art

> [style anchor] A wide landscape at dawn: a lone young traveler stands on a hilltop holding up a small glowing device that pulses with warm light, facing outward over a vast valley where scattered stepped-terrace settlements sit disconnected by fog and broken stone causeways. Far in the distance, one tower on a mountaintop glows faintly in response. Sense of scale, solitude, and quiet hope. No title text.

## 2. Guild emblems (generate 4 separately, same icon-badge format)

> [style anchor] A single circular emblem badge, flat icon style with subtle bevel, centered on a plain dark background, no text: {GUILD MOTIF}. Bold, simple, instantly recognizable at 64px.

Substitute `{GUILD MOTIF}` with:
- **Pathfinders:** "a stylized open eye overlaid on a compass rose, rendered in pale cyan and white"
- **Forgeborn:** "a stylized anvil fused with a gear, rendered in warm amber and bronze"
- **Unbroken:** "a cracked stone that has been bound back together with golden thread (kintsugi-style), rendered in deep red and gold"
- **Keepers:** "a closed hand cupping a small flame, rendered in jade green and soft white"

## 3. Guardian portraits (generate 5 separately)

> [style anchor] A single original creature, three-quarter view, centered, plain dark gradient background, no text: {GUARDIAN DESCRIPTION}. Distinct, legible silhouette; friendly-epic rather than horrifying.

- **Emberhorn** (industry/exhaustion): "a massive weathered furnace-backed beast with a curved horn chimney venting soft orange embers, mountain-stone hide, slow and heavy"
- **Tidekeeper** (trade/memory): "an ancient sea creature whose broad shell carries the ruins of a small port town, barnacled and draped in kelp, gentle expression"
- **The Glass Wing** (vision/uncertainty): "a luminous translucent flying creature whose wings faintly reflect fragmented alternate skies, delicate and eerie-beautiful"
- **Rootfather** (resilience/stewardship): "a slow-walking figure made entirely of intertwined living tree roots and moss, cradling a small sapling, ancient and calm"
- **The Hollow Crown** (power/control): "a tall regal figure whose crown and robes dissolve into static/interference at the edges, imposing but tragic rather than purely evil"

## 4. Settlement / environment vignette (for loading screens, journal illustrations)

> [style anchor] A small stepped-terrace settlement built into a hillside at golden hour, glowing lantern-towers connecting it by a thin line of light to a distant point on the horizon, terraced fields, a few small figures going about daily life. Sense of quiet rebuilding after hardship.

## Practical notes

- Generate at square or 3:2 aspect ratio for widest reuse (social cards, loading screens, App Store assets).
- Keep every asset's palette within the style-anchor range so title art, emblems, and portraits feel like one world when placed together.
- The in-game canvas rendering (hexes, founder token, settlement huts) intentionally stays geometric/iconographic rather than painterly — these illustrated assets are for framing moments (title, victory/defeat screens, journal entries), not for replacing the live map rendering.

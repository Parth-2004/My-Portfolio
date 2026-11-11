# Media prompts

**Status:** the hero video, SIGNAL video, all six project covers and the link preview are now in `assets/`. Only `assets/portrait.jpg` is still missing. Use these prompts to regenerate anything you want to replace; the code picks up a new file with the same name automatically. A missing file falls back to the built-in canvas/CSS art.

| Slot | File | Size | Where it shows |
|---|---|---|---|
| Hero background video | `assets/hero.mp4` | 1920×1080, 24 fps, 8–10 s, no audio, ≤ 6 MB | Behind the particle name in the first screen |
| "SIGNAL" pill video | `assets/signal.mp4` | 1280×720, 24 fps, 5–6 s, no audio, ≤ 3 MB | Inside the pill that opens between SIG and NAL |
| Project covers (×6) | `assets/work/omni.jpg`, `trades.jpg`, `agency.jpg`, `loop.jpg`, `reposcan.jpg`, `chat.jpg` | 1600×1040 (≈16:10.4) | The 3D project cards in "Selected work" |
| Portrait | `assets/portrait.jpg` | 1200×1500 (4:5) | About section: rendered as a live halftone, real photo on hover |
| Link preview | `assets/og.jpg` | 1200×630 | WhatsApp / LinkedIn / Slack previews of your URL |

---

## 1. Hero background video: `assets/hero.mp4`

The particles spell your name in the upper middle of the screen, so that area must stay **dark and calm**. Keep motion toward the edges.

**Prompt** (Veo 3, Runway Gen-4, Kling, Luma, Sora, or similar):

> Slow cinematic dolly forward through a vast dark void filled with drifting threads of light, like neural pathways or data streams. Thin luminous filaments in deep indigo and teal curve gently across the edges of the frame, and tiny pale-lime sparks occasionally travel along them like signals. Soft volumetric haze, very shallow depth of field, creamy bokeh. The center and upper-middle of the frame stay dark and empty as negative space for a title. Near-black background, low exposure, high contrast, subtle film grain. One continuous shot, no cuts, very slow camera, seamless loop, 8 seconds, 24 fps, 16:9. No text, no logos, no people.

**Negative prompt:** text, letters, numbers, logos, watermark, faces, people, bright background, white background, fast motion, flicker, strobing, heavy lens flare

**Alternative mood** (more "product", less "space"):

> A single liquid-glass sphere slowly rotating in total darkness, refracting faint indigo and teal light, a thin ring of lime light orbiting it very slowly. Studio product lighting, black seamless background, the sphere sits low in the frame with empty dark space above it. Seamless 8 second loop, 24 fps, 16:9, no text.

## 2. SIGNAL pill video: `assets/signal.mp4`

It's cropped into a wide pill, so keep the subject centered and fill the frame edge to edge.

> Macro shot of chaotic glowing static, swirling indigo and teal particles, that gradually organizes into a single clean, smooth sine wave of bright lime-green light running horizontally through the center of the frame. Dark background, shallow depth of field, cinematic, gentle motion. Seamless 6 second loop, 24 fps, 16:9, no text.

## 3. Project covers: `assets/work/*.jpg`

The card title sits in the **bottom-left**, so ask for that corner to be dark. For a consistent set, generate all six with the same model and style settings. Even better, generate them as one 3×2 grid and crop.

Shared style suffix to append to each: *"abstract premium 3D render, cinematic lighting, soft volumetric fog, shallow depth of field, near-black background, dark empty lower-left corner for a title, 16:10, no text, no letters, no logos."*

- **omni.jpg (Omni-Engine):** A translucent glass monolith floating in deep indigo space, fine glowing threads connecting it to small floating glass document panes, each thread ending in a bright node, suggesting citations and traceability. Indigo and teal light.
- **trades.jpg (Anchorium Trades):** Polished chrome candlestick bars rising from a dark mirrored floor, warm orange and crimson rim light, a thin glowing trend line weaving upward through them.
- **agency.jpg (Automation Agency):** Soft frosted-glass chat bubbles flowing along a gentle curve through dark emerald space, one bubble glowing brighter as if answered by a person. Teal and green rim light.
- **loop.jpg (Loop AI):** A glossy infinity-loop ribbon made of liquid glass, lit in magenta and violet, small glowing particles travelling along it.
- **reposcan.jpg (RepoScanAI):** A glass magnifying lens hovering over a grid of softly glowing tiles, a few tiles lit bright blue as if flagged during an audit. Deep navy.
- **chat.jpg (Crypto Chat Stream):** A padlock made of light-refracting glass and brushed steel, surrounded by faint out-of-focus streams of glyphs. Cool silver-blue light.

## 4. Portrait: `assets/portrait.jpg`

Use a **real photo of yourself**, not a generated one. Recruiters expect your actual face. Tips:
- 4:5 crop, face in the upper-middle third, shoulders visible.
- Plain, darker background and strong light on one side. High contrast gives the best halftone.
- Optional cleanup prompt for an AI photo editor, used only on your own photo: *"Replace the background with a smooth dark charcoal studio backdrop and add a soft key light from the left. Keep my face, hair and clothing exactly as they are."*

## 5. Link preview: `assets/og.jpg`

Easiest: open the deployed site, take a 1200×630 screenshot of the hero, and save it as `assets/og.jpg`. Or generate a background with the hero prompt above and add "Parth Shikarwar · Software & ML/AI Engineer" in Canva or Figma.

---

## Compressing video for the web

Generated clips are often 20–80 MB. Compress them before committing (needs [ffmpeg](https://ffmpeg.org/)):

```bash
ffmpeg -i raw-hero.mp4 -vf "scale=1920:-2,fps=24" -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart -an assets/hero.mp4
```

```bash
ffmpeg -i raw-signal.mp4 -vf "scale=1280:-2,fps=24" -c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p -movflags +faststart -an assets/signal.mp4
```

The hero video crossfades at the loop point automatically, so it doesn't need a perfect seamless loop.

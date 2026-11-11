**Live:** https://parthshikarwar.vercel.app/

# Parth Shikarwar: Portfolio

A hand-built, motion-heavy portfolio. Plain HTML, CSS and JavaScript: no framework and no build step. It deploys anywhere that serves static files.

```
portfolio/
├── index.html          all content (SEO-friendly, edit text here)
├── 404.html            themed "page not found" (Vercel serves it automatically)
├── css/style.css       design tokens at the top (:root), then each section
├── js/main.js          every animation, driven by one requestAnimationFrame loop
├── assets/
│   ├── hero.mp4        hero background (light threads, 1280×720, 8 s, 1.1 MB)
│   ├── signal.mp4      video inside the SIGNAL pill (960×540, 6 s, 1.2 MB)
│   ├── og.jpg          1200×630 link preview for LinkedIn/WhatsApp/Slack
│   ├── Parth_Shikarwar_Resume.pdf
│   └── work/           six project covers (also used as case-study headers)
├── vercel.json         security headers + caching for /assets
├── .vercelignore       keeps README/MEDIA_PROMPTS off the live site
├── robots.txt, sitemap.xml
└── MEDIA_PROMPTS.md    the prompts used for the videos and covers
```

## What's on the page

1. **Hero:** your name built from ~5,000 particles that assemble out of random noise. The cursor pushes them apart, a click scatters them, and scrolling dissolves them back into noise. On phones a scripted "ghost finger" plays the effect once.
2. **Ticker:** tech names that reverse direction when you reverse your scroll.
3. **About:** a manifesto that lights up word by word as you scroll, a halftone portrait (your photo once added) and count-up stats.
4. **Journey:** Class X → Class XII → GGSIPU → Oracle → Winnovation → Samsung → Cadence → Anchorium → 2027. A glowing line fills as you scroll and the years light up as it passes.
5. **SIGNAL interlude:** a pill-shaped window opens between the letters as you scroll.
6. **Selected work:** a pinned 3D stack of six project cards. Each scroll step drops the front card. Clicking a card expands it into a full case study.
7. **From the lab:** six more projects with GitHub/live links.
8. **Workflows:** live, animated pipelines for Omni-Engine, Anchorium Trades, the Cadence search, Loop AI and the automation agency.
9. **Toolkit, Credentials:** skills bento and certificate links.
10. **Contact:** a working form (Formspree) over a dotted globe with arcs from New Delhi.
11. **Footer:** a giant glass wordmark.

## Run it locally

```bash
python -m http.server 8137 --directory portfolio
```

Then open http://localhost:8137. Opening `index.html` directly with `file://` also works, but a server is closer to production.

> **Animations are always on**, even when a visitor's operating system has *reduce motion* / *Animation effects* turned off. A calm version (no ambient motion) still exists for testing: add `?motion=reduced` to the URL, e.g. `http://localhost:8137/?motion=reduced`.

## Deploy to Vercel

It's a static site: **no build step, no `package.json`, no framework**. Vercel serves the folder as-is.

**Option A: replace your current site** (keeps `parthshikarwar.vercel.app`)
1. In your `My-Portfolio` GitHub repo, delete the old `index.html` and copy in *everything* from this folder, including the dotfile `.vercelignore`.
2. Commit and push. Vercel redeploys automatically.

**Option B: new project from the command line**
```bash
cd portfolio
npx vercel --prod
```
The first run asks you to log in and a few setup questions. Accept the defaults: framework "Other", no build command, output directory `.`.

**Option C: import a GitHub repo in the Vercel dashboard.** New Project → pick the repo → Framework Preset **Other** → leave Build and Output empty. If this folder sits inside a bigger repo, set **Root Directory** to the folder.

### After the first deploy
- If the URL isn't `https://parthshikarwar.vercel.app/`, find-and-replace that URL in `index.html` (canonical, `og:url`, `og:image`, `twitter:image`, JSON-LD), `robots.txt` and `sitemap.xml`.
- Paste the URL into https://www.opengraph.xyz to check the link preview.
- Send yourself one message through the contact form to confirm Formspree delivers it.
- When you change `css/style.css` or `js/main.js`, bump the `?v=2` on their `<link>`/`<script>` tags in `index.html` so returning visitors get the new files.

## Contact form

The form posts to `https://formspree.io/f/xgopjrny`, the same Formspree endpoint your current portfolio uses, so messages arrive in that Formspree inbox. To use a different inbox, create a form at formspree.io and replace the `action="..."` URL on the `<form class="contact-form">` tag. A hidden honeypot field filters basic spam bots.

## Things to check before you publish

Search `index.html` for `EDIT:` comments.

- **Class X / Class XII:** the résumé doesn't list them. Your old site said *Don Bosco School, New Delhi · 2022*, so the timeline shows Class XII (Science) in 2022 and Class X in 2020. Correct the years and add your board/percentages if you want them shown.
- **Cadence status:** the résumé lists May–Jul 2026, so the site describes it in the past tense. If you're still there, tell visitors (e.g. change the hero foot line).
- **Certificate links:** the four Google Drive links were matched to Cadence, Winnovation, Oracle and Samsung in the order they appear in the résumé. Click each one once to confirm.
- **Phone number:** left off deliberately (public pages get scraped). Add it to the contact list if you want it.
- **Portrait:** the About card currently shows a "PS" monogram as a halftone. Add a real photo of yourself as `assets/portrait.jpg` (4:5, about 1200×1500). It renders as a live halftone and switches to the real photo on hover.

## Editing tips

- **Colors and fonts:** `:root` at the top of `css/style.css`. The lime `--accent` is reserved for "live" signals (status dot, timeline, pipeline packets, primary hover).
- **Add a project card:** copy one `<article class="wk-card">` block, give it a new `data-case` id, add a matching `<article data-case="...">` in the hidden `.case-src` block, and bump `style="--n:6"` on `.wk` to the new count.
- **Add a workflow tab:** copy a `.flow-tab` button and its `.flow` panel; the ids must match (`tab-xyz` ↔ `flow-xyz`).

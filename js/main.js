/* ==========================================================================
   Parth Shikarwar — Portfolio runtime
   One rAF loop drives everything: smooth scroll, hero particles, card peel,
   timeline, halftone portrait, globe, cursor. Each module self-pauses when
   off-screen and respects prefers-reduced-motion.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const root = document.documentElement;
  const RM = root.classList.contains('rm'); // set in <head>; ?motion=full overrides the OS preference
  if (RM) $$('svg').forEach(s => s.pauseAnimations && s.pauseAnimations());
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const DESK = matchMedia('(min-width: 992px)');
  const SAVE_DATA = !!(navigator.connection && navigator.connection.saveData);

  /* pointer */
  const ptr = { x: innerWidth / 2, y: innerHeight / 2, has: false };
  addEventListener('pointermove', e => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.has = true; }, { passive: true });
  const dropPtr = e => { if (!e || e.pointerType !== 'mouse') ptr.has = false; };
  addEventListener('pointerup', dropPtr, { passive: true });
  addEventListener('pointercancel', dropPtr, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { ptr.has = false; });

  if ('scrollRestoration' in history && !location.hash) history.scrollRestoration = 'manual';

  /* single clock */
  const updaters = [];
  const onFrame = fn => updaters.push(fn);
  const watch = (el, cb, margin = '10% 0px') => {
    if (!el) return;
    new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { rootMargin: margin }).observe(el);
  };
  const debounce = (fn, ms = 180) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!RM && typeof window.Lenis === 'function') {
    try { lenis = new window.Lenis({ lerp: .1, smoothWheel: true, wheelMultiplier: 1 }); } catch (e) { lenis = null; }
  }
  const scrollToY = (target) => {
    if (lenis) { lenis.scrollTo(target, { duration: 1.4, force: true }); return; }
    const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY;
    scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
  };

  /* ---------- toast ---------- */
  const toast = msg => {
    const t = $('.toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 1900);
  };

  /* ==========================================================================
     Split headlines + reveal
     ========================================================================== */
  function splitWords(el) {
    let i = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          if (!n.textContent.trim()) return;
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p.indexOf(' ') > -1 ? ' ' : ' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = p; s.style.setProperty('--wi', i++);
            w.appendChild(s); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR' && !n.classList.contains('sr-only')) {
          walk(n);
        }
      });
    };
    walk(el);
  }
  $$('[data-split]').forEach(splitWords);

  const revealIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });

  /* ==========================================================================
     Menu (mobile)
     ========================================================================== */
  const Menu = (() => {
    const btn = $('.nav-burger'), menu = $('#menu');
    let open = false;
    const set = v => {
      if (!menu || !btn) return;
      open = v; btn.setAttribute('aria-expanded', String(v)); root.classList.toggle('menu-open', v);
      if (v) { menu.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('open'))); lenis && lenis.stop(); }
      else { menu.classList.remove('open'); setTimeout(() => { if (!open) menu.hidden = true; }, 450); lenis && lenis.start(); }
    };
    btn && btn.addEventListener('click', () => set(!open));
    addEventListener('keydown', e => { if (e.key === 'Escape' && open) set(false); });
    return { close: () => { if (open) set(false); }, isOpen: () => open };
  })();

  /* ==========================================================================
     Case-study overlay (expands from the clicked card)
     ========================================================================== */
  const Case = (() => {
    const wrap = $('.case'), panel = $('.case-panel'), body = $('.case-body'), closeBtn = $('.case-close');
    if (!wrap) return { open() {}, close(cb) { cb && cb(); }, isOpen: () => false };
    let open = false, from = null, lastFocus = null;
    const inset = r => `inset(${Math.max(0, r.top)}px ${Math.max(0, innerWidth - r.right)}px ${Math.max(0, innerHeight - r.bottom)}px ${Math.max(0, r.left)}px round 24px)`;
    const FULL = 'inset(0px 0px 0px 0px round 0px)';

    function openCase(id, fromEl, viaKeyboard) {
      const src = $(`.case-src [data-case="${id}"]`);
      if (!src || open) return;
      open = true; lastFocus = document.activeElement;
      panel.getAnimations().forEach(a => a.cancel()); body.getAnimations().forEach(a => a.cancel());
      body.replaceChildren(src.cloneNode(true));
      wrap.hidden = false; panel.scrollTop = 0;
      lenis && lenis.stop(); root.classList.add('case-open');
      const r = fromEl && fromEl.getBoundingClientRect();
      from = r && r.width > 10 && r.bottom > 0 && r.top < innerHeight
        ? { top: r.top, right: r.right, bottom: r.bottom, left: r.left }
        : { top: innerHeight * .3, right: innerWidth * .7, bottom: innerHeight * .7, left: innerWidth * .3 };
      if (!RM) {
        panel.animate([{ clipPath: inset(from) }, { clipPath: FULL }], { duration: 850, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
        body.animate([{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], { duration: 750, delay: 420, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
      }
      setTimeout(() => (viaKeyboard ? closeBtn : panel).focus({ preventScroll: true }), 60);
    }

    function closeCase(after) {
      if (!open) { after && after(); return; }
      open = false;
      const finish = () => {
        wrap.hidden = true; body.replaceChildren();
        panel.getAnimations().forEach(a => a.cancel()); body.getAnimations().forEach(a => a.cancel());
        root.classList.remove('case-open'); lenis && lenis.start();
        if (after) after(); else if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      };
      if (RM) { finish(); return; }
      body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
      const a = panel.animate([{ clipPath: FULL }, { clipPath: inset(from) }], { duration: 700, delay: 120, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
      a.onfinish = finish;
    }

    closeBtn.addEventListener('click', () => closeCase());
    addEventListener('keydown', e => {
      if (!open) return;
      if (e.key === 'Escape') { closeCase(); return; }
      if (e.key === 'Tab') { // focus trap
        const f = $$('a[href], button:not([disabled])', panel).filter(el => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    return { open: openCase, close: closeCase, isOpen: () => open };
  })();

  /* ==========================================================================
     Workflows (tabs + live pipeline)
     ========================================================================== */
  const Flows = (() => {
    const tabs = $$('.flow-tab'), panels = $$('.flow'), ind = $('.flow-ind'), board = $('.flow-board');
    if (!tabs.length) return { select() {} };
    const ids = tabs.map(t => t.id.replace('tab-', ''));
    let cur = 0, step = 0, timer = 0, vis = false;

    const moveInd = () => { const t = tabs[cur]; if (!t || !ind) return; ind.style.width = t.offsetWidth + 'px'; ind.style.transform = `translateX(${t.offsetLeft}px)`; };
    function select(i) {
      if (typeof i === 'string') i = Math.max(0, ids.indexOf(i));
      cur = i;
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === i)); t.tabIndex = j === i ? 0 : -1; });
      panels.forEach((p, j) => { p.hidden = j !== i; });
      moveInd();
      $$('.node', panels[cur]).forEach(n => n.classList.remove('on', 'done'));
      $$('.link', panels[cur]).forEach(l => l.classList.remove('go'));
      step = 0; timer = 800;
      if (RM) $$('.node', panels[cur]).forEach(n => n.classList.add('done'));
      const t = tabs[cur]; if (t && t.parentElement.scrollWidth > t.parentElement.clientWidth) t.parentElement.scrollTo({ left: t.offsetLeft - 20, behavior: 'smooth' });
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        select(j); tabs[j].focus();
      });
    });
    watch(board, v => { vis = v; });
    addEventListener('resize', debounce(moveInd, 100));
    if (document.fonts) document.fonts.ready.then(moveInd);

    onFrame(dt => {
      if (!vis || RM) return;
      timer += dt;
      const nodes = panels[cur].querySelectorAll('.node'), N = nodes.length;
      if (timer < (step >= N ? 1900 : 1050)) return;
      timer = 0;
      if (step >= N) { nodes.forEach(n => n.classList.remove('on', 'done')); step = 0; }
      nodes.forEach((n, j) => { n.classList.toggle('on', j === step); n.classList.toggle('done', j < step); });
      const l = panels[cur].querySelectorAll('.link')[step];
      if (l) { l.classList.remove('go'); void l.offsetWidth; l.classList.add('go'); }
      step++;
    });
    select(0);
    return { select };
  })();

  /* ==========================================================================
     Global click routing: anchors, case openers, copy buttons
     ========================================================================== */
  document.addEventListener('click', e => {
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      const v = copy.dataset.copy;
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(() => toast('Email copied'), () => toast(v));
      else toast(v);
      return;
    }

    const a = e.target.closest('a[href^="#"]');
    if (a) {
      const id = a.getAttribute('href');
      const isTop = id === '#' || id === '#top';
      const target = isTop ? null : $(id);
      if (!isTop && !target) return;
      e.preventDefault();
      const flow = a.dataset.flow;
      const go = () => { if (flow) Flows.select(flow); scrollToY(isTop ? 0 : target); };
      Menu.close();
      if (Case.isOpen()) Case.close(go); else go();
      return;
    }

    const opener = e.target.closest('[data-open]');
    if (opener) { Case.open(opener.dataset.open, $(`.wk-card[data-case="${opener.dataset.open}"] .wk-art`), e.detail === 0); return; }
    const art = e.target.closest('.wk-card .wk-art');
    if (art) Case.open(art.closest('.wk-card').dataset.case, art, false);
  });

  /* ==========================================================================
     Nav: hide on scroll down, active section
     ========================================================================== */
  (() => {
    const nav = $('.nav'); if (!nav) return;
    let lastY = scrollY, hidden = false;
    onFrame(() => {
      const y = scrollY, dy = y - lastY;
      if (Math.abs(dy) < 6) return;
      const h = y > 220 && dy > 0 && !Menu.isOpen();
      if (h !== hidden) { hidden = h; nav.classList.toggle('hide', h); }
      lastY = y;
    });
    const links = $$('.nav-pill a[data-nav]');
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.dataset.nav === e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(a => { const s = document.getElementById(a.dataset.nav); s && io.observe(s); });
    const top = document.getElementById('top'); top && io.observe(top); // clears the highlight over the hero
  })();

  /* scroll progress */
  (() => {
    const bar = $('.progress i'); if (!bar) return;
    let last = -1;
    onFrame(() => {
      const max = root.scrollHeight - innerHeight;
      const p = max > 0 ? clamp(scrollY / max) : 0;
      if (Math.abs(p - last) > .0005) { last = p; bar.style.transform = `scaleX(${p.toFixed(4)})`; }
    });
  })();

  /* ==========================================================================
     HERO — "Parth." assembled from noise; cursor repels, click scatters,
     scrolling disperses it back into noise.
     ========================================================================== */
  const Hero = (() => {
    const hero = $('.hero'), cvs = $('.hero-canvas'), content = $('.hero-content');
    if (!hero || !cvs || !cvs.getContext) return { start() {} };
    const ctx = cvs.getContext('2d');
    const COLORS = ['rgba(242,241,236,.95)', 'rgba(242,241,236,.5)', 'rgba(165,152,255,.95)', 'rgba(105,226,212,.85)', 'rgba(212,255,58,1)'];
    const font = fs => `italic 400 ${fs}px "Instrument Serif", "Times New Roman", serif`;
    const hint = $('.hero-hint'); if (hint && !FINE) hint.textContent = 'Tap the noise to scatter it';
    let W = 0, H = 0, P = [], B = [[], [], [], [], []], started = false, visible = true, t0 = 0, lastW = 0, lastH = 0;

    function band() {
      const top = innerWidth < 992 ? 104 : 116;
      const bottom = content.offsetTop - (innerWidth < 600 ? 4 : 18);
      return { top, bottom };
    }

    function sample() {
      const off = document.createElement('canvas'); off.width = W; off.height = H;
      const o = off.getContext('2d', { willReadFrequently: true });
      const { top, bottom } = band();
      const bandH = Math.max(bottom - top, H * .2);
      o.textBaseline = 'alphabetic';
      o.font = font(100);
      let m = o.measureText('Parth.');
      const wR = ((m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width)) / 100;
      const hR = ((m.actualBoundingBoxAscent || 70) + (m.actualBoundingBoxDescent || 2)) / 100;
      const fs = Math.min((W * .9) / wR, (bandH * .94) / hR, 600);
      o.font = font(fs);
      m = o.measureText('Parth.');
      const wWord = o.measureText('Parth').width;
      const bl = m.actualBoundingBoxLeft || 0, br = m.actualBoundingBoxRight || m.width;
      const asc = m.actualBoundingBoxAscent || fs * .7, desc = m.actualBoundingBoxDescent || 0;
      const x0 = (W - (bl + br)) / 2 + bl;
      const base = top + (bandH - (asc + desc)) / 2 + asc;
      o.fillStyle = '#fff'; o.fillText('Parth', x0, base);
      o.fillStyle = '#f00'; o.fillText('.', x0 + wWord, base);
      const y0 = Math.max(0, Math.floor(base - asc - 4)), y1 = Math.min(H, Math.ceil(base + desc + 6));
      const data = o.getImageData(0, 0, W, H).data;
      const target = W < 700 ? 2600 : 5200;
      let step = W < 700 ? 3 : 4, pts;
      do {
        pts = [];
        for (let y = y0; y < y1; y += step) for (let x = 0; x < W; x += step) {
          const i = (y * W + x) * 4;
          if (data[i + 3] > 128) pts.push(x, y, data[i + 1] < 120 ? 1 : 0);
        }
        step++;
      } while (pts.length / 3 > target && step < 14);
      return pts;
    }

    function build() {
      W = cvs.clientWidth; H = cvs.clientHeight;
      if (!W || !H) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      lastW = W; lastH = H;
      cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pts = sample(), n = pts.length / 3, old = P, diag = Math.hypot(W, H);
      P = new Array(n);
      for (let i = 0; i < n; i++) {
        const isDot = pts[i * 3 + 2] === 1, r = Math.random();
        const c = isDot ? 4 : r < .07 ? 2 : r < .12 ? 3 : r < .6 ? 0 : 1;
        const ang = Math.random() * Math.PI * 2, sp = (.35 + Math.random() * .9) * diag * .55;
        const o = old[i];
        P[i] = {
          hx: pts[i * 3], hy: pts[i * 3 + 1],
          x: o ? o.x : RM ? pts[i * 3] : Math.random() * W, y: o ? o.y : RM ? pts[i * 3 + 1] : Math.random() * H,
          vx: 0, vy: 0, c, ph: Math.random() * 6.2832,
          sx: Math.cos(ang) * sp, sy: Math.sin(ang) * sp - H * .2,
          s: isDot ? 2.6 : 1.1 + Math.random() * 1.25
        };
      }
      B = [[], [], [], [], []]; P.forEach(p => B[p.c].push(p));
    }

    // In calm (reduced-motion) mode the word starts assembled and never drifts on its own,
    // but it still reacts to the visitor's own cursor and scroll.
    function frame(dt, now) {
      if (!started || !visible || !P.length) return;
      const f = Math.min(dt, 50) / 16.667;
      const sy = scrollY;
      const sc = easeIO(clamp(sy / (hero.offsetHeight * .8)));
      const age = (now - t0) / 1000;
      const k = (RM ? .024 : .004 + .02 * easeOut(clamp(age / 1.9))) * f;
      const damp = Math.pow(.84, f);
      const R = W < 700 ? 74 : 130, R2 = R * R;
      const wob = RM ? 0 : .8;

      // pointer (real, or a scripted "ghost" sweep on touch screens)
      let mx = ptr.x, my = ptr.y + sy, usePtr = ptr.has;
      if (!FINE && !RM && !ptr.has && age > 1.6 && age < 5.6) {
        const t = (age - 1.6) / 4;
        const { top, bottom } = band();
        mx = W * (.08 + .84 * t); my = (top + bottom) / 2 + Math.sin(t * Math.PI * 3) * (bottom - top) * .22; usePtr = true;
      }

      const w1 = now * .0011;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 5; b++) {
        const arr = B[b]; ctx.fillStyle = COLORS[b];
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          const tx = p.hx + p.sx * sc + Math.sin(w1 + p.ph) * wob;
          const ty = p.hy + p.sy * sc + Math.cos(w1 * .9 + p.ph * 1.3) * wob;
          if (usePtr) {
            const dx = p.x - mx, dy = p.y - my, dd = dx * dx + dy * dy;
            if (dd < R2 && dd > .01) { const d = Math.sqrt(dd), fo = (1 - d / R) * 5.2 * f; p.vx += dx / d * fo; p.vy += dy / d * fo; }
          }
          p.vx = (p.vx + (tx - p.x) * k) * damp;
          p.vy = (p.vy + (ty - p.y) * k) * damp;
          p.x += p.vx * f; p.y += p.vy * f;
          ctx.fillRect(p.x, p.y, p.s, p.s);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      cvs.style.opacity = (1 - sc * .85).toFixed(3);
    }

    hero.addEventListener('pointerdown', e => {
      if (!started || e.target.closest('a, button, input, textarea')) return;
      const x = e.clientX, y = e.clientY + scrollY;
      for (const p of P) {
        const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
        if (d < 300) { const fo = (1 - d / 300) * 24; p.vx += dx / d * fo; p.vy += dy / d * fo; }
      }
    });

    watch(hero, v => { visible = v; }, '0px');
    addEventListener('resize', debounce(() => {
      if (!started) return;
      const w = cvs.clientWidth, h = cvs.clientHeight;
      if (w !== lastW || Math.abs(h - lastH) > 120) build();
    }, 200));
    onFrame(frame);

    async function start() {
      try { await Promise.race([document.fonts.load(font(120)), new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* fallback font */ }
      build(); started = true; t0 = performance.now();
    }
    return { start };
  })();

  /* hero / interlude video helper: crossfade loop (fade in on load, out before the end) */
  function fadingVideo(v, FADE = 600, LEAD = .6) {
    let raf, out = false; v.style.opacity = 0; v.loop = false; v.muted = true; v.playsInline = true;
    const fadeTo = to => {
      cancelAnimationFrame(raf); const from = +v.style.opacity || 0, t0 = performance.now();
      const st = t => { const k = Math.min(1, (t - t0) / FADE); v.style.opacity = from + (to - from) * k; if (k < 1) raf = requestAnimationFrame(st); };
      raf = requestAnimationFrame(st);
    };
    v.addEventListener('loadeddata', () => { v.play().catch(() => {}); fadeTo(1); });
    v.addEventListener('timeupdate', () => { const left = v.duration - v.currentTime; if (!out && left > 0 && left <= LEAD) { out = true; fadeTo(0); } });
    v.addEventListener('ended', () => { v.style.opacity = 0; setTimeout(() => { v.currentTime = 0; v.play().catch(() => {}); out = false; fadeTo(1); }, 80); });
  }
  function heroVideo() {
    const v = $('.hero-video');
    if (!v || RM || SAVE_DATA || !v.dataset.src) return;
    v.addEventListener('error', () => v.remove(), { once: true });
    fadingVideo(v);
    v.src = v.dataset.src;
    let inView = true;
    watch($('.hero'), on => { inView = on; if (!v.isConnected || !v.currentSrc) return; on ? v.play().catch(() => {}) : v.pause(); }, '0px');
    // browsers pause muted video in background tabs; resume when the visitor comes back
    document.addEventListener('visibilitychange', () => { if (!document.hidden && inView && v.isConnected && v.currentSrc) v.play().catch(() => {}); });
  }

  /* ==========================================================================
     Ticker — reverses with scroll direction, speeds up with velocity
     ========================================================================== */
  (() => {
    const tracks = $$('.tk-track'); if (!tracks.length || RM) return;
    let lastY = scrollY, dir = 1, vel = 0, lastRate = 1, vis = false;
    watch($('.ticker'), v => { vis = v; });
    onFrame(() => {
      const y = scrollY, dy = y - lastY; lastY = y;
      if (Math.abs(dy) > .5) dir = dy > 0 ? 1 : -1;
      vel = lerp(vel, Math.min(Math.abs(dy) / 6, 5), .08);
      if (!vis) return;
      const rate = dir * (1 + vel);
      if (Math.abs(rate - lastRate) > .04) {
        lastRate = rate;
        tracks.forEach(t => { const a = t.getAnimations ? t.getAnimations()[0] : null; if (a) a.playbackRate = rate; });
      }
    });
  })();

  /* ==========================================================================
     About — scroll-lit manifesto, halftone portrait, count-ups
     ========================================================================== */
  (() => {
    const p = $('.manifesto'); if (!p) return;
    const words = p.textContent.trim().split(/\s+/);
    p.textContent = '';
    const spans = words.map((w, i) => {
      const s = document.createElement('span'); s.className = 'mw'; s.textContent = w;
      p.appendChild(s); if (i < words.length - 1) p.appendChild(document.createTextNode(' '));
      return s;
    });
    if (RM) { spans.forEach(s => s.classList.add('on')); return; }
    let lit = -1;
    onFrame(() => {
      const r = p.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const prog = clamp((innerHeight * .82 - r.top) / (r.height + innerHeight * .3));
      const n = Math.round(prog * spans.length);
      if (n !== lit) { for (let i = 0; i < spans.length; i++) spans[i].classList.toggle('on', i < n); lit = n; }
    });
  })();

  (() => {
    const fig = $('.portrait'), cvs = $('.portrait-canvas'), img = $('.portrait-img');
    if (!fig || !cvs) return;
    const ctx = cvs.getContext('2d');
    let W = 0, H = 0, G = 7, lum = null, cols = 0, rows = 0, vis = false, src = null;

    function prep() {
      W = cvs.clientWidth; H = cvs.clientHeight; if (!W || !H) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      G = W < 380 ? 6 : 7;
      const off = document.createElement('canvas'); off.width = W; off.height = H;
      const o = off.getContext('2d', { willReadFrequently: true });
      o.fillStyle = '#000'; o.fillRect(0, 0, W, H);
      if (src) {
        const s = Math.max(W / src.naturalWidth, H / src.naturalHeight), dw = src.naturalWidth * s, dh = src.naturalHeight * s;
        o.filter = 'grayscale(1) contrast(1.15) brightness(1.05)'; o.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh); o.filter = 'none';
      } else {
        const g = o.createRadialGradient(W * .45, H * .4, 0, W * .5, H * .45, W * .85);
        g.addColorStop(0, '#2c2c2c'); g.addColorStop(1, '#000'); o.fillStyle = g; o.fillRect(0, 0, W, H);
        o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'alphabetic';
        o.font = `italic 400 ${W * .66}px "Instrument Serif", serif`;
        o.fillText('PS', W * .5, H * .64);
        o.fillStyle = 'rgba(255,255,255,.55)';
        o.font = `italic 400 ${W * .66}px "Instrument Serif", serif`;
        o.fillText('.', W * .5 + o.measureText('PS').width / 2 + W * .05, H * .64);
      }
      const d = o.getImageData(0, 0, W, H).data;
      cols = Math.ceil(W / G); rows = Math.ceil(H / G);
      lum = new Float32Array(cols * rows);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = Math.min(W - 1, (c * G + G / 2) | 0), y = Math.min(H - 1, (r * G + G / 2) | 0), i = (y * W + x) * 4;
        lum[r * cols + c] = (d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114) / 255;
      }
      draw(performance.now());
    }

    function draw(now) {
      if (!lum) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#ecebe6';
      const r = cvs.getBoundingClientRect(), mx = ptr.x - r.left, my = ptr.y - r.top;
      const near = ptr.has && mx > -80 && my > -80 && mx < W + 80 && my < H + 80;
      const t = now / 520;
      ctx.beginPath();
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const L = lum[y * cols + x]; if (L < .05) continue;
        const cx = x * G + G / 2, cy = y * G + G / 2;
        let rad = L * G * .56 * (RM ? 1 : (.86 + .14 * Math.sin(t + cx * .045 + cy * .03)));
        if (near) { const dd = Math.hypot(cx - mx, cy - my); if (dd < 120) rad *= 1 + .75 * (1 - dd / 120); }
        if (rad < .4) continue;
        rad = Math.min(rad, G * .74);
        ctx.moveTo(cx + rad, cy); ctx.arc(cx, cy, rad, 0, 6.2832);
      }
      ctx.fill();
    }

    watch(fig, v => { vis = v; });
    let wasNear = false;
    onFrame((dt, now) => {
      if (!vis) return;
      if (!RM) { draw(now); return; }
      // calm mode: redraw only while the visitor's cursor is over the portrait
      const r = cvs.getBoundingClientRect();
      const near = ptr.has && ptr.x > r.left - 80 && ptr.x < r.right + 80 && ptr.y > r.top - 80 && ptr.y < r.bottom + 80;
      if (near || wasNear) draw(now);
      wasNear = near;
    });
    addEventListener('resize', debounce(prep, 200));
    const go = () => {
      const probe = new Image();
      probe.onload = () => { src = probe; img.src = probe.src; img.hidden = false; fig.classList.add('has-photo'); prep(); };
      probe.onerror = () => { src = null; prep(); };
      probe.src = 'assets/portrait.jpg';
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(go);
  })();

  const Counts = (() => {
    const els = $$('.count');
    const paint = (el, v) => {
      const dec = +(el.dataset.dec || 0), suf = el.dataset.suffix || '';
      el.textContent = v.toFixed(dec);
      if (suf) { const s = document.createElement('small'); s.textContent = suf; el.appendChild(s); }
    };
    els.forEach(el => paint(el, 0));
    const run = el => {
      const to = parseFloat(el.dataset.to);
      if (RM) { paint(el, to); return; }
      const t0 = performance.now(), D = 1700;
      const st = now => { const k = clamp((now - t0) / D); paint(el, to * easeOut(k)); if (k < 1) requestAnimationFrame(st); };
      requestAnimationFrame(st);
    };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); run(e.target); } }), { threshold: .4 });
    return { init: () => els.forEach(el => io.observe(el)) };
  })();

  /* ==========================================================================
     Journey timeline — spine fills with scroll, nodes light, years parallax
     ========================================================================== */
  (() => {
    const tl = $('.tl'), fill = $('.tl-fill'); if (!tl || !fill) return;
    const items = $$('.tl-item', tl), nodes = items.map(i => $('.tl-node', i)), years = items.map(i => $('.tl-year', i));
    let vis = false;
    watch(tl, v => { vis = v; }, '20% 0px');
    onFrame(() => {
      if (!vis) return;
      const r = tl.getBoundingClientRect();
      const p = clamp((innerHeight * .62 - r.top) / r.height);
      fill.style.height = (p * 100).toFixed(2) + '%';
      const fy = r.top + p * r.height;
      items.forEach((it, i) => {
        const nr = nodes[i].getBoundingClientRect();
        const lit = nr.top + nr.height / 2 <= fy + 1;
        if (lit !== it._lit) { it._lit = lit; it.classList.toggle('lit', lit); }
        if (!RM && years[i] && innerWidth >= 768) {
          const yr = it.getBoundingClientRect();
          const off = (yr.top + yr.height / 2 - innerHeight / 2) * -.12;
          years[i].style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
        } else if (years[i] && years[i].style.transform) years[i].style.transform = '';
      });
    });
  })();

  /* ==========================================================================
     Interlude — a pill window opens between the letters as you scroll
     ========================================================================== */
  (() => {
    const sec = $('.interlude'), word = $('.pillword'), pill = $('.pw-pill');
    if (!sec || !word || !pill) return;
    const v = $('video', pill);
    let vis = false, requested = false;
    watch(sec, on => {
      vis = on;
      if (!v || RM || SAVE_DATA) return;
      if (on && !requested) {
        requested = true;
        v.addEventListener('error', () => v.remove(), { once: true });
        v.addEventListener('loadeddata', () => { v.classList.add('ok'); v.play().catch(() => {}); }, { once: true });
        v.preload = 'auto'; // the markup says "none" so nothing downloads until the section is near
        v.src = v.dataset.src;
        v.load();
      } else if (v.isConnected && v.currentSrc) { on ? v.play().catch(() => {}) : v.pause(); }
    }, '30% 0px');
    if (v) document.addEventListener('visibilitychange', () => { if (!document.hidden && vis && v.isConnected && v.currentSrc) v.play().catch(() => {}); });
    const set = raw => {
      const sy = easeOut(seg(raw, 0, .28)), w = easeIO(seg(raw, .14, 1));
      word.style.setProperty('--sy', sy.toFixed(3));
      word.style.setProperty('--pw', (.03 + w * 1.9).toFixed(3) + 'em');
      word.style.setProperty('--gap', (.02 + w * .06).toFixed(3) + 'em');
    };
    if (RM) { set(1); return; }
    onFrame(() => {
      if (!vis) return;
      const r = sec.getBoundingClientRect();
      set(seg((innerHeight - r.top) / (innerHeight + r.height * .2), .2, .72));
    });
  })();

  /* ==========================================================================
     WORK — pinned 3D card peel (desktop); plain stacked list below 992px
     ========================================================================== */
  (() => {
    const wk = $('.wk'); if (!wk) return;
    const cards = $$('.wk-card', wk), n = cards.length;
    const host = $('.wk-infos'), cur = $('.wk-cur'), dotsHost = $('.wk-dots'), stack = $('.wk-stack'), badge = $('.wk-badge');
    if (!n || !host || !stack) return;
    const side = cards.map(c => { const inf = $('.wk-info', c).cloneNode(true); inf.classList.add('wk-info--side'); host.appendChild(inf); return inf; });
    const total = () => Math.max(1, wk.offsetHeight - innerHeight);
    const goTo = i => scrollToY(wk.getBoundingClientRect().top + scrollY + (i / (n - 1)) * total() + 2);
    const dots = cards.map((c, i) => {
      const b = document.createElement('button'); b.type = 'button';
      b.textContent = String(i + 1).padStart(2, '0'); b.setAttribute('aria-label', 'Show project ' + (i + 1));
      b.addEventListener('click', () => goTo(i)); dotsHost.appendChild(b); return b;
    });
    let s = 0, active = -1, wasDesk = null, rx = 0, ry = 0, vis = false;
    watch(wk, v => { vis = v; }, '0px');

    const setActive = a => {
      if (a === active) return; active = a;
      side.forEach((el, i) => el.classList.toggle('on', i === a));
      dots.forEach((d, i) => d.classList.toggle('on', i === a));
      if (cur) cur.textContent = String(a + 1).padStart(2, '0');
    };
    const reset = () => {
      cards.forEach(c => { c.style.transform = ''; c.style.opacity = ''; c.style.zIndex = ''; c.style.pointerEvents = ''; });
      stack.style.transform = '';
    };

    onFrame(dt => {
      const desk = DESK.matches;
      if (desk !== wasDesk) { wasDesk = desk; active = -1; if (!desk) reset(); else setActive(0); }
      if (!desk || !vis) return;
      const r = wk.getBoundingClientRect();
      const p = clamp(-r.top / total());
      const target = p * (n - 1);
      s += (target - s) * (1 - Math.exp(-dt * .012));
      if (Math.abs(target - s) < .0005) s = target;
      const vh = innerHeight;
      for (let b = 0; b < n; b++) {
        const c = cards[b]; let tr, op;
        if (b >= s) {
          const rel = b - s;
          tr = `translate3d(0, ${(-rel * 36).toFixed(2)}px, ${(-rel * 110).toFixed(2)}px)`;
          op = clamp(1 - (rel - 2.3));
        } else {
          const d = clamp(s - b);
          tr = `translate3d(0, ${(d * d * vh * .95).toFixed(2)}px, 0) rotateX(${(-d * 16).toFixed(2)}deg) rotateZ(${((b % 2 ? 1 : -1) * d * 7).toFixed(2)}deg)`;
          op = 1 - seg(d, .55, .9);
        }
        c.style.transform = tr; c.style.opacity = op.toFixed(3); c.style.zIndex = String(n - b);
        c.style.pointerEvents = Math.abs(b - s) < .5 ? 'auto' : 'none';
      }
      setActive(clamp(Math.round(s), 0, n - 1));

      let tx = 0, ty = 0;
      if (ptr.has && FINE && !RM && !Case.isOpen()) {
        const sr = stack.getBoundingClientRect();
        tx = -clamp((ptr.y - sr.top) / sr.height - .5, -.6, .6) * 7;
        ty = clamp((ptr.x - sr.left) / sr.width - .5, -.6, .6) * 11;
      }
      const kk = 1 - Math.exp(-dt * .005);
      rx += (tx - rx) * kk; ry += (ty - ry) * kk;
      stack.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      if (badge) badge.style.transform = `rotate(${(p * 360).toFixed(1)}deg)`;
    });
  })();

  /* ==========================================================================
     Spotlight cards (cursor-following glow)
     ========================================================================== */
  if (FINE) {
    document.addEventListener('pointermove', e => {
      const el = e.target.closest && e.target.closest('.spot'); if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
    }, { passive: true });
  }

  /* ==========================================================================
     Contact globe — dotted sphere, New Delhi ping, arcs to the world
     ========================================================================== */
  (() => {
    const sec = $('.contact'), cvs = $('.globe'); if (!sec || !cvs) return;
    const ctx = cvs.getContext('2d');
    const M = 56;
    let N = 0, pts = null;
    const fib = n => { // Fibonacci sphere, density scaled to the on-screen radius
      if (n === N) return; N = n; pts = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
        pts[i * 3] = Math.cos(th) * r; pts[i * 3 + 1] = y; pts[i * 3 + 2] = Math.sin(th) * r;
      }
    };
    const ll = (lat, lon) => { const a = lat * Math.PI / 180, o = lon * Math.PI / 180; return [Math.cos(a) * Math.cos(o), Math.sin(a), Math.cos(a) * Math.sin(o)]; };
    const HOME = ll(28.61, 77.21);
    const arcs = [ll(40.71, -74.0), ll(37.77, -122.42), ll(51.51, -.13), ll(1.35, 103.82), ll(25.2, 55.27)].map(B => {
      const A = HOME, dot = A[0] * B[0] + A[1] * B[1] + A[2] * B[2], w = Math.acos(clamp(dot, -1, 1)), sw = Math.sin(w) || 1;
      const out = new Float32Array(M * 3);
      for (let i = 0; i < M; i++) {
        const t = i / (M - 1), a = Math.sin((1 - t) * w) / sw, b = Math.sin(t * w) / sw;
        const h = 1 + Math.sin(Math.PI * t) * (.08 + w * .12);
        out[i * 3] = (A[0] * a + B[0] * b) * h; out[i * 3 + 1] = (A[1] * a + B[1] * b) * h; out[i * 3 + 2] = (A[2] * a + B[2] * b) * h;
      }
      return out;
    });
    let W = 0, H = 0, R = 0, cx = 0, cy = 0, vis = false;
    const size = () => {
      W = cvs.clientWidth; H = cvs.clientHeight; if (!W) return;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const desk = innerWidth >= 992;
      R = desk ? Math.min(W * .33, H * .5) : Math.min(W * .58, 280);
      cx = desk ? W * .79 : W * .92; cy = desk ? H * .6 : R * .75 + 20;
      fib(Math.round(clamp(2 * Math.PI * R * R / (14 * 14), 1200, 8000)));
    };

    const draw = now => {
      ctx.clearRect(0, 0, W, H);
      const a = .2234 - .2 + (RM ? 0 : Math.sin(now / 9000) * .5), b = .38;
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      const P = (x, y, z) => {
        const x1 = x * ca - z * sa, z1 = x * sa + z * ca, y2 = y * cb - z1 * sb, z2 = y * sb + z1 * cb, k = 4 / (4 - z2);
        return [cx + x1 * R * k, cy - y2 * R * k, z2, Math.hypot(x1, y2)];
      };
      const g = ctx.createRadialGradient(cx, cy, R * .2, cx, cy, R * 1.35);
      g.addColorStop(0, 'rgba(80,70,255,.13)'); g.addColorStop(1, 'rgba(80,70,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#ecebe6';
      for (let i = 0; i < N; i++) {
        const x = pts[i * 3], y = pts[i * 3 + 1], z = pts[i * 3 + 2];
        const x1 = x * ca - z * sa, z1 = x * sa + z * ca, y2 = y * cb - z1 * sb, z2 = y * sb + z1 * cb, k = 4 / (4 - z2);
        const front = z2 > 0;
        ctx.globalAlpha = front ? .12 + .5 * z2 : .025 + .04 * (1 + z2);
        const s = front ? 1.7 : 1.1;
        ctx.fillRect(cx + x1 * R * k - s / 2, cy - y2 * R * k - s / 2, s, s);
      }
      ctx.globalAlpha = 1;

      arcs.forEach((arc, j) => {
        ctx.beginPath(); let pen = false;
        for (let i = 0; i < M; i++) {
          const q = P(arc[i * 3], arc[i * 3 + 1], arc[i * 3 + 2]);
          const seen = q[2] > 0 || q[3] > 1;
          if (seen) { pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); pen = true; } else pen = false;
        }
        ctx.strokeStyle = 'rgba(236,235,230,.3)'; ctx.lineWidth = 1; ctx.stroke();
        if (!RM) {
          const t = ((now / 3000) + j * .23) % 1, idx = Math.floor(t * (M - 1));
          const q = P(arc[idx * 3], arc[idx * 3 + 1], arc[idx * 3 + 2]);
          if (q[2] > 0 || q[3] > 1) {
            ctx.globalAlpha = Math.sin(t * Math.PI);
            ctx.fillStyle = '#d4ff3a'; ctx.beginPath(); ctx.arc(q[0], q[1], 2.4, 0, 6.2832); ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      });

      const h = P(HOME[0], HOME[1], HOME[2]);
      if (h[2] > -.05) {
        const ph = RM ? .5 : (now / 1700) % 1;
        ctx.strokeStyle = `rgba(212,255,58,${(1 - ph) * .9})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(h[0], h[1], 4 + ph * 22, 0, 6.2832); ctx.stroke();
        ctx.fillStyle = '#d4ff3a'; ctx.shadowColor = '#d4ff3a'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(h[0], h[1], 3.6, 0, 6.2832); ctx.fill(); ctx.shadowBlur = 0;
        if (innerWidth >= 992) {
          ctx.fillStyle = 'rgba(236,235,230,.8)'; ctx.font = '500 10px "Geist Mono", monospace';
          ctx.fillText('NEW DELHI', h[0] + 10, h[1] - 8);
        }
      }
    };

    size();
    addEventListener('resize', debounce(() => { size(); if (RM) draw(0); }, 200));
    watch(sec, v => { vis = v; if (v && RM) draw(0); });
    onFrame((dt, now) => { if (vis && !RM) draw(now); });
  })();

  /* ==========================================================================
     Contact form → Formspree
     ========================================================================== */
  (() => {
    const form = $('.contact-form'); if (!form) return;
    const stF = $('.cf-state--form', form), stD = $('.cf-state--done', form);
    const btn = $('.btn-send', form), lab = $('.send-label', form), note = $('.cf-note', form);
    const rules = {
      name: v => v.trim().length >= 2 || 'Please enter your name',
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Please enter a valid email address',
      message: v => v.trim().length >= 10 || 'A little more detail, please (10+ characters)'
    };
    const check = el => {
      const rule = rules[el.name]; if (!rule) return true;
      const res = rule(el.value), field = el.closest('.field'), err = $('.err', field);
      if (res === true) { field.classList.remove('invalid'); err.textContent = ''; el.removeAttribute('aria-invalid'); return true; }
      field.classList.add('invalid'); err.textContent = res; el.setAttribute('aria-invalid', 'true'); return false;
    };
    $$('input, textarea', form).forEach(el => {
      el.addEventListener('blur', () => { if (el.value) check(el); });
      el.addEventListener('input', () => { const f = el.closest('.field'); if (f && f.classList.contains('invalid')) check(el); });
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const els = ['name', 'email', 'message'].map(nm => form.elements.namedItem(nm));
      const results = els.map(check);
      if (results.includes(false)) { els[results.indexOf(false)].focus(); return; }
      if (form.elements.namedItem('_gotcha').value) return;
      btn.disabled = true; btn.classList.add('sending'); lab.textContent = 'Sending'; note.textContent = '';
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset(); stF.hidden = true; stD.hidden = false;
      } catch (err) {
        note.innerHTML = 'Couldn’t send right now. Please email <a href="mailto:parthshikarwar04@gmail.com">parthshikarwar04@gmail.com</a>.';
      } finally {
        btn.disabled = false; btn.classList.remove('sending'); lab.textContent = 'Send message';
      }
    });
    const again = $('.cf-again', form);
    again && again.addEventListener('click', () => { stD.hidden = true; stF.hidden = false; });
  })();

  /* ==========================================================================
     Cursor (dot + lagging ring + ticker label on case cards)
     ========================================================================== */
  (() => {
    if (!FINE) return; // pointer-driven, so it stays on in calm mode too
    const c = $('.cursor'), dot = $('.cur-dot'), ring = $('.cur-ring'), label = $('.cur-label'), track = $('.cur-track');
    if (!c) return;
    root.classList.add('has-cursor');
    let rx = ptr.x, ry = ptr.y, lx = ptr.x, ly = ptr.y, mode = null, ht = 0;
    const setLabel = txt => {
      track.replaceChildren();
      for (let i = 0; i < 2; i++) { const s = document.createElement('span'); s.textContent = `${txt} → ${txt} → ${txt} → `; track.appendChild(s); }
    };
    const hitTest = () => {
      const el = document.elementFromPoint(ptr.x, ptr.y);
      const lb = el && el.closest('[data-cursor]');
      const hv = el && el.closest('a, button, label, [role="tab"]');
      const m = lb ? 'L:' + lb.dataset.cursor : hv ? 'H' : '';
      if (m === mode) return;
      mode = m;
      c.classList.toggle('label', !!lb); c.classList.toggle('hover', !lb && !!hv);
      if (lb) setLabel(lb.dataset.cursor);
    };
    onFrame(dt => {
      c.style.opacity = ptr.has ? '1' : '0';
      if (!ptr.has) return;
      const k = 1 - Math.exp(-dt * .022), k2 = 1 - Math.exp(-dt * .014);
      rx += (ptr.x - rx) * k; ry += (ptr.y - ry) * k; lx += (ptr.x - lx) * k2; ly += (ptr.y - ly) * k2;
      dot.style.translate = `${ptr.x}px ${ptr.y}px`;
      ring.style.translate = `${rx.toFixed(1)}px ${ry.toFixed(1)}px`;
      label.style.translate = `${lx.toFixed(1)}px ${ly.toFixed(1)}px`;
      if ((ht += dt) > 60) { ht = 0; hitTest(); }
    });
  })();

  /* magnetic buttons */
  if (FINE && !RM) {
    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * .22).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * .32).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* clock + year */
  (() => {
    let fmt;
    try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { return; }
    const tick = () => $$('.clock').forEach(c => { c.textContent = fmt.format(new Date()); });
    tick(); setInterval(tick, 15000);
    const y = $('.year'); if (y) y.textContent = String(new Date().getFullYear());
  })();

  /* ==========================================================================
     Boot: preloader → page reveal
     ========================================================================== */
  function startPage() {
    $$('[data-hero]').forEach(el => el.classList.add('in'));
    $$('[data-reveal], [data-split]').forEach(el => { if (!el.hasAttribute('data-hero')) revealIO.observe(el); });
    const wm = $('.wordmark'); wm && revealIO.observe(wm);
    Counts.init();
    Hero.start();
    heroVideo();
    // deep links (e.g. /#contact): jump once layout and fonts have settled
    if (location.hash.length > 1) {
      let t = null; try { t = document.querySelector(location.hash); } catch (e) { /* invalid selector */ }
      if (t) setTimeout(() => {
        const y = t.getBoundingClientRect().top + scrollY;
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y);
      }, 60);
    }
  }

  (() => {
    const el = $('.preloader'), num = $('.pre-num'), line = $('.pre-line i');
    let done = false, fontsOk = !document.fonts;
    const t0 = performance.now(), MIN = RM ? 0 : 1500;
    if (document.fonts) document.fonts.ready.then(() => { fontsOk = true; });
    setTimeout(() => { fontsOk = true; }, 2600);
    const finish = () => {
      if (done) return; done = true;
      root.classList.add('is-ready');
      if (el) { el.classList.add('out'); setTimeout(() => el.remove(), 1300); }
      setTimeout(startPage, RM ? 0 : 280);
    };
    setTimeout(finish, 4200);
    if (!el || RM) { finish(); return; }
    onFrame((dt, now) => {
      if (done) return;
      let p = MIN ? clamp((now - t0) / MIN) : 1;
      if (!fontsOk) p = Math.min(p, .88);
      const shown = easeOut(p);
      if (num) num.textContent = String(Math.round(shown * 100)).padStart(3, '0');
      if (line) line.style.transform = `scaleX(${shown.toFixed(3)})`;
      if (p >= 1) finish();
    });
  })();

  /* ==========================================================================
     The loop
     ========================================================================== */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(64, now - last); last = now;
    if (lenis) lenis.raf(now);
    for (let i = 0; i < updaters.length; i++) {
      try { updaters[i](dt, now); } catch (err) { console.error(err); updaters.splice(i--, 1); }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

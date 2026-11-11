/**
 * Domain Expansion presentation: every Domain gets a theme (palette + motif), used for
 *  - a full-screen splash on every client when it opens,
 *  - a themed chat card,
 *  - a patterned barrier drawing on the map (plus the coloured Region the rules use).
 * Motif textures live in assets/domains/<motif>.svg (white line art, tinted by the theme).
 */
import { SYSTEM_ID } from "./config.mjs";

const SOCKET = `system.${SYSTEM_ID}`;
const esc = s => foundry.utils.escapeHTML?.(String(s)) ?? String(s);

export const MOTIFS = ["flames", "waves", "petals", "chains", "blades", "stars", "void", "cards", "gears", "shards",
  "feathers", "frost", "lightning", "sand", "threads", "script", "hearts", "bones", "mist", "notes", "eyes", "scales"];

/** technique → [background, mid, accent, motif]. */
const T = (bg, mid, accent, motif) => ({ bg, mid, accent, motif });
export const DOMAIN_THEMES = {
  "Beast Tamer": T("#1d1408", "#5a3a12", "#e0a040", "bones"),
  "Binding Cords": T("#121418", "#3a4048", "#c8ccd4", "chains"),
  "Black Bird Manipulation": T("#08080c", "#262033", "#9a86c8", "feathers"),
  "Blood Manipulation": T("#1a0204", "#5c0a12", "#e0303c", "mist"),
  "Boogie Woogie": T("#14081c", "#4a1c5c", "#ffd23c", "notes"),
  "Comedian": T("#1c1004", "#7a3c08", "#ffb020", "stars"),
  "Construction": T("#141210", "#4a3e30", "#d8a860", "gears"),
  "Contract Re-Creation": T("#0e1214", "#28404a", "#7ad0d8", "cards"),
  "Copy (Mimicry)": T("#120a14", "#3c1c44", "#f0a0e0", "hearts"),
  "Cursed Speech": T("#0c0c10", "#2c2c3a", "#e8e0c8", "script"),
  "Cursed Spirit Manipulation": T("#0a0c08", "#2c3420", "#a8c060", "eyes"),
  "Cursed Technique Erasure": T("#141414", "#504c44", "#fff4d0", "scales"),
  "Cursed Tool Master": T("#101012", "#383840", "#d0d4e0", "blades"),
  "Cursed Womb": T("#140608", "#4a1820", "#d07080", "bones"),
  "Deadly Sentencing": T("#0c0a06", "#3a2e10", "#f0c850", "scales"),
  "Decay (Rot)": T("#0c0e06", "#2e3410", "#9ab030", "mist"),
  "Detonation": T("#160a02", "#5a2006", "#ff7a20", "flames"),
  "Disaster Flames": T("#1a0600", "#6a1a00", "#ff6a10", "flames"),
  "Disaster Plants": T("#06120a", "#1c4a24", "#f6a8c8", "petals"),
  "Disaster Tides": T("#020c18", "#0a3058", "#7ad8ff", "waves"),
  "Dream Eater": T("#0a0818", "#2a2458", "#b8a8ff", "stars"),
  "Enthrall": T("#16040c", "#5a1030", "#ff7ab0", "hearts"),
  "Flight Dominion": T("#06101c", "#1e4a7a", "#e8f4ff", "feathers"),
  "Foresight": T("#0c0c12", "#2a2a40", "#d8c890", "eyes"),
  "Granite Blast": T("#121010", "#4a403a", "#ffa040", "shards"),
  "Gravity Well": T("#04040a", "#1a1430", "#8a6cff", "void"),
  "Ice Formation": T("#04101a", "#1c4a6a", "#d8f4ff", "frost"),
  "Idle Death Gamble": T("#0a1408", "#1c5a20", "#ffe040", "cards"),
  "Idle Transfiguration": T("#0c0a10", "#3a2c40", "#c8a0d8", "threads"),
  "Illusion Weaver": T("#0a0c16", "#2c3460", "#c0d0ff", "shards"),
  "Ink Calligraphy": T("#0c0a08", "#2e2a24", "#f4ecd8", "script"),
  "Limitless": T("#02040c", "#0c1c48", "#9ad0ff", "void"),
  "Loan Shark": T("#0a0c0a", "#24382a", "#e8c860", "chains"),
  "Love Rendezvous": T("#140812", "#4a1a44", "#ff9ad8", "stars"),
  "Lucky Streak": T("#100c02", "#4a3a08", "#ffd84a", "cards"),
  "Magnetism": T("#0c0c10", "#34343e", "#ff5a5a", "shards"),
  "Mind's Eye": T("#0a0a12", "#28284a", "#c8b8ff", "eyes"),
  "Moon Dregs": T("#06060c", "#20203a", "#f0e8c0", "stars"),
  "Mythical Beast Amber": T("#100a02", "#4a3008", "#ffe070", "lightning"),
  "New Shadow Style": T("#0c0c0c", "#2a2a2a", "#e8e8f0", "blades"),
  "Plague Bearer": T("#0c0e04", "#343a0e", "#c8d040", "mist"),
  "Possession": T("#0a060a", "#2c1a2c", "#c890c8", "mist"),
  "Prism": T("#0c0c14", "#30305a", "#fff8ff", "shards"),
  "Projection Sorcery": T("#0a0a0c", "#2a2a34", "#f0f0f0", "script"),
  "Ratio Technique": T("#0c0c0a", "#34342a", "#f0e0a0", "scales"),
  "Reflection": T("#0a0e12", "#2c3e4e", "#e0f0ff", "shards"),
  "Reversed Flow Mastery": T("#06120e", "#1a4a3a", "#a8ffd8", "petals"),
  "Sand Manipulation": T("#140e04", "#5a4214", "#f0d090", "sand"),
  "Shrine": T("#140202", "#4a0606", "#ff3030", "blades"),
  "Six Eyes Discipline": T("#02060e", "#0e2a4a", "#a8e0ff", "eyes"),
  "Sky Manipulation": T("#040c18", "#1c3c6a", "#c8e4ff", "feathers"),
  "Sonic Resonance": T("#0c0814", "#2e2050", "#c8a8ff", "notes"),
  "Spirit Channeling": T("#06080c", "#1e2a34", "#a8d0d8", "mist"),
  "Star Rage": T("#0c0602", "#3a1c08", "#ffb050", "stars"),
  "Stormcaller": T("#060a10", "#1c2c40", "#d0e8ff", "lightning"),
  "Straw Doll Technique": T("#0e0a06", "#3a2c18", "#e8c890", "threads"),
  "Temporal Stasis": T("#08080c", "#2a2a34", "#d8d0b0", "frost"),
  "Ten Shadows Technique": T("#040406", "#141420", "#8890b0", "void"),
  "Terraform": T("#0e0a06", "#3e2e18", "#c8a060", "shards"),
  "Thread Manipulation": T("#0c0a0e", "#2e2838", "#f0e0ff", "threads"),
  "Veil Weaving": T("#06080c", "#202838", "#d8e0f0", "script"),
  "Venom Weaving": T("#060c06", "#1c3a1c", "#80ff60", "petals")
};

/** Fallback for curses and custom Domains: pick a motif from words in the name, colours from a hash. */
const KEYWORDS = [
  [/fire|flame|burn|ember|inferno|coffin/i, "flames"], [/sea|tide|water|wave|drown|horizon/i, "waves"],
  [/flower|garden|bloom|petal|venom/i, "petals"], [/chain|bind|cage|prison/i, "chains"], [/blade|shrine|sword|cut/i, "blades"],
  [/star|moon|night|sky/i, "stars"], [/void|abyss|hollow|singular|shadow/i, "void"], [/card|gamble|luck|dice|house/i, "cards"],
  [/gear|foundry|machine|forge/i, "gears"], [/mirror|glass|prism|shard/i, "shards"], [/bird|wing|feather|flock/i, "feathers"],
  [/ice|frost|zero|frozen|snow/i, "frost"], [/thunder|lightning|storm/i, "lightning"], [/sand|desert|dust/i, "sand"],
  [/thread|web|string|doll/i, "threads"], [/word|chant|script|ink|manuscript|seal|sutra/i, "script"], [/heart|love|court/i, "hearts"],
  [/bone|womb|beast|flesh|grave|dead/i, "bones"], [/mist|plague|rot|decay|fog|blood/i, "mist"], [/song|sound|music|rhythm/i, "notes"],
  [/eye|sight|mind|clarity/i, "eyes"], [/judg|sentenc|verdict|ratio|law/i, "scales"]
];
function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function hsl(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return `#${[f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, "0")).join("")}`;
}

/** The theme for a Domain: by technique, then by name keywords, then by hash. */
export function themeFor({ technique = "", name = "" } = {}) {
  const base = DOMAIN_THEMES[technique];
  if (base) return { ...base };
  const motif = KEYWORDS.find(([re]) => re.test(name))?.[1] ?? MOTIFS[hash(name) % MOTIFS.length];
  const hue = hash(name || technique) % 360;
  return { bg: hsl(hue, 45, 5), mid: hsl(hue, 50, 20), accent: hsl(hue, 85, 65), motif };
}

export const motifPath = motif => `systems/${SYSTEM_ID}/assets/domains/${MOTIFS.includes(motif) ? motif : "void"}.svg`;
export const shortName = name => String(name ?? "").replace(/^Domain Expansion:\s*/i, "").replace(/\s*\((Universal|Incomplete Domain)\)\s*$/i, "");

/** Inline CSS variables for a themed element. */
export function themeStyle(theme) {
  return `--dom-bg:${theme.bg};--dom-mid:${theme.mid};--dom-accent:${theme.accent};--dom-motif:url('/${motifPath(theme.motif)}');`;
}

/* ---------- sound ---------- */

/** Per-motif voice: pitch of the bell, how much noise (fire/sand hiss), and the drone's interval. */
const VOICE = {
  flames: [0.8, 0.9, 7], waves: [0.7, 0.6, 5], petals: [1.4, 0.2, 4], chains: [1.0, 0.4, 6], blades: [1.2, 0.3, 7],
  stars: [1.8, 0.1, 4], void: [0.5, 0.3, 6], cards: [1.5, 0.2, 4], gears: [0.9, 0.5, 5], shards: [1.6, 0.3, 6],
  feathers: [1.3, 0.4, 5], frost: [2.0, 0.3, 4], lightning: [1.1, 0.8, 6], sand: [0.9, 1.0, 5], threads: [1.4, 0.2, 3],
  script: [1.0, 0.2, 5], hearts: [1.3, 0.1, 4], bones: [0.6, 0.4, 6], mist: [0.7, 0.7, 3], notes: [1.5, 0.1, 4],
  eyes: [1.1, 0.2, 6], scales: [1.0, 0.2, 7]
};

let audioCtx = null;
/** The Domain opening: a barrier slam, a rising rush, a temple bell and a drone under the title card. Synthesised, no files. */
function playDomainSound(theme) {
  if (!game.settings.get(SYSTEM_ID, "domainSound")) return;
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const [pitch, noiseAmt, interval] = VOICE[theme.motif] ?? [1, 0.3, 5];
    const vol = (game.settings.get("core", "globalInterfaceVolume") ?? 0.5) * 0.9;
    const t0 = ctx.currentTime + 0.05;
    const master = ctx.createGain();
    master.gain.value = vol;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);

    const env = (node, a, peak, d, at = t0) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + a);
      g.gain.exponentialRampToValueAtTime(0.0001, at + a + d);
      node.connect(g).connect(master);
      return g;
    };
    const noise = seconds => {
      const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      return src;
    };

    // 1. Rising rush (the barrier drawing in).
    const rush = noise(1.2);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(200, t0);
    bp.frequency.exponentialRampToValueAtTime(3000 * pitch, t0 + 1.0);
    rush.connect(bp);
    env(bp, 0.9, 0.25 + noiseAmt * 0.25, 0.25);
    rush.start(t0); rush.stop(t0 + 1.2);

    // 2. The slam: a sub drop and a low thud.
    const slamAt = t0 + 1.0;
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(90 * Math.min(pitch, 1.2), slamAt);
    sub.frequency.exponentialRampToValueAtTime(28, slamAt + 1.6);
    env(sub, 0.01, 0.9, 2.2, slamAt);
    sub.start(slamAt); sub.stop(slamAt + 2.4);
    const thud = noise(0.6);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 400 + noiseAmt * 1200;
    thud.connect(lp);
    env(lp, 0.005, 0.5 + noiseAmt * 0.3, 0.5, slamAt);
    thud.start(slamAt); thud.stop(slamAt + 0.6);

    // 3. Temple bell: inharmonic partials.
    const base = 220 * pitch;
    for (const [ratio, amp, dec] of [[1, 0.35, 3.5], [2.76, 0.18, 2.4], [5.4, 0.1, 1.6], [8.9, 0.05, 1.0]]) {
      const o = ctx.createOscillator();
      o.type = "sine"; o.frequency.value = base * ratio;
      env(o, 0.004, amp, dec, slamAt + 0.05);
      o.start(slamAt); o.stop(slamAt + dec + 0.2);
    }

    // 4. Drone under the title card.
    const droneAt = slamAt + 0.2;
    const semis = n => Math.pow(2, n / 12);
    for (const [f, amp] of [[55 * pitch, 0.18], [55 * pitch * semis(interval), 0.1], [110 * pitch, 0.06]]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth"; o.frequency.value = f;
      const f2 = ctx.createBiquadFilter();
      f2.type = "lowpass"; f2.frequency.value = 600;
      o.connect(f2);
      env(f2, 0.8, amp, 2.2, droneAt);
      o.start(droneAt); o.stop(droneAt + 3.2);
    }
  } catch (err) {
    console.warn(`${SYSTEM_ID} | Domain sound failed`, err);
  }
}

/* ---------- splash ---------- */

function showSplash({ name, caster, theme, incomplete = false }) {
  playDomainSound(theme);
  if (!game.settings.get(SYSTEM_ID, "domainSplash")) return;
  document.querySelector(".jjk-domain-splash")?.remove();
  const el = document.createElement("div");
  el.className = "jjk-domain-splash";
  el.setAttribute("style", themeStyle(theme));
  el.innerHTML = `<div class="dom-motif"></div><div class="dom-ring"></div>
    <div class="dom-text">
      <div class="dom-kanji">領域展開</div>
      <div class="dom-label">${incomplete ? "Incomplete Domain" : "Domain Expansion"}</div>
      <div class="dom-name">${esc(name)}</div>
      <div class="dom-caster">${esc(caster)}</div>
    </div>`;
  el.addEventListener("click", () => el.remove());
  document.body.append(el);
  setTimeout(() => el.classList.add("out"), 3200);
  setTimeout(() => el.remove(), 4000);
}

/** Show the splash on every client (call from the GM side when a Domain opens). */
export function broadcastSplash(data) {
  showSplash(data);
  game.socket.emit(SOCKET, { action: "domainSplash", ...data });
}

/* ---------- chat ---------- */

export function themedHeader(theme, name, caster, incomplete = false) {
  return `<div class="jjk-domain-banner" style="${themeStyle(theme)}">
    <span class="kanji">領域展開</span>
    <span class="label">${incomplete ? "Incomplete Domain" : "Domain Expansion"}</span>
    <span class="name">${esc(name)}</span>
    ${caster ? `<span class="caster">${esc(caster)}</span>` : ""}</div>`;
}

/* ---------- barrier drawing ---------- */

/** A patterned circle over the barrier, tinted with the theme. Returns the Drawing id (or null). */
export async function drawStyledBarrier(scene, st, theme) {
  try {
    const r = (st.radius / scene.grid.distance) * scene.grid.size;
    const FILL = CONST.DRAWING_FILL_TYPES ?? { PATTERN: 2 };
    const [d] = await scene.createEmbeddedDocuments("Drawing", [{
      x: st.center.x - r, y: st.center.y - r,
      shape: { type: "e", width: r * 2, height: r * 2 },
      fillType: FILL.PATTERN, fillColor: theme.accent, fillAlpha: 0.35, texture: motifPath(theme.motif),
      strokeColor: theme.accent, strokeWidth: 10, strokeAlpha: 0.9,
      text: shortName(st.name), fontSize: Math.max(24, Math.round(scene.grid.size * 0.6)), textColor: theme.accent, textAlpha: 0.9,
      locked: true, interface: false, flags: { [SYSTEM_ID]: { domainBarrier: true } }
    }]);
    return d?.id ?? null;
  } catch (err) {
    console.warn(`${SYSTEM_ID} | couldn't draw the styled Domain barrier`, err);
    return null;
  }
}

export function registerDomainStyle() {
  game.settings.register(SYSTEM_ID, "domainSplash", {
    name: "Domain Expansion splash", hint: "Show a full-screen title card on every screen when a Domain opens.",
    scope: "client", config: true, type: Boolean, default: true
  });
  game.settings.register(SYSTEM_ID, "domainSound", {
    name: "Domain Expansion sound", hint: "Play the Domain opening sound (follows your Interface volume).",
    scope: "client", config: true, type: Boolean, default: true
  });
  game.socket.on(SOCKET, msg => { if (msg?.action === "domainSplash") showSplash(msg); });
}

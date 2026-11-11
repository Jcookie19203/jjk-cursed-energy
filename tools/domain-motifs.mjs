// Generates assets/domains/<motif>.svg: 200×200 tileable white line art (tinted in Foundry by the theme colour).
import fs from "fs";
const W = 200, out = "assets/domains";
const S = 'fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="#fff"';
const rng = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const tile = draw => {   // draw at offsets so edges wrap
  let s = ""; for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) s += `<g transform="translate(${dx} ${dy})">${draw}</g>`;
  return s;
};
const pts = (n, seed) => { const r = rng(seed); return Array.from({ length: n }, () => [r() * W, r() * W, r()]); };
const M = {
  flames: () => pts(6, 3).map(([x, y, k]) => `<path ${S} d="M${x} ${y + 24} C${x - 14} ${y + 8} ${x - 4} ${y - 6} ${x} ${y - 26} C${x + 6} ${y - 8} ${x + 16} ${y + 6} ${x} ${y + 24}Z"/>`).join(""),
  waves: () => [20, 60, 100, 140, 180].map(y => `<path ${S} d="M0 ${y} Q25 ${y - 18} 50 ${y} T100 ${y} T150 ${y} T200 ${y}"/>`).join(""),
  petals: () => pts(7, 11).map(([x, y, k]) => `<g transform="translate(${x} ${y}) rotate(${k * 360})">${[0, 72, 144, 216, 288].map(a => `<ellipse ${S} stroke-width="2" rx="4" ry="10" transform="rotate(${a}) translate(0 -10)"/>`).join("")}</g>`).join(""),
  chains: () => [0, 1, 2, 3, 4].map(i => `<rect ${S} x="${i * 50 - 14}" y="${88 + (i % 2) * 0}" width="${i % 2 ? 36 : 36}" height="${i % 2 ? 12 : 24}" rx="10" transform="rotate(-30 100 100)"/>`).join("") + [0, 1, 2, 3, 4].map(i => `<rect ${S} x="${i * 50 - 14}" y="${18}" width="36" height="${i % 2 ? 12 : 24}" rx="10" transform="rotate(-30 100 100)"/>`).join(""),
  blades: () => pts(8, 5).map(([x, y, k]) => `<path ${S} stroke-width="2.5" d="M${x} ${y} l${30 * Math.cos(k * 6)} ${30 * Math.sin(k * 6)}"/>`).join(""),
  stars: () => pts(14, 7).map(([x, y, k]) => k > 0.7 ? `<path ${F} d="M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2}Z"/>` : `<circle ${F} cx="${x}" cy="${y}" r="${1 + k * 2}"/>`).join(""),
  void: () => [24, 48, 72, 96].map(r => `<circle ${S} stroke-width="1.5" opacity="${1 - r / 120}" cx="100" cy="100" r="${r}"/>`).join("") + pts(10, 13).map(([x, y]) => `<circle ${F} cx="${x}" cy="${y}" r="1.2"/>`).join(""),
  cards: () => pts(5, 17).map(([x, y, k]) => `<g transform="translate(${x} ${y}) rotate(${k * 60 - 30})"><rect ${S} x="-14" y="-20" width="28" height="40" rx="3"/><path ${F} d="M0 -7 L6 0 L0 7 L-6 0Z"/></g>`).join(""),
  gears: () => [[50, 50, 26], [140, 120, 34], [60, 160, 18]].map(([x, y, r]) => `<circle ${S} cx="${x}" cy="${y}" r="${r}"/><circle ${S} cx="${x}" cy="${y}" r="${r / 3}"/>` + Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5; return `<path ${S} d="M${x + r * Math.cos(a)} ${y + r * Math.sin(a)} L${x + (r + 8) * Math.cos(a)} ${y + (r + 8) * Math.sin(a)}"/>`; }).join("")).join(""),
  shards: () => pts(7, 19).map(([x, y, k]) => `<path ${S} stroke-width="2" d="M${x} ${y - 20} L${x + 12} ${y + 4} L${x - 2} ${y + 22} L${x - 12} ${y}Z" transform="rotate(${k * 180} ${x} ${y})"/>`).join(""),
  feathers: () => pts(6, 23).map(([x, y, k]) => `<g transform="translate(${x} ${y}) rotate(${k * 360})"><path ${S} stroke-width="2" d="M0 -24 Q10 0 0 24 Q-10 0 0 -24 M0 -24 L0 28"/></g>`).join(""),
  frost: () => pts(6, 29).map(([x, y]) => `<g transform="translate(${x} ${y})">${[0, 60, 120].map(a => `<path ${S} stroke-width="2" transform="rotate(${a})" d="M0 -18 L0 18 M0 -10 l-5 -5 M0 -10 l5 -5 M0 10 l-5 5 M0 10 l5 5"/>`).join("")}</g>`).join(""),
  lightning: () => pts(5, 31).map(([x, y]) => `<path ${S} d="M${x} ${y - 30} L${x - 8} ${y - 4} L${x + 4} ${y - 2} L${x - 6} ${y + 30}"/>`).join(""),
  sand: () => pts(70, 37).map(([x, y, k]) => `<circle ${F} cx="${x}" cy="${y}" r="${0.6 + k * 1.4}"/>`).join("") + [50, 130].map(y => `<path ${S} stroke-width="1.5" d="M0 ${y} Q50 ${y - 10} 100 ${y} T200 ${y}"/>`).join(""),
  threads: () => Array.from({ length: 8 }, (_, i) => `<path ${S} stroke-width="1.2" d="M${i * 25} 0 Q${i * 25 + 40} 100 ${i * 25} 200"/>`).join("") + Array.from({ length: 4 }, (_, i) => `<path ${S} stroke-width="1.2" d="M0 ${i * 50 + 25} L200 ${i * 50 + 10}"/>`).join(""),
  script: () => pts(8, 41).map(([x, y, k]) => `<path ${S} stroke-width="2.5" d="M${x} ${y} l12 0 M${x + 6} ${y - 6} l0 16 M${x} ${y + 12} q6 -4 12 2"/>`).join(""),
  hearts: () => pts(6, 43).map(([x, y, k]) => `<path ${S} transform="translate(${x} ${y}) scale(${0.7 + k * 0.6})" d="M0 8 C-14 -2 -10 -14 0 -6 C10 -14 14 -2 0 8Z"/>`).join(""),
  bones: () => pts(5, 47).map(([x, y, k]) => `<g transform="translate(${x} ${y}) rotate(${k * 180})"><path ${S} d="M-16 0 L16 0"/><circle ${S} stroke-width="2" cx="-19" cy="-4" r="4"/><circle ${S} stroke-width="2" cx="-19" cy="4" r="4"/><circle ${S} stroke-width="2" cx="19" cy="-4" r="4"/><circle ${S} stroke-width="2" cx="19" cy="4" r="4"/></g>`).join(""),
  mist: () => [30, 80, 130, 175].map((y, i) => `<path ${S} stroke-width="5" opacity="0.6" d="M${-20 + i * 15} ${y} q30 -16 60 0 q30 16 60 0 q30 -16 60 0"/>`).join(""),
  notes: () => pts(6, 53).map(([x, y]) => `<path ${S} d="M${x} ${y} L${x} ${y - 24} L${x + 12} ${y - 28}"/><ellipse ${F} cx="${x - 4}" cy="${y}" rx="5" ry="4"/>`).join(""),
  eyes: () => pts(5, 59).map(([x, y]) => `<path ${S} d="M${x - 18} ${y} Q${x} ${y - 14} ${x + 18} ${y} Q${x} ${y + 14} ${x - 18} ${y}Z"/><circle ${F} cx="${x}" cy="${y}" r="4"/>`).join(""),
  scales: () => pts(4, 61).map(([x, y]) => `<path ${S} stroke-width="2" d="M${x} ${y - 20} L${x} ${y + 18} M${x - 10} ${y + 18} L${x + 10} ${y + 18} M${x - 20} ${y - 14} L${x + 20} ${y - 14} M${x - 20} ${y - 14} l-8 16 l16 0 Z M${x + 20} ${y - 14} l-8 16 l16 0 Z"/>`).join("")
};
for (const [name, fn] of Object.entries(M)) {
  fs.writeFileSync(`${out}/${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">${tile(fn())}</svg>`);
}
console.log(Object.keys(M).length, "motifs");

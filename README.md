# Jujutsu Kaisen: Cursed Energy — Foundry VTT System

A standalone Foundry VTT **v14** game system for the *Cursed Energy* jujutsu-sorcery homebrew, built on Pathfinder 2e (Remaster) core mechanics.

## Install
In Foundry's Setup screen, go to **Game Systems → Install System**, paste this into **Manifest URL**, and click **Install**:

```
https://github.com/Jcookie19203/jjk-cursed-energy/releases/latest/download/system.json
```

Updates then show up under **Game Systems → Update**.

To install by hand instead, download `jjk-cursed-energy.zip` from the latest release and unzip it into Foundry's `Data/systems/` folder, so you end up with `Data/systems/jjk-cursed-energy/system.json`.

## What's in it
**Actor types**
- **Sorcerer** — every number comes from the Grade Table: CE pool, HP, Reinforcement, Cursed Attack and Technique DC bands, saves, Perception, AC, technique die and Reinforced Strike dice.
  - The Cursed Attack / Technique DC band climbs **+1 for each card you hold in your current tier**. The sheet shows **Promote ▲** once you have all three.
  - It also tracks composure, Takeover Pressure (for vessels), Domain state, Hero Points, skills with proficiency ranks, and every condition.
- **Curse / NPC** — a stat block: AC, saves, Perception, HP, CE, Reinforcement, Cursed Attack, Technique DC, IWR, Strikes and abilities.

**Item types:** Ability Card (technique and path cards), Weapon / Cursed Tool, Armor, Gear, Binding Vow, Ancestry, Background.

**Rules automation**
- d20 checks with PF2e degrees of success (±10, natural 20/1), the multiple attack penalty (including agile), and a target-AC readout.
- Condition penalties applied automatically (frightened, sickened, clumsy, enfeebled, stupefied, drained, off-guard, prone, grabbed…), with token icons synced.
- Ability cards post to chat with buttons: **Pay CE**, **Cursed Strike**, **Save vs DC** (anyone can click to roll their save), **Output Damage** (CE × technique die + key mod), **Open Domain**, and **Add Pressure**.
- Damage cards include **Apply / Half / Double / Heal**, and offer **Reinforcement** (spend 1 CE to reduce the damage).
- **Black Flash** prompt on every critical attack: a flat check of DC 8 − composure. On a success it refunds CE equal to your Grade Rank and adds composure.
- **Steady Flow** (+1 CE at the start of each turn) and **takeover save** prompts at Pressure 5+. Both can be turned off in Settings.
- **Domains:** opening one spends the whole pool and needs at least half of it; ending one leaves you fatigued at 0 CE.
- Drag a card from a sheet to the hotbar to make a macro.

**Compendiums**
- *Visible to players:* the Rules (Cursed Energy), PF2e Core summary, Ancestries, Backgrounds, Equipment, Player Primers and Curse Field Notes (a stat-free player brief for every curse).
- *GM only:* Cursed Techniques (63 techniques × 21 cards), Cursed Paths, GM Master Sheets, GM Guide, Curses & Rival Sorcerers (110 ready-to-run actors, canon and original, foldered by Grade) and Cursed Tools (104 tools and cursed objects, foldered by Grade, ready to drag onto a sheet).

## How to run a technique at the table
1. The player makes a Sorcerer and picks a technique.
2. Open **Cursed Techniques (GM)**, find that technique's folder, and drag its `Fledgling - 1` card onto the sheet. Give the player the matching **Player Primer** from the Player Primers pack.
3. When the player earns a card (the requirements are in the technique's GM Master Sheet), drag that card onto their sheet too.
4. When their current tier holds 3 cards, click **Promote ▲**.

## Rebuilding (for editing the content)
```bash
npm install
npm run build:packs   # regenerate every compendium from the markdown supplement next door
npm run check         # syntax + manifest checks
npm run zip           # make dist/jjk-cursed-energy.zip
```
The pack builder reads `../JJK Cursed Energy Supplement (PF2e)/` and `content/`. Edit the markdown and rebuild; don't edit the packs in Foundry if you plan to rebuild.

## Status
Version 0.1.1, tested on Foundry v14 (build 369). Card parsing is automatic, so some cards may need their cost, actions or save type corrected on the item sheet. See LICENSE.md for attribution.

## Releasing
1. Bump `version` in `system.json` and `package.json`, and point `download` at the new tag.
2. `npm run check && npm run zip`
3. Create a GitHub release tagged `v<version>` with `system.json` and `dist/jjk-cursed-energy.zip` attached.

// Core PF2e-style item data for the standalone system, written as mechanical summaries.
// Stats follow PF2e Remaster; descriptions are original. Verify against the Player Core if in doubt.

const p = s => `<p>${s}</p>`;

export const ANCESTRIES = [
  { name: "Human", hp: 8, size: "medium", speed: 25, boosts: "Two free boosts", flaw: "", languages: "Your home language plus additional languages equal to your Int modifier", senses: "", traits: "human, humanoid",
    description: p("The default for a modern jujutsu campaign. Humans are adaptable and come in every shape. Most sorcerers, curse users and their victims are human.") },
  { name: "Dwarf", hp: 10, size: "medium", speed: 20, boosts: "Constitution, Wisdom, one free", flaw: "Charisma", languages: "Common, Dwarven", senses: "Darkvision", traits: "dwarf, humanoid",
    description: p("Stout, stubborn and slow to tire. Dwarves see in the dark and shrug off hardships that would fell others.") },
  { name: "Elf", hp: 6, size: "medium", speed: 30, boosts: "Dexterity, Intelligence, one free", flaw: "Constitution", languages: "Common, Elven", senses: "Low-light vision", traits: "elf, humanoid",
    description: p("Long-lived, quick and perceptive, with keen senses in dim light.") },
  { name: "Gnome", hp: 8, size: "small", speed: 25, boosts: "Constitution, Charisma, one free", flaw: "Strength", languages: "Common, Gnomish", senses: "Low-light vision", traits: "gnome, humanoid",
    description: p("Small, curious and endlessly energetic.") },
  { name: "Goblin", hp: 6, size: "small", speed: 25, boosts: "Dexterity, Charisma, one free", flaw: "Wisdom", languages: "Common, Goblin", senses: "Darkvision", traits: "goblin, humanoid",
    description: p("Small, scrappy and fearless, with darkvision.") },
  { name: "Halfling", hp: 6, size: "small", speed: 25, boosts: "Dexterity, Wisdom, one free", flaw: "Strength", languages: "Common, Halfling", senses: "Keen eyes", traits: "halfling, humanoid",
    description: p("Small, lucky and observant. Halflings notice what others miss.") },
  { name: "Leshy", hp: 8, size: "small", speed: 25, boosts: "Constitution, Wisdom, one free", flaw: "Intelligence", languages: "Common, Fey", senses: "Low-light vision", traits: "leshy, plant",
    description: p("A plant spirit given a body. Tough and close to the natural world.") },
  { name: "Orc", hp: 10, size: "medium", speed: 25, boosts: "Two free boosts", flaw: "", languages: "Common, Orcish", senses: "Darkvision", traits: "orc, humanoid",
    description: p("Strong, enduring and hard to put down, with darkvision.") }
];

// Setting-appropriate backgrounds (original). Each gives two boosts (one from a pair, one free), a trained skill, a Lore and a skill feat.
export const BACKGROUNDS = [
  ["Jujutsu Clan Heir", "Charisma or Intelligence, one free", "Society", "Jujutsu Clan Lore", "Courtly Graces", "You grew up inside one of the old sorcerer families, surrounded by expectations, rivals and secrets."],
  ["Window", "Wisdom or Intelligence, one free", "Occultism", "Curse Lore", "Recognize Spell", "You can see curses but never had much cursed energy of your own. You've spent years reporting sightings to the sorcerer schools."],
  ["Assistant Manager", "Intelligence or Charisma, one free", "Society", "Jujutsu Administration Lore", "Multilingual", "You drove sorcerers to missions, put up curtains and filed the reports. Now you're in the fight yourself."],
  ["Delinquent", "Strength or Charisma, one free", "Intimidation", "Underworld Lore", "Intimidating Glare", "You were the one nobody wanted to fight. Curses are just bigger delinquents."],
  ["Temple Acolyte", "Wisdom or Charisma, one free", "Religion", "Temple Lore", "Student of the Canon", "You trained at a shrine or temple that has quietly exorcised curses for centuries."],
  ["Athlete", "Strength or Dexterity, one free", "Athletics", "Sports Lore", "Quick Jump", "School sports star, physique off the charts. Reinforcing your body with cursed energy came naturally."],
  ["High School Student", "Intelligence or Dexterity, one free", "Society", "High School Lore", "Hobnobber", "An ordinary student until a curse turned your life upside down."],
  ["Curse Survivor", "Constitution or Wisdom, one free", "Survival", "Curse Lore", "Diehard", "A curse took someone from you and almost took you too. You still have the scars."],
  ["Shrine Keeper", "Wisdom or Intelligence, one free", "Occultism", "Barrier Lore", "Ward Medicine", "Your family maintains a shrine and its old barriers. You know how seals are meant to hold."],
  ["Martial Artist", "Strength or Dexterity, one free", "Acrobatics", "Dojo Lore", "Cat Fall", "You've trained in a fighting art since childhood. Cursed energy is just one more discipline."],
  ["Detective", "Intelligence or Wisdom, one free", "Society", "Legal Lore", "Streetwise", "You investigated disappearances that never added up, until you learned about curses."],
  ["Medical Student", "Intelligence or Wisdom, one free", "Medicine", "Anatomy Lore", "Battle Medicine", "You were training to save lives. Reversed Cursed Technique might let you save more."]
].map(([name, boosts, trainedSkill, lore, feat, text]) => ({ name, boosts, trainedSkill, lore, feat, description: p(text) }));

// Weapons: die size sets the dice in this system (the dice count comes from your Grade's Reinforced Strike).
export const WEAPONS = [
  ["Fist (unarmed)", "d4", "bludgeoning", "melee", "agile, finesse, nonlethal, unarmed", "", "Every sorcerer's first weapon. Uses your Grade's Reinforced Strike dice."],
  ["Dagger", "d4", "piercing", "melee / thrown 10 ft", "agile, finesse, thrown, versatile S", "2 sp", "A short blade, easy to hide."],
  ["Shortsword", "d6", "piercing", "melee", "agile, finesse, versatile S", "9 sp", "A short, quick blade."],
  ["Katana", "d6", "slashing", "melee", "deadly d8, two-hand d10, versatile P", "2 gp", "A curved sword you can wield one- or two-handed."],
  ["Longsword", "d8", "slashing", "melee", "versatile P", "1 gp", "A straight, reliable sword."],
  ["Spear", "d6", "piercing", "melee / thrown 20 ft", "thrown", "1 sp", "A simple polearm that can be thrown."],
  ["Bo Staff", "d8", "bludgeoning", "melee (reach)", "monk, parry, reach, trip", "2 sp", "A long staff for sweeping and blocking."],
  ["Nunchaku", "d6", "bludgeoning", "melee", "backswing, disarm, finesse, monk", "2 sp", "Two batons on a chain."],
  ["Three-Section Staff", "d8", "bludgeoning", "melee (reach)", "backswing, reach, trip, two-hand", "6 sp", "The shape of the special-grade tool Playful Cloud, without its power."],
  ["Chain Weapon", "d8", "slashing", "melee (reach)", "disarm, reach, trip", "3 gp", "A weighted chain, good for tangling and pulling."],
  ["Shortbow", "d6", "piercing", "ranged 60 ft", "deadly d10", "3 gp", "A compact bow."],
  ["Throwing Knives", "d4", "slashing", "thrown 20 ft", "agile, thrown", "1 sp", "Small balanced blades."]
].map(([name, dieSize, damageType, range, traits, price, text]) => ({ name, dieSize, damageType, range, traits, price, description: p(text) }));

export const CURSED_TOOLS = [
  ["Grade 4 Cursed Knife", "d4", "slashing", "melee", "agile, finesse, cursed tool", "A school-issued tool that holds a little cursed energy."],
  ["Grade 3 Cursed Staff", "d8", "bludgeoning", "melee (reach)", "reach, trip, cursed tool", "A training staff that stores a charge well."],
  ["Grade 2 Cursed Blade", "d8", "slashing", "melee", "versatile P, cursed tool", "A blade that takes a heavy charge."]
].map(([name, dieSize, damageType, range, traits, text], i) => ({ name, dieSize, damageType, range, traits, cursedTool: true, yen: [100000, 400000, 1500000][i], description: p(`${text} Charge it with 1 CE at a time (up to your Grade Rank) and release the charge on a hit for extra technique dice.`) }));

/** Armor prices in yen (PF2e price, at ¥10,000 per gp). */
const ARMOR_YEN = { "School Uniform (reinforced)": 30000, "Padded Armor": 2000, "Leather Armor": 20000, "Studded Leather": 30000, "Chain Shirt": 50000, "Hide Armor": 20000, "Breastplate": 80000, "Full Plate": 300000 };

export const ARMOR = [
  ["School Uniform (reinforced)", "unarmored", 0, 5, 0, 0, 0, "Jujutsu school uniforms are woven to take cursed energy. No bonus, no penalty."],
  ["Padded Armor", "light", 1, 3, 0, 0, 10, "Thick quilted layers."],
  ["Leather Armor", "light", 1, 4, -1, 0, 10, "Supple and quiet."],
  ["Studded Leather", "light", 2, 3, -1, 0, 12, "Leather with metal studs."],
  ["Chain Shirt", "light", 2, 3, -1, 0, 12, "A light mail shirt."],
  ["Hide Armor", "medium", 3, 2, -2, -5, 14, "Heavy hides."],
  ["Breastplate", "medium", 4, 1, -2, -5, 16, "A solid chest plate."],
  ["Full Plate", "heavy", 6, 0, -3, -10, 18, "Head-to-toe plate."]
].map(([name, category, acBonus, dexCap, checkPenalty, speedPenalty, strength, text]) => ({ name, category, acBonus, dexCap, checkPenalty, speedPenalty, strength: Math.floor((strength - 10) / 2), yen: ARMOR_YEN[name] ?? 0, description: p(text) }));

export const GEAR = [
  ["Phone", "L", "8 gp", "Calls, maps and a flashlight. The window reports go here."],
  ["Flashlight", "L", "1 sp", "Bright light in a 60-foot cone."],
  ["First-Aid Kit", "L", "5 sp", "Lets you Administer First Aid without a penalty."],
  ["Healer's Toolkit", "1", "5 gp", "Needed to Treat Wounds."],
  ["Climbing Kit", "1", "5 sp", "Rope, pitons and harness for Athletics to Climb."],
  ["Rope (50 ft)", "L", "5 cp", "Strong, light rope."],
  ["Binoculars", "L", "2 gp", "See distant things clearly."],
  ["Curtain Talisman", "L", "1 gp", "A paper seal used to raise a curtain (veil) around a mission site."],
  ["Bandages", "L", "1 cp", "Stops bleeding with Administer First Aid."],
  ["Backpack", "-", "1 sp", "Carries up to 4 Bulk without counting against your limit."]
].map(([name, bulk, price, text]) => ({ name, bulk, price, description: p(text) }));

/* ---------- Modern weapons (Core Rules VIII) ---------- */
// Prices are in yen. Everyday melee weapons are sold at the supply office; firearms and explosives only at the Bureau Armory.

export const MODERN_WEAPONS = [
  ["Baseball Bat", "d6", "bludgeoning", "melee", "backswing, shove", 8000, "Aluminium or wood. A favourite of delinquents, and of exorcists who were delinquents."],
  ["Crowbar", "d6", "bludgeoning", "melee", "shove, versatile P", 4000, "Opens doors, crates and the occasional curse."],
  ["Combat Knife", "d4", "piercing", "melee / thrown 10 ft", "agile, finesse, thrown, versatile S", 15000, "A military fighting knife with a serrated spine."],
  ["Machete", "d6", "slashing", "melee", "sweep", 12000, "A long, heavy brush blade."],
  ["Fire Axe", "d8", "slashing", "melee", "sweep, two-handed", 10000, "Pulled off the wall of a burning building, or bought new. Needs both hands."],
  ["Telescopic Baton", "d4", "bludgeoning", "melee", "agile, finesse, nonlethal, parry", 6000, "Snaps out to full length with a flick of the wrist. Standard issue for Bureau assistant managers."],
  ["Sledgehammer", "d10", "bludgeoning", "melee", "shove, two-handed", 15000, "Slow, heavy and very good at walls. Needs both hands."],
  ["Chainsaw", "d10", "slashing", "melee", "forceful, sweep, two-handed, loud", 45000, "Needs both hands. Everyone within 100 feet hears it start."]
].map(([name, dieSize, damageType, range, traits, yen, text]) => ({ name, dieSize, damageType, range, traits, yen, description: p(text) }));

// [name, die, type, range, traits, magazine, reload actions, auto-fire rounds, yen, text]
export const FIREARMS = [
  ["Revolver", "d6", "piercing", "ranged 60 ft", "firearm, concussive, fatal d10", 6, 1, 0, 150000, "Six chambers and a heavy trigger. It never jams, and sorcerers who favour guns tend to start here."],
  ["Semi-Automatic Pistol", "d6", "piercing", "ranged 50 ft", "firearm, concussive", 15, 1, 0, 120000, "A Bureau-licensed service pistol. Fifteen rounds and a quick magazine change."],
  ["Submachine Gun", "d4", "piercing", "ranged 40 ft", "firearm, concussive, auto-fire", 30, 1, 5, 400000, "Compact and fast. Auto-Fire empties five rounds into a 10-foot burst."],
  ["Pump Shotgun", "d8", "piercing", "ranged 30 ft", "firearm, concussive, scatter 10 ft, two-handed", 6, 2, 0, 250000, "Six shells, loaded one at a time. Brutal up close; the spread clips anything beside the target."],
  ["Assault Rifle", "d8", "piercing", "ranged 100 ft", "firearm, concussive, auto-fire, two-handed", 30, 1, 5, 700000, "A military rifle the Bureau licenses only to sorcerers who keep their paperwork in order."],
  ["Sniper Rifle", "d10", "piercing", "ranged 200 ft", "firearm, fatal d12, kickback, two-handed", 5, 1, 0, 900000, "Bolt-action and scoped. A curse rarely knows where the shot came from."],
  ["Taser", "d4", "electricity", "ranged 15 ft", "firearm, nonlethal", 1, 1, 0, 30000, "Fires two barbed probes on wires. On a critical hit, the target is stunned 1."]
].map(([name, dieSize, damageType, range, traits, magazine, reload, autoFire, yen, text]) =>
  ({ name, dieSize, damageType, range, traits, firearm: true, magazine, loaded: magazine, reload, autoFire, yen, description: p(text) }));

export const EXPLOSIVES = [
  { name: "Fragmentation Grenade", dieSize: "d6", damageType: "piercing", range: "thrown 30 ft", traits: "consumable, thrown", area: "10-ft burst", save: "reflex", yen: 40000,
    text: "Pull the pin, throw it up to 30 feet. Everyone in a 10-foot burst makes a basic Reflex save against your Technique DC." },
  { name: "Incendiary Grenade", dieSize: "d6", damageType: "fire", range: "thrown 30 ft", traits: "consumable, fire, thrown", area: "10-ft burst", save: "reflex", yen: 45000,
    text: "A burst of burning gel. Everyone in a 10-foot burst makes a basic Reflex save against your Technique DC." },
  { name: "Flashbang", dieSize: "d4", damageType: "", range: "thrown 30 ft", traits: "consumable, thrown, visual, auditory", area: "10-ft burst", save: "fortitude", noDamage: true, yen: 25000,
    text: "A blinding flash and a deafening bang. Everyone in a 10-foot burst makes a Fortitude save against your Technique DC. On a failure, the creature is dazzled. On a critical failure, it is blinded and deafened." }
].map(({ text, ...e }) => ({ ...e, consumable: true, quantity: 3, description: p(`${text} Comes in a pack of three; each throw uses one.`) }));

export const MODERN_ARMOR = [
  ["Motorcycle Jacket", "light", 1, 4, 0, 0, 10, 40000, "Armoured leather with padding at the shoulders and elbows."],
  ["Ballistic Vest", "light", 2, 3, -1, 0, 12, 200000, "A Kevlar vest with trauma plates. Bureau Armory only."],
  ["Riot Gear", "medium", 4, 1, -2, -5, 16, 350000, "Helmet, plates and shin guards from a police supplier. Bureau Armory only."]
].map(([name, category, acBonus, dexCap, checkPenalty, speedPenalty, strength, yen, text]) => ({ name, category, acBonus, dexCap, checkPenalty, speedPenalty, strength: Math.floor((strength - 10) / 2), yen, description: p(text) }));

export const MODERN_GEAR = [
  ["Smoke Grenade", "L", 15000, "Throw it up to 30 feet. Smoke fills a 20-foot burst for 1 minute, and creatures inside it are concealed."],
  ["Gun Case", "1", 10000, "A locking hard case. Bureau rules say a firearm travels in one."],
  ["Hearing Protection", "L", 5000, "Electronic earmuffs. You can't be deafened by gunfire or a flashbang while you wear them."]
].map(([name, bulk, yen, text]) => ({ name, bulk, yen, description: p(text) }));

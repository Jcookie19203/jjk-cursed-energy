// Read-aloud text and NPC dialogue for "Under the Hollow Crown". Merged into the guide and world by
// tools/campaign-build.mjs. Read-aloud boxes are written to be read to the players as-is; NPC lines are
// suggestions to say in character (paraphrase freely).

/** The campaign opening: read to the players at the start of session 1. Spoiler-free. */
export const OPENING_HOOK = {
  read: [
    "Every year, Japan loses about ten thousand people to things it can't see. The papers call them accidents, suicides, disappearances. A small number of people know better. Fear, grief, hatred and regret don't simply fade. They pool, and they curdle, and they take shape. Those shapes are called curses, and the people who can see them, and fight them, are called jujutsu sorcerers.",
    "You can see them. Maybe you always could: the thing at the end of your grandmother's hospital bed, the shape on the train that nobody else moved away from. Maybe it started last month. Either way, someone noticed. A letter arrived with no stamp and no return address, and it knew your name.",
    "It was an offer of admission to a school that isn't on any map: the Hanagasumi Annex, a new branch of Tokyo Jujutsu High, opening this spring in Hanagasumi Ward.",
    "You've never heard of Hanagasumi. Hardly anyone outside it has. It's a tired corner of Tokyo where the shutters stay down on half the shopping street, the trains run late, and nobody walks home alone after dark. Curse sightings here run five times higher than anywhere else in the city. Nobody at headquarters will say why. They just built a school in the middle of it, and they filled the first class with you.",
    "The Annex is an old middle school with a new coat of paint. There's a gravel courtyard, a cherry tree that hasn't bloomed in years, and a hand-painted sign over the gate. The principal, a nervous man called Hase, shakes every one of your hands twice and apologises for the heating. Your teacher doesn't shake anyone's hand. He's a tall, unsmiling man with a bad knee he doesn't mention, and he looks at each of you for exactly one second, as if he's measuring something and doesn't like the result.",
    "\"Inukai. Grade 1. I teach you; I don't look after you. You'll call me sensei, you'll answer when you're asked, and in the field you'll do exactly what I say, because the last students who didn't are dead. This ward has more curses than anywhere in Tokyo. Headquarters wants to know why. So do I.\"",
    "He drops a folder on the desk. Inside is a photograph of a condemned apartment block called Sunrise Heights. Three demolition workers went up its stairwell last week. None of them came down.",
    "\"Eat something,\" says Inukai-sensei, already walking away. \"We leave in an hour.\"",
  ],
  short: "You can see curses: the shapes that human fear and grief leave behind. That makes you a jujutsu sorcerer, and it got you a letter from a school that isn't on any map: the Hanagasumi Annex, opening this spring in a tired corner of Tokyo where curse sightings run five times higher than anywhere else and nobody will say why. You're its first class. Your teacher, the cold and unreadable Inukai-sensei, has your first job: a condemned apartment block where three workers walked up the stairwell and never came down.",
  questions: [
    "Before you read, ask each player: how did your character first see a curse?",
    "After you read, go round the table: when the letter came, who in your life did you tell, and what did you say?",
    "Then ask the session-zero question: what does Hanagasumi Ward owe you, or what do you owe it?",
  ],
};

/** Per encounter: what the players see when the scene opens, plus optional in-fight lines. */
export const ENCOUNTER_TEXT = {
  "1.1": { read: "The lobby smells of wet plaster and old cigarettes. A wall of rusted mailboxes hangs open, stuffed with eviction notices nobody collected. The reception desk has folded in on itself. Something grey is clinging to the mailboxes, swaying slightly, like laundry in a breeze that isn't there." },
  "1.2": { read: "The third-floor corridor runs the length of the building. Every few metres there's a hole punched through the drywall into the flat behind it, the edges chewed rather than broken. Flies circle the corridor light in a perfect slow ring. From inside the walls comes a scratching, and then, unmistakably, a giggle." },
  "1.3": { read: "Behind the block, a small playground: a sandpit gone to weeds, a slide with a crack down the middle, and one swing. The swing is moving. There's no wind. It goes up, and back, and up, and on every forward arc the chain creaks like someone sighing." },
  "1.4": { read: "The stairwell climbs in half-floors, a landing and a door at every turn. You count the doors as you go: one, two, three, four… and then a fifth door on a landing you're sure wasn't there a moment ago. It's ajar. The dark behind it is waiting for you to make up your mind.",
    lines: [{ who: "Kaito (if he's with them)", line: "Doorways. Don't stand in them. It eats the ones who can't decide." }] },
  "1.5": { read: "A white hall under headquarters, sealed behind glass. On the other side, three examiners with clipboards and one very bored stenographer. In the middle of the floor sits a porcelain doll in a school uniform. Its head turns toward you. Then, very softly, it starts to cry.",
    lines: [{ who: "Examiner", line: "Candidates, the curse is Grade 4. You may begin. We will stop you if you start to die. Probably." }] },

  "2.1": { read: "The convenience store is the brightest thing on the street at 2 a.m., humming fridges and a radio playing a song from twenty years ago. The clock behind the counter says 2:00. It has said 2:00 since you walked in. The cashier smiles at you without blinking. \"That'll be one more,\" it says. \"One more what?\" you'd ask. It just keeps smiling." },
  "2.2": { read: "The school has three floors. The building plans say so, the fire map says so, and the janitor says so. But when you reach the top of the stairs there's another flight going up, and a door marked 4F, and behind it a corridor identical to the one below, down to the same broken locker. The clock in the classroom ahead is five minutes fast." },
  "2.3": { read: "The storm drain is ankle-deep and full of lost things: umbrellas, single shoes, phones, keys, a wedding ring, a child's backpack. Further in, the pile gets taller and starts to look deliberate, like a nest. Somewhere in the middle of it, something is sorting teeth into neat little rows." },
  "2.4": { read: "Steam rolls off the big tiled pool of the old bathhouse. The water is perfectly still. Then one of you feels something close around an ankle, gentle at first, like a hand, and the pool floor isn't where it was a second ago." },
  "2.5": { read: "The curse is already dead, split neatly down the middle. Sitting on it, cross-legged, is a man in a good coat with a long cloth-wrapped bundle across his knees. He's eating convenience-store onigiri. He looks up and smiles like he's been waiting for you.",
    lines: [
      { who: "Ravel (entrance)", line: "Ah, the Annex kids. I've heard about you. The thing I want was in its stomach; let's not argue over who gets to open it. Or, actually, let's." },
      { who: "Ravel (withdrawing)", line: "That's enough for today. You're better than the rumours. Here, my card. Call me when you can afford me." }
    ] },
  "2.6": { read: "The rooftop is a garden: dozens of potted plants under a tarp, watered and tidy. Every pot has the same sigil scratched into its side, the seed shape you've been seeing all month. A man in a delivery jacket is kneeling over the last pot with a trowel. He doesn't look round.",
    lines: [{ who: "Sower Cultivator", line: "You're early. The Gardener said you'd come eventually. She said you'd understand, eventually. I don't think you will." }] },
  "2.7": { read: "The Annex at night. Every light is off and every door you closed this evening is open. From the biology lab comes a wet, rhythmic clicking, like someone fitting plastic organs back into a body one by one. Footsteps start down the long corridor toward the dormitory." },

  "3.1": { read: "The covered market is packed: fish counters, pickle stalls, a man shouting prices. And the same woman is at every stall. Same coat, same bag, same blank smile, buying the same daikon at five different counters. When you look at her, all of her look back." },
  "3.2": { read: "The stairwell is lit only by phone screens: dozens of them, propped on every step, all showing the same chat window. Three grey dots, typing. Typing. Typing. Then every phone lights up at once with a single message: \"Seen.\"" },
  "3.3": { read: "The izakaya is warm and almost cosy: a long counter, paper lanterns, a TV with the baseball on mute. The master behind the counter has already poured a drink for each of you. \"On the house,\" he says. \"Goro-san always sat there. Third stool.\" The glasses are sweating, and the liquid inside is very slightly moving." },
  "3.4": { read: "Rush hour on the platform, shoulder to shoulder. The yellow safety line at the platform edge is brighter than it should be, and it's moving toward the crowd. The board says the express is due in three minutes. The crowd behind you starts, very gently, to push." },
  "3.5": { read: "The basement under the market is flooded to the knee and stinks of iron. Rusted shutters hang off their rails. Mounds of corroded blades, tools and charms lie everywhere like the bones of something that ate metal. In the middle of the water something huge and red-brown turns over, and every weapon on you starts, faintly, to weep rust.",
    lines: [{ who: "Haruta (helping, for now)", line: "Wow, would you look at that. Good thing you've got us. Go on, we'll cover you." }] },
  "3.6": { read: "The Husk is dead. You're soaked, bleeding and out of cursed energy. Behind you, someone starts a slow clap.",
    lines: [
      { who: "Haruta", line: "Honestly, thank you. We couldn't get near that thing. Nothing personal, but the Gardener wants the market clean. That includes you." },
      { who: "Kechizu", line: "Brother told me to bring something back. You'll do." }
    ] },
  "3.7": { read: "The training ground at the Kyoto school is gravel and old cedar trees, ringed with students who've come to watch the Tokyo kids lose. Across the ground your opponent rolls a spear across their shoulders and waits for the referee's flag.",
    lines: [{ who: "Referee", line: "Exhibition bout. Fight to a clean hit or a yield. Nobody dies in front of the principal, please." }] },

  "4.1": { read: "Two flats face each other across a courtyard. In each, a resident sits at the kitchen table, signing the same document over and over, hands moving in perfect unison. A grey thread of cursed energy runs between the two windows, across the courtyard, taut as a washing line." },
  "4.2": { read: "The clinic waiting room is full. Every seat is taken by someone holding a numbered ticket, staring at the display above the door that reads 0. Nobody speaks. The ticket machine by the entrance spits out a ticket for each of you without being asked. Your numbers are in the thousands." },
  "4.3": { read: "The train stops at a station that isn't on any map. One platform, one bench, a single lamp, and a sign with no name on it. The doors open. Three hundred commuters stand very still in the carriages behind you. Somewhere along the line an air-raid siren begins to wind up, and the crowd turns, all at once, toward the platform.",
    lines: [{ who: "Sae Mibu (at the end of the line, after the fight)", line: "You're Inukai's students. He's a careful man. Careful men never ask what's under the ward. Forty years ago this was the Ninth Night. They burned us out so they could bury something, and then they called it an accident. I'm not your enemy. I'm a gardener. And something is about to bloom." }] },
  "4.4": { read: "The last train out of Kisaragi rattles through a dark that isn't a tunnel. In the end carriage, Ravel sits with his feet up and his sword across his lap, a cased tool on the seat beside him.",
    lines: [
      { who: "Ravel", line: "You again. Good. I need that case and I'd rather not cut my way through you to get it. Shall we make it official? A vow: you help me, I help you, and nobody stabs anybody until we're off this train." },
      { who: "Ravel (if refused)", line: "Shame. I was starting to like you." }
    ] },
  "4.5": { read: "An office that goes on forever: rows of grey filing cabinets, every drawer stuffed with signed contracts, every signature still wet. At the end of the aisle a figure in a suit stands behind a desk, stamping papers with a seal that looks like a mouth. It stops when it sees you, and smiles, and opens a fresh folder with your names on it.",
    lines: [{ who: "The Debt Collector", line: "Ah. The ones who keep promises. I have every one of them here, you know. Let's go through them together, line by line." }] },
  "4.6": { read: "The Annex is burning. Students are running past you toward the road. In the courtyard, the curse that did this stands over a tall man slumped against the cherry tree. His watch is cracked. His sword is broken. And for the first time since you met him, Inukai-sensei is smiling.",
    lines: [
      { who: "Kaito (dying)", line: "You came back. Of course you did. Everyone got out; I counted. Don't look at me. Look at it. It's empty: no tricks left, nothing in the tank. You can take it." },
      { who: "Kaito (last words, after the fight)", line: "(Say each PC's given name, one at a time, slowly.) …I should have said those sooner. There's a notebook in my desk. Read it. You were never a list of mistakes. You were the reason I came back to teaching." }
    ] },

  "5.1": { read: "The curtain over the quarantine zone is a dome of black glass a kilometre wide. Police tape, a headquarters van, two bored officers. On the other side of the barrier you can see streetlights still on, washing still on balconies, and nobody moving at all." },
  "5.2": { read: "The shrine courtyard is silent except for hammering. A sacred cedar stands in the middle, hundreds of iron nails driven into its bark, each one pinning a straw doll. As you watch, another nail goes in, by itself, and somewhere nearby a resident starts to scream." },
  "5.3": { read: "The village clinic is where it started. The waiting room is full of patients asleep in their chairs, breathing in time, every one of them with the same grey rash climbing their necks. Behind the reception desk the sickness has a heart: a pulsing mass of bandages and old medical charts, beating." },
  "5.4": { read: "The village hall has been turned into a courtroom: benches facing a raised bench, a witness stand, a gallery full of residents who can't look away. Behind the judge's bench sits something in a powdered wig with no face at all. It raises a gavel. \"The accused will rise.\"",
    lines: [{ who: "The Faceless Magistrate", line: "This court finds that you have entered a sealed zone without authority. Sentence will be carried out immediately. Court is now in session." }] },
  "5.5": { read: "Ravel's safehouse is a love hotel with a rotating bed and a minibar he's very proud of. He pours tea, not alcohol, and sets out five cups.",
    lines: [{ who: "Ravel", line: "You're wanted. Very wanted. Kujo's put your faces on every desk in headquarters. I'll hide you, because I like you and because you'll owe me. Before you go: the Sowers keep their grown tools somewhere. I know where. Want to hear the price?" }] },
  "5.6": { read: "Rooftop to rooftop across the ward at night, sirens below. Three figures land on the roof ahead of you: headquarters sorcerers in black suits, ID lanyards still on.",
    lines: [{ who: "Headquarters sorcerer", line: "Annex students. You're suspended pending inquiry. Come quietly and nobody gets hurt. We're just doing our jobs." }] },

  "6.1": { read: "Noon at the Ninth Night memorial. The bronze flame catches the sun; the wall of names is too bright to read. Your shadows are gone. Not short: gone. On the white wall behind the memorial, dark outlines of people stand where nobody is standing, and one of them is moving." },
  "6.2": { read: "The road underpass is flooded to the roof. Cars bob against the ceiling. On the roofs of the cars, civilians are clinging on, and the water around them is black and completely still, the stillness of something holding its breath." },
  "6.3": { read: "The vault under the shrine is lined floor to ceiling with blades, each with a paper tag naming its dead owner. In the middle, on a stone pedestal, a plain katana in a white scabbard. Ravel is standing beside it, sword already drawn, and he isn't smiling for once.",
    lines: [
      { who: "Ravel", line: "That's the Split Soul Katana. It cuts what a thing is, not what it's made of. It's the only reason anyone walks away from what's under this ward, and I want to be the one holding it. No hard feelings. Draw." },
      { who: "Ravel (beaten)", line: "Ha. Of course. Take it, then. If you'd rather I didn't die here, I'll swear to fight beside you at the end. Your call." }
    ] },
  "6.4": { read: "The inner hall of headquarters: tatami, paper screens, and a barrier humming around the elders' chamber. Elder Kujo is waiting at a low table with tea for one, and two sorcerers standing behind him who are very clearly not there to serve tea.",
    lines: [
      { who: "Elder Kujo", line: "Sit. No? Very well. Yes, I signed the orders. Forty years ago I watched the Ninth Night from that window. Do you know what it costs to kill a Special Grade? Cities. I kept it asleep for the price of one poor ward. That isn't villainy, children. It's arithmetic." },
      { who: "Elder Kujo (losing)", line: "Enough. Enough. What do you want? A vow? Name the terms." }
    ] },
  "6.5": { read: "Write this one from the PC's own story: the place their session-zero tie leads, the person or curse waiting there, and the thing they've been carrying since session one." },
  "6.6": { read: "The Annex courtyard at night. Kaito's memorial tree is in bloom out of season. Kneeling at its roots, trowel in hand, is a neat woman in a gardening apron, and the hole she's dug is filling with light from underneath.",
    lines: [
      { who: "Sae Mibu", line: "You came. I'm glad. I wanted someone to be here who'd understand. I was eight on the Ninth Night. I hid under a train platform for two days and listened to the whole ward cry, and then they told us it was an accident. This is the ward's grief. It deserves to be born." },
      { who: "Sae Mibu (if a PC reaches the child)", line: "…I just wanted somebody to say sorry." },
      { who: "Sae Mibu (last action)", line: "It's alright. It was always going to bloom." }
    ] },

  "7.1": { read: "Every light in the ward goes out at once. In the dark, a shape walks down the main street, taller than the streetlights, wearing a crown made of nothing. Where it passes, people stop running and simply stand there. Grey figures pour out of the ground behind it, weeping, and start to drag the standing people toward it.",
    lines: [{ who: "The Hollow Sovereign", line: "(a voice inside everyone's head, very tired) Rest. It's easier to rest." }] },
  "7.2": { read: "The stadium is filling up. Figure after figure walks in and takes a seat, each one counting out loud: \"Four thousand and six. Four thousand and seven.\" The numbers rise every second. Somewhere in the stands, one quiet voice is counting from one." },
  "7.3": { read: "The maternity ward is ankle-deep in warm black fluid and it's still rising. Cots line the walls, all empty but rocking. At the far end, something vast and soft and sorrowful is giving birth, again, and again, and every child it has climbs out of the water toward you." },
  "7.4": { read: "The shopping street is half lava and half blossom: shopfronts melting on one side, trees bursting through the tarmac on the other. Two disasters are standing in the middle of the road arguing about whose turn it is." },
  "7.5": { read: "Under the memorial the ground just stops. You walk down a staircase that isn't there into a throne room with no walls, no floor and no ceiling, only a ring of mouthing faces receding forever. On a throne of nothing sits the Hollow Sovereign, and for the first time it looks at you properly.",
    lines: [
      { who: "The Hollow Sovereign", line: "You are so tired. All of you. You've been carrying this ward since you were children. Put it down. Sit. Nobody will blame you." },
      { who: "The Hollow Sovereign (when a PC defies it)", line: "(silence, and then, for the first time, a sound like pain)" }
    ] },
};

/** Per act: key NPC lines between fights, and quick answers for investigation scenes. */
export const ACT_TEXT = {
  1: {
    lines: [
      { who: "Kaito (first day)", line: "Inukai. Grade 1. I teach you; I don't look after you. You'll call me sensei, you'll answer when you're asked, and in the field you'll do exactly what I say, because the last students who didn't are dead." },
      { who: "Kaito (after the stairwell, if a PC did well)", line: "Acceptable." },
      { who: "Kaito (if asked anything personal)", line: "No." },
      { who: "Principal Hase", line: "You're the first class this school has ever had. Please don't be the last." },
      { who: "Mrs Oda (the last tenant)", line: "It started listening. Six months ago. After the nice man with the seed packets came round asking about the boiler." },
      { who: "Mina Takara (noodle shop)", line: "You can see it too, right? The thing on the roof across the street. It waves at me." },
    ],
    asks: [
      { q: "Why is Sunrise Heights being demolished?", a: "The owners went bankrupt; the city bought it cheap. Every tenant but Mrs Oda left after the disappearances." },
      { q: "What's the sigil?", a: "A seed shape, burned in with cursed energy, still warm. Occultism DC 15: it's a marker, not a spell; something is being planted, not cast. Kaito won't say more." },
      { q: "Who were the missing workers?", a: "Three demolition crew. Last seen on the stairwell's third landing; their hard hats are still there." },
    ],
  },
  2: {
    lines: [
      { who: "Kaito (case board)", line: "Four jobs. Pick your order. Anything with that seed on it comes to me. And nobody goes in alone. That isn't advice." },
      { who: "Kaito (turning up at a case, unasked)", line: "I was passing. Carry on." },
      { who: "Old Man Tsuda (pawn shop)", line: "Back room's for people who know to ask for it. You knew. Don't tell your teacher." },
      { who: "Kaito (after the map)", line: "Nine circles. Four done. Headquarters has a file on this. I'm going to read it, whether they let me or not." },
    ],
    asks: [
      { q: "What's on the cultivator's map?", a: "Hanagasumi Ward with nine circles inked on it, four crossed out: Sunrise Heights, the bathhouse, the storm drain and the school. The pawn shop is circled in pencil." },
      { q: "Who is Ravel?", a: "Society DC 20: a freelance sorcerer who hunts special-grade tools, licensed but not affiliated. Headquarters tolerates him because he's useful." },
    ],
  },
  3: {
    lines: [
      { who: "Kaito (the one personal question he answers)", line: "Two of them. Kyoto, six years ago. I let them take a job alone because I thought they were ready. …Next question." },
      { who: "The fence", line: "Grown tools. Not forged: grown. Plant the right seed in the right misery and a blade comes up. Don't look at me like that, it's a living." },
      { who: "Captured lieutenant", line: "The Gardener plants one circle every year, on the anniversary of the Ninth Night. Five done. You can't stop it. You can only be standing nearby when it blooms." },
      { who: "Elder Kujo (promotion ceremony)", line: "Congratulations, Grade 2. I understand you recovered a map. May I see it? Thank you. Interesting. Leave this one with headquarters." },
    ],
    asks: [
      { q: "What was in Goro Sakai's notebook?", a: "Names of tools that failed, dates, and one line underlined twice: \"The rust goes TOWARD the seeds.\" And the fence's address." },
      { q: "What was the Ninth Night?", a: "Society DC 25: a fire in 1986 that killed hundreds in the ward. The official report blames a gas main. The report is unusually short." },
    ],
  },
  4: {
    lines: [
      { who: "Debt Collector victim", line: "I only signed for a little power. A little. Now every time I lie, I lose a finger. I've got six left." },
      { who: "Kaito (the night before Kisaragi Station, after a PC says something stupid)", line: "(He laughs, once, and seems surprised at himself.) You lot are the worst class I've ever had. …Don't make me bury you." },
      { who: "Principal Hase (funeral)", line: "He asked me not to give a speech, so I won't. Only this. He wasn't cold, you know. He was frightened. Of exactly this. Of you standing here, and him not." },
      { who: "Mina (at the funeral)", line: "He sat at the end of our counter every Friday and never said a word to anyone. He paid my school fees. I wasn't supposed to know." },
    ],
    asks: [
      { q: "Who owes the Debt Collector?", a: "Over a dozen sorcerers, including a headquarters clerk who reports to Elder Kujo's office." },
      { q: "Where is Kisaragi Station?", a: "Nowhere. It exists only when a train full of frightened people is running late." },
    ],
  },
  5: {
    lines: [
      { who: "Headquarters officer at the curtain", line: "Orders are nobody in, nobody out. Four hundred people? I know. I don't make the orders." },
      { who: "Village elder (inside)", line: "My father was a fireman on the Ninth Night. He said the fire started in six places at once, and the sorcerers were already standing in the street, waiting." },
      { who: "Principal Hase (reinstating them)", line: "I've reinstated you. I'll probably lose my job for it. Don't make me regret it. Make them regret it." },
    ],
    asks: [
      { q: "What do the sealing orders say?", a: "That the 'Crown' under the ward is to be kept dormant at minimum cost, incidents in the ward are acceptable losses, and the Sowers are not to be pursued. Signed: Yasumasa Kujo, every year for forty years." },
      { q: "Why the Sealed Village?", a: "It's the seventh circle. The contagion keeps 400 frightened people in one place for as long as headquarters keeps the curtain up." },
    ],
  },
  6: {
    lines: [
      { who: "Ravel (before the vault)", line: "I'll be honest with you, because it's the end and I'm sentimental: I want that katana for myself. If you get there first, it's yours. If I do, well." },
      { who: "Elder Kujo (if bound by a vow)", line: "Fine. I'll testify. I'll resign. I'll even pray for you. You won't survive it, you know." },
    ],
    asks: [
      { q: "Where are the last two circles?", a: "The Ninth Night memorial, and the Annex courtyard where Kaito died. Grief has to be fresh or old; she has both." },
    ],
  },
  7: {
    lines: [
      { who: "Principal Hase (the council)", line: "Headquarters wants to evacuate the city. I told them you'd go in. They laughed. Then they stopped laughing." },
      { who: "Mina (before the finale)", line: "Come back. Okay? Just come back. You owe me ramen." },
      { who: "Epilogue: Mina, next spring", line: "I passed the entrance exam. First year at the Annex. Don't laugh. Sensei would've laughed." },
    ],
    asks: [],
  },
};

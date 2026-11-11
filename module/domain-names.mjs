/**
 * Japanese names for every technique's Domain: [kanji (shown on the splash), kana reading (spoken), VOICEVOX speaker id].
 * Canon Domains use their series names; the supplement's own Domains are translated.
 * The spoken clips in assets/domains/voice/ are generated from this table by tools/domain-voices.mjs.
 *
 * Voices (VOICEVOX, credit required): 84 青山龍星 (しっとり) · 53 麒ヶ島宗麟 · 52 雀松朱司 · 101 離途 (シリアス) · 11 玄野武宏.
 */
export const VOICE_CREDITS = {
  84: "VOICEVOX:青山龍星", 53: "VOICEVOX:麒ヶ島宗麟", 52: "VOICEVOX:雀松朱司", 101: "VOICEVOX:離途", 11: "VOICEVOX:玄野武宏"
};

export const DOMAIN_NAMES = {
  "Beast Tamer": ["狂獣狩猟", "きょうじゅうしゅりょう", 53],
  "Binding Cords": ["千鎖縛界", "せんさばっかい", 52],
  "Black Bird Manipulation": ["黒群開帳", "こくぐんかいちょう", 101],
  "Blood Manipulation": ["紅血泥濘", "こうけつでいねい", 84],
  "Boogie Woogie": ["律動拍殿", "りつどうはくでん", 11],
  "Comedian": ["喜劇時間", "きげきじかん", 11],
  "Construction": ["万歯車鋳造所", "まんはぐるまちゅうぞうじょ", 53],
  "Contract Re-Creation": ["無尽在庫", "むじんざいこ", 52],
  "Copy (Mimicry)": ["真贋相愛", "しんがんそうあい", 101],
  "Cursed Speech": ["静野詠唱", "せいやえいしょう", 84],
  "Cursed Spirit Manipulation": ["合成呪霊苑", "ごうせいじゅれいえん", 53],
  "Cursed Technique Erasure": ["裁光", "さいこう", 52],
  "Cursed Tool Master": ["無窮武庫", "むきゅうぶこ", 11],
  "Cursed Womb": ["呪胎獄", "じゅたいごく", 84],
  "Deadly Sentencing": ["誅伏賜死", "ちゅうぶくしし", 53],
  "Decay (Rot)": ["不知井底", "ふちせいてい", 101],
  "Detonation": ["火薬樽", "かやくだる", 11],
  "Disaster Flames": ["蓋棺鉄囲山", "がいかんてっちせん", 53],
  "Disaster Plants": ["百花繚原", "ひゃっかりょうげん", 52],
  "Disaster Tides": ["蕩蘊平線", "たううんへいせん", 101],
  "Dream Eater": ["眠獄", "みんごく", 84],
  "Enthrall": ["心臓法廷", "しんぞうほうてい", 52],
  "Flight Dominion": ["無重天", "むじゅうてん", 11],
  "Foresight": ["筆定刻", "ひっていこく", 101],
  "Granite Blast": ["砲撃要塞", "ほうげきようさい", 53],
  "Gravity Well": ["特異点", "とくいてん", 84],
  "Ice Formation": ["絶対零度", "ぜったいれいど", 52],
  "Idle Death Gamble": ["坐殺博徒", "ざさつばくと", 11],
  "Idle Transfiguration": ["自閉円頓裹", "じへいえんどんか", 101],
  "Illusion Weaver": ["鏡幻殿", "きょうげんでん", 52],
  "Ink Calligraphy": ["呪墨写本", "じゅぼくしゃほん", 84],
  "Limitless": ["無量空処", "むりょうくうしょ", 84],
  "Loan Shark": ["最終取立事務所", "さいしゅうとりたてじむしょ", 53],
  "Love Rendezvous": ["恋人引力", "こいびといんりょく", 11],
  "Lucky Streak": ["胴元必勝", "どうもとひっしょう", 11],
  "Magnetism": ["鉄磁石", "てつじしゃく", 52],
  "Mind's Eye": ["開心眼", "かいしんがん", 101],
  "Moon Dregs": ["星鍛冶", "ほしかじ", 84],
  "Mythical Beast Amber": ["霹靂宮", "へきれききゅう", 53],
  "New Shadow Style": ["簡易領域・決刃", "かんいりょういき、けつじん", 52],
  "Plague Bearer": ["疫病結界", "えきびょうけっかい", 101],
  "Possession": ["借肉", "しゃくにく", 84],
  "Prism": ["光輝殿", "こうきでん", 11],
  "Projection Sorcery": ["時胞月宮殿", "じほうげっきゅうでん", 52],
  "Ratio Technique": ["瓦落瓦落", "がらがら", 53],
  "Reflection": ["鏡界", "きょうかい", 101],
  "Reversed Flow Mastery": ["癒しの聖域", "いやしのせいいき", 11],
  "Sand Manipulation": ["砂漠霊廟", "さばくれいびょう", 53],
  "Shrine": ["伏魔御廚子", "ふくまみづし", 53],
  "Six Eyes Discipline": ["無辺明晰", "むへんめいせき", 84],
  "Sky Manipulation": ["蒼穹天蓋", "そうきゅうてんがい", 52],
  "Sonic Resonance": ["無音交響", "むおんこうきょう", 101],
  "Spirit Channeling": ["万霊降神", "ばんれいこうしん", 53],
  "Star Rage": ["崩星", "ほうせい", 11],
  "Stormcaller": ["嵐眼", "らんがん", 84],
  "Straw Doll Technique": ["共鳴", "きょうめい", 52],
  "Temporal Stasis": ["凍刻", "とうこく", 101],
  "Ten Shadows Technique": ["嵌合暗翳庭", "かんごうあんえいてい", 84],
  "Terraform": ["生ける山", "いけるやま", 53],
  "Thread Manipulation": ["千糸網", "せんしもう", 52],
  "Veil Weaving": ["封印聖所", "ふういんせいしょ", 101],
  "Venom Weaving": ["毒花園", "どくかえん", 11]
};

/** "Disaster Tides" → "disaster-tides" (voice clip file name). */
export const voiceSlug = technique => technique.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

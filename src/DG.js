import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════
const MOOD_MAX = 1500;
const BOND_MAX = 200;
const BASE_HP = 120;
const BASE_MP = 140;
const DAY_START_MIN = 360;
const NIGHT_START_MIN = 1200;
const TOTAL_MINS = 1440;
const SAVE_KEY = "dreamguardian_save";
const ROOT_BG = "linear-gradient(to bottom, #090014, #140026, #090014)";

const getMoodTier = (pts) => (pts >= 1001 ? 3 : pts >= 501 ? 2 : 1);

const TIER_DATA = {
  3: {
    label: "Awesome",
    col: "#a855f7",
    dim: "#6d28d9",
    emoji: "😊",
    desc: "Alex seems relaxed today. The dark circles are fading. There's even a quiet smile when he glances at Luna's corner.",
  },
  2: {
    label: "Stressed",
    col: "#f59e0b",
    dim: "#b45309",
    emoji: "😔",
    desc: "Alex looks tired and on edge. Moving slower than usual, barely finishing his meals.",
  },
  1: {
    label: "Deprived",
    col: "#ef4444",
    dim: "#b91c1c",
    emoji: "😩",
    desc: "Alex is struggling. Slumped posture, hollow stare. The apartment feels heavier today.",
  },
};

// ─── Upgrade trees ──────────────────────────────────────────
// Each form: 60 upgrades split across 6 branches (10 each)
// cost = 10 + (level * 5) shards

const makeBranch = (id, name, ico, type, desc, effects) => ({
  id,
  name,
  ico,
  type,
  desc,
  effects,
});
// effects: array of 10 entries, each { stat, val } applied per level

const FERAL_BRANCHES = [
  makeBranch(
    "f_atk",
    "Shadow Claws",
    "🐾",
    "passive",
    "Increases base physical attack power.",
    Array(10)
      .fill(null)
      .map((_, i) => ({ stat: "atk", val: 3 + i }))
  ),
  makeBranch(
    "f_hp",
    "Iron Fur",
    "🛡",
    "passive",
    "Increases Luna's maximum HP.",
    Array(10)
      .fill(null)
      .map((_, i) => ({ stat: "maxHp", val: 8 }))
  ),
  makeBranch(
    "f_spd",
    "Ghost Step",
    "💨",
    "passive",
    "Reduces chance of enemy hitting Luna (dodge +2% per level).",
    Array(10)
      .fill(null)
      .map((_, i) => ({ stat: "dodge", val: 2 }))
  ),
  makeBranch(
    "f_pounce",
    "Apex Pounce",
    "⚡",
    "active",
    "Empowers Shadow Pounce: +15% damage per level.",
    Array(10)
      .fill(null)
      .map((_, i) => ({ stat: "pounce", val: 15 }))
  ),
  makeBranch(
    "f_hiss",
    "Soul Shriek",
    "💀",
    "active",
    "Empowers Banshee Hiss: debuff lasts +1 turn per level.",
    Array(10)
      .fill(null)
      .map((_, i) => ({ stat: "hiss", val: 1 }))
  ),
  makeBranch(
    "f_ult",
    "Feral Resonance",
    "🌟",
    "ultimate",
    "Empowers Feral Surge: +10% damage per level.",
    Array(10)
      .fill(null)
      .map((_, i) => ({ stat: "surge", val: 10 }))
  ),
];

const HYBRID_BRANCHES = [
  makeBranch(
    "h_matk",
    "Lunar Core",
    "🌙",
    "passive",
    "Increases base magic attack power.",
    Array(10)
      .fill(null)
      .map((_, i) => ({ stat: "matk", val: 3 + i }))
  ),
  makeBranch(
    "h_mp",
    "Dream Reservoir",
    "💧",
    "passive",
    "Increases Luna's maximum MP.",
    Array(10)
      .fill(null)
      .map((_, i) => ({ stat: "maxMp", val: 8 }))
  ),
  makeBranch(
    "h_regen",
    "Star Pulse",
    "✦",
    "passive",
    "Luna regenerates +1 MP per enemy turn.",
    Array(10)
      .fill(null)
      .map((_, i) => ({ stat: "mpRegen", val: 1 }))
  ),
  makeBranch(
    "h_blast",
    "Void Lance",
    "🔵",
    "active",
    "Empowers Lunar Blast: +15% magic damage per level.",
    Array(10)
      .fill(null)
      .map((_, i) => ({ stat: "blast", val: 15 }))
  ),
  makeBranch(
    "h_weave",
    "Nightmare Bind",
    "🌀",
    "active",
    "Empowers Dream Weave: +10% damage and drains 3 enemy MP per level.",
    Array(10)
      .fill(null)
      .map((_, i) => ({ stat: "weave", val: 10 }))
  ),
  makeBranch(
    "h_ult",
    "Nova Ascension",
    "✨",
    "ultimate",
    "Empowers Guardian Nova: +10% magic damage per level.",
    Array(10)
      .fill(null)
      .map((_, i) => ({ stat: "nova", val: 10 }))
  ),
];

const upgradeCost = (currentLevel) => 10 + currentLevel * 5;
const totalUpgrades = (lvls) => Object.values(lvls).reduce((a, v) => a + v, 0);

const buildDefaultLevels = (branches) =>
  Object.fromEntries(branches.map((b) => [b.id, 0]));

// Compute bonus stat from upgrade levels
const computeBonus = (branches, levels, stat) =>
  branches.reduce((acc, branch) => {
    const lv = levels[branch.id] || 0;
    branch.effects.slice(0, lv).forEach((e) => {
      if (e.stat === stat) acc += e.val;
    });
    return acc;
  }, 0);

// ─── Story acts ─────────────────────────────────────────────
const STORY_ACTS = [
  {
    id: "prologue",
    title: "Prologue: The Bond",
    pages: [
      {
        heading: "The Dream Guardian: A Tale of Devotion",
        sub: "Prologue: The Bond",
        text: "Day 1. Apartment 4B. 3:47 AM.\n\nIn a cozy apartment, a cat named Luna lives with her human, Alex. Their bond is simple but profound: Alex provides warmth, shelter, and food, while Luna offers companionship and silent protection.\n\nBut lately, Alex has been restless at night, tossing and turning, plagued by nightmares and insomnia. Luna notices the dark circles under Alex's eyes, the untouched breakfast bowls, and the dwindling quality of her own meals.",
      },
      {
        heading: "The Portal",
        text: "One moonlit night, as Alex finally drifts into troubled sleep, Luna discovers a shimmering portal beneath the bed — a gateway to the Dreamscape, the otherworld where nightmares take physical form.\n\nHer collar glows a soft, steady blue.\n\nShe is scared. But she steps inside.",
      },
    ],
  },
  {
    id: "act1",
    title: "Act I: Into the Dreamscape",
    pages: [
      {
        heading: "Act I: Into the Dreamscape",
        text: "Luna steps through the portal and finds herself in a twisted reflection of their home. Shadows writhe in corners, and whispers echo through distorted hallways. Here, she encounters the Nightmare Feeders — spectral creatures that feast on human rest, growing stronger with each sleepless night.",
      },
      {
        heading: "The Keeper of Dreams",
        text: '"Your human is under siege," the Keeper explains. "These creatures drain their peace, feeding on anxiety, stress, and fear. Only a guardian with true devotion can drive them back."\n\nLuna accepts her role without hesitation. For every peaceful night Alex enjoys, the food is better, the home is happier, and their bond grows stronger. But more than that — Luna loves her human.',
      },
    ],
  },
  {
    id: "act2",
    title: "Act II: The Nightly Battles",
    pages: [
      {
        heading: "Act II: The Nightly Battles",
        text: "Each night, Luna enters the Dreamscape to face increasingly dangerous foes — Anxiety Wraiths that multiply with every worry, Memory Ghouls that twist happy moments into sources of dread, and the Insomnia Titan, a massive entity that prevents rest entirely.",
      },
      {
        heading: "Dream Essence",
        text: "Luna fights with agility, cunning, and fierce determination. She learns to harness Dream Essence — fragments of Alex's happy memories — to strengthen her attacks and unlock new abilities.\n\nEach victory brings Alex one step closer to restful sleep.",
      },
    ],
  },
  {
    id: "act3",
    title: "Act III: The Ultimate Sacrifice",
    pages: [
      {
        heading: "Act III: The Ultimate Sacrifice",
        text: "As Luna delves deeper, she discovers the source: The Void Shepherd, an ancient entity that feeds on the despair of the sleepless. It has marked Alex as its primary target.\n\nThe final confrontation is brutal. Luna is outmatched, but she refuses to retreat.",
      },
      {
        heading: "One Final Strike",
        text: "Drawing on every ounce of love and loyalty, she channels all the Dream Essence she has collected — every purr, every cuddle, every quiet moment shared with Alex — into one final strike.\n\nThe Void Shepherd screams and dissolves into light.",
      },
    ],
  },
  {
    id: "epilogue",
    title: "Epilogue: The Morning After",
    isEnd: true
  }
];
    pages: [
      {
        heading: "Epilogue: The Morning After",
        text: "Alex wakes to the best sleep he has had in months. Sunlight streams through the window. Luna is curled up at the foot of the bed, exhausted but purring softly.\n\nAlex doesn't know about the battles fought in the shadows, but he feels the difference.",
      },
      {
        heading: "A Well-Rested Human",
        final: true,
        text: "That morning, Alex prepares Luna's favorite meal — fresh fish and cream. As Luna eats, she glances at the space beneath the bed. The portal is sealed, for now.\n\nBut she knows: if the nightmares return, she will be ready.\n\nBecause a well-rested human means a happy home. And for Luna, that is worth fighting for.",
      },
    ],
  },
];

// ─── Enemy pools ────────────────────────────────────────────
const ENEMY_POOLS = {
  prologue: [
    {
      id: "feeder",
      name: "Nightmare Feeder",
      ico: "👾",
      hp: 80,
      atk: 10,
      shards: 4,
      desc: "A slimy black-purple crawler. Red eyes that never blink.",
      minion: true,
    },
    {
      id: "wraith",
      name: "Anxiety Wraith",
      ico: "👻",
      hp: 65,
      atk: 12,
      shards: 5,
      desc: "A purple wisp that multiplies when struck.",
      minion: true,
    },
  ],
  act1: [
    {
      id: "feeder",
      name: "Nightmare Feeder",
      ico: "👾",
      hp: 130,
      atk: 16,
      shards: 5,
      desc: "Stronger. Hungrier. Its red eyes pulse.",
      minion: true,
    },
    {
      id: "wraith",
      name: "Anxiety Wraith",
      ico: "👻",
      hp: 110,
      atk: 18,
      shards: 6,
      desc: "Its multiplications come faster now.",
      minion: true,
    },
    {
      id: "ghoul",
      name: "Memory Ghoul",
      ico: "🌀",
      hp: 155,
      atk: 14,
      shards: 8,
      desc: "A glitchy silhouette that warps happy memories.",
      minion: true,
    },
    {
      id: "titan",
      name: "Insomnia Titan",
      ico: "⚙️",
      hp: 520,
      atk: 32,
      shards: 35,
      desc: "A golem of rusted clocks and iron chains.",
      boss: true,
      switchable: true,
    },
  ],
  act2: [
    {
      id: "feeder",
      name: "Nightmare Feeder",
      ico: "👾",
      hp: 180,
      atk: 20,
      shards: 6,
      desc: "Evolved. Faster, hungrier.",
      minion: true,
    },
    {
      id: "wraith",
      name: "Anxiety Wraith",
      ico: "👻",
      hp: 155,
      atk: 23,
      shards: 7,
      desc: "Its screech alone causes damage.",
      minion: true,
    },
    {
      id: "ghoul",
      name: "Memory Ghoul",
      ico: "🌀",
      hp: 200,
      atk: 17,
      shards: 9,
      desc: "It wears the faces of happier days.",
      minion: true,
    },
    {
      id: "sentinel",
      name: "Ocular Sentinel",
      ico: "👁️",
      hp: 500,
      atk: 38,
      shards: 40,
      desc: "A massive unblinking eye. Drains Mana.",
      boss: true,
      drainMP: 15,
      requireHybrid: true,
    },
  ],
  act3: [
    {
      id: "feeder",
      name: "Nightmare Feeder",
      ico: "👾",
      hp: 230,
      atk: 26,
      shards: 7,
      desc: "Nearly unrecognizable. Ancient and ravenous.",
      minion: true,
    },
    {
      id: "wraith",
      name: "Anxiety Wraith",
      ico: "👻",
      hp: 200,
      atk: 29,
      shards: 8,
      desc: "It has stopped multiplying — now it simply consumes.",
      minion: true,
    },
    {
      id: "ghoul",
      name: "Memory Ghoul",
      ico: "🌀",
      hp: 260,
      atk: 21,
      shards: 10,
      desc: "The glitches have become intentional.",
      minion: true,
    },
    {
      id: "shepherd",
      name: "The Void Shepherd",
      ico: "🕳️",
      hp: 850,
      atk: 46,
      shards: 70,
      desc: "Ancient entity of negative space and despair. The Final Boss.",
      boss: true,
      final: true,
      drainMP: 20,
      requireHybrid: true,
    },
  ],
};

const BOSS_NIGHT_NUMS = [20, 40, 60, 80];

// ─── Skills ─────────────────────────────────────────────────
const CAT_SKILLS = [
  {
    id: "scratch",
    name: "Feral Scratch",
    ico: "🐾",
    mp: 0,
    mult: 1.3,
    type: "phys",
    desc: "Quick slash. No MP cost. Always reliable.",
  },
  {
    id: "pounce",
    name: "Shadow Pounce",
    ico: "⚡",
    mp: 10,
    mult: 2.8,
    type: "phys",
    desc: "Leaping ambush. Low MP, solid damage.",
    upgStat: "pounce",
  },
  {
    id: "hiss",
    name: "Banshee Hiss",
    ico: "💀",
    mp: 14,
    mult: 2.0,
    type: "phys",
    desc: "Reduces enemy ATK for 2 turns.",
    debuff: true,
    upgStat: "hiss",
  },
  {
    id: "surge",
    name: "Feral Surge ★",
    ico: "🌟",
    mp: 38,
    mult: 5.0,
    type: "phys",
    desc: "ULTIMATE — Devastating feral burst. Bond Buff +50%.",
    ult: true,
    upgStat: "surge",
  },
];
const HYBRID_SKILLS = [
  {
    id: "pawstrike",
    name: "Paw Strike",
    ico: "✊",
    mp: 0,
    mult: 1.2,
    type: "phys",
    desc: "Basic melee. No MP cost. Always available.",
  },
  {
    id: "lunarblast",
    name: "Lunar Blast",
    ico: "🌙",
    mp: 12,
    mult: 3.2,
    type: "magic",
    desc: "90% Magic — Focused moonlight bolt.",
    upgStat: "blast",
  },
  {
    id: "dreamweave",
    name: "Dream Weave",
    ico: "🌀",
    mp: 22,
    mult: 3.8,
    type: "magic",
    desc: "90% Magic — Nightmare tendrils lash the foe.",
    upgStat: "weave",
  },
  {
    id: "nova",
    name: "Guardian Nova ★",
    ico: "✨",
    mp: 45,
    mult: 6.5,
    type: "magic",
    desc: "ULTIMATE — 90% Magic dreamscape nova. Bond Buff +50%.",
    ult: true,
    upgStat: "nova",
  },
];

// ─── Scavenge pool ───────────────────────────────────────────
const SCAVENGE_POOL = [
  { label: "Loose change", coins: 3 },
  { label: "Hidden coin", coins: 7 },
  { label: "Crumpled bill", coins: 15 },
  { label: "Lucky quarter", coins: 5 },
  { label: "Dusty wallet", coins: 25 },
  { label: "Old button", coins: 1 },
  { label: "Dust bunny...", coins: 0 },
  { label: "Just shadows", coins: 0 },
];

// ─── Alex actions ────────────────────────────────────────────
const ALEX_ACT = {
  3: {
    before: [
      'Alex kneels and scratches behind Luna\'s ears before grabbing his keys. "Be good, okay?" His eyes are lighter today.',
      "Alex spends ten minutes playing with Luna before leaving — the feather toy gets a real workout.",
      'He picks her up, holds her close for a moment, then sets her down gently. "Back soon."',
    ],
    after: [
      "Alex comes home humming softly. He immediately refills Luna's bowl and opens a can of the good food.",
      "He returns with groceries and — tucked in the bag — a new cat treat pouch. Luna gets a handful right away.",
      "Alex collapses onto the couch and lets Luna climb onto his lap without a word. They stay like that for hours.",
    ],
    mGain: [8, 14],
    bGain: [3, 5],
  },
  2: {
    before: [
      "Alex glances at Luna's half-full bowl and decides it's enough. He grabs his keys, distracted.",
      "He leaves quickly. A brief pat on Luna's head on the way to the door.",
      "Alex is somewhere else in his mind. Luna watches him leave from the windowsill.",
    ],
    after: [
      "Alex returns looking tired. He feeds Luna without much ceremony, then sinks into the couch.",
      "He comes home, rubs his face, pours Luna's regular food. They sit in the same room but barely interact.",
      "Alex forgot her treats again. He fills her bowl with the basics and calls it a night.",
    ],
    mGain: [3, 6],
    bGain: [1, 2],
  },
  1: {
    before: [
      "Alex shuffles past Luna's empty bowl without noticing. He is out the door in seconds.",
      "He barely looks at Luna. His eyes are red. He leaves without a word.",
      "Luna tries to get his attention. He gently moves her aside and closes the door behind him.",
    ],
    after: [
      "Alex returns late. He's forgotten Luna's food — pours a half-measure of the cheap stuff.",
      "He comes home and sits on the floor, back against the bed. Luna approaches slowly. They sit together in the dark.",
      "Alex shuffles in, fills her bowl with the minimum, and goes straight to bed.",
    ],
    mGain: [0, 2],
    bGain: [0, 1],
    mLoss: [2, 5],
  },
};

// ═══════════════════════════════════════════════════════════
// ITEM CATALOG
// ═══════════════════════════════════════════════════════════
// type: "consumable" | "equipment"
// slot (equipment): "weapon" | "accessory" | "aura"
// effect: applied immediately (consumable) or on equip (equipment)
// availability: "mouse" | "mappy" | "both"
// rarity: "common" | "uncommon" | "rare" | "legendary"

const ITEM_CATALOG = [
  // ── CONSUMABLES ─────────────────────────────────────────
  // Mood potions
  {
    id: "mood_sm",
    type: "consumable",
    ico: "🫧",
    name: "Mood Vial",
    desc: "A small vial of shimmering calm. Restores Alex's mood a little.",
    price: 12,
    rarity: "common",
    avail: "both",
    effect: { mood: 60 },
  },
  {
    id: "mood_md",
    type: "consumable",
    ico: "💜",
    name: "Mood Tonic",
    desc: "A deeper draught. Alex's tension visibly eases.",
    price: 30,
    rarity: "uncommon",
    avail: "both",
    effect: { mood: 160 },
  },
  {
    id: "mood_lg",
    type: "consumable",
    ico: "💫",
    name: "Dream Elixir",
    desc: "Bottled peace. A generous surge of calm washes over Alex.",
    price: 65,
    rarity: "rare",
    avail: "mappy",
    effect: { mood: 320 },
  },
  {
    id: "mood_xl",
    type: "consumable",
    ico: "🌙",
    name: "Lunar Essence",
    desc: "Distilled moonlight. Fills Alex's mood nearly to the brim.",
    price: 130,
    rarity: "legendary",
    avail: "mappy",
    effect: { mood: 550 },
  },
  // Bond potions
  {
    id: "bond_sm",
    type: "consumable",
    ico: "🐾",
    name: "Bond Drop",
    desc: "A tiny bead of shared warmth. Strengthens the bond between Luna and Alex.",
    price: 18,
    rarity: "common",
    avail: "both",
    effect: { bond: 8 },
  },
  {
    id: "bond_md",
    type: "consumable",
    ico: "💛",
    name: "Bond Essence",
    desc: "A glowing shard of mutual trust. A meaningful boost to the bond.",
    price: 40,
    rarity: "uncommon",
    avail: "both",
    effect: { bond: 20 },
  },
  {
    id: "bond_lg",
    type: "consumable",
    ico: "✨",
    name: "Soul Crystal",
    desc: "Crystallized devotion. Alex and Luna feel profoundly close.",
    price: 90,
    rarity: "rare",
    avail: "mappy",
    effect: { bond: 40 },
  },
  // HP potions
  {
    id: "hp_flask",
    type: "consumable",
    ico: "❤️",
    name: "HP Flask",
    desc: "Restores 35 HP to Luna when used in battle.",
    price: 22,
    rarity: "common",
    avail: "both",
    effect: { hp: 35 },
    battle: true,
  },
  {
    id: "hp_brew",
    type: "consumable",
    ico: "🩸",
    name: "HP Regen Brew",
    desc: "Luna regenerates 4 HP per enemy turn for the rest of the battle.",
    price: 35,
    rarity: "uncommon",
    avail: "both",
    effect: { hpRegen: 4 },
    battle: true,
  },
  {
    id: "hp_surge",
    type: "consumable",
    ico: "💗",
    name: "Vitality Surge",
    desc: "Immediately restores 80 HP to Luna.",
    price: 55,
    rarity: "rare",
    avail: "mappy",
    effect: { hp: 80 },
    battle: true,
  },
  // MP potions
  {
    id: "mp_flask",
    type: "consumable",
    ico: "💧",
    name: "MP Flask",
    desc: "Restores 30 MP to Luna when used in battle.",
    price: 20,
    rarity: "common",
    avail: "both",
    effect: { mp: 30 },
    battle: true,
  },
  {
    id: "mp_brew",
    type: "consumable",
    ico: "🌊",
    name: "MP Regen Brew",
    desc: "Luna regenerates 4 MP per enemy turn for the rest of the battle.",
    price: 32,
    rarity: "uncommon",
    avail: "both",
    effect: { mpRegen: 4 },
    battle: true,
  },
  {
    id: "mp_surge",
    type: "consumable",
    ico: "🔵",
    name: "Mana Surge",
    desc: "Immediately restores 65 MP to Luna.",
    price: 50,
    rarity: "rare",
    avail: "mappy",
    effect: { mp: 65 },
    battle: true,
  },

  // ── EQUIPMENT — WEAPON SLOT ─────────────────────────────
  {
    id: "eq_claws",
    type: "equipment",
    slot: "weapon",
    ico: "🗡️",
    name: "Iron Dream Claws",
    desc: "Reinforced claws that boost physical attack. Feral form benefits most.",
    price: 55,
    rarity: "common",
    avail: "both",
    effect: { atk: 7, matk: 2 },
  },
  {
    id: "eq_shadowc",
    type: "equipment",
    slot: "weapon",
    ico: "🌑",
    name: "Shadow Claws",
    desc: "Forged in the darkest part of the Dreamscape. Significant ATK power.",
    price: 90,
    rarity: "uncommon",
    avail: "mouse",
    effect: { atk: 14, dodge: 3 },
  },
  {
    id: "eq_voidg",
    type: "equipment",
    slot: "weapon",
    ico: "🫲",
    name: "Void Gauntlet",
    desc: "A gauntlet that channels nightmare energy. Magic attacks are devastating.",
    price: 110,
    rarity: "rare",
    avail: "mappy",
    effect: { matk: 16, atk: 3 },
  },
  {
    id: "eq_pawg",
    type: "equipment",
    slot: "weapon",
    ico: "🥊",
    name: "Paw Gloves",
    desc: "Padded gloves that improve physical strikes and help Luna dodge.",
    price: 70,
    rarity: "uncommon",
    avail: "both",
    effect: { atk: 8, dodge: 5 },
  },
  {
    id: "eq_dreamf",
    type: "equipment",
    slot: "weapon",
    ico: "🌀",
    name: "Dream Fangs",
    desc: "Enchanted fangs woven from memory. Balanced physical and magic output.",
    price: 145,
    rarity: "legendary",
    avail: "mappy",
    effect: { atk: 12, matk: 12 },
  },

  // ── EQUIPMENT — ACCESSORY SLOT ──────────────────────────
  {
    id: "eq_collar",
    type: "equipment",
    slot: "accessory",
    ico: "🔮",
    name: "Moon Collar",
    desc: "A shimmering collar that expands Luna's MP capacity.",
    price: 50,
    rarity: "common",
    avail: "both",
    effect: { maxMp: 20 },
  },
  {
    id: "eq_purr",
    type: "equipment",
    slot: "accessory",
    ico: "🛡",
    name: "Purr Shield",
    desc: "A resonating charm that grants Luna extra HP.",
    price: 45,
    rarity: "common",
    avail: "both",
    effect: { maxHp: 22 },
  },
  {
    id: "eq_ward",
    type: "equipment",
    slot: "accessory",
    ico: "🌿",
    name: "Nightmare Ward",
    desc: "Reduces incoming enemy damage by a flat amount each strike.",
    price: 100,
    rarity: "rare",
    avail: "mappy",
    effect: { dmgReduce: 6 },
  },
  {
    id: "eq_whisker",
    type: "equipment",
    slot: "accessory",
    ico: "🐱",
    name: "Whisker Ring",
    desc: "Enchanted ring that boosts both HP and MP.",
    price: 80,
    rarity: "uncommon",
    avail: "both",
    effect: { maxHp: 14, maxMp: 14 },
  },
  {
    id: "eq_soulgem",
    type: "equipment",
    slot: "accessory",
    ico: "💎",
    name: "Soul Gem",
    desc: "A precious gem of pure dream energy. Massive HP and MP boost.",
    price: 160,
    rarity: "legendary",
    avail: "mappy",
    effect: { maxHp: 35, maxMp: 35 },
  },

  // ── EQUIPMENT — AURA SLOT ───────────────────────────────
  {
    id: "eq_staura",
    type: "equipment",
    slot: "aura",
    ico: "⭐",
    name: "Starlight Aura",
    desc: "Luna glows softly. Regenerates a small amount of HP each enemy turn.",
    price: 60,
    rarity: "common",
    avail: "both",
    effect: { hpRegenEq: 2 },
  },
  {
    id: "eq_moona",
    type: "equipment",
    slot: "aura",
    ico: "🌕",
    name: "Moonbeam Aura",
    desc: "A golden halo. Regenerates MP each enemy turn.",
    price: 65,
    rarity: "common",
    avail: "both",
    effect: { mpRegenEq: 2 },
  },
  {
    id: "eq_nighta",
    type: "equipment",
    slot: "aura",
    ico: "🌙",
    name: "Nightveil Aura",
    desc: "Wraps Luna in shadow. Increases dodge chance significantly.",
    price: 85,
    rarity: "uncommon",
    avail: "mouse",
    effect: { dodge: 8 },
  },
  {
    id: "eq_dreama",
    type: "equipment",
    slot: "aura",
    ico: "🌌",
    name: "Dreamscape Aura",
    desc: "A cosmic shimmer. Boosts both physical and magic attack.",
    price: 120,
    rarity: "rare",
    avail: "mappy",
    effect: { atk: 6, matk: 6 },
  },
  {
    id: "eq_voidaura",
    type: "equipment",
    slot: "aura",
    ico: "🕳️",
    name: "Void Aura",
    desc: "Luna radiates pure void energy. Devastating magic boost.",
    price: 170,
    rarity: "legendary",
    avail: "mappy",
    effect: { matk: 20, hpRegenEq: 3 },
  },
];

const RARITY_COL = {
  common: "#9ca3af",
  uncommon: "#22d3ee",
  rare: "#a855f7",
  legendary: "#fbbf24",
};
const SLOT_LABEL = {
  weapon: "⚔ Weapon",
  accessory: "💍 Accessory",
  aura: "✨ Aura",
};

// Generate a merchant's shop for this visit
// Mappy: 3-5 items, biased toward rare/legendary, premium prices +20%
// Mouse: 3-4 items, common/uncommon only, slight discount -10%
const generateShop = (merchant) => {
  const pool = ITEM_CATALOG.filter(
    (i) => i.avail === "both" || i.avail === merchant
  );
  const count = merchant === "mappy" ? rng(3, 5) : rng(3, 4);
  // Weighted pick by rarity
  const weights = { common: 40, uncommon: 30, rare: 20, legendary: 10 };
  const mouseWeights = { common: 55, uncommon: 35, rare: 10, legendary: 0 };
  const w = merchant === "mappy" ? weights : mouseWeights;
  const eligible = pool.filter((i) => w[i.rarity] > 0);
  const chosen = [];
  const used = new Set();
  let attempts = 0;
  while (chosen.length < count && attempts < 60) {
    attempts++;
    const item = pick(eligible);
    if (used.has(item.id)) continue;
    const roll = Math.random() * 100;
    if (roll < w[item.rarity]) {
      chosen.push(item);
      used.add(item.id);
    }
  }
  // Apply merchant price modifier
  const mod = merchant === "mappy" ? 1.2 : 0.9;
  return chosen.map((i) => ({ ...i, shopPrice: Math.ceil(i.price * mod) }));
};

// Compute total equipment bonuses from equipped items
const equipBonus = (equipped, stat) => {
  return Object.values(equipped).reduce((acc, item) => {
    if (!item) return acc;
    return acc + (item.effect?.[stat] || 0);
  }, 0);
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const rng = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rng(0, arr.length - 1)];

const fmtTime = (totalMins) => {
  const m = ((totalMins % TOTAL_MINS) + TOTAL_MINS) % TOTAL_MINS;
  const h = Math.floor(m / 60) % 24,
    mm = m % 60;
  const ap = h >= 12 ? "PM" : "AM",
    dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(mm).padStart(2, "0")} ${ap}`;
};
const isDaytime = (t) => {
  const m = ((t % TOTAL_MINS) + TOTAL_MINS) % TOTAL_MINS;
  return m >= DAY_START_MIN && m < NIGHT_START_MIN;
};
const getActKey = (n) =>
  n < 20 ? "prologue" : n < 40 ? "act1" : n < 60 ? "act2" : "act3";
const getActIdx = (n) =>
  n < 20 ? 0 : n < 40 ? 1 : n < 60 ? 2 : n < 80 ? 3 : 4;
const calcVictoryMood = (n, s) => Math.floor(n + (s / 60) * 3 + 75);

const lunaAtk = (form, shards, fLvls, hLvls, equipped = {}) => {
  const base = form === "cat" ? 35 : 28;
  const shardBonus = Math.floor(shards * 0.5);
  const upgBonus =
    form === "cat"
      ? computeBonus(FERAL_BRANCHES, fLvls, "atk")
      : computeBonus(HYBRID_BRANCHES, hLvls, "matk");
  const eqAtk = equipBonus(equipped, "atk");
  const eqMatk = equipBonus(equipped, "matk");
  const formBonus = form === "cat" ? eqAtk : eqMatk;
  return base + shardBonus + upgBonus + formBonus;
};

const calcDmg = (
  skill,
  form,
  shards,
  bondBuff,
  fLvls,
  hLvls,
  equipped = {}
) => {
  const branches = form === "cat" ? FERAL_BRANCHES : HYBRID_BRANCHES;
  const levels = form === "cat" ? fLvls : hLvls;
  let mult = skill.mult;
  if (skill.upgStat) {
    const pct = computeBonus(branches, levels, skill.upgStat);
    mult = mult * (1 + pct / 100);
  }
  let d = lunaAtk(form, shards, fLvls, hLvls, equipped) * mult;
  if (form === "cat" && skill.type === "magic") d *= 0.1;
  if (form === "hybrid" && skill.type === "phys") d *= 0.1;
  if (skill.ult && bondBuff) d *= 1.5;
  // Variance: ±10% of damage, always positive
  const variance = Math.floor(d * 0.1);
  return Math.max(1, Math.floor(d) + rng(-variance, variance));
};

const buildQueue = (nightNum, actKey) => {
  const pool = ENEMY_POOLS[actKey] || ENEMY_POOLS.act1;
  const minions = pool.filter((e) => e.minion);
  if (!minions.length) return [];
  const roll = Math.random() * 100;
  const count = roll < 30 ? 20 : roll < 60 ? 10 : 5;
  const isBoss = BOSS_NIGHT_NUMS.includes(nightNum);
  const bossList = pool.filter((e) => e.boss);
  const queue = [];
  for (let i = 0; i < count; i++) {
    const base = pick(minions);
    queue.push({
      ...base,
      hp: base.hp,
      maxHp: base.hp,
      uid: `${base.id}_${i}`,
    });
  }
  if ((isBoss || Math.random() < 0.12) && bossList.length) {
    const boss = pick(bossList);
    queue.push({
      ...boss,
      hp: boss.hp,
      maxHp: boss.hp,
      uid: `${boss.id}_boss`,
    });
  }
  return queue;
};
const pickForm = (queue) => {
  const boss = queue.find((e) => e.boss);
  if (boss?.requireHybrid) return "hybrid";
  if (!boss) return Math.random() < 0.15 ? "hybrid" : "cat";
  return Math.random() < 0.5 ? "hybrid" : "cat";
};

// ═══════════════════════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════════════════════
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.oscs = [];
    this.vol = 0.22;
    this.ready = false;
  }
  init() {
    if (this.ready) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.vol;
      this.master.connect(this.ctx.destination);
      this.ready = true;
    } catch (_) {}
  }
  setVol(v) {
    this.vol = v;
    if (this.master)
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }
  stopAll() {
    this.oscs.forEach((o) => {
      try {
        o.stop();
      } catch (_) {}
    });
    this.oscs = [];
  }
  ambient(theme) {
    if (!this.ready) return;
    this.stopAll();
    const freqs =
      theme === "night" ? [65, 97, 130, 195, 260] : [220, 330, 440, 165, 550];
    freqs.forEach((f, i) => {
      const o = this.ctx.createOscillator(),
        g = this.ctx.createGain();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = f;
      g.gain.value = 0.016 + Math.random() * 0.006;
      const lfo = this.ctx.createOscillator(),
        lg = this.ctx.createGain();
      lfo.frequency.value = 0.07 + Math.random() * 0.22;
      lg.gain.value = f * 0.012;
      lfo.connect(lg);
      lg.connect(o.frequency);
      o.connect(g);
      g.connect(this.master);
      o.start();
      lfo.start();
      this.oscs.push(o, lfo);
    });
  }
  sfx(type) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const play = (freq, dur, wave, vol = 0.1) => {
      const o = this.ctx.createOscillator(),
        g = this.ctx.createGain();
      o.type = wave;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(now);
      o.stop(now + dur);
    };
    if (type === "hit") play(320, 0.14, "sawtooth", 0.13);
    else if (type === "magic") {
      play(700, 0.08, "sine", 0.09);
      play(1100, 0.22, "sine", 0.06);
    } else if (type === "click") play(600, 0.07, "sine", 0.04);
    else if (type === "win")
      [440, 554, 660, 880].forEach((f, i) =>
        setTimeout(() => play(f, 0.3, "sine", 0.08), i * 100)
      );
    else if (type === "portal")
      [200, 300, 400, 300, 200].forEach((f, i) =>
        setTimeout(() => play(f, 0.18, "sine", 0.06), i * 75)
      );
    else if (type === "upgrade") {
      play(880, 0.1, "sine", 0.1);
      play(1100, 0.15, "sine", 0.08);
    }
  }
}
const AUD = new AudioEngine();

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const FONT = '"Courier New",Courier,monospace';
const ROOT_BG =
  "radial-gradient(ellipse at 20% 80%,#1e004a 0%,#0c0018 50%,#060010 100%)";
const S = {
  card: (border, bg) => ({
    background: bg || "rgba(14,0,30,0.88)",
    border: `1px solid ${border || "rgba(139,92,246,0.18)"}`,
    borderRadius: "10px",
    padding: "14px 16px",
    marginBottom: "10px",
    boxSizing: "border-box",
  }),
  label: {
    fontSize: "10px",
    letterSpacing: "2px",
    color: "#6d28d9",
    marginBottom: "4px",
    textTransform: "uppercase",
  },
  title: (sz, col) => ({
    fontSize: sz || "14px",
    color: col || "#c4b5fd",
    letterSpacing: "2px",
    textTransform: "uppercase",
    fontWeight: "bold",
    marginBottom: "8px",
    textShadow: `0 0 14px ${col || "#c4b5fd"}44`,
  }),
  btn: (col, dis) => ({
    background: dis ? "rgba(16,8,28,0.5)" : "rgba(50,18,100,0.22)",
    border: `1px solid ${dis ? "rgba(60,40,80,0.2)" : col || "#7c3aed"}`,
    borderRadius: "7px",
    color: dis ? "#3a2552" : "#e9d5ff",
    padding: "9px 16px",
    cursor: dis ? "not-allowed" : "pointer",
    fontFamily: FONT,
    fontSize: "12px",
    letterSpacing: "0.5px",
    boxShadow: dis ? "none" : `0 0 10px ${col || "#7c3aed"}33`,
    transition: "all 0.15s",
    lineHeight: "1.4",
    opacity: dis ? 0.45 : 1,
  }),
  row: (gap) => ({
    display: "flex",
    gap: gap || "10px",
    flexWrap: "wrap",
    alignItems: "center",
  }),
  barTrack: (h) => ({
    height: h || "11px",
    background: "rgba(6,0,14,0.8)",
    borderRadius: "5px",
    border: "1px solid rgba(80,40,140,0.1)",
    overflow: "hidden",
  }),
  barFill: (pct, col) => ({
    width: `${Math.max(0, Math.min(100, pct))}%`,
    height: "100%",
    background: col,
    borderRadius: "5px",
    transition: "width 0.4s ease",
  }),
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.82)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: "16px",
    boxSizing: "border-box",
  },
  modal: (col, wide) => ({
    background: "rgba(10,0,24,0.99)",
    border: `1px solid ${col || "rgba(139,92,246,0.35)"}`,
    borderRadius: "14px",
    padding: "22px 20px",
    maxWidth: wide ? "680px" : "480px",
    width: "100%",
    boxShadow: `0 0 60px ${col || "rgba(139,92,246,0.1)"}`,
    boxSizing: "border-box",
    maxHeight: "90vh",
    overflowY: "auto",
  }),
  dot: (a) => ({
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: a ? "#a855f7" : "rgba(139,92,246,0.18)",
    boxShadow: a ? "0 0 8px #a855f7" : "none",
    transition: "all 0.3s",
  }),
};

// ═══════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════
function Bar({ lbl, val, max, col, h }) {
  return (
    <div style={{ marginBottom: "6px" }}>
      {lbl && (
        <div style={{ ...S.label, marginBottom: "3px" }}>
          {lbl}: {val}/{max}
        </div>
      )}
      <div style={S.barTrack(h)}>
        <div style={S.barFill((val / max) * 100, col)} />
      </div>
    </div>
  );
}
function ModalWrap({ children, borderCol, wide }) {
  return (
    <div style={S.overlay}>
      <div style={S.modal(borderCol, wide)}>{children}</div>
    </div>
  );
}
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: "14px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(70,16,120,0.97)",
        border: "1px solid rgba(168,85,247,0.5)",
        borderRadius: "8px",
        padding: "10px 20px",
        fontSize: "12px",
        color: "#e9d5ff",
        zIndex: 300,
        whiteSpace: "nowrap",
        boxShadow: "0 0 20px rgba(139,92,246,0.3)",
        pointerEvents: "none",
      }}
    >
      {msg}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STATUS PANEL
// ═══════════════════════════════════════════════════════════
function StatusPanel({
  day,
  gameTime,
  form,
  coins,
  shards,
  nightTotal,
  showBond,
  bond,
}) {
  const dayMode = isDaytime(gameTime);
  return (
    <div style={S.card()}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "12px",
        }}
      >
        <div>
          <div style={S.label}>Status</div>
          <div
            style={{ fontSize: "18px", color: "#c4b5fd", fontWeight: "bold" }}
          >
            Day {day}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: dayMode ? "#fbbf24" : "#818cf8",
              marginTop: "2px",
            }}
          >
            {dayMode ? "🌤 Daytime" : "🌙 Nighttime"}
          </div>
          <div style={{ fontSize: "12px", color: "#7c3aed", marginTop: "3px" }}>
            {fmtTime(gameTime)}
          </div>
        </div>
        <div>
          <div style={S.label}>Luna</div>
          <div style={{ fontSize: "12px", color: "#c4b5fd" }}>
            {form === "cat" ? "🐈‍⬛ Feral" : "⚡ Guardian"}
          </div>
          <div style={{ fontSize: "11px", color: "#7c3aed", marginTop: "5px" }}>
            🪙 {coins} coins
          </div>
          <div style={{ fontSize: "11px", color: "#6d28d9" }}>
            💎 {shards} shards
          </div>
        </div>
        <div>
          <div style={S.label}>Journey</div>
          <div style={{ fontSize: "12px", color: "#a78bfa" }}>
            Night #{nightTotal}
          </div>
          {showBond && (
            <>
              <div style={{ ...S.label, marginTop: "8px" }}>Bond</div>
              <div style={S.barTrack("7px")}>
                <div
                  style={S.barFill(
                    (bond / BOND_MAX) * 100,
                    "linear-gradient(90deg,#92400e,#fbbf24)"
                  )}
                />
              </div>
              <div
                style={{ fontSize: "10px", color: "#8b5cf6", marginTop: "2px" }}
              >
                {bond}/{BOND_MAX}
                {bond >= 100 ? " ★ BUFF" : ""}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MOOD GAUGE
// ═══════════════════════════════════════════════════════════
function MoodGauge({ mood }) {
  const tier = getMoodTier(mood),
    td = TIER_DATA[tier],
    pct = (mood / MOOD_MAX) * 100;
  const grad =
    tier === 1
      ? "linear-gradient(90deg,#7f1d1d,#ef4444)"
      : tier === 2
      ? "linear-gradient(90deg,#78350f,#f59e0b)"
      : "linear-gradient(90deg,#4c1d95,#a855f7)";
  return (
    <div style={S.card()}>
      <div
        style={{
          ...S.row("0"),
          justifyContent: "space-between",
          marginBottom: "6px",
        }}
      >
        <div style={S.label}>Mood Gauge</div>
        <div style={{ fontSize: "11px", color: td.col, letterSpacing: "1px" }}>
          TIER {tier} — {td.label.toUpperCase()}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "9px",
          color: "#3d1a5e",
          marginBottom: "3px",
        }}
      >
        <span>T1 ▸ 0</span>
        <span style={{ color: "#92400e" }}>T2 ▸ 501</span>
        <span style={{ color: "#5b21b6" }}>T3 ▸ 1001</span>
        <span>1500</span>
      </div>
      <div style={{ ...S.barTrack("15px"), position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: `${(501 / 1500) * 100}%`,
            top: 0,
            bottom: 0,
            width: "1px",
            background: "rgba(120,53,14,0.55)",
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${(1001 / 1500) * 100}%`,
            top: 0,
            bottom: 0,
            width: "1px",
            background: "rgba(91,33,182,0.55)",
            zIndex: 1,
          }}
        />
        <div style={S.barFill(pct, grad)} />
      </div>
      <div
        style={{
          textAlign: "right",
          fontSize: "11px",
          color: "#7c3aed",
          marginTop: "4px",
        }}
      >
        {mood} / {MOOD_MAX}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STORY SCREEN
// ═══════════════════════════════════════════════════════════
function StoryScreen({ act, pageIdx, onNext, onFinish, isPrologue }) {
  const page = act.pages[pageIdx],
    isLast = pageIdx === act.pages.length - 1;
  return (
  <div style={{
    minHeight: "100dvh",
    background: ROOT_BG, // This connects to the constant we just added
    color: "#ddd6fe",
    fontFamily: "sans-serif",
    padding: 16,
    boxSizing: "border-box",
  }}>
      <div
        style={{
          ...S.card("rgba(139,92,246,0.4)", "rgba(8,0,20,0.99)"),
          maxWidth: "580px",
          width: "100%",
          textAlign: "center",
          marginBottom: 0,
          boxShadow: "0 0 60px rgba(139,92,246,0.07)",
        }}
      >
        <div style={{ fontSize: "58px", marginBottom: "12px" }}>
          {isPrologue ? "🐈‍⬛" : "✨"}
        </div>
        {page.sub && (
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "5px",
              color: "#3d1a6e",
              marginBottom: "6px",
            }}
          >
            {page.sub}
          </div>
        )}
        {!page.sub && act.title && (
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "4px",
              color: "#3d1a6e",
              marginBottom: "6px",
            }}
          >
            {act.title.toUpperCase()}
          </div>
        )}
        <div style={{ ...S.title("19px", "#c084fc"), marginBottom: "18px" }}>
          {page.heading}
        </div>
        <div
          style={{
            fontSize: "13px",
            lineHeight: "2.2",
            color: "#ddd6fe",
            whiteSpace: "pre-line",
            textAlign: "left",
            minHeight: "110px",
            marginBottom: "24px",
          }}
        >
          {page.text}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "7px",
            marginBottom: "24px",
          }}
        >
          {act.pages.map((_, i) => (
            <div key={i} style={S.dot(i === pageIdx)} />
          ))}
        </div>
        <button
          style={{
            ...S.btn("#7c3aed"),
            fontSize: "13px",
            padding: "12px 32px",
            boxShadow: "0 0 28px rgba(139,92,246,0.22)",
          }}
          onClick={() => {
            AUD.sfx("click");
            if (isLast) onFinish(page.final);
            else onNext();
          }}
        >
          {isLast
            ? page.final
              ? "🌅 End"
              : isPrologue
              ? "🌙 Begin the Journey"
              : "Continue →"
            : "Continue →"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// UPGRADE TREE MODAL
// ═══════════════════════════════════════════════════════════
function UpgradeModal({
  onClose,
  shards,
  setShards,
  feralLevels,
  setFeralLevels,
  hybridLevels,
  setHybridLevels,
  notify,
}) {
  const [tab, setTab] = useState("feral");
  const isFeral = tab === "feral";
  const branches = isFeral ? FERAL_BRANCHES : HYBRID_BRANCHES;
  const levels = isFeral ? feralLevels : hybridLevels;
  const setLevels = isFeral ? setFeralLevels : setHybridLevels;
  const used = totalUpgrades(levels);
  const maxUp = 60;

  const doUpgrade = (branchId) => {
    const cur = levels[branchId] || 0;
    if (cur >= 10) {
      notify("Branch maxed out!");
      return;
    }
    if (used >= maxUp) {
      notify("Maximum upgrades reached for this form (60)!");
      return;
    }
    const cost = upgradeCost(cur);
    if (shards < cost) {
      notify(`Need ${cost} shards (you have ${shards}).`);
      return;
    }
    AUD.sfx("upgrade");
    setShards((s) => s - cost);
    setLevels((prev) => ({ ...prev, [branchId]: cur + 1 }));
    notify(`Upgrade applied! (−${cost} shards)`);
  };

  const typeCol = {
    passive: "#818cf8",
    active: "#f59e0b",
    ultimate: "#fbbf24",
  };

  return (
    <ModalWrap borderCol="rgba(139,92,246,0.5)" wide>
      {/* Header */}
      <div
        style={{
          ...S.row("0"),
          justifyContent: "space-between",
          marginBottom: "14px",
          flexWrap: "nowrap",
        }}
      >
        <div style={{ ...S.title("16px", "#c084fc"), marginBottom: 0 }}>
          ⬆ Luna Upgrades
        </div>
        <button
          style={{ ...S.btn("#4c1d95"), padding: "5px 14px", fontSize: "11px" }}
          onClick={onClose}
        >
          ✕ Close
        </button>
      </div>

      <div style={{ fontSize: "11px", color: "#6d28d9", marginBottom: "12px" }}>
        💎 {shards} shards available &nbsp;|&nbsp; Each form: max 60 upgrades
        (10 per branch × 6 branches)
      </div>

      {/* Form tabs */}
      <div style={{ ...S.row("8px"), marginBottom: "14px" }}>
        <button
          style={S.btn(tab === "feral" ? "#7c3aed" : "#4c1d95")}
          onClick={() => setTab("feral")}
        >
          🐈‍⬛ Feral Form &nbsp;
          <span style={{ fontSize: "10px", color: "#8b5cf6" }}>
            {totalUpgrades(feralLevels)}/60
          </span>
        </button>
        <button
          style={S.btn(tab === "hybrid" ? "#a855f7" : "#4c1d95")}
          onClick={() => setTab("hybrid")}
        >
          ⚡ Guardian Form &nbsp;
          <span style={{ fontSize: "10px", color: "#8b5cf6" }}>
            {totalUpgrades(hybridLevels)}/60
          </span>
        </button>
      </div>

      {/* Branch progress summary */}
      <div
        style={{
          ...S.card("rgba(100,60,180,0.15)", "rgba(10,0,22,0.6)"),
          marginBottom: "14px",
          padding: "10px 14px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "#6d28d9",
            marginBottom: "6px",
            letterSpacing: "1px",
          }}
        >
          BRANCH OVERVIEW — {isFeral ? "FERAL" : "GUARDIAN"}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "6px",
          }}
        >
          {branches.map((b) => (
            <div key={b.id} style={{ fontSize: "11px", color: "#a78bfa" }}>
              {b.ico} {b.name.split(" ")[0]}:{" "}
              <span
                style={{ color: levels[b.id] >= 10 ? "#fbbf24" : "#c4b5fd" }}
              >
                {levels[b.id] || 0}/10
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Branch cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {branches.map((branch) => {
          const lv = levels[branch.id] || 0;
          const cost = upgradeCost(lv);
          const maxed = lv >= 10;
          const canBuy = !maxed && shards >= cost && used < maxUp;
          const pct = (lv / 10) * 100;
          return (
            <div
              key={branch.id}
              style={{
                ...S.card(
                  maxed ? "rgba(251,191,36,0.25)" : "rgba(100,60,180,0.18)",
                  "rgba(12,0,28,0.7)"
                ),
                marginBottom: 0,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  ...S.row("0"),
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <div>
                  <span style={{ fontSize: "16px", marginRight: "8px" }}>
                    {branch.ico}
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#c4b5fd",
                      fontWeight: "bold",
                    }}
                  >
                    {branch.name}
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      color: typeCol[branch.type] || "#818cf8",
                      marginLeft: "8px",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                    }}
                  >
                    {branch.type}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: maxed ? "#fbbf24" : "#8b5cf6",
                    fontWeight: "bold",
                  }}
                >
                  {maxed ? "MAX" : `Lv ${lv}/10`}
                </div>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#6d28d9",
                  marginBottom: "8px",
                  lineHeight: "1.6",
                }}
              >
                {branch.desc}
              </div>
              {/* Level bar */}
              <div style={{ ...S.barTrack("8px"), marginBottom: "8px" }}>
                <div
                  style={S.barFill(
                    pct,
                    maxed
                      ? "linear-gradient(90deg,#92400e,#fbbf24)"
                      : "linear-gradient(90deg,#4c1d95,#a855f7)"
                  )}
                />
              </div>
              {/* Per-level effects */}
              <div
                style={{
                  fontSize: "10px",
                  color: "#4c1d95",
                  marginBottom: "8px",
                }}
              >
                {branch.effects.slice(0, lv).map((e, i) => (
                  <span
                    key={i}
                    style={{ color: "#059669", marginRight: "4px" }}
                  >
                    ✓
                  </span>
                ))}
                {lv < 10 && (
                  <span style={{ color: "#4c1d95" }}>
                    Next: +{branch.effects[lv].val} {branch.effects[lv].stat}
                  </span>
                )}
              </div>
              <div style={{ ...S.row("8px") }}>
                <button
                  style={{
                    ...S.btn(
                      canBuy ? (isFeral ? "#7c3aed" : "#a855f7") : "#4c1d95",
                      !canBuy
                    ),
                    fontSize: "11px",
                    padding: "7px 14px",
                  }}
                  onClick={() => doUpgrade(branch.id)}
                  disabled={!canBuy}
                >
                  {maxed ? "✓ Maxed" : `⬆ Upgrade (${cost} 💎)`}
                </button>
                {!maxed && shards < cost && (
                  <span style={{ fontSize: "10px", color: "#b91c1c" }}>
                    Need {cost - shards} more shards
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "14px",
          borderTop: "1px solid rgba(80,40,120,0.2)",
          paddingTop: "12px",
          fontSize: "10px",
          color: "#3d1a5e",
          lineHeight: "1.8",
        }}
      >
        ✦ Passive upgrades apply permanently · Active upgrades boost specific
        skills · Ultimate upgrades enhance Feral Surge / Guardian Nova
      </div>
    </ModalWrap>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function DreamGuardian() {
  // Calculate bonuses using the function from your constants
  const bonusAtk = computeBonus(FERAL_BRANCHES, game.feralLevels, "atk");
  const bonusMatk = computeBonus(HYBRID_BRANCHES, game.hybridLevels, "matk");
  const bonusMaxHp = computeBonus(FERAL_BRANCHES, game.feralLevels, "maxHp");
  const bonusMaxMp = computeBonus(HYBRID_BRANCHES, game.hybridLevels, "maxMp");

  // Final Stats used for UI and Combat
  const totalMaxHp = BASE_HP + bonusMaxHp;
  {/* HP BAR */}
<StatBar 
  value={game.player.hp} 
  max={totalMaxHp} // Now dynamic!
  color="#ef4444" 
/>
  const totalMaxMp = BASE_MP + bonusMaxMp;
  {/* MP BAR */}
<StatBar 
  value={game.player.mp} 
  max={totalMaxMp} // Now dynamic!
  color="#8b5cf6" 
/>
  const totalAtk = 10 + bonusAtk; // 10 is base starting atk
  const totalMatk = 10 + bonusMatk;
  // ── Screen ────────────────────────────────────────────────
  const [screen, setScreen] = useState("title"); // title | prologue | main | battle | cutscene | ending
  const [storyPageIdx, setStoryPageIdx] = useState(0);
  const [cutsceneActI, setCutsceneActI] = useState(0);
  const [cutscenePageI, setCutscenePageI] = useState(0);

  // ── Core stats ────────────────────────────────────────────
  const [day, setDay] = useState(1);
  const [nightTotal, setNightTotal] = useState(0);
  const [mood, setMood] = useState(1001);
  const [bond, setBond] = useState(0);
  const [coins, setCoins] = useState(0);
  const [shards, setShards] = useState(0);

  // ── Luna ──────────────────────────────────────────────────
  const [lunaForm, setLunaForm] = useState("cat");
  const [lunaHP, setLunaHP] = useState(BASE_HP);
  const [lunaMP, setLunaMP] = useState(BASE_MP);
  const [feralLevels, setFeralLevels] = useState(() =>
    buildDefaultLevels(FERAL_BRANCHES)
  );
  const [hybridLevels, setHybridLevels] = useState(() =>
    buildDefaultLevels(HYBRID_BRANCHES)
  );

  // ── Inventory & equipment ─────────────────────────────────
  const [inventory, setInventory] = useState([]); // consumable items held
  const [equipped, setEquipped] = useState({
    weapon: null,
    accessory: null,
    aura: null,
  });
  const [shopStock, setShopStock] = useState({ mappy: [], mouse: [] });
  const [showInventory, setShowInventory] = useState(false);

  // ── Time / day ────────────────────────────────────────────
  const [gameTime, setGameTime] = useState(DAY_START_MIN);
  const [alexSleeping, setAlexSleeping] = useState(false);
  const [scavenged, setScavenged] = useState(false);
  const [mappyOpen, setMappyOpen] = useState(false);

  // ── Popups ────────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [showBefore, setShowBefore] = useState(false);
  const [showAfter, setShowAfter] = useState(false);
  const [showScavenge, setShowScavenge] = useState(false);
  const [scavengePhase, setScavengePhase] = useState("trade");
  const [showSleepPop, setShowSleepPop] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [beforeMsg, setBeforeMsg] = useState("");
  const [afterMsg, setAfterMsg] = useState("");
  const [toast, setToast] = useState("");
  const [showBond, setShowBond] = useState(false);
  const [musicVol, setMusicVol] = useState(0.22);

  // ── Scavenge spots ────────────────────────────────────────
  const [spots, setSpots] = useState([]);

  // ── Battle ────────────────────────────────────────────────
  const [queue, setQueue] = useState([]);
  const [curEnemy, setCurEnemy] = useState(null);
  const [battleLog, setBattleLog] = useState([]);
  const [battleTurn, setBattleTurn] = useState("player");
  const [battleResult, setBattleResult] = useState(null);
  const [battleSecs, setBattleSecs] = useState(0);
  const [defeated, setDefeated] = useState(0);
  const [totalQ, setTotalQ] = useState(0);
  const [debuff, setDebuff] = useState(0);
  const [canSwitch, setCanSwitch] = useState(false);
  const [eShake, setEShake] = useState(false);
  const [lShake, setLShake] = useState(false);
  const [nextMsg, setNextMsg] = useState("");

  const [battleHpRegen, setBattleHpRegen] = useState(0);
  const [battleMpRegen, setBattleMpRegen] = useState(0);

  // ── Refs ──────────────────────────────────────────────────
  const timeTickRef = useRef(null);
  const battleTickRef = useRef(null);
  const toastTimer = useRef(null);
  const sleepFired = useRef(false);

  // ── Derived ───────────────────────────────────────────────
  const tier = getMoodTier(mood);
  const td = TIER_DATA[tier];
  const bondBuff = bond >= 100;
  const dayMode = isDaytime(gameTime);
  const skills = lunaForm === "cat" ? CAT_SKILLS : HYBRID_SKILLS;
  const maxHP =
    BASE_HP +
    computeBonus(FERAL_BRANCHES, feralLevels, "maxHp") +
    equipBonus(equipped, "maxHp");
  const maxMP =
    BASE_MP +
    computeBonus(HYBRID_BRANCHES, hybridLevels, "maxMp") +
    equipBonus(equipped, "maxMp");
  const eqDodge =
    computeBonus(FERAL_BRANCHES, feralLevels, "dodge") +
    equipBonus(equipped, "dodge");
  const eqDmgReduce = equipBonus(equipped, "dmgReduce");
  const eqHpRegen = equipBonus(equipped, "hpRegenEq");
  const eqMpRegen = equipBonus(equipped, "mpRegenEq");

  // ═══════════════════════════════════════════════════════
  // SAVE / LOAD
  // ═══════════════════════════════════════════════════════
  const saveGame = useCallback(() => {
    try {
      const data = {
        day,
        nightTotal,
        mood,
        bond,
        coins,
        shards,
        lunaForm,
        feralLevels,
        hybridLevels,
        inventory,
        equipped,
        gameTime,
        showBond,
        musicVol,
        screen: screen === "battle" ? "main" : screen,
        storyPageIdx,
        cutsceneActI,
        cutscenePageI,
        ts: Date.now(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      notify("💾 Game saved!");
    } catch (e) {
      notify("Save failed.");
    }
  }, [
    day,
    nightTotal,
    mood,
    bond,
    coins,
    shards,
    lunaForm,
    feralLevels,
    hybridLevels,
    gameTime,
    showBond,
    musicVol,
    screen,
    storyPageIdx,
    cutsceneActI,
    cutscenePageI,
  ]);

  const hasSave = () => {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  };

  const loadGame = () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        notify("No save file found.");
        return;
      }
      const d = JSON.parse(raw);
      setDay(d.day || 1);
      setNightTotal(d.nightTotal || 0);
      setMood(d.mood ?? 1001);
      setBond(d.bond ?? 0);
      setCoins(d.coins ?? 0);
      setShards(d.shards ?? 0);
      setLunaForm(d.lunaForm || "cat");
      setFeralLevels(d.feralLevels || buildDefaultLevels(FERAL_BRANCHES));
      setHybridLevels(d.hybridLevels || buildDefaultLevels(HYBRID_BRANCHES));
      setInventory(d.inventory || []);
      setEquipped(d.equipped || { weapon: null, accessory: null, aura: null });
      setGameTime(d.gameTime ?? DAY_START_MIN);
      setShowBond(d.showBond ?? false);
      setMusicVol(d.musicVol ?? 0.22);
      setStoryPageIdx(d.storyPageIdx ?? 0);
      setCutsceneActI(d.cutsceneActI ?? 0);
      setCutscenePageI(d.cutscenePageI ?? 0);
      setLunaHP(BASE_HP);
      setLunaMP(BASE_MP);
      setAlexSleeping(false);
      setScavenged(false);
      setMappyOpen(Math.random() < 0.4);
      sleepFired.current = false;
      setScreen(d.screen || "main");
      AUD.setVol(d.musicVol ?? 0.22);
      notify("💾 Save loaded!");
    } catch (e) {
      notify("Failed to load save.");
    }
  };

  const deleteSave = () => {
    try {
      localStorage.removeItem(SAVE_KEY);
      notify("Save deleted.");
    } catch {}
  };

  // ═══════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════
  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3400);
  }, []);

  const addMood = useCallback(
    (n) => setMood((m) => Math.max(0, Math.min(MOOD_MAX, m + n))),
    []
  );
  const addBond = useCallback(
    (n) => {
      if (getMoodTier(mood) === 1) return;
      setBond((b) => Math.min(BOND_MAX, b + (getMoodTier(mood) === 3 ? n : 1)));
    },
    [mood]
  );
  const ensureAudio = () => AUD.init();
  const addBattleLog = (msg) => setBattleLog((p) => [...p.slice(-18), msg]);

  // ═══════════════════════════════════════════════════════
  // GAME-TIME TICK  (10 game-mins per real second)
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    if (screen !== "main") {
      clearInterval(timeTickRef.current);
      return;
    }
    sleepFired.current = false;
    timeTickRef.current = setInterval(() => {
      setGameTime((prev) => {
        const next = (prev + 10) % TOTAL_MINS;
        if (
          !sleepFired.current &&
          prev < NIGHT_START_MIN &&
          next >= NIGHT_START_MIN
        ) {
          sleepFired.current = true;
          setTimeout(() => setShowSleepPop(true), 50);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timeTickRef.current);
  }, [screen]);

  useEffect(() => {
    if (screen !== "battle") {
      clearInterval(battleTickRef.current);
      return;
    }
    battleTickRef.current = setInterval(
      () => setBattleSecs((s) => s + 1),
      1000
    );
    return () => clearInterval(battleTickRef.current);
  }, [screen]);

  useEffect(() => {
    if (!AUD.ready) return;
    if (screen === "main") AUD.ambient(dayMode ? "day" : "night");
    if (screen === "battle") AUD.ambient("night");
  }, [screen, dayMode]);

  // ═══════════════════════════════════════════════════════
  // ALEX ACTIONS
  // ═══════════════════════════════════════════════════════
  const applyAlexAct = (t) => {
    const data = ALEX_ACT[t];
    const mG = rng(data.mGain[0], data.mGain[1]),
      bG = rng(data.bGain[0], data.bGain[1]);
    const mL = data.mLoss ? rng(data.mLoss[0], data.mLoss[1]) : 0;
    addMood(mG - mL);
    addBond(bG);
    return { mG, bG, mL };
  };

  const triggerAlexBefore = () => {
    const data = ALEX_ACT[tier],
      msg = pick(data.before);
    const { mG, bG, mL } = applyAlexAct(tier);
    const delta = mG - mL;
    const suffix =
      delta !== 0
        ? `\n\n(${delta > 0 ? "+" : ""}${delta} Mood${
            bG > 0 ? `, +${bG} Bond` : ""
          })`
        : "";
    setBeforeMsg(msg + suffix);
    setShowBefore(true);
  };

  const triggerAlexAfter = () => {
    const data = ALEX_ACT[tier],
      msg = pick(data.after);
    const { mG, bG, mL } = applyAlexAct(tier);
    const delta = mG - mL;
    const suffix =
      delta !== 0
        ? `\n\n(${delta > 0 ? "+" : ""}${delta} Mood${
            bG > 0 ? `, +${bG} Bond` : ""
          })`
        : "";
    setAfterMsg(`The door opens. It is 7:00 PM.\n\n${msg}${suffix}`);
    setShowAfter(true);
  };

  // ═══════════════════════════════════════════════════════
  // SCAVENGE
  // ═══════════════════════════════════════════════════════
  const onScavengeClick = () => {
    if (!dayMode || scavenged) return;
    ensureAudio();
    AUD.sfx("click");
    triggerAlexBefore();
  };

  const activeMerchant = () =>
    tier === 3 && mappyOpen && day > 5 ? "mappy" : "mouse";

  const openShop = () => {
    const m = activeMerchant();
    setShopStock((prev) => ({ ...prev, [m]: generateShop(m) }));
  };

  const afterBeforeConfirm = () => {
    setShowBefore(false);
    openShop();
    const s = Array(10)
      .fill(null)
      .map((_, i) => {
        const chance = 2 + Math.random() * 88,
          found = Math.random() * 100 < chance;
        return {
          id: i,
          revealed: false,
          item: found ? pick(SCAVENGE_POOL) : null,
        };
      });
    setSpots(s);
    setScavengePhase("trade");
    setShowScavenge(true);
  };

  const buyItem = (item, merchant) => {
    const price = item.shopPrice;
    if (coins < price) {
      notify(`Need ${price - coins} more coins.`);
      return;
    }
    ensureAudio();
    AUD.sfx("upgrade");
    setCoins((c) => c - price);
    if (item.type === "consumable") {
      if (!item.battle) {
        if (item.effect.mood) addMood(item.effect.mood);
        if (item.effect.bond) addBond(item.effect.bond);
        notify(
          `Used ${item.name}!${
            item.effect.mood ? ` +${item.effect.mood} Mood` : ""
          }${item.effect.bond ? ` +${item.effect.bond} Bond` : ""}`
        );
      } else {
        setInventory((inv) => [
          ...inv,
          { ...item, uid: `${item.id}_${Date.now()}` },
        ]);
        notify(`${item.name} added to inventory.`);
      }
    } else {
      setEquipped((prev) => ({ ...prev, [item.slot]: item }));
      notify(`${item.name} equipped in ${item.slot} slot!`);
    }
    setShopStock((prev) => ({
      ...prev,
      [merchant]: prev[merchant].filter((i) => i.id !== item.id),
    }));
  };

  const skipTrade = () => setScavengePhase("searching");

  // Use a consumable battle item from inventory
  const useBattleItem = (uid) => {
    const item = inventory.find((i) => i.uid === uid);
    if (!item) return;
    ensureAudio();
    AUD.sfx("win");
    if (item.effect.hp) setLunaHP((h) => Math.min(maxHP, h + item.effect.hp));
    if (item.effect.mp) setLunaMP((m) => Math.min(maxMP, m + item.effect.mp));
    if (item.effect.hpRegen) setBattleHpRegen((r) => r + item.effect.hpRegen);
    if (item.effect.mpRegen) setBattleMpRegen((r) => r + item.effect.mpRegen);
    addBattleLog(
      `🧪 Used ${item.name}!${item.effect.hp ? ` +${item.effect.hp} HP` : ""}${
        item.effect.mp ? ` +${item.effect.mp} MP` : ""
      }`
    );
    setInventory((inv) => inv.filter((i) => i.uid !== uid));
  };

  const clickSpot = (idx) => {
    if (spots[idx].revealed) return;
    AUD.sfx("click");
    setSpots((prev) => {
      const ns = [...prev];
      ns[idx] = { ...ns[idx], revealed: true };
      if (ns[idx].item?.coins > 0) setCoins((c) => c + ns[idx].item.coins);
      return ns;
    });
  };

  const finishScavenge = () => {
    setShowScavenge(false);
    setScavenged(true);
    setGameTime(19 * 60);
    triggerAlexAfter();
  };

  // ═══════════════════════════════════════════════════════
  // SLEEP & PORTAL
  // ═══════════════════════════════════════════════════════
  const confirmSleep = () => {
    setShowSleepPop(false);
    setAlexSleeping(true);
  };

  const enterDreamscape = () => {
    ensureAudio();
    AUD.sfx("portal");
    const actKey = getActKey(nightTotal);
    const q = buildQueue(nightTotal + 1, actKey);
    if (!q.length) {
      notify("The Dreamscape is quiet tonight...");
      return;
    }
    const form = pickForm(q),
      boss = q.find((e) => e.boss);
    setLunaForm(form);
    setCanSwitch(boss ? !!boss.switchable : false);
    const [first, ...rest] = q;
    setQueue(rest);
    setCurEnemy({ ...first });
    setTotalQ(q.length);
    setBattleLog([
      "Luna slips through the violet tear beneath the bed...",
      "The Dreamscape opens. Vast. Cold. Wrong.",
      `A ${first.name} emerges from the dark!`,
    ]);
    setBattleTurn("player");
    setBattleSecs(0);
    setBattleResult(null);
    setDefeated(0);
    setDebuff(0);
    setNextMsg("");
    setBattleHpRegen(0);
    setBattleMpRegen(0);
    setScreen("battle");
  };

  // ═══════════════════════════════════════════════════════
  // COMBAT
  // ═══════════════════════════════════════════════════════
  const NATURAL_MP_REGEN = 8; // MP restored at the start of every player turn

  const useSkill = (skill) => {
    if (battleTurn !== "player" || !curEnemy || battleResult) return;
    // Natural MP regen at start of turn
    setLunaMP((m) => Math.min(maxMP, m + NATURAL_MP_REGEN));
    const mpAfterRegen = Math.min(maxMP, lunaMP + NATURAL_MP_REGEN);
    if (mpAfterRegen < skill.mp) {
      addBattleLog(
        `✦ +${NATURAL_MP_REGEN} MP — but still not enough for ${skill.name}!`
      );
      setBattleTurn("player");
      return;
    }
    if (skill.mp > 0) addBattleLog(`✦ +${NATURAL_MP_REGEN} MP regen`);
    ensureAudio();
    AUD.sfx(skill.type === "magic" ? "magic" : "hit");
    setBattleTurn("animating");

    const dmg = calcDmg(
      skill,
      lunaForm,
      shards,
      bondBuff,
      feralLevels,
      hybridLevels,
      equipped
    );
    const newEHP = Math.max(0, curEnemy.hp - dmg);
    const newMP = Math.max(0, mpAfterRegen - skill.mp);

    setLunaMP(newMP);
    if (skill.debuff) setDebuff(5);
    setCurEnemy((e) => ({ ...e, hp: newEHP }));
    setEShake(true);
    setTimeout(() => setEShake(false), 280);
    if (skill.ult && bondBuff) addBattleLog("🌟 Bond Resonance — +50% power!");
    addBattleLog(
      `${skill.type === "magic" ? "✨" : "💥"} ${skill.name} — ${dmg} dmg!`
    );

    if (newEHP <= 0) {
      const newDef = defeated + 1;
      setDefeated(newDef);
      addBattleLog(`✅ ${curEnemy.name} vanquished!`);
      AUD.sfx("win");
      if (queue.length > 0) {
        setTimeout(() => {
          const [next, ...rest] = queue;
          setQueue(rest);
          setCurEnemy({ ...next });
          addBattleLog(`⚠️ ${next.name} emerges from the dark!`);
          setNextMsg(`${next.name} emerges!`);
          setTimeout(() => setNextMsg(""), 2600);
          setBattleTurn("player");
        }, 1200);
      } else {
        clearInterval(battleTickRef.current);
        const mR = calcVictoryMood(newDef, battleSecs);
        addMood(mR);
        const totalSh = curEnemy.shards * newDef;
        setShards((s) => s + totalSh);
        addBattleLog(`🌟 All cleared! +${mR} Mood · +${totalSh} Shards`);
        setBattleResult("win");
        setBattleTurn("done");
      }
      return;
    }

    setBattleTurn("enemy");
    setTimeout(() => {
      let curMP = newMP;
      if (curEnemy.drainMP) {
        curMP = Math.max(0, curMP - curEnemy.drainMP);
        setLunaMP(curMP);
        addBattleLog(
          `${curEnemy.ico} ${curEnemy.name} drains ${curEnemy.drainMP} MP!`
        );
      }

      // MP regen on enemy turn: equipment + upgrade (hybrid only) + base regen for hybrid
      const mpRegenUp =
        lunaForm === "hybrid"
          ? computeBonus(HYBRID_BRANCHES, hybridLevels, "mpRegen")
          : 0;
      const totalMpRegen = mpRegenUp + eqMpRegen + battleMpRegen;
      if (totalMpRegen > 0) {
        setLunaMP((m) => Math.min(maxMP, m + totalMpRegen));
      }

      // Equipment HP regen
      const totalHpRegen = eqHpRegen + battleHpRegen;
      if (totalHpRegen > 0) {
        setLunaHP((h) => Math.min(maxHP, h + totalHpRegen));
        addBattleLog(`💚 Luna regenerates ${totalHpRegen} HP!`);
      }

      // Dodge check (upgrade + equipment)
      if (Math.random() * 100 < eqDodge) {
        addBattleLog("💨 Luna dodges the attack!");
        setBattleTurn("player");
        return;
      }

      const effAtk = Math.max(4, curEnemy.atk - Math.max(0, debuff));
      setDebuff((d) => Math.max(0, d - 1));
      let eDmg = Math.max(1, effAtk - rng(0, 5));
      // Damage reduction from equipment
      if (eqDmgReduce > 0) {
        eDmg = Math.max(1, eDmg - eqDmgReduce);
        addBattleLog(`🛡 Equipment absorbs ${eqDmgReduce} damage!`);
      }
      addBattleLog(`💢 ${curEnemy.name} strikes Luna for ${eDmg} damage!`);
      setLShake(true);
      setTimeout(() => setLShake(false), 280);
      setLunaHP((h) => {
        const newH = Math.max(0, h - eDmg);
        if (newH <= 0) {
          clearInterval(battleTickRef.current);
          addMood(-75);
          addBattleLog("💀 Luna has fallen... (−75 Mood)");
          setBattleResult("lose");
          setBattleTurn("done");
        } else setBattleTurn("player");
        return newH;
      });
    }, 1250);
  };

  const switchForm = () => {
    if (!canSwitch || battleTurn !== "player") return;
    AUD.sfx("click");
    const next = lunaForm === "cat" ? "hybrid" : "cat";
    setLunaForm(next);
    addBattleLog(
      `🔄 Luna shifts to ${next === "cat" ? "Feral" : "Guardian"} form!`
    );
  };

  const endBattle = () => {
    clearInterval(battleTickRef.current);
    const newNT = nightTotal + 1;
    setNightTotal(newNT);
    setDay((d) => d + 1);
    setLunaHP(maxHP);
    setLunaMP(maxMP);
    setAlexSleeping(false);
    setScavenged(false);
    setSpots([]);
    setMappyOpen(Math.random() < 0.4);
    setGameTime(DAY_START_MIN);
    sleepFired.current = false;
    if (newNT > 0 && newNT % 20 === 0) {
      const actI = getActIdx(newNT);
      setCutsceneActI(actI);
      setCutscenePageI(0);
      setScreen("cutscene");
      AUD.ambient("day");
      return;
    }
    setScreen("main");
    AUD.ambient("day");
  };

  // ─── Story ─────────────────────────────────────────────
  const onPrologueFinish = (isFinal) => {
    if (isFinal) {
      setScreen("ending");
      return;
    }
    setMappyOpen(Math.random() < 0.4);
    setScreen("main");
    AUD.ambient("day");
  };
  const onCutsceneFinish = (isFinal) => {
    if (isFinal) {
      setScreen("ending");
      return;
    }
    setScreen("main");
    AUD.ambient("day");
  };

  // ═══════════════════════════════════════════════════════
  // ─── TITLE SCREEN ──────────────────────────────────────
  // ═══════════════════════════════════════════════════════
  if (screen === "title") {
    const hasSv = hasSave();
    return (
      <div
        style={{
          minHeight: "100vh",
          background: ROOT_BG,
          color: "#ddd6fe",
          fontFamily: FONT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          boxSizing: "border-box",
        }}
        onClick={ensureAudio}
      >
        <div
          style={{
            ...S.card("rgba(139,92,246,0.4)", "rgba(8,0,20,0.99)"),
            maxWidth: "520px",
            width: "100%",
            textAlign: "center",
            marginBottom: 0,
            boxShadow: "0 0 80px rgba(139,92,246,0.1)",
          }}
        >
          <div style={{ fontSize: "70px", marginBottom: "12px" }}>🐈‍⬛</div>
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "6px",
              color: "#3d1a6e",
              marginBottom: "10px",
            }}
          >
            A TALE OF DEVOTION
          </div>
          <div style={{ ...S.title("24px", "#c084fc"), marginBottom: "6px" }}>
            The Dream Guardian
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#4c1d95",
              marginBottom: "36px",
              lineHeight: "1.8",
            }}
          >
            Luna. Luna and Alex. The portal beneath the bed.
            <br />
            The nightmares that must not be allowed to win.
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <button
              style={{
                ...S.btn("#7c3aed"),
                fontSize: "14px",
                padding: "13px 40px",
                boxShadow: "0 0 30px rgba(139,92,246,0.3)",
                letterSpacing: "2px",
              }}
              onClick={() => {
                ensureAudio();
                AUD.sfx("click");
                AUD.ambient("day");
                setScreen("prologue");
              }}
            >
              🌙 New Game
            </button>
            {hasSv && (
              <button
                style={{
                  ...S.btn("#4338ca"),
                  fontSize: "13px",
                  padding: "11px 32px",
                }}
                onClick={() => {
                  ensureAudio();
                  AUD.sfx("click");
                  loadGame();
                  AUD.ambient("day");
                }}
              >
                💾 Continue Saved Game
              </button>
            )}
            {hasSv && (
              <button
                style={{
                  ...S.btn("#7f1d1d"),
                  fontSize: "11px",
                  padding: "7px 20px",
                }}
                onClick={() => {
                  if (window.confirm("Delete saved game?")) deleteSave();
                }}
              >
                🗑 Delete Save
              </button>
            )}
          </div>
          {hasSv &&
            (() => {
              try {
                const d = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
                const ts = d.ts ? new Date(d.ts).toLocaleString() : "Unknown";
                return (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#3d1a5e",
                      marginTop: "16px",
                    }}
                  >
                    Last saved: {ts} &nbsp;·&nbsp; Day {d.day || "?"} · Night{" "}
                    {d.nightTotal || "?"}
                  </div>
                );
              } catch {
                return null;
              }
            })()}
        </div>
      </div>
    );
  }

  // ─── ENDING ────────────────────────────────────────────
  if (screen === "ending") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: ROOT_BG,
          color: "#ddd6fe",
          fontFamily: FONT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            ...S.card("rgba(251,191,36,0.3)", "rgba(8,0,18,0.99)"),
            maxWidth: "520px",
            textAlign: "center",
            marginBottom: 0,
          }}
        >
          <div style={{ fontSize: "62px", marginBottom: "14px" }}>🌅</div>
          <div style={S.title("22px", "#fbbf24")}>The Portal is Sealed</div>
          <div
            style={{
              fontSize: "13px",
              lineHeight: "2.3",
              color: "#fef3c7",
              marginBottom: "24px",
            }}
          >
            Luna saved Alex's dreams.
            <br />
            The Void Shepherd is no more.
            <br />
            <br />
            For now, the apartment is at peace.
            <br />
            Luna is curled at the foot of the bed, purring softly.
            <br />
            <br />
            <em style={{ color: "#fbbf24" }}>
              But if the nightmares return — she will be ready.
            </em>
          </div>
          <div
            style={{ fontSize: "12px", color: "#7c3aed", marginBottom: "22px" }}
          >
            Nights: {nightTotal} · Shards: {shards} · Bond: {bond}/200
          </div>
          <div style={{ ...S.row("10px"), justifyContent: "center" }}>
            <button
              style={S.btn("#fbbf24")}
              onClick={() => window.location.reload()}
            >
              ↺ New Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PROLOGUE ──────────────────────────────────────────
  if (screen === "prologue") {
    return (
      <div onClick={ensureAudio}>
        <StoryScreen
          act={STORY_ACTS[0]}
          pageIdx={storyPageIdx}
          onNext={() => setStoryPageIdx((p) => p + 1)}
          onFinish={onPrologueFinish}
          isPrologue
        />
      </div>
    );
  }

  // ─── CUTSCENE ──────────────────────────────────────────
  if (screen === "cutscene") {
    const act = STORY_ACTS[cutsceneActI] || STORY_ACTS[STORY_ACTS.length - 1];
    return (
      <StoryScreen
        act={act}
        pageIdx={cutscenePageI}
        onNext={() => setCutscenePageI((p) => p + 1)}
        onFinish={onCutsceneFinish}
        isPrologue={false}
      />
    );
  }

  // ─── BATTLE ────────────────────────────────────────────
  if (screen === "battle") {
    const canAct = battleTurn === "player" && !battleResult;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: ROOT_BG,
          color: "#ddd6fe",
          fontFamily: FONT,
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        <Toast msg={toast} />
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div
            style={{
              ...S.card("rgba(139,92,246,0.12)", "rgba(10,0,22,0.7)"),
              textAlign: "center",
              padding: "8px 16px",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: "#3d1a5e",
                letterSpacing: "4px",
              }}
            >
              ✦ DREAMSCAPE &nbsp;|&nbsp; Night {nightTotal + 1} &nbsp;|&nbsp;{" "}
              {fmtTime(gameTime)} &nbsp;|&nbsp; {battleSecs}s
            </span>
          </div>

          <div
            style={{
              ...S.card(),
              padding: "8px 16px",
              marginBottom: "8px",
              ...S.row("0"),
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "12px", color: "#c4b5fd" }}>
              {lunaForm === "cat"
                ? "🐈‍⬛ Feral — 90% Physical"
                : "⚡ Guardian — 90% Magic"}
              {bondBuff && (
                <span style={{ color: "#fbbf24", marginLeft: "8px" }}>
                  ★ Bond Buff
                </span>
              )}
            </span>
            {canSwitch && (
              <button
                style={{
                  ...S.btn("#5b21b6"),
                  padding: "5px 12px",
                  fontSize: "11px",
                }}
                onClick={switchForm}
                disabled={!canAct}
              >
                ⇄ Switch
              </button>
            )}
          </div>

          <div
            style={{ ...S.card(), padding: "8px 16px", marginBottom: "8px" }}
          >
            <div
              style={{
                ...S.row("0"),
                justifyContent: "space-between",
                marginBottom: "5px",
              }}
            >
              <span style={S.label}>Enemy Wave</span>
              <span style={{ fontSize: "11px", color: "#8b5cf6" }}>
                {defeated} / {totalQ}
              </span>
            </div>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {Array(totalQ)
                .fill(null)
                .map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: "13px",
                      height: "13px",
                      borderRadius: "3px",
                      background:
                        i < defeated
                          ? "#10b981"
                          : i === defeated
                          ? "#a855f7"
                          : "rgba(139,92,246,0.12)",
                      border: "1px solid rgba(90,50,140,0.18)",
                      boxShadow: i === defeated ? "0 0 6px #a855f7" : "none",
                      transition: "background 0.3s",
                    }}
                  />
                ))}
            </div>
          </div>

          {nextMsg && (
            <div
              style={{
                ...S.card("rgba(239,68,68,0.28)", "rgba(40,0,0,0.65)"),
                textAlign: "center",
                fontSize: "13px",
                color: "#fca5a5",
                padding: "10px",
                marginBottom: "8px",
              }}
            >
              ⚠️ {nextMsg}
            </div>
          )}

          {battleResult && (
            <div
              style={{
                ...S.card(
                  battleResult === "win"
                    ? "rgba(16,185,129,0.4)"
                    : "rgba(239,68,68,0.4)",
                  battleResult === "win"
                    ? "rgba(0,28,14,0.7)"
                    : "rgba(42,0,0,0.7)"
                ),
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "44px", marginBottom: "8px" }}>
                {battleResult === "win" ? "🌟" : "💀"}
              </div>
              <div
                style={S.title(
                  "18px",
                  battleResult === "win" ? "#10b981" : "#ef4444"
                )}
              >
                {battleResult === "win"
                  ? "DREAMSCAPE PURIFIED"
                  : "LUNA HAS FALLEN"}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: battleResult === "win" ? "#6ee7b7" : "#fca5a5",
                  lineHeight: "1.9",
                  marginBottom: "16px",
                }}
              >
                {battleResult === "win"
                  ? `${defeated} nightmare${
                      defeated > 1 ? "s" : ""
                    } destroyed. Alex will sleep in peace.`
                  : "The darkness overwhelmed Luna. −75 Mood."}
              </div>
              <button
                style={S.btn(battleResult === "win" ? "#059669" : "#dc2626")}
                onClick={endBattle}
              >
                {battleResult === "win"
                  ? "🌅 Greet the morning →"
                  : "💔 Retreat to dawn →"}
              </button>
            </div>
          )}

          {curEnemy && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  ...S.card(
                    curEnemy.boss
                      ? "rgba(239,68,68,0.28)"
                      : "rgba(139,92,246,0.2)",
                    curEnemy.boss ? "rgba(40,0,0,0.55)" : undefined
                  ),
                  transform: eShake ? "translateX(-8px)" : "none",
                  transition: "transform 0.1s",
                }}
              >
                <div
                  style={{
                    ...S.row("0"),
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "9px",
                      color: curEnemy.boss ? "#ef4444" : "#8b5cf6",
                      letterSpacing: "1.5px",
                    }}
                  >
                    {curEnemy.boss ? "⚠️ BOSS" : "ENEMY"}
                  </span>
                  {curEnemy.drainMP && (
                    <span style={{ fontSize: "9px", color: "#60a5fa" }}>
                      ⚡MP Drain
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "42px",
                    textAlign: "center",
                    marginBottom: "4px",
                  }}
                >
                  {curEnemy.ico}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#c4b5fd",
                    textAlign: "center",
                    fontWeight: "bold",
                    marginBottom: "3px",
                  }}
                >
                  {curEnemy.name}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#6d28d9",
                    fontStyle: "italic",
                    textAlign: "center",
                    lineHeight: "1.6",
                    marginBottom: "8px",
                  }}
                >
                  {curEnemy.desc}
                </div>
                <Bar
                  lbl="HP"
                  val={curEnemy.hp}
                  max={curEnemy.maxHp}
                  col="linear-gradient(90deg,#7f1d1d,#ef4444)"
                  h="10px"
                />
                {debuff > 0 && (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#fbbf24",
                      marginTop: "3px",
                    }}
                  >
                    ⬇ ATK −{debuff}
                  </div>
                )}
              </div>
              <div
                style={{
                  ...S.card(),
                  transform: lShake ? "translateX(8px)" : "none",
                  transition: "transform 0.1s",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    color: "#8b5cf6",
                    letterSpacing: "1.5px",
                    marginBottom: "5px",
                  }}
                >
                  {lunaForm === "cat"
                    ? "🐈‍⬛ LUNA — FERAL"
                    : "⚡ LUNA — GUARDIAN"}
                </div>
                <div
                  style={{
                    fontSize: "42px",
                    textAlign: "center",
                    marginBottom: "6px",
                  }}
                >
                  {lunaForm === "cat" ? "🐈‍⬛" : "⚡"}
                </div>
                <Bar
                  lbl="HP"
                  val={lunaHP}
                  max={maxHP}
                  col="linear-gradient(90deg,#065f46,#10b981)"
                  h="10px"
                />
                <div style={{ marginTop: "5px" }} />
                <Bar
                  lbl="MP"
                  val={lunaMP}
                  max={maxMP}
                  col="linear-gradient(90deg,#1e3a8a,#60a5fa)"
                  h="10px"
                />
                <div
                  style={{
                    fontSize: "9px",
                    color: "#6d28d9",
                    marginTop: "5px",
                  }}
                >
                  ATK:{" "}
                  {lunaAtk(
                    lunaForm,
                    shards,
                    feralLevels,
                    hybridLevels,
                    equipped
                  )}
                  &nbsp;·&nbsp;
                  <span style={{ color: "#60a5fa" }}>
                    +{NATURAL_MP_REGEN} MP/turn
                  </span>
                  {eqHpRegen + battleHpRegen > 0 && (
                    <span style={{ color: "#10b981" }}>
                      &nbsp;· +{eqHpRegen + battleHpRegen} HP/turn
                    </span>
                  )}
                  {eqMpRegen + battleMpRegen > 0 && (
                    <span style={{ color: "#818cf8" }}>
                      &nbsp;· +{eqMpRegen + battleMpRegen} MP eq
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Battle items quick-use */}
          {!battleResult && inventory.length > 0 && (
            <div
              style={{
                ...S.card("rgba(251,191,36,0.15)", "rgba(12,0,28,0.7)"),
                marginBottom: "8px",
                padding: "10px 14px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  color: "#92400e",
                  letterSpacing: "2px",
                  marginBottom: "8px",
                }}
              >
                🧪 BATTLE ITEMS
              </div>
              <div style={S.row("6px")}>
                {inventory.map((item) => (
                  <button
                    key={item.uid}
                    style={{
                      ...S.btn("#92400e"),
                      padding: "6px 10px",
                      fontSize: "11px",
                      display: "flex",
                      gap: "5px",
                      alignItems: "center",
                    }}
                    onClick={() => useBattleItem(item.uid)}
                    disabled={battleTurn !== "player"}
                  >
                    {item.ico} {item.name}
                    <span style={{ fontSize: "9px", color: "#fcd34d" }}>
                      {item.effect.hp ? `+${item.effect.hp}HP` : ""}
                      {item.effect.mp ? `+${item.effect.mp}MP` : ""}
                      {item.effect.hpRegen ? `+${item.effect.hpRegen}HP/t` : ""}
                      {item.effect.mpRegen ? `+${item.effect.mpRegen}MP/t` : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!battleResult && curEnemy && (
            <div style={{ ...S.card(), marginBottom: "8px" }}>
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "1.5px",
                  color: canAct ? "#8b5cf6" : "#3a2050",
                  marginBottom: "8px",
                }}
              >
                {canAct
                  ? "⚔ CHOOSE SKILL"
                  : battleTurn === "enemy"
                  ? "⏳ Enemy acting..."
                  : battleTurn === "animating"
                  ? "⚡ Striking..."
                  : "—"}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "7px",
                }}
              >
                {skills.map((sk) => {
                  const mpAvail = lunaMP + NATURAL_MP_REGEN;
                  const off = !canAct || mpAvail < sk.mp;
                  return (
                    <button
                      key={sk.id}
                      style={{
                        ...S.btn(
                          sk.ult
                            ? "#92400e"
                            : sk.type === "magic"
                            ? "#1e3a8a"
                            : "#4c1d95",
                          off
                        ),
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                        padding: "9px 10px",
                        textAlign: "left",
                      }}
                      onClick={() => useSkill(sk)}
                      disabled={off}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: "12px", fontWeight: "bold" }}>
                          {sk.ico} {sk.name}
                        </span>
                        {sk.mp === 0 ? (
                          <span
                            style={{
                              fontSize: "9px",
                              color: "#10b981",
                              letterSpacing: "1px",
                            }}
                          >
                            FREE
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "10px",
                              color:
                                lunaMP + NATURAL_MP_REGEN >= sk.mp
                                  ? "#93c5fd"
                                  : "#ef4444",
                            }}
                          >
                            {sk.mp}MP
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "10px", color: "#6d28d9" }}>
                        {sk.desc}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: sk.type === "magic" ? "#818cf8" : "#d97706",
                        }}
                      >
                        ×{sk.mult} {sk.type === "magic" ? "✨" : "💥"}
                        {sk.ult && bondBuff ? " — BUFF" : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={S.card()}>
            <div style={S.label}>Battle Log</div>
            <div
              style={{
                maxHeight: "155px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "3px",
              }}
            >
              {battleLog.map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "12px",
                    lineHeight: "1.7",
                    opacity: i < battleLog.length - 6 ? 0.42 : 1,
                    color:
                      line.includes("strikes") ||
                      line.includes("drains") ||
                      line.includes("damage")
                        ? "#fca5a5"
                        : line.includes("✅") ||
                          line.includes("🌟") ||
                          line.includes("+")
                        ? "#86efac"
                        : line.includes("💀")
                        ? "#ef4444"
                        : line.includes("Bond") || line.includes("★")
                        ? "#fbbf24"
                        : "#c4b5fd",
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // ─── MAIN SCREEN ───────────────────────────────────────
  // ═══════════════════════════════════════════════════════
  const allRevealed = spots.length > 0 && spots.every((s) => s.revealed);
  const foundCoins = spots
    .filter((s) => s.revealed && (s.item?.coins || 0) > 0)
    .reduce((a, s) => a + (s.item?.coins || 0), 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: ROOT_BG,
        color: "#ddd6fe",
        fontFamily: FONT,
        padding: "16px",
        boxSizing: "border-box",
      }}
      onClick={!AUD.ready ? ensureAudio : undefined}
    >
      <Toast msg={toast} />
      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          shards={shards}
          setShards={setShards}
          feralLevels={feralLevels}
          setFeralLevels={setFeralLevels}
          hybridLevels={hybridLevels}
          setHybridLevels={setHybridLevels}
          notify={notify}
        />
      )}
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        {/* Top bar */}
        <div
          style={{
            ...S.row("0"),
            justifyContent: "space-between",
            marginBottom: "8px",
            flexWrap: "nowrap",
          }}
        >
          <div
            style={{ fontSize: "9px", letterSpacing: "5px", color: "#3d1a6e" }}
          >
            THE DREAM GUARDIAN
          </div>
          <div style={S.row("6px")}>
            <button
              style={{
                ...S.btn("#166534"),
                padding: "6px 12px",
                fontSize: "11px",
              }}
              onClick={saveGame}
            >
              💾 Save
            </button>
            <button
              style={{
                ...S.btn("#4c1d95"),
                padding: "6px 12px",
                fontSize: "11px",
              }}
              onClick={() => {
                ensureAudio();
                AUD.sfx("click");
                setShowSettings(true);
              }}
            >
              ⚙ Settings
            </button>
          </div>
        </div>

        <StatusPanel
          day={day}
          gameTime={gameTime}
          form={lunaForm}
          coins={coins}
          shards={shards}
          nightTotal={nightTotal}
          showBond={showBond}
          bond={bond}
        />
        <MoodGauge mood={mood} />

        {/* Alex info */}
        <div style={S.card()}>
          <div style={S.row()}>
            <div style={{ fontSize: "54px" }}>{td.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={S.label}>Alex</div>
              <div
                style={{
                  fontSize: "15px",
                  color: td.col,
                  fontWeight: "bold",
                  letterSpacing: "1px",
                  marginBottom: "4px",
                }}
              >
                Tier {tier}: {td.label}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#a78bfa",
                  lineHeight: "1.85",
                }}
              >
                {td.desc}
              </div>
            </div>
          </div>
        </div>

        {/* Luna Upgrade + Inventory buttons */}
        <div style={S.card()}>
          <div style={S.label}>Luna's Power</div>
          <div
            style={{
              ...S.row("0"),
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#8b5cf6" }}>
              Feral:{" "}
              <span
                style={{
                  color:
                    totalUpgrades(feralLevels) >= 60 ? "#fbbf24" : "#c4b5fd",
                }}
              >
                {totalUpgrades(feralLevels)}/60
              </span>
              &nbsp;&nbsp;Guardian:{" "}
              <span
                style={{
                  color:
                    totalUpgrades(hybridLevels) >= 60 ? "#fbbf24" : "#c4b5fd",
                }}
              >
                {totalUpgrades(hybridLevels)}/60
              </span>
            </div>
          </div>
          <div style={S.row("8px")}>
            <button
              style={{
                ...S.btn("#7c3aed"),
                fontSize: "12px",
                padding: "10px 18px",
                boxShadow: "0 0 16px rgba(139,92,246,0.25)",
              }}
              onClick={() => {
                ensureAudio();
                AUD.sfx("click");
                setShowUpgrade(true);
              }}
            >
              ⬆ Luna Upgrades &nbsp;
              <span style={{ fontSize: "10px", opacity: 0.7 }}>
                ({shards} 💎)
              </span>
            </button>
            <button
              style={{
                ...S.btn("#4c1d95"),
                fontSize: "12px",
                padding: "10px 18px",
                position: "relative",
              }}
              onClick={() => {
                ensureAudio();
                AUD.sfx("click");
                setShowInventory(true);
              }}
            >
              🎒 Inventory
              {inventory.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-5px",
                    background: "#a855f7",
                    borderRadius: "50%",
                    width: "16px",
                    height: "16px",
                    fontSize: "9px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                  }}
                >
                  {inventory.length}
                </span>
              )}
              &nbsp;&nbsp;
              {Object.values(equipped).filter(Boolean).length > 0 && (
                <span style={{ fontSize: "10px", color: "#fbbf24" }}>
                  ⚔{Object.values(equipped).filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Apartment scavenge */}
        <div style={S.card()}>
          <div style={S.label}>Apartment Scavenge</div>
          {!dayMode ? (
            <div style={{ fontSize: "12px", color: "#3a2052" }}>
              🌙 Alex is home at night — scavenging isn't possible right now.
            </div>
          ) : scavenged ? (
            <div style={{ fontSize: "12px", color: "#3a2052" }}>
              Luna already searched today. Nothing left to find until tomorrow.
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: "12px",
                  color: "#7c3aed",
                  marginBottom: "8px",
                }}
              >
                Luna will sniff out hidden coins while Alex steps out for the
                day.
                {day > 5 && mappyOpen && (
                  <span style={{ color: "#fbbf24" }}>
                    {" "}
                    &nbsp;★ Mappy's window is open!
                  </span>
                )}
              </div>
              <button style={S.btn("#4338ca")} onClick={onScavengeClick}>
                🔍 Send Alex Out &amp; Begin Scavenging
              </button>
            </>
          )}
        </div>

        {/* Dreamscape portal */}
        <div
          style={{
            ...S.card("rgba(139,92,246,0.35)", "rgba(14,0,34,0.78)"),
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              color: "#2e0a5a",
              letterSpacing: "6px",
              marginBottom: "10px",
            }}
          >
            THE PORTAL BENEATH THE BED
          </div>
          {dayMode ? (
            <>
              <div style={{ fontSize: "30px", marginBottom: "8px" }}>🌤</div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#2e1a4a",
                  lineHeight: "1.9",
                }}
              >
                The portal rests while the sun is up.
                <br />
                Wait for night to fall.
              </div>
            </>
          ) : !alexSleeping ? (
            <>
              <div style={{ fontSize: "30px", marginBottom: "8px" }}>🌙</div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#3d1a5e",
                  lineHeight: "1.9",
                  marginBottom: "10px",
                }}
              >
                Night has settled. Alex hasn't drifted off yet...
              </div>
              <button style={S.btn("#5b21b6", true)} disabled>
                Portal dormant — Alex still awake
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: "30px", marginBottom: "8px" }}>✨</div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#a855f7",
                  lineHeight: "1.9",
                  marginBottom: "12px",
                }}
              >
                Alex has fallen asleep.
                <br />
                The portal breathes with violet light.
                <br />
                Luna feels the pull of the Dreamscape.
              </div>
              <button
                style={{
                  ...S.btn("#7c3aed"),
                  padding: "12px 28px",
                  fontSize: "13px",
                  boxShadow: "0 0 30px rgba(139,92,246,0.38)",
                }}
                onClick={enterDreamscape}
              >
                ✦ Enter the Dreamscape
              </button>
              {nightTotal >= 7 && (
                <div style={{ marginTop: "10px" }}>
                  <button
                    style={{ ...S.btn("#312e81"), fontSize: "11px" }}
                    onClick={() =>
                      notify(
                        "The Keeper of Dreams beckons. Neural Missions available within the Dreamscape."
                      )
                    }
                  >
                    🧠 Neural Missions Available
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ════════ MODALS ════════ */}

      {showSettings && (
        <ModalWrap borderCol="rgba(139,92,246,0.4)">
          <div style={S.title("16px", "#c084fc")}>⚙ Settings</div>
          <div style={{ marginBottom: "20px" }}>
            <div style={S.label}>Bond Gauge</div>
            <button
              style={S.btn(showBond ? "#7c3aed" : "#4c1d95")}
              onClick={() => {
                AUD.sfx("click");
                setShowBond((b) => !b);
              }}
            >
              {showBond
                ? "✓ Visible on main screen"
                : "✗ Hidden — click to show"}
            </button>
            <div
              style={{ fontSize: "11px", color: "#4c1d95", marginTop: "6px" }}
            >
              Fills in good moods. Powers Luna's Ultimate at 100/200.
            </div>
          </div>
          <div style={{ marginBottom: "24px" }}>
            <div style={S.label}>Music Volume</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVol}
              style={{
                width: "100%",
                accentColor: "#7c3aed",
                marginBottom: "4px",
              }}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setMusicVol(v);
                AUD.setVol(v);
              }}
            />
            <div style={{ fontSize: "11px", color: "#8b5cf6" }}>
              {Math.round(musicVol * 100)}%
            </div>
          </div>
          <div style={{ marginBottom: "20px" }}>
            <div style={S.label}>Save &amp; Load</div>
            <div style={S.row("8px")}>
              <button style={S.btn("#166534")} onClick={saveGame}>
                💾 Save Game
              </button>
              <button
                style={S.btn("#1e3a8a")}
                onClick={() => {
                  loadGame();
                  setShowSettings(false);
                }}
              >
                📂 Load Save
              </button>
              <button
                style={S.btn("#7f1d1d")}
                onClick={() => {
                  if (window.confirm("Delete saved game?")) deleteSave();
                }}
              >
                🗑 Delete
              </button>
            </div>
          </div>
          <button
            style={S.btn("#7c3aed")}
            onClick={() => {
              AUD.sfx("click");
              setShowSettings(false);
            }}
          >
            Close
          </button>
        </ModalWrap>
      )}

      {showBefore && (
        <ModalWrap borderCol="rgba(251,191,36,0.3)">
          <div
            style={{
              fontSize: "42px",
              textAlign: "center",
              marginBottom: "12px",
            }}
          >
            {td.emoji}
          </div>
          <div style={S.title("14px", "#fbbf24")}>Before Alex Leaves</div>
          <div
            style={{
              fontSize: "12px",
              color: "#fef3c7",
              lineHeight: "2.1",
              whiteSpace: "pre-line",
              marginBottom: "22px",
            }}
          >
            {beforeMsg}
          </div>
          <button style={S.btn("#b45309")} onClick={afterBeforeConfirm}>
            Alex heads out →
          </button>
        </ModalWrap>
      )}

      {showScavenge &&
        (() => {
          const merchant = activeMerchant(),
            isMappy = merchant === "mappy";
          const mCol = isMappy ? "#fbbf24" : "#86efac";
          const mBg = isMappy
            ? "rgba(251,191,36,0.45)"
            : "rgba(100,200,100,0.3)";
          const stock = shopStock[merchant] || [];

          if (scavengePhase === "trade") {
            return (
              <ModalWrap borderCol={mBg} wide>
                {/* Merchant header */}
                <div
                  style={{
                    ...S.row("0"),
                    justifyContent: "space-between",
                    marginBottom: "14px",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "32px", marginBottom: "4px" }}>
                      {isMappy ? "🐦" : "🐭"}
                    </div>
                    <div style={S.title("15px", mCol)}>
                      {isMappy ? "Mappy the Magpie" : "The Mouse"}
                    </div>
                    <div
                      style={{
                        fontSize: "9px",
                        letterSpacing: "2px",
                        color: isMappy ? "#92400e" : "#166534",
                      }}
                    >
                      {isMappy
                        ? "WINDOW MERCHANT — PREMIUM GOODS"
                        : "HIDDEN ROUTE — ALWAYS AVAILABLE"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "#8b5cf6" }}>
                      Your coins
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        color: "#fbbf24",
                        fontWeight: "bold",
                      }}
                    >
                      🪙 {coins}
                    </div>
                    <button
                      style={{
                        ...S.btn("#4338ca"),
                        padding: "5px 12px",
                        fontSize: "10px",
                        marginTop: "6px",
                      }}
                      onClick={skipTrade}
                    >
                      Skip shop →
                    </button>
                  </div>
                </div>

                {/* Merchant dialogue */}
                <div
                  style={{
                    fontSize: "12px",
                    color: isMappy ? "#fef3c7" : "#d1fae5",
                    fontStyle: "italic",
                    marginBottom: "14px",
                    lineHeight: "1.8",
                    padding: "10px 12px",
                    background: isMappy
                      ? "rgba(30,15,0,0.5)"
                      : "rgba(0,20,10,0.5)",
                    borderRadius: "7px",
                    border: `1px solid ${
                      isMappy ? "rgba(180,130,0,0.15)" : "rgba(50,160,80,0.15)"
                    }`,
                  }}
                >
                  {isMappy
                    ? '"Shiny things, shiny things... Mappy has the finest wares. Take a look, yes?"'
                    : '"Keep it quiet. I\'ve got a few things that might help you tonight. Pick what you need."'}
                </div>

                {/* Item grid */}
                {stock.length === 0 ? (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#3d1a5e",
                      textAlign: "center",
                      padding: "20px",
                    }}
                  >
                    {isMappy
                      ? "Mappy has nothing left to sell today."
                      : "The Mouse's satchel is empty."}
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      marginBottom: "14px",
                    }}
                  >
                    {stock.map((item) => {
                      const affordable = coins >= item.shopPrice;
                      const isEq = item.type === "equipment";
                      const currentEq = isEq ? equipped[item.slot] : null;
                      return (
                        <div
                          key={item.id}
                          style={{
                            ...S.card(
                              affordable
                                ? "rgba(139,92,246,0.22)"
                                : "rgba(40,20,60,0.3)",
                              "rgba(10,0,22,0.8)"
                            ),
                            marginBottom: 0,
                            padding: "10px 12px",
                          }}
                        >
                          <div
                            style={{
                              ...S.row("0"),
                              justifyContent: "space-between",
                              marginBottom: "6px",
                            }}
                          >
                            <div style={S.row("6px")}>
                              <span style={{ fontSize: "22px" }}>
                                {item.ico}
                              </span>
                              <div>
                                <div
                                  style={{
                                    fontSize: "13px",
                                    color: "#c4b5fd",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {item.name}
                                </div>
                                <div style={{ ...S.row("6px") }}>
                                  <span
                                    style={{
                                      fontSize: "9px",
                                      color: RARITY_COL[item.rarity],
                                      letterSpacing: "1px",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {item.rarity}
                                  </span>
                                  {isEq && (
                                    <span
                                      style={{
                                        fontSize: "9px",
                                        color: "#6d28d9",
                                        letterSpacing: "1px",
                                      }}
                                    >
                                      {SLOT_LABEL[item.slot]}
                                    </span>
                                  )}
                                  {item.battle && (
                                    <span
                                      style={{
                                        fontSize: "9px",
                                        color: "#f59e0b",
                                        letterSpacing: "1px",
                                      }}
                                    >
                                      BATTLE USE
                                    </span>
                                  )}
                                  {item.type === "consumable" &&
                                    !item.battle && (
                                      <span
                                        style={{
                                          fontSize: "9px",
                                          color: "#10b981",
                                          letterSpacing: "1px",
                                        }}
                                      >
                                        INSTANT
                                      </span>
                                    )}
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div
                                style={{
                                  fontSize: "14px",
                                  color: affordable ? "#fbbf24" : "#7f1d1d",
                                  fontWeight: "bold",
                                }}
                              >
                                🪙 {item.shopPrice}
                              </div>
                              <button
                                style={{
                                  ...S.btn(
                                    affordable
                                      ? isMappy
                                        ? "#d97706"
                                        : "#16a34a"
                                      : "#4b5563",
                                    !affordable
                                  ),
                                  padding: "5px 12px",
                                  fontSize: "11px",
                                  marginTop: "4px",
                                }}
                                disabled={!affordable}
                                onClick={() => buyItem(item, merchant)}
                              >
                                {affordable ? "Buy" : "Can't afford"}
                              </button>
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#6d28d9",
                              lineHeight: "1.6",
                              marginBottom: "4px",
                            }}
                          >
                            {item.desc}
                          </div>
                          {/* Effect tags */}
                          <div style={S.row("4px")}>
                            {item.effect &&
                              Object.entries(item.effect).map(([k, v]) => (
                                <span
                                  key={k}
                                  style={{
                                    fontSize: "10px",
                                    background: "rgba(70,30,120,0.4)",
                                    border: "1px solid rgba(100,60,180,0.2)",
                                    borderRadius: "4px",
                                    padding: "2px 6px",
                                    color: "#a78bfa",
                                  }}
                                >
                                  +{v}{" "}
                                  {k === "mood"
                                    ? "Mood"
                                    : k === "bond"
                                    ? "Bond"
                                    : k === "hp"
                                    ? "HP"
                                    : k === "mp"
                                    ? "MP"
                                    : k === "atk"
                                    ? "ATK"
                                    : k === "matk"
                                    ? "M.ATK"
                                    : k === "maxHp"
                                    ? "Max HP"
                                    : k === "maxMp"
                                    ? "Max MP"
                                    : k === "dodge"
                                    ? "Dodge%"
                                    : k === "dmgReduce"
                                    ? "Absorb"
                                    : k === "hpRegen" || k === "hpRegenEq"
                                    ? "HP/turn"
                                    : k === "mpRegen" || k === "mpRegenEq"
                                    ? "MP/turn"
                                    : k}
                                </span>
                              ))}
                          </div>
                          {/* Show what's currently in that equipment slot */}
                          {isEq && currentEq && (
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#4c1d95",
                                marginTop: "5px",
                              }}
                            >
                              Currently equipped: {currentEq.ico}{" "}
                              {currentEq.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div
                  style={{
                    borderTop: "1px solid rgba(80,40,120,0.2)",
                    paddingTop: "12px",
                    ...S.row("8px"),
                  }}
                >
                  <button style={S.btn("#4338ca")} onClick={skipTrade}>
                    🔍 Done — Go scavenging
                  </button>
                  <span style={{ fontSize: "10px", color: "#3d1a5e" }}>
                    Stock refreshes each visit
                  </span>
                </div>
              </ModalWrap>
            );
          }

          // ── Scavenging phase ───────────────────────────────
          return (
            <ModalWrap borderCol="rgba(67,56,202,0.4)" wide>
              <div style={S.title("14px", "#a5b4fc")}>
                🔍 Luna is Searching the Apartment
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#8b5cf6",
                  marginBottom: "12px",
                }}
              >
                {spots.filter((s) => !s.revealed).length} spots left to sniff
                out.
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5,1fr)",
                  gap: "7px",
                  marginBottom: "14px",
                }}
              >
                {spots.map((spot, i) => (
                  <button
                    key={i}
                    style={{
                      ...S.btn(
                        spot.revealed
                          ? (spot.item?.coins || 0) > 0
                            ? "#059669"
                            : "#374151"
                          : "#7c3aed",
                        spot.revealed
                      ),
                      padding: "16px 4px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "18px",
                    }}
                    onClick={() => clickSpot(i)}
                    disabled={spot.revealed}
                  >
                    {spot.revealed ? (
                      (spot.item?.coins || 0) > 0 ? (
                        <>
                          <span>💰</span>
                          <span style={{ fontSize: "10px" }}>
                            +{spot.item.coins}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: "13px", color: "#374151" }}>
                          ✕
                        </span>
                      )
                    ) : (
                      <span>❓</span>
                    )}
                  </button>
                ))}
              </div>
              {allRevealed ? (
                <button style={S.btn("#059669")} onClick={finishScavenge}>
                  ✓ Done — {foundCoins} coins found. Alex is on his way back.
                </button>
              ) : (
                <div style={S.row()}>
                  <button
                    style={S.btn("#4338ca")}
                    onClick={() => spots.forEach((_, i) => clickSpot(i))}
                  >
                    Reveal All
                  </button>
                  <span style={{ fontSize: "11px", color: "#3d1a5e" }}>
                    or tap spots one by one
                  </span>
                </div>
              )}
            </ModalWrap>
          );
        })()}

      {/* ── Inventory & Equipment modal ── */}
      {showInventory && (
        <ModalWrap borderCol="rgba(139,92,246,0.4)" wide>
          <div
            style={{
              ...S.row("0"),
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <div style={S.title("15px", "#c084fc")}>
              🎒 Inventory &amp; Equipment
            </div>
            <button
              style={{
                ...S.btn("#4c1d95"),
                padding: "5px 12px",
                fontSize: "11px",
              }}
              onClick={() => setShowInventory(false)}
            >
              ✕ Close
            </button>
          </div>

          {/* Equipped items */}
          <div
            style={{
              ...S.card("rgba(139,92,246,0.2)", "rgba(10,0,22,0.7)"),
              marginBottom: "12px",
            }}
          >
            <div style={S.label}>Equipped</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "8px",
              }}
            >
              {["weapon", "accessory", "aura"].map((slot) => {
                const eq = equipped[slot];
                return (
                  <div
                    key={slot}
                    style={{
                      ...S.card(
                        eq ? "rgba(139,92,246,0.3)" : "rgba(40,20,60,0.2)",
                        "rgba(8,0,18,0.7)"
                      ),
                      marginBottom: 0,
                      padding: "10px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "9px",
                        color: "#4c1d95",
                        letterSpacing: "1.5px",
                        marginBottom: "5px",
                      }}
                    >
                      {SLOT_LABEL[slot]}
                    </div>
                    {eq ? (
                      <>
                        <div style={{ fontSize: "24px", marginBottom: "4px" }}>
                          {eq.ico}
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#c4b5fd",
                            marginBottom: "3px",
                          }}
                        >
                          {eq.name}
                        </div>
                        <div
                          style={{
                            ...S.row("3px"),
                            justifyContent: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          {Object.entries(eq.effect || {}).map(([k, v]) => (
                            <span
                              key={k}
                              style={{ fontSize: "9px", color: "#a78bfa" }}
                            >
                              +{v}{" "}
                              {k === "atk"
                                ? "ATK"
                                : k === "matk"
                                ? "MATK"
                                : k === "maxHp"
                                ? "HP"
                                : k === "maxMp"
                                ? "MP"
                                : k === "dodge"
                                ? "Dodge"
                                : k === "dmgReduce"
                                ? "Absorb"
                                : k === "hpRegenEq"
                                ? "HP/t"
                                : k === "mpRegenEq"
                                ? "MP/t"
                                : k}
                            </span>
                          ))}
                        </div>
                        <button
                          style={{
                            ...S.btn("#7f1d1d"),
                            padding: "4px 8px",
                            fontSize: "10px",
                            marginTop: "6px",
                          }}
                          onClick={() => {
                            AUD.sfx("click");
                            setEquipped((prev) => ({ ...prev, [slot]: null }));
                            notify(`${eq.name} unequipped.`);
                          }}
                        >
                          Unequip
                        </button>
                      </>
                    ) : (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#2a1040",
                          marginTop: "10px",
                        }}
                      >
                        — empty —
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Battle consumables in inventory */}
          <div style={S.label}>Battle Items (used during combat)</div>
          {inventory.length === 0 ? (
            <div
              style={{ fontSize: "12px", color: "#3d1a5e", padding: "10px 0" }}
            >
              No battle items. Buy HP/MP flasks or brews from merchants.
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "7px" }}
            >
              {inventory.map((item) => (
                <div
                  key={item.uid}
                  style={{
                    ...S.card("rgba(100,60,180,0.2)", "rgba(10,0,22,0.7)"),
                    marginBottom: 0,
                    padding: "10px 12px",
                    ...S.row("0"),
                    justifyContent: "space-between",
                  }}
                >
                  <div style={S.row("8px")}>
                    <span style={{ fontSize: "20px" }}>{item.ico}</span>
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#c4b5fd",
                          fontWeight: "bold",
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: "10px", color: "#6d28d9" }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#f59e0b",
                      letterSpacing: "1px",
                    }}
                  >
                    USE IN
                    <br />
                    BATTLE
                  </div>
                </div>
              ))}
            </div>
          )}
        </ModalWrap>
      )}

      {showAfter && (
        <ModalWrap borderCol="rgba(251,191,36,0.3)">
          <div
            style={{
              fontSize: "42px",
              textAlign: "center",
              marginBottom: "12px",
            }}
          >
            {td.emoji}
          </div>
          <div style={S.title("14px", "#fbbf24")}>Alex Returns Home</div>
          <div
            style={{
              fontSize: "12px",
              color: "#fef3c7",
              lineHeight: "2.1",
              whiteSpace: "pre-line",
              marginBottom: "22px",
            }}
          >
            {afterMsg}
          </div>
          <button style={S.btn("#b45309")} onClick={() => setShowAfter(false)}>
            Evening begins →
          </button>
        </ModalWrap>
      )}

      {showSleepPop && (
        <ModalWrap borderCol="rgba(99,102,241,0.4)">
          <div
            style={{
              fontSize: "42px",
              textAlign: "center",
              marginBottom: "12px",
            }}
          >
            🛏
          </div>
          <div style={S.title("14px", "#818cf8")}>Alex is Falling Asleep</div>
          <div
            style={{
              fontSize: "12px",
              color: "#c7d2fe",
              lineHeight: "1.95",
              marginBottom: "12px",
            }}
          >
            The apartment grows quiet. The lights go off one by one.
          </div>
          <div
            style={{
              fontSize: "12px",
              lineHeight: "2.05",
              marginBottom: "22px",
              color:
                tier === 3 ? "#6ee7b7" : tier === 2 ? "#fcd34d" : "#fca5a5",
            }}
          >
            {tier === 3
              ? "Alex drifts off almost immediately. His breathing is slow and even. The Dreamscape hums with restless energy anyway — it always does."
              : tier === 2
              ? "Alex tosses and turns before finally going still. Luna can feel the disturbances already forming."
              : "Alex barely makes it to bed. He collapses, too exhausted to settle. The nightmares rush in before he's fully under."}
          </div>
          <div
            style={{ fontSize: "11px", color: "#4338ca", marginBottom: "18px" }}
          >
            {tier === 3
              ? "Sleeping soundly — light dream activity detected."
              : tier === 2
              ? "Restless sleep — moderate nightmare presence."
              : "Severe disruption — nightmares already breaching."}
          </div>
          <button style={S.btn("#4338ca")} onClick={confirmSleep}>
            {tier === 3
              ? "The portal glows softly beneath the bed..."
              : tier === 2
              ? "The portal pulses with warning light..."
              : "The portal tears open with force..."}
          </button>
        </ModalWrap>
      )}
    </div>
  );
}

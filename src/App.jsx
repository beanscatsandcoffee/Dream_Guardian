import React, { useEffect, useMemo, useState } from "react";

// ── Responsive hook ──────────────────────────────────────────────────
function useResponsive() {
  const init = typeof window !== "undefined"
    ? { w: window.innerWidth, h: window.innerHeight }
    : { w: 768, h: 1024 };
  const [size, setSize] = useState(init);
  useEffect(() => {
    function handle() { setSize({ w: window.innerWidth, h: window.innerHeight }); }
    window.addEventListener("resize", handle);
    window.addEventListener("orientationchange", handle);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("orientationchange", handle);
    };
  }, []);
  return {
    isMobile: size.w < 600,
    isSmall:  size.w < 380,
    isLandscapeMobile: size.w > size.h && size.h < 520,
    w: size.w, h: size.h,
  };
}

// ── Global CSS style block ───────────────────────────────────────────
function GlobalStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      *, *::before, *::after { box-sizing: border-box; }
      html { -webkit-text-size-adjust: 100%; }
      body { margin: 0; padding: 0; overflow-x: hidden; -webkit-tap-highlight-color: transparent; }
      button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
      @media (max-width: 360px) {
        .dg-arena { grid-template-columns: 1fr 26px 1fr !important; gap: 4px !important; }
        .dg-skills { grid-template-columns: 1fr !important; }
      }
      @media (orientation: landscape) and (max-height: 520px) {
        .dg-overlay { padding: 8px 10px 10px !important; }
        .dg-char { font-size: 34px !important; line-height: 1 !important; }
        .dg-arena { margin-bottom: 8px !important; }
        .dg-hdr  { margin-bottom: 8px !important; }
        .dg-void  { padding-top: 10px !important; justify-content: flex-start !important; }
      }
      @supports (padding: env(safe-area-inset-bottom)) {
        .dg-overlay { padding-bottom: max(16px, env(safe-area-inset-bottom)) !important; }
        .dg-page { padding-bottom: max(16px, env(safe-area-inset-bottom)); }
      }
    `}} />
  );
}

const STORAGE_KEY = "dream_guardian_save_v5";
const ROOT_BG = "linear-gradient(to bottom, #090014, #140026, #090014)";

const defaultPlayer = {
  hp: 100, maxHp: 100, mp: 40, maxMp: 40,
  atk: 10, matk: 12, coins: 0, shards: 0,
  level: 1, xp: 0,
};

const introText = "Alex never sleeps peacefully anymore.\n\nEvery night, something crawls through the Dreamscape.\nSomething hungry.\n\nLuna began seeing the portal beneath the bed weeks ago.\nA breathing violet tear hidden beneath reality itself.\n\nNow every night is a battle.\n\nProtect Alex.\nEnter the Dreamscape.\nSurvive the nightmares.";

const defaultState = {
  day: 1, phase: "day",
  alexWorking: false,
  mood: 1001, bond: 0,
  player: defaultPlayer,
  inventory: [],
  equipped: { weapon: null, accessory: null, aura: null, body_armor: null, paw_gloves: null, tail_enhancements: null, head_gear: null },
  toast: "",
  dailyMouseItems: [],
  dailyMappyItems: [],
  mappyAvailable: false,
  battle: null,
  voidData: null,
  dreamLog: [],
  upgrades: {},
  talkedToday: false,
  scavengedToday: false,
  totalBattlesCount: 0,
  rerollCountToday: 0,
  battleHistory: [],
  lastActShown: 0,
  neuralMissionActive: null,
};

// ── Item Pools ───────────────────────────────────────────────────────
const MOUSE_ITEMS_POOL = [
  { id:"small_potion",   name:"Small Potion",    ico:"🧪", type:"consumable", price:15,  desc:"+30 HP",              effect:{ hp:30 } },
  { id:"large_potion",   name:"Large Potion",    ico:"🫙", type:"consumable", price:35,  desc:"+60 HP",              effect:{ hp:60 } },
  { id:"star_shard",     name:"Star Shard",      ico:"⭐", type:"consumable", price:40,  desc:"+25 MP",              effect:{ mp:25 } },
  { id:"mana_vial",      name:"Mana Vial",       ico:"💙", type:"consumable", price:45,  desc:"+50 MP",              effect:{ mp:50 } },
  { id:"moon_bread",     name:"Moon Bread",      ico:"🍞", type:"consumable", price:20,  desc:"+20 HP +10 MP",       effect:{ hp:20, mp:10 } },
  { id:"heart_elixir",   name:"Heart Elixir",    ico:"💖", type:"consumable", price:130, desc:"+20 Permanent Max HP",effect:{ maxHp:20 } },
  { id:"mana_elixir",    name:"Mana Elixir",     ico:"🧪", type:"consumable", price:150, desc:"+40 Permanent Max MP",effect:{ maxMp:40 } },
  { id:"moon_blade",     name:"Moon Blade",      ico:"🗡️", type:"equipment",  slot:"weapon",    price:90,  desc:"+4 ATK",              effect:{ atk:4 } },
  { id:"shadow_claw",    name:"Shadow Claw",     ico:"🌑", type:"equipment",  slot:"weapon",    price:110, desc:"+6 ATK",              effect:{ atk:6 } },
  { id:"dream_charm",    name:"Dream Charm",     ico:"🔮", type:"equipment",  slot:"accessory", price:75,  desc:"+20 Max MP",          effect:{ maxMp:20 } },
  { id:"lunar_ring",     name:"Lunar Ring",      ico:"💍", type:"equipment",  slot:"accessory", price:100, desc:"+5 ATK +10 Max MP",   effect:{ atk:5, maxMp:10 } },
  { id:"dream_aura",     name:"Dream Aura",      ico:"🌀", type:"equipment",  slot:"aura",      price:130, desc:"+5 ATK +15 Max MP",   effect:{ atk:5, maxMp:15 } },
  { id:"spirit_cloak",   name:"Spirit Cloak",    ico:"👘", type:"equipment",  slot:"aura",      price:95,  desc:"+20 Max HP",          effect:{ maxHp:20 } },
  { id:"twilight_ring",  name:"Twilight Ring",   ico:"🌙", type:"equipment",  slot:"accessory", price:85,  desc:"+25 Max MP",          effect:{ maxMp:25 } },
  
  // Body Armor
  { id:"architecture",   name:"Architecture",    ico:"🛡️", type:"equipment",  slot:"body_armor", price:140, desc:"DR +5% & +2% Dream Essence drops per star. Reduces debuff impact by 5%", effect:{ dr:5, maxHp:15 } },
  { id:"synapse",        name:"Synapse",         ico:"🧠", type:"equipment",  slot:"body_armor", price:210, desc:"DR +8%. Converts 1% of blocked damage into Speed inside battles", effect:{ dr:8, atk:2 } },
  
  // Paw Gloves
  { id:"spindle",        name:"Spindle",         ico:"🐾", type:"equipment",  slot:"paw_gloves", price:120, desc:"Attack Speed +8%, Multi-Strike rate +2% per star", effect:{ atk:3, maxHp:10 } },
  { id:"synesthesia",    name:"Synesthesia",     ico:"🎨", type:"equipment",  slot:"paw_gloves", price:190, desc:"Armor Pen +5%. Unlocks 30% Blind chance on enemy at 2 stars", effect:{ atk:5, maxMp:10 } },

  // Tail Enhancements
  { id:"continuum",      name:"Continuum",       ico:"🧬", type:"equipment",  slot:"tail_enhancements", price:155, desc:"Every 5th attack cleaves next 3 enemies in queue for 20% damage", effect:{ atk:4, maxHp:15 } },
  { id:"oscillation",    name:"Oscillation",     ico:"〰️", type:"equipment",  slot:"tail_enhancements", price:220, desc:"Attacks have +2% (+3% per star) chance to hit twice", effect:{ atk:6, maxMp:10 } },

  // Head Gear
  { id:"phantasm",       name:"Phantasm",        ico:"🎭", type:"equipment",  slot:"head_gear", price:130, desc:"Increased evasion and dodge rate +5%", effect:{ maxHp:20, maxMp:10 } },
  { id:"aura_crown",     name:"Aura",            ico:"👑", type:"equipment",  slot:"head_gear", price:185, desc:"Tears mind focus, reducing enemy defense by 5%", effect:{ atk:3, maxHp:30 } },
];

const MAPPY_ITEMS_POOL = [
  { id:"stellar_blade",   name:"Stellar Blade",    ico:"✨", type:"equipment",  slot:"weapon",    price:250, desc:"+12 ATK",                   effect:{ atk:12 } },
  { id:"void_armor",      name:"Void Armor",       ico:"🛡️", type:"equipment",  slot:"aura",      price:200, desc:"+30 Max HP",                 effect:{ maxHp:30 } },
  { id:"eclipse_ring",    name:"Eclipse Ring",     ico:"🌒", type:"equipment",  slot:"accessory", price:180, desc:"+40 Max MP",                 effect:{ maxMp:40 } },
  { id:"nightmare_cloak", name:"Nightmare Cloak",  ico:"🌑", type:"equipment",  slot:"aura",      price:220, desc:"+8 ATK +20 Max MP",          effect:{ atk:8, maxMp:20 } },
  { id:"blood_crystal",   name:"Blood Crystal",    ico:"🔴", type:"consumable", price:80,  desc:"+80 HP",                   effect:{ hp:80 } },
  { id:"astral_gem",      name:"Astral Gem",       ico:"💎", type:"consumable", price:90,  desc:"+80 MP",                   effect:{ mp:80 } },
  { id:"dream_relic",     name:"Dream Relic",      ico:"🏺", type:"equipment",  slot:"accessory", price:300, desc:"+15 ATK +30 Max MP",         effect:{ atk:15, maxMp:30 } },
  { id:"phantom_blade",   name:"Phantom Blade",    ico:"👻", type:"equipment",  slot:"weapon",    price:280, desc:"+14 ATK",                   effect:{ atk:14 } },
  { id:"lunar_veil",      name:"Lunar Veil",       ico:"🌕", type:"equipment",  slot:"aura",      price:160, desc:"+10 ATK +10 Max HP",         effect:{ atk:10, maxHp:10 } },
  { id:"dream_crown",     name:"Dream Crown",      ico:"👑", type:"equipment",  slot:"accessory", price:350, desc:"+20 ATK +50 Max MP",         effect:{ atk:20, maxMp:50 } },
  { id:"elixir",          name:"Elixir",           ico:"✨", type:"consumable", price:120, desc:"+150 HP +50 MP",           effect:{ hp:150, mp:50 } },
  { id:"shadow_pendant",  name:"Shadow Pendant",   ico:"🖤", type:"equipment",  slot:"accessory", price:195, desc:"+12 ATK +25 Max MP",         effect:{ atk:12, maxMp:25 } },
  { id:"spectral_aura",   name:"Spectral Aura",    ico:"🌫️", type:"equipment",  slot:"aura",      price:240, desc:"+50 Max HP +20 Max MP",      effect:{ maxHp:50, maxMp:20 } },
  { id:"moon_fang",       name:"Moon Fang",        ico:"🌙", type:"equipment",  slot:"weapon",    price:320, desc:"+16 ATK",                   effect:{ atk:16 } },
  { id:"nightmare_fuel",  name:"Nightmare Fuel",   ico:"🔥", type:"consumable", price:60,  desc:"+50 HP +30 MP",            effect:{ hp:50, mp:30 } },
  { id:"void_crystal",    name:"Void Crystal",     ico:"🌀", type:"equipment",  slot:"accessory", price:230, desc:"+15 ATK +35 Max MP",         effect:{ atk:15, maxMp:35 } },
  { id:"dream_gauntlet",  name:"Dream Gauntlet",   ico:"🥊", type:"equipment",  slot:"weapon",    price:190, desc:"+9 ATK +15 Max HP",          effect:{ atk:9, maxHp:15 } },
  { id:"star_cape",       name:"Star Cape",        ico:"🌟", type:"equipment",  slot:"aura",      price:175, desc:"+25 Max HP +15 Max MP",      effect:{ maxHp:25, maxMp:15 } },
  { id:"prism_shard",     name:"Prism Shard",      ico:"💠", type:"consumable", price:100, desc:"+100 HP",                  effect:{ hp:100 } },
  { id:"cosmic_eye",      name:"Cosmic Eye",       ico:"👁️", type:"equipment",  slot:"accessory", price:400, desc:"+25 ATK +60 Max MP +30 Max HP", effect:{ atk:25, maxMp:60, maxHp:30 } },
  { id:"deja_vu",         name:"Déjà Vu",          ico:"🌀", type:"consumable", price:150, desc:"Resets HP & MP to 100% in battle, removing all debuffs." },
  { id:"psyche",          name:"Psyche",           ico:"🧬", type:"consumable", price:1000, desc:"Ascension item required to level up 5★ items (up to +5)." },

  // Mappy Rare Equipment
  { id:"stasis",          name:"Stasis",           ico:"❄️", type:"equipment",  slot:"body_armor", price:260, desc:"DR +12%, -2.5% Enemy Crit Damage. Unlocks 20% chance to Slow enemy at 1 star", effect:{ dr:12, maxHp:30 } },
  { id:"myoclonia",       name:"Myoclonia",        ico:"⚡", type:"equipment",  slot:"body_armor", price:340, desc:"DR +15%, Thorns 20%. Unlocks 10% chance to Paralyze enemy at 2 stars", effect:{ dr:15, maxHp:50, thorns:20 } },
  { id:"trigger",         name:"Trigger",          ico:"🔫", type:"equipment",  slot:"paw_gloves", price:250, desc:"Crit +2%, Critical damage multiplier +10%", effect:{ atk:8, maxMp:15 } },
  { id:"trauma",          name:"Trauma",           ico:"🥊", type:"equipment",  slot:"paw_gloves", price:380, desc:"Hybrid-only. Base ATK +12%, Crit -1% per star. Unlocks Crushing Blow at 4 stars", effect:{ atk:12, maxHp:20 } },
  { id:"lapse",           name:"Lapse",            ico:"⏳", type:"equipment",  slot:"tail_enhancements", price:280, desc:"3% chance to freeze enemy turn for 1 turn", effect:{ atk:8, maxHp:25 } },
  { id:"paradox",         name:"Paradox",          ico:"🔗", type:"equipment",  slot:"tail_enhancements", price:350, desc:"Inverts enemy debuffs into buffs. Unlocks 50% persistent hold at 3 stars", effect:{ atk:10, maxMp:25 } },
  { id:"hypnagogia_crown",name:"Hypnagogia",       ico:"👁️", type:"equipment",  slot:"head_gear", price:290, desc:"5% (+5% per star) chance to hit for x2 damage, x4 damage at 3 stars", effect:{ atk:8, maxMp:30 } },
  { id:"catharsis_hat",   name:"Catharsis",        ico:"🎩", type:"equipment",  slot:"head_gear", price:360, desc:"Decreases Ultimate Bond requirement by 15%, +10% coin/shard drops", effect:{ atk:12, maxHp:40, maxMp:30 } },
];

// ── Enemies ──────────────────────────────────────────────────────────
const REGULAR_ENEMIES = [
  { id:"fogling",      name:"Fogling",      ico:"👁️", hp:40,  maxHp:40,  atk:6,  reward:8,   isBoss:false },
  { id:"night_hound",  name:"Night Hound",  ico:"🐺", hp:70,  maxHp:70,  atk:10, reward:14,  isBoss:false },
  { id:"shade_wraith", name:"Shade Wraith", ico:"👻", hp:55,  maxHp:55,  atk:8,  reward:11,  isBoss:false },
  { id:"anxiety_wisp", name:"Anxiety Wisp", ico:"💜", hp:45,  maxHp:45,  atk:7,  reward:9,   isBoss:false },
  { id:"mem_ghoul",    name:"Memory Ghoul", ico:"🌀", hp:80,  maxHp:80,  atk:11, reward:16,  isBoss:false },
  { id:"lucid_weaver", name:"Lucid Weaver",  ico:"🕸️", hp:40,  maxHp:40,  atk:6,  reward:8,   isBoss:false },
  { id:"hyp_crawler",  name:"Hypnagogic Crawler", ico:"🐛", hp:48, maxHp:48, atk:7, reward:9, isBoss:false },
  { id:"som_lurker",   name:"Somatic Lurker", ico:"🦎",  hp:65,  maxHp:65,  atk:9,  reward:12,  isBoss:false },
  { id:"aeth_phantasm",name:"Aetheric Phantasm", ico:"✨", hp:75,  maxHp:75,  atk:10, reward:15,  isBoss:false },
];
const BOSS_ENEMY = { id:"insomnia_titan", name:"Insomnia Titan", ico:"⏰", hp:320, maxHp:320, atk:22, reward:150, isBoss:true };
const REM_BOSS = { id:"rem", name:"REM", ico:"👁️‍🗨️", hp:450, maxHp:450, atk:50, reward:250, isBoss:true, magicShield:2, dodgeLowered:false };

// ── Skill Trees ──────────────────────────────────────────────────────
const SKILL_TREE = {
  feral: [
    { id:"f1",  name:"Razor Claws",       type:"Passive", stat:"ATK",     baseValue:5,   desc:"Permanent boost to physical ATK." },
    { id:"f2",  name:"Midnight Pounce",   type:"Active",  stat:"DMG",     baseValue:20,  mpCost:8,  desc:"High-speed strike. ATK×1.5 damage." },
    { id:"f3",  name:"Adrenaline Purr",   type:"Passive", stat:"SPD",     baseValue:3,   desc:"Movement speed. Grants flat dodge chance (%) in nightmares." },
    { id:"f4",  name:"Feral Reflex",      type:"Passive", stat:"CRIT",    baseValue:5,   desc:"Chance for critical hit (2× damage)." },
    { id:"f5",  name:"Shadow Blend",      type:"Active",  stat:"STEALTH", baseValue:1,   mpCost:12, desc:"Skip enemy's attack this turn." },
    { id:"f6",  name:"Ragdoll Bounce",    type:"Passive", stat:"DEF",     baseValue:4,   desc:"Reduces physical damage taken from enemies by flat defense." },
    { id:"f7",  name:"Thrill of Hunt",    type:"Passive", stat:"VAMP",    baseValue:2,   desc:"Heal % of damage dealt." },
    { id:"f8",  name:"Alpha Hiss",        type:"Active",  stat:"DEBUFF",  baseValue:4,   mpCost:10, desc:"Reduce enemy ATK by 4 for 2 turns." },
    { id:"f9",  name:"Scent Tracker",     type:"Passive", stat:"LUCK",    baseValue:15,  desc:"Boosts scavenging spawn rates." },
    { id:"f10", name:"Feline Grace",      type:"Passive", stat:"STAM",    baseValue:20,  desc:"Reduces MP cost for physical skills." },
  ],
  hybrid: [
    { id:"h1",  name:"Lunar Spark",       type:"Active",  stat:"MAG",     baseValue:25,  mpCost:12, desc:"Magic projectile. MATK×1.4 damage." },
    { id:"h2",  name:"Aura of Devotion",  type:"Passive", stat:"REGEN",   baseValue:5,   desc:"MP regen (+3) after each attack turn." },
    { id:"h3",  name:"Violet Tear",       type:"Active",  stat:"AOE",     baseValue:40,  mpCost:20, desc:"Massive explosion. MATK×2.0 damage." },
    { id:"h4",  name:"Guardian's Resolve",type:"Passive", stat:"MDEF",    baseValue:4,   desc:"Magic resistance. Reduces damage taken by flat MDEF." },
    { id:"h5",  name:"Star-Touched Nails",type:"Passive", stat:"PEN",     baseValue:4,   desc:"Ignore defense, adding flat bonus Pierce damage to all hits." },
    { id:"h6",  name:"Warp Step",         type:"Active",  stat:"DODGE",   baseValue:25,  mpCost:15, desc:"Dodge this turn + MATK×0.8 counter." },
    { id:"h7",  name:"Echoing Meow",      type:"Active",  stat:"DEBUFF",  baseValue:15,  mpCost:10, desc:"Reduce enemy ATK by 5 for 3 turns." },
    { id:"h8",  name:"Astral Fur",        type:"Passive", stat:"MAXMP",   baseValue:25,  desc:"Massive permanent boost to your Mana pool." },
    { id:"h9",  name:"Bond Flare",        type:"Active",  stat:"ULT",     baseValue:100, mpCost:30, desc:"Channels Bond energy for massive damage." },
    { id:"h10", name:"Dreamweaver",       type:"Passive", stat:"EXP",     baseValue:1,   desc:"Guarantees extra bonus shards upon clearing nightmares." },
  ],
};

const ALL_ACTIVE_SKILLS  = [...SKILL_TREE.feral, ...SKILL_TREE.hybrid].filter(s => s.type === "Active");
const ALL_PASSIVE_SKILLS = [...SKILL_TREE.feral, ...SKILL_TREE.hybrid].filter(s => s.type === "Passive");

// ── Utilities ────────────────────────────────────────────────────────
function getXpNeeded(level) {
  if (level <= 2) return 50;
  return 50 + Math.floor((level - 1) / 2) * 25;
}

function getEnemyXp(tier, isVictory) {
  let victoryXp = 5;
  const t = (tier || "Normal").toLowerCase();
  if (t === "uncommon") {
    victoryXp = 10;
  } else if (t === "rare") {
    victoryXp = 20;
  } else if (t === "mutated") {
    victoryXp = 50;
  } else if (t === "sr" || t === "boss") {
    victoryXp = 100;
  }
  return isVictory ? victoryXp : (victoryXp / 2);
}

function addPlayerXp(player, xpGained, notificationsList) {
  let currentXp = player.xp || 0;
  let currentLevel = player.level || 1;
  let coinsGained = 0;
  let shardsGained = 0;
  
  currentXp += xpGained;
  
  while (true) {
    const xpNeeded = getXpNeeded(currentLevel);
    if (currentXp >= xpNeeded) {
      currentXp -= xpNeeded;
      currentLevel += 1;
      
      const fromL = currentLevel - 1;
      const levelFactor = Math.floor((fromL - 1) / 5);
      const mult = Math.pow(2, levelFactor);
      
      coinsGained += 20 * mult;
      shardsGained += 1 * mult;
      
      notificationsList.push(`Level Up! Reached Level ${currentLevel}! (+${20 * mult} coins, +${1 * mult} Shard)`);
    } else {
      break;
    }
  }
  
  return {
    ...player,
    level: currentLevel,
    xp: currentXp,
    coins: player.coins + coinsGained,
    shards: (player.shards || 0) + shardsGained,
  };
}

function getSkillStats(baseValue, level) {
  return {
    price: Math.floor(10 * Math.pow(2, level)),
    power: Math.floor(baseValue * Math.pow(1.8, level)),
  };
}

function getMoodDetails(pts) {
  if (pts > 1000) return { label:"Tier 3: Awesome",  color:"#60a5fa" };
  if (pts > 500)  return { label:"Tier 2: Stressed", color:"#fbbf24" };
  return               { label:"Tier 1: Deprived", color:"#ef4444" };
}

const ENEMY_PASSIVES = [
  { name: "Thorns", desc: "Reflects 2 damage when hit" },
  { name: "Empower", desc: "Deals +25% damage" },
  { name: "Regen", desc: "Heals 5 HP each turn" },
];

const ENEMY_SKILLS = [
  { name: "Shadow Bite", desc: "ATKx1.3 dmg & heals enemy +4 HP", multiplier: 1.3, mpDrain: 0, heal: 4 },
  { name: "Mind Drain", desc: "Drains 5 MP from player", multiplier: 0.8, mpDrain: 5, heal: 0 },
  { name: "Heavy Slam", desc: "Deals ATKx1.5 heavy damage", multiplier: 1.5, mpDrain: 0, heal: 0 },
];

function getEnemyTier(day) {
  let tiers = [];
  if (day <= 7) {
    tiers = [
      { name: "Normal", weight: 100 },
      { name: "Uncommon", weight: 80 }
    ];
  } else {
    tiers = [
      { name: "Normal", weight: 100 },
      { name: "Uncommon", weight: 80 },
      { name: "Rare", weight: 60 },
      { name: "Mutated", weight: 40 },
      { name: "SR", weight: 20 }
    ];
  }
  const totalWeight = tiers.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const tier of tiers) {
    roll -= tier.weight;
    if (roll <= 0) return tier.name;
  }
  return "Normal";
}

function getEnemyPassivesAndSkills(tier, isBoss) {
  if (isBoss) {
    const p = [...ENEMY_PASSIVES].sort(() => Math.random() - 0.5).slice(0, 2);
    const s = [...ENEMY_SKILLS].sort(() => Math.random() - 0.5).slice(0, 2);
    return { passives: p, skills: s };
  }
  let pCount = 0;
  let sCount = 0;
  if (tier === "Uncommon") { pCount = 1; }
  else if (tier === "Rare") { sCount = 1; }
  else if (tier === "Mutated") { pCount = 1; sCount = 1; }
  else if (tier === "SR") { pCount = 2; sCount = 1; }
  
  const passives = [...ENEMY_PASSIVES].sort(() => Math.random() - 0.5).slice(0, pCount);
  const skills = [...ENEMY_SKILLS].sort(() => Math.random() - 0.5).slice(0, sCount);
  return { passives, skills };
}

function getEnemyCount(day, totalAtk, unlockedSkills) {
  if (day > 0 && day % 7 === 0) return 15;
  // Starting count everyday is 3-5 (Request 7)
  return Math.floor(Math.random() * 3) + 3;
}

function getBossAdaptability(enemy, totalAtk) {
  let reduction = 0;
  let reflection = 0;
  const isBoss = enemy.isBoss || enemy.tier === "BOSS" || enemy.id === "rem";
  const hasThorns = enemy.passives && enemy.passives.some(p => p.name === "Thorns");

  if (isBoss) {
    if (totalAtk >= 100) {
      reduction = 0.75;
      reflection = hasThorns ? 10 : 25;
    } else if (totalAtk >= 30) {
      reduction = 0.25;
      reflection = hasThorns ? 4 : 5;
    } else {
      reduction = 0;
      reflection = hasThorns ? 2 : 0;
    }
  } else {
    reduction = 0;
    reflection = hasThorns ? 2 : 0;
  }
  return { reduction, reflection };
}

function generateEnemyQueue(count, day) {
  return Array.from({ length: count }, (_, i) => {
    if (i === count - 1 && count >= 15) {
      const isRem = Math.random() < 0.5;
      const chosenBoss = isRem ? REM_BOSS : BOSS_ENEMY;
      const mult = Math.pow(1.5, Math.floor((day - 1) / 7));
      const bHp = Math.floor(chosenBoss.hp * mult);
      const bAtk = Math.max(1, Math.floor(chosenBoss.atk * mult));
      const { passives, skills } = getEnemyPassivesAndSkills("Normal", true);

      // Add a visual skill if they are fighting REM
      const bossSkills = isRem 
        ? [{ name: "True Laser", desc: "True Damage (ignores all armor)" }, { name: "Rapid Vibration", desc: "Lowers dodge rate by 25%" }]
        : skills;

      return { 
        ...chosenBoss, 
        hp: bHp, 
        maxHp: bHp, 
        atk: bAtk, 
        tier: "BOSS",
        passives,
        skills: bossSkills,
        debuffAtk: 0, 
        debuffTurns: 0,
        magicShield: isRem ? 2 : 0,
        dodgeLowered: false
      };
    }
    const tmpl = REGULAR_ENEMIES[Math.floor(Math.random() * REGULAR_ENEMIES.length)];
    const tier = getEnemyTier(day);
    const { passives, skills } = getEnemyPassivesAndSkills(tier, false);
    
    const mult = Math.pow(1.5, Math.floor((day - 1) / 7));
    
    let tierAtkMult = 1.0;
    let tierHpMult = 1.0;
    if (tier === "Uncommon") { tierAtkMult = 1.1; tierHpMult = 1.1; }
    else if (tier === "Rare") { tierAtkMult = 1.25; tierHpMult = 1.2; }
    else if (tier === "Mutated") { tierAtkMult = 1.4; tierHpMult = 1.35; }
    else if (tier === "SR") { tierAtkMult = 1.6; tierHpMult = 1.5; }

    const finalHp = Math.floor(tmpl.hp * mult * tierHpMult);
    const finalAtk = Math.max(1, Math.floor(tmpl.atk * mult * tierAtkMult));

    return { 
      ...tmpl, 
      hp: finalHp, 
      maxHp: finalHp, 
      atk: finalAtk, 
      tier,
      passives,
      skills,
      debuffAtk: 0, 
      debuffTurns: 0,
      magicShield: 0,
      dodgeLowered: false
    };
  });
}

const RARITY_STYLE = {
  jackpot:  { bg:"rgba(255,215,0,0.18)",  border:"rgba(255,215,0,0.8)",   label:"JACKPOT",   color:"#fde68a" },
  ultraRare:{ bg:"rgba(220,38,38,0.15)",  border:"rgba(220,38,38,0.7)",   label:"ULTRA RARE",color:"#fca5a5" },
  veryRare: { bg:"rgba(139,92,246,0.2)",  border:"rgba(139,92,246,0.7)",  label:"VERY RARE", color:"#c4b5fd" },
  rare:     { bg:"rgba(59,130,246,0.15)", border:"rgba(59,130,246,0.6)",  label:"RARE",      color:"#93c5fd" },
  uncommon: { bg:"rgba(16,185,129,0.12)", border:"rgba(16,185,129,0.5)",  label:"UNCOMMON",  color:"#6ee7b7" },
  common:   { bg:"rgba(250,204,21,0.08)", border:"rgba(250,204,21,0.35)", label:"COMMON",    color:"#fde68a" },
  shard:    { bg:"rgba(6,182,212,0.18)",  border:"rgba(6,182,212,0.8)",   label:"SHARD",     color:"#67e8f9" },
  empty:    { bg:"rgba(255,255,255,0.02)",border:"rgba(255,255,255,0.08)",label:"EMPTY",     color:"#444"    },
};

function generateScavengeBoxes(luckBonus) {
  // Determine number of non-empty boxes using binomial probability distribution
  // heavily boosting probability for exactly 4 non-empty coin boxes:
  const dist = [
    0.001, // 0 boxes
    0.005, // 1 box
    0.022, // 2 boxes (halved)
    0.058, // 3 boxes (halved)
    0.410, // 4 boxes (doubled from 0.205)
    0.246, // 5 boxes
    0.160, // 6 boxes
    0.076, // 7 boxes
    0.020, // 8 boxes
    0.002, // 9 boxes
    0.000, // 10 boxes
  ];
  const sum = dist.reduce((a, b) => a + b, 0);
  const normalized = dist.map(v => v / sum);

  let r = Math.random();
  let numCoins = 4;
  let cumulative = 0;
  for (let i = 0; i <= 10; i++) {
    cumulative += normalized[i];
    if (r <= cumulative) {
      numCoins = i;
      break;
    }
  }

  const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const coinIndices = new Set(indices.slice(0, numCoins));

  return Array.from({ length: 10 }, (_, idx) => {
    if (!coinIndices.has(idx)) {
      return { value: 0, rarity: "empty", revealed: false };
    }

    if (Math.random() < 0.001) return { value: 1, rarity: "shard", revealed: false, isShard: true };
    if (Math.random() < 0.00001) return { value: 5000, rarity: "jackpot", revealed: false };
    
    // Rarity distribution based on the remaining spawnChance (smaller chance means rarer items). Luck bonus slightly improves rarity chance.
    const rawChance = Math.random() * 88 + 2;
    const spawnChance = Math.max(0.1, rawChance - (luckBonus || 0) * 0.4);
    let value;
    let rarity;

    // We lower the chances of rare and above by 15% by adjusting thresholds: 
    // This reduces the bracket sizes, making common and uncommon much more persistent.
    if (spawnChance < 2.55) {  // Ultra Rare (previously < 3, decreased by 15%)
      value = Math.floor(Math.random() * 301) + 200;
      rarity = "ultraRare";
    } else if (spawnChance < 8.5) { // Very Rare (previously < 10, decreased by 15%)
      value = Math.floor(Math.random() * 151) + 100;
      rarity = "veryRare";
    } else if (spawnChance < 21.25) { // Rare (previously < 25, decreased by 15%)
      value = Math.floor(Math.random() * 61)  + 40;
      rarity = "rare";
    } else if (spawnChance < 65) {
      value = Math.floor(Math.random() * 21)  + 10;
      rarity = "uncommon";
    } else {
      value = Math.floor(Math.random() * 9)   + 1;
      rarity = "common";
    }
    return { value, rarity, revealed: false };
  });
}

function itemDisplayName(item) {
  const stars = "★".repeat(item.forgeLevel || 0);
  return stars ? (item.baseName || item.name) + " " + stars : (item.baseName || item.name);
}

function formatSlotName(slot) {
  if (!slot) return "";
  const s = slot.toLowerCase();
  if (s === "weapon") return "Weapon Gear ⚔️";
  if (s === "accessory") return "Accessory Gear 💍";
  if (s === "aura") return "Aura Gear 🌫️";
  if (s === "body_armor") return "Body Armor 🛡️";
  if (s === "paw_gloves") return "Paw Gloves 🐾";
  if (s === "tail_enhancements") return "Tail Enhancement 〰️";
  if (s === "head_gear") return "Head Gear 👑";
  return slot.toUpperCase();
}

function slotDisplayName(slot) {
  if (!slot) return "";
  const s = slot.toLowerCase();
  if (s === "weapon") return "Weapon ⚔️";
  if (s === "accessory") return "Accessory 💍";
  if (s === "aura") return "Aura 🌫️";
  if (s === "body_armor") return "Body Armor 🛡️";
  if (s === "paw_gloves") return "Paw Gloves 🐾";
  if (s === "tail_enhancements") return "Tail 〰️";
  if (s === "head_gear") return "Head Gear 👑";
  return slot;
}

function itemSellPrice(item) {
  const base = Math.floor((item.price || 10) * 0.5);
  return Math.floor(base * Math.pow(2, item.forgeLevel || 0));
}

function hasMaxForgedItem(game, itemId, baseName) {
  const normBaseName = baseName || "";
  const matchInv = (game.inventory || []).some(item => 
    ((item.id && item.id === itemId) || (item.baseName && item.baseName === normBaseName) || (item.name && item.name.startsWith(normBaseName))) && 
    (item.forgeLevel || 0) >= 5
  );
  if (matchInv) return true;

  const matchEq = Object.values(game.equipped || {}).some(item => 
    item && 
    ((item.id && item.id === itemId) || (item.baseName && item.baseName === normBaseName) || (item.name && item.name.startsWith(normBaseName))) && 
    (item.forgeLevel || 0) >= 5
  );
  return matchEq;
}

function safeLoad() {
  try {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch(e) {}
    if (!raw) return defaultState;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return defaultState;
    const loaded = Object.assign({}, defaultState, p);
    loaded.player   = Object.assign({}, defaultPlayer,  p.player   || {});
    // Force player base attack to always be exactly 10 when loading raw saved states
    loaded.player.atk = 10;
    if (!loaded.player.level) loaded.player.level = 1;
    if (loaded.player.xp === undefined) loaded.player.xp = 0;
    
    // Sanitize and ensure unique structural fields inside loaded inventory items
    const rawInv = p.inventory || [];
    loaded.inventory = rawInv.map((item) => ({
      ...item,
      uid: item.uid || (Date.now() + "_" + Math.random().toString(36).substring(2, 9) + "_" + Math.random().toString(36).substring(2, 9)),
      baseName: item.baseName || item.name,
      forgeLevel: item.forgeLevel || 0,
    }));

    // Ensure unique structural fields inside loaded equipped items
    const rawEq = Object.assign({ weapon:null, accessory:null, aura:null, body_armor:null, paw_gloves:null, tail_enhancements:null, head_gear:null }, p.equipped || {});
    loaded.equipped = { weapon: null, accessory: null, aura: null, body_armor: null, paw_gloves: null, tail_enhancements: null, head_gear: null };
    ["weapon", "accessory", "aura", "body_armor", "paw_gloves", "tail_enhancements", "head_gear"].forEach(slot => {
      const item = rawEq[slot];
      if (item) {
        loaded.equipped[slot] = {
          ...item,
          uid: item.uid || (Date.now() + "_" + Math.random().toString(36).substring(2, 9) + "_" + Math.random().toString(36).substring(2, 9)),
          baseName: item.baseName || item.name,
          forgeLevel: item.forgeLevel || 0,
        };
      }
    });

    loaded.upgrades         = p.upgrades         || {};
    loaded.dailyMouseItems  = p.dailyMouseItems  || [];
    loaded.dailyMappyItems  = p.dailyMappyItems  || [];
    loaded.voidData         = null;
    loaded.battle           = null;
    return loaded;
  } catch(e) {
    console.warn("DreamGuardian: save load failed", e);
    return defaultState;
  }
}

// ── Shared UI ────────────────────────────────────────────────────────
function StatBar({ value, max, color="#8b5cf6" }) {
  const pct = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
  return (
    <div style={{ width:"100%", height:10, background:"rgba(255,255,255,0.1)", borderRadius:999, overflow:"hidden" }}>
      <div style={{ width:pct+"%", height:"100%", background:color, transition:"width 0.3s" }} />
    </div>
  );
}

function Card({ children, style={} }) {
  return (
    <div style={{
      background:"rgba(18,0,40,0.75)", border:"1px solid rgba(139,92,246,0.25)",
      borderRadius:18, padding:16, marginBottom:14, ...style,
    }}>{children}</div>
  );
}

function Btn({ children, onClick, color="#7c3aed", disabled, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "rgba(70,70,70,0.4)" : color,
      border:"none", color: disabled ? "#666" : "white",
      padding: small ? "9px 12px" : "12px 16px",
      minHeight: small ? 40 : 46,
      borderRadius:12, cursor: disabled ? "not-allowed" : "pointer",
      fontWeight:"bold", width:"100%", fontSize: small ? 13 : 15,
      fontFamily:"sans-serif", lineHeight:1.2,
    }}>{children}</button>
  );
}

// ── Scavenge Mini-game ────────────────────────────────────────────────
function ScavengeGame({ luckBonus, onFinish }) {
  const [boxes]    = useState(() => generateScavengeBoxes(luckBonus));
  const [revealed, setRevealed] = useState(Array(10).fill(false));
  const [done, setDone]         = useState(false);
  
  const collectedCoins = boxes.reduce((s, b, i) => s + (revealed[i] && !b.isShard ? b.value : 0), 0);
  const collectedShards = boxes.reduce((s, b, i) => s + (revealed[i] && b.isShard ? b.value : 0), 0);

  function flip(idx) {
    if (revealed[idx] || done) return;
    setRevealed(prev => prev.map((r, i) => i === idx ? true : r));
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, zIndex:1000, fontFamily:"sans-serif" }}>
      <div style={{ width:"100%", maxWidth:480, background:"#0d001f", border:"1px solid rgba(139,92,246,0.4)", borderRadius:24, padding:24 }}>
        <div style={{ fontSize:22, fontWeight:"bold", color:"#ddd6fe", marginBottom:4 }}>🔍 Scavenge Apartment</div>
        <div style={{ fontSize:13, color:"#a78bfa", marginBottom: luckBonus > 0 ? 6 : 18 }}>
          10 spots — each has a random spawn chance. Rarer spots yield bigger rewards.
        </div>
        {luckBonus > 0 && (
          <div style={{ fontSize:11, color:"#6ee7b7", marginBottom:14 }}>✦ Scent Tracker active — spawn rates boosted</div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:16 }}>
          {boxes.map((box, i) => {
            const rs = revealed[i] ? RARITY_STYLE[box.rarity] : null;
            return (
              <button key={i} onClick={() => flip(i)} disabled={revealed[i] || done} style={{
                aspectRatio:"1", borderRadius:14, fontFamily:"sans-serif",
                background: rs ? rs.bg : "rgba(109,40,217,0.22)",
                border:"1px solid " + (rs ? rs.border : "rgba(139,92,246,0.5)"),
                cursor: revealed[i] || done ? "default" : "pointer",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                color: rs ? rs.color : "#c4b5fd", fontSize: revealed[i] ? 12 : 22, padding:4,
                transition:"all 0.2s",
                boxShadow: revealed[i] && box.rarity === "jackpot" ? "0 0 18px rgba(255,215,0,0.6)" : "none",
              }}>
                {revealed[i] ? (
                  box.isShard ? (
                    <>
                      <span style={{ fontSize: 16 }}>💎</span>
                      <span style={{ fontWeight:"bold" }}>{box.value}</span>
                      <span style={{ fontSize:9, opacity:0.8 }}>SHARD</span>
                    </>
                  ) : box.value > 0 ? (
                    <>
                      <span style={{ fontSize: box.rarity === "jackpot" ? 18 : 14 }}>{box.rarity === "jackpot" ? "💵" : "🪙"}</span>
                      <span style={{ fontWeight:"bold" }}>{box.value}</span>
                      {box.rarity !== "common" && box.rarity !== "empty" && (
                        <span style={{ fontSize:9, opacity:0.8 }}>{RARITY_STYLE[box.rarity].label}</span>
                      )}
                    </>
                  ) : <span style={{ fontSize:18, opacity:0.4 }}>✕</span>
                ) : "❓"}
              </button>
            );
          })}
        </div>
        <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:12, padding:"10px 14px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", gap:16 }}>
            <span style={{ color:"#fbbf24", fontWeight:"bold", fontSize:20 }}>🪙 {collectedCoins}</span>
            {collectedShards > 0 && (
              <span style={{ color:"#67e8f9", fontWeight:"bold", fontSize:20 }}>💎 {collectedShards}</span>
            )}
          </div>
          <span style={{ color:"#a78bfa", fontSize:13 }}>collected so far</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Btn color="#4338ca" onClick={() => { setRevealed(Array(10).fill(true)); setDone(true); }} disabled={done}>✨ Reveal All</Btn>
          <Btn color="#166534" onClick={() => onFinish(collectedCoins, collectedShards)}>✓ Collect & Stop</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Battle Overlay ───────────────────────────────────────
function BattleOverlay({ game, totalAtk, totalMaxHp, totalMaxMp, onAttack, onSkill, onFlee, setActiveModalInfo }) {
  const resp = useResponsive();
  const { battle, player, upgrades = {} } = game;
  if (!battle || !battle.enemyQueue) return null;

  const enemy          = battle.enemyQueue[battle.currentIdx];
  const remaining      = battle.enemyQueue.length - battle.currentIdx;
  const totalEnemies   = battle.enemyQueue.length;
  const defeated       = battle.totalDefeated;
  const battleLog      = battle.log || [];
  const isBossFight    = totalEnemies >= 15;

  const unlockedActives  = ALL_ACTIVE_SKILLS.filter(s => (upgrades[s.id] || 0) > 0);
  const unlockedPassives = ALL_PASSIVE_SKILLS.filter(s => (upgrades[s.id] || 0) > 0);
  const fleeWouldKill    = (player.hp - 25) <= 0;

  return (
    <div style={{
      position:"fixed", inset:0,
      background:isBossFight ? "linear-gradient(to bottom, #1a0005, #300010, #1a0005)" : "linear-gradient(to bottom, #03000c, #100020, #03000c)",
      display:"flex", flexDirection:"column",
      padding: resp.isLandscapeMobile ? "8px 10px 10px" : "14px 14px 18px",
      zIndex:1000, fontFamily:"sans-serif", overflowY:"auto", WebkitOverflowScrolling:"touch",
    }}>
      <div className="dg-hdr" style={{ textAlign:"center", marginBottom: resp.isLandscapeMobile ? 6 : 12 }}>
        <div style={{ fontSize:11, letterSpacing:5, color: isBossFight ? "#ef4444" : "#6d28d9" }}>
          {isBossFight ? "⚠️ BOSS ENCOUNTER" : "DREAMSCAPE BATTLE"}
        </div>
        <div style={{ fontSize:19, color:"#ddd6fe", fontWeight:"bold" }}>Night {game.day}</div>
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:6, marginTop:6, flexWrap:"wrap" }}>
          {battle.enemyQueue.map((e, i) => (
            <div key={i} style={{
              width:12, height:12, borderRadius:"50%",
              background: i < defeated ? "#22c55e" : i === battle.currentIdx ? "#fbbf24" : "rgba(255,255,255,0.15)",
              border:"1px solid " + (i === battle.currentIdx ? "#fbbf24" : "transparent"),
            }} title={e.name} />
          ))}
          <span style={{ fontSize:12, color:"#a78bfa", marginLeft:4 }}>
            {defeated}/{totalEnemies} defeated
          </span>
         </div>
      </div>

      <div className="dg-arena" style={{ display:"grid", gridTemplateColumns: resp.isSmall ? "1fr 26px 1fr" : "1fr 50px 1fr", gap: resp.isSmall ? 5 : 8, maxWidth:680, margin:"0 auto", width:"100%", marginBottom: resp.isLandscapeMobile ? 8 : 12 }}>
        {/* Enemy */}
        <div style={{
          background: enemy.isBoss ? "rgba(220,38,38,0.15)" : "rgba(220,38,38,0.07)",
          border:"1px solid " + (enemy.isBoss ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.2)"),
          borderRadius:18, padding:"12px 10px", textAlign:"center",
        }}>
          <div className="dg-char" style={{ fontSize: resp.isLandscapeMobile ? 34 : (enemy.isBoss ? 48 : 52), lineHeight:1, marginBottom:4 }}>{enemy.ico}</div>
          <div style={{ fontWeight:"bold", fontSize:14, color: "#fca5a5", marginBottom:2 }}>
            {enemy.name}
            {enemy.isBoss && <span style={{ fontSize:10, color:"#ef4444", marginLeft:6, letterSpacing:2 }}>BOSS</span>}
          </div>

          {/* Tier (Request 8) */}
          <div style={{ 
            fontSize:12, 
            fontWeight:"bold", 
            color: enemy.isBoss ? "#ef4444" : (enemy.tier === "SR" ? "#fbbf24" : (enemy.tier === "Mutated" ? "#c084fc" : (enemy.tier === "Rare" ? "#60a5fa" : (enemy.tier === "Uncommon" ? "#4ade80" : "#9ca3af")))), 
            marginBottom:6 
          }}>
            Tier: {enemy.isBoss ? "BOSS" : (enemy.tier || "Normal")}
          </div>

          {/* Passives (Request 8) */}
          {enemy.passives && enemy.passives.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, justifyContent:"center", marginBottom:4 }}>
              {enemy.passives.map((p, idx) => (
                <span 
                  key={idx} 
                  onClick={() => setActiveModalInfo && setActiveModalInfo({ name: p.name, desc: p.desc, ico: "🛡️" })}
                  style={{ background:"rgba(244,63,94,0.15)", border:"1px solid rgba(244,63,94,0.3)", color:"#fb7185", fontSize:9, padding:"2px 6px", borderRadius:6, cursor:"pointer" }} 
                  title="Click to view details"
                >
                  🛡️ {p.name}
                </span>
              ))}
            </div>
          )}

          {/* Skills (Request 8) */}
          {enemy.skills && enemy.skills.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, justifyContent:"center", marginBottom:8 }}>
              {enemy.skills.map((s, idx) => (
                <span 
                  key={idx} 
                  onClick={() => setActiveModalInfo && setActiveModalInfo({ name: s.name, desc: s.desc, ico: "⚡" })}
                  style={{ background:"rgba(59,130,246,0.15)", border:"1px solid rgba(59,130,246,0.3)", color:"#60a5fa", fontSize:9, padding:"2px 6px", borderRadius:6, cursor:"pointer" }} 
                  title="Click to view details"
                >
                  ⚡ {s.name}
                </span>
              ))}
            </div>
          )}

          {enemy.debuffAtk && enemy.debuffAtk > 0 ? (
            <div 
              onClick={() => setActiveModalInfo && setActiveModalInfo({ name: "ATK Debuff", desc: `Enemy's damage is reduced by ${enemy.debuffAtk} for ${enemy.debuffTurns} turns.`, ico: "↓ ATK" })}
              style={{ fontSize:11, color:"#fb923c", marginBottom:5, padding:"1px 7px", background:"rgba(251,146,60,0.12)", borderRadius:8, display:"inline-block", cursor:"pointer" }}
              title="Click to view details"
            >
              ↓ ATK -{enemy.debuffAtk} ({enemy.debuffTurns}t)
            </div>
          ) : null}
          <div style={{ fontSize:11, color:"#fca5a5", marginBottom:4 }}>❤️ {Math.max(0,enemy.hp)} / {enemy.maxHp}</div>
          <StatBar value={Math.max(0,enemy.hp)} max={enemy.maxHp} color={enemy.isBoss ? "#dc2626" : "#ef4444"} />
          {remaining > 1 && (
            <div style={{ fontSize:10, color:"#6d28d9", marginTop:6 }}>+{remaining-1} more waiting</div>
          )}
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>
          <span style={{ fontSize:17, color:"#581c87", fontWeight:"bold" }}>VS</span>
        </div>

        {/* Luna */}
        <div style={{ background:"rgba(109,40,217,0.08)", border:"1px solid rgba(139,92,246,0.25)", borderRadius:18, padding:"12px 10px", textAlign:"center" }}>
          <div className="dg-char" style={{ fontSize: resp.isLandscapeMobile ? 34 : 52, lineHeight:1, marginBottom:4 }}>🐱</div>
          <div style={{ fontWeight:"bold", fontSize:14, color:"#c4b5fd", marginBottom:6 }}>Luna (Lvl {player.level || 1})</div>
          {battle.dodgeActive && (
            <div style={{ fontSize:11, color:"#a78bfa", marginBottom:5, padding:"1px 7px", background:"rgba(139,92,246,0.15)", borderRadius:8, display:"inline-block" }}>⚡ Dodge Ready</div>
          )}
          {/* HP Reflection Fix (Request 2) */}
          <div style={{ fontSize:11, color:"#fca5a5", marginBottom:4 }}>❤️ {player.hp} / {totalMaxHp}</div>
          <StatBar value={player.hp} max={totalMaxHp} color="#ef4444" />
          <div style={{ fontSize:11, color:"#a78bfa", margin:"7px 0 4px" }}>🔮 {player.mp} / {totalMaxMp}</div>
          <StatBar value={player.mp} max={totalMaxMp} color="#8b5cf6" />
        </div>
      </div>

      {battleLog.length > 0 && (
        <div style={{ maxWidth:680, margin:"0 auto", width:"100%", marginBottom:10, background:"rgba(0,0,0,0.45)", borderRadius:12, padding:"7px 12px" }}>
          {battleLog.slice(0, 4).map((entry, i) => (
            <div key={i} style={{ fontSize:12, color:"#ddd6fe", padding:"2px 0", opacity: i === 0 ? 1 : Math.max(0.2, 0.6 - i * 0.15) }}>{entry}</div>
          ))}
        </div>
      )}

      <div style={{ maxWidth:680, margin:"0 auto", width:"100%" }}>
        <div style={{ marginBottom:9 }}>
          <Btn color="#b91c1c" onClick={onAttack}>⚔️ Attack  (ATK {totalAtk})</Btn>
        </div>

        {unlockedActives.length > 0 && (
          <>
            <div style={{ fontSize:11, color:"#6d28d9", letterSpacing:2, marginBottom:5 }}>ACTIVE SKILLS</div>
            <div className="dg-skills" style={{ display:"grid", gridTemplateColumns: resp.isSmall ? "1fr" : "1fr 1fr", gap:7, marginBottom:10 }}>
              {unlockedActives.map(skill => {
                const canUse = player.mp >= (skill.mpCost || 0);
                return (
                  <button key={skill.id} onClick={() => canUse && onSkill(skill)} disabled={!canUse} style={{
                    background: canUse ? "rgba(91,33,182,0.25)" : "rgba(50,50,50,0.18)",
                    border:"1px solid " + (canUse ? "rgba(139,92,246,0.45)" : "rgba(255,255,255,0.06)"),
                    borderRadius:11, padding:"9px 11px",
                    color: canUse ? "#ddd6fe" : "#555",
                    cursor: canUse ? "pointer" : "not-allowed",
                    textAlign:"left", fontFamily:"sans-serif",
                  }}>
                    <div style={{ fontWeight:"bold", fontSize:13, marginBottom:2 }}>{skill.name}</div>
                    <div style={{ fontSize:11, display:"flex", gap:6, alignItems:"center" }}>
                      <span style={{ background: canUse ? "rgba(139,92,246,0.3)" : "rgba(80,80,80,0.3)", padding:"1px 7px", borderRadius:8, color: canUse ? "#a78bfa" : "#555" }}>
                        🔮 {skill.mpCost} MP
                      </span>
                      <span style={{ color:"#fde68a", fontSize:10 }}>Lv.{upgrades[skill.id]}</span>
                    </div>
                    <div style={{ fontSize:11, marginTop:3, color: canUse ? "#9ca3af" : "#444" }}>{skill.desc}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {unlockedPassives.length > 0 && (
          <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(139,92,246,0.12)", borderRadius:11, padding:"9px 13px", marginBottom:9 }}>
            <div style={{ fontSize:11, color:"#6d28d9", letterSpacing:2, marginBottom:5 }}>PASSIVES ACTIVE</div>
            {unlockedPassives.map(s => (
              <div 
                key={s.id} 
                onClick={() => setActiveModalInfo && setActiveModalInfo({ name: s.name, desc: s.desc, ico: "✦" })}
                style={{ fontSize:12, color:"#7c3aed", padding:"2px 0", cursor:"pointer" }}
                title="Click to view details"
              >
                ✦ {s.name} (Lv.{upgrades[s.id]}) — {s.desc}
              </div>
            ))}
          </div>
        )}

        {unlockedActives.length === 0 && (
          <div style={{ fontSize:12, color:"#4b5563", textAlign:"center", padding:"8px 0", marginBottom:9 }}>
            No skills unlocked yet — visit the Upgrade Tree between nights.
          </div>
        )}

        <button onClick={onFlee} style={{
          background:"rgba(55,65,81,0.55)", border:"1px solid rgba(107,114,128,0.3)",
          color:"#9ca3af", padding:"10px 14px", borderRadius:11,
          cursor:"pointer", fontWeight:"bold", width:"100%", fontSize:14,
          fontFamily:"sans-serif", textAlign:"left",
        }}>
          <div>🏃 Flee Battle — return to Dreamscape Void</div>
          <div style={{ fontSize:11, color: fleeWouldKill ? "#ef4444" : "#6b7280", marginTop:2 }}>
            No immediate HP penalty. Enemies remain in the Void.
          </div>
        </button>
      </div>
    </div>
  );
}

// ── Void Screen ───────────────────────────────────────────
function VoidScreen({ 
  game, totalMaxHp, totalMaxMp, onReenter, onFleeNight, onSleepMorning, 
  buyItem, useItem, equipItem, unequipItem, hasMaxForgedItem 
}) {
  const resp = useResponsive();
  const [activeTab, setActiveTab] = React.useState("shops"); // "shops" or "bag"
  const [shopTab, setShopTab] = React.useState("mouse"); // "mouse" or "mappy"

  const { voidData, player, dailyMouseItems = [], dailyMappyItems = [], inventory = [], equipped = {} } = game;
  if (!voidData) return null;
  const remaining    = (voidData.remainingQueue && voidData.remainingQueue.length) || 0;
  const moodPenalty  = remaining * 15;
  const fleeHpPenalty = Math.min(player.hp - 1, 25);

  const mappyAvail = game.mappyAvailable;

  const invConsumables = inventory.filter(i => i.type === "consumable");
  const invEquips = inventory.filter(i => i.type === "equipment");

  return (
    <div style={{
      position:"fixed", inset:0,
      background:"linear-gradient(to bottom, #03000c, #0a0018, #03000c)",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"flex-start",
      padding: resp.isLandscapeMobile ? "10px 16px 16px" : 16,
      zIndex:1000, fontFamily:"sans-serif", overflowY:"auto", WebkitOverflowScrolling:"touch",
    }}>
      <div style={{ width:"100%", maxWidth:560 }}>
        <div style={{ textAlign:"center", marginBottom:12 }}>
          <div style={{ fontSize:11, letterSpacing:5, color:"#a78bfa", marginBottom:4 }}>DREAMSCAPE VOID</div>
          <div className="dg-char" style={{ fontSize: resp.isLandscapeMobile ? 28 : 42, lineHeight:1 }}>🐱</div>
          <div style={{ fontSize:17, fontWeight:"bold", color:"#c4b5fd", marginTop:4 }}>Luna rests in the Dreamscape Void...</div>
          <div style={{ fontSize:12, color:"#8b5cf6", marginTop:2 }}>
            {remaining} nightmare{remaining !== 1 ? "s" : ""} still lurking.
          </div>
        </div>

        {/* HP and MP Stats in Void (Request 2) */}
        <div style={{ background:"rgba(109,40,217,0.08)", border:"1px solid rgba(139,92,246,0.2)", borderRadius:16, padding:12, marginBottom:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <div style={{ fontSize:11, color:"#fca5a5", marginBottom:4 }}>❤️ HP {player.hp} / {totalMaxHp}</div>
              <StatBar value={player.hp} max={totalMaxHp} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize:11, color:"#c4b5fd", marginBottom:4 }}>🔮 MP {player.mp} / {totalMaxMp}</div>
              <StatBar value={player.mp} max={totalMaxMp} color="#8b5cf6" />
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:12 }}>
            <span style={{ color:"#fde68a" }}>🪙 {player.coins} Coins</span>
            <span style={{ color:"#a78bfa" }}>💎 {player.shards || 0} Shards</span>
          </div>
        </div>

        {/* Tabs for Void Screen */}
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <button onClick={() => setActiveTab("shops")} style={{
            flex:1, padding:"10px", borderRadius:10, border:"none", fontFamily:"sans-serif", fontWeight:"bold", fontSize:13,
            background: activeTab === "shops" ? "#6d28d9" : "rgba(255,255,255,0.04)",
            color: activeTab === "shops" ? "white" : "#a78bfa", cursor:"pointer",
          }}>🛒 Void Merchants</button>
          
          <button onClick={() => setActiveTab("bag")} style={{
            flex:1, padding:"10px", borderRadius:10, border:"none", fontFamily:"sans-serif", fontWeight:"bold", fontSize:13,
            background: activeTab === "bag" ? "#155e75" : "rgba(255,255,255,0.04)",
            color: activeTab === "bag" ? "white" : "#06b6d4", cursor:"pointer",
          }}>🎒 Bag & Gear ({inventory.length})</button>
        </div>

        {activeTab === "shops" && (
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(139,92,246,0.15)", borderRadius:16, padding:12, marginBottom:12 }}>
            {/* Merchant Sub Tabs */}
            <div style={{ display:"flex", gap:6, marginBottom:10 }}>
              <button onClick={() => setShopTab("mouse")} style={{
                flex:1, padding:"8px", borderRadius:8, border:"none", fontFamily:"sans-serif", fontSize:12, fontWeight:"bold",
                background: shopTab === "mouse" ? "#4338ca" : "rgba(255,255,255,0.03)",
                color: shopTab === "mouse" ? "white" : "#9ca3af", cursor:"pointer"
              }}>🐭 The Mouse</button>
              
              <button 
                onClick={() => mappyAvail && setShopTab("mappy")} 
                disabled={!mappyAvail}
                style={{
                  flex:1, padding:"8px", borderRadius:8, border:"none", fontFamily:"sans-serif", fontSize:12, fontWeight:"bold",
                  background: !mappyAvail ? "rgba(50,50,50,0.15)" : (shopTab === "mappy" ? "#b45309" : "rgba(255,255,255,0.03)"),
                  color: !mappyAvail ? "#444" : (shopTab === "mappy" ? "white" : "#9ca3af"), 
                  cursor: mappyAvail ? "pointer" : "not-allowed"
                }}
              >
                🐦 Mappy {!mappyAvail && (game.day < 6 ? "(Day 6+)" : "(Low Mood)")}
              </button>
            </div>

            {shopTab === "mouse" ? (
              <div style={{ display:"grid", gap:8 }}>
                {dailyMouseItems.length === 0 ? (
                  <div style={{ textAlign:"center", fontSize:12, color:"#9ca3af", padding:"10px 0" }}>Mouse has nothing in stock today.</div>
                ) : (
                  dailyMouseItems.map((item, i) => {
                    const isMaxed = hasMaxForgedItem(game, item.id, item.baseName || item.name);
                    const stock = item.stock !== undefined ? item.stock : 1;
                    const isSoldOut = stock <= 0;
                    const canAfford = player.coins >= item.price;

                    let btnText = `🪙 ${item.price}`;
                    let btnDisabled = false;
                    let btnBg = "#166534";

                    if (isMaxed) {
                      btnText = "5★ Owned";
                      btnDisabled = true;
                      btnBg = "rgba(70,70,70,0.4)";
                    } else if (isSoldOut) {
                      btnText = "Sold Out";
                      btnDisabled = true;
                      btnBg = "rgba(70,70,70,0.4)";
                    } else if (!canAfford) {
                      btnDisabled = true;
                      btnBg = "rgba(70,70,70,0.4)";
                    }

                    return (
                      <div key={i} style={{ background:"rgba(255,255,255,0.03)", padding:10, borderRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, opacity: isSoldOut ? 0.6 : 1 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight:"bold", fontSize:13, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                            <span>{item.ico} {item.name}</span>
                            {item.slot && (
                              <span style={{ fontSize:9, background:"rgba(167,139,250,0.15)", color:"#c4b5fd", padding:"1px 6px", borderRadius:4, fontWeight:"bold" }}>
                                {slotDisplayName(item.slot)}
                              </span>
                            )}
                            <span style={{ fontSize:10, color:"#a78bfa" }}>({isSoldOut ? "Out of Stock" : `Stock: ${stock}`})</span>
                          </div>
                          <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>{item.desc}</div>
                        </div>
                        <div style={{ minWidth:95 }}>
                          <button 
                            onClick={() => buyItem(item, "mouse")} 
                            disabled={btnDisabled}
                            style={{
                              background: btnBg, border:"none", color: btnDisabled ? "#777" : "white",
                              padding:"6px 10px", borderRadius:8, cursor: btnDisabled ? "not-allowed" : "pointer",
                              fontWeight:"bold", fontSize:12, width:"100%", fontFamily:"sans-serif"
                            }}
                          >
                            {btnText}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div style={{ display:"grid", gap:8 }}>
                {dailyMappyItems.length === 0 ? (
                  <div style={{ textAlign:"center", fontSize:12, color:"#9ca3af", padding:"10px 0" }}>Mappy has nothing in stock today.</div>
                ) : (
                  dailyMappyItems.map((item, i) => {
                    const isMaxed = hasMaxForgedItem(game, item.id, item.baseName || item.name);
                    const stock = item.stock !== undefined ? item.stock : 1;
                    const isSoldOut = stock <= 0;
                    const canAfford = player.coins >= item.price;

                    let btnText = `🪙 ${item.price}`;
                    let btnDisabled = false;
                    let btnBg = "#b45309";

                    if (isMaxed) {
                      btnText = "5★ Owned";
                      btnDisabled = true;
                      btnBg = "rgba(70,70,70,0.4)";
                    } else if (isSoldOut) {
                      btnText = "Sold Out";
                      btnDisabled = true;
                      btnBg = "rgba(70,70,70,0.4)";
                    } else if (!canAfford) {
                      btnDisabled = true;
                      btnBg = "rgba(70,70,70,0.4)";
                    }

                    return (
                      <div key={i} style={{ background:"rgba(180,83,9,0.05)", border:"1px solid rgba(180,83,9,0.15)", padding:10, borderRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, opacity: isSoldOut ? 0.6 : 1 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight:"bold", fontSize:13, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                            <span>{item.ico} {item.name}</span>
                            {item.slot && (
                              <span style={{ fontSize:9, background:"rgba(245,158,11,0.15)", color:"#f59e0b", padding:"1px 6px", borderRadius:4, fontWeight:"bold" }}>
                                {slotDisplayName(item.slot)}
                              </span>
                            )}
                            <span style={{ fontSize:10, color:"#f59e0b" }}>({isSoldOut ? "Out of Stock" : `Stock: ${stock}`})</span>
                          </div>
                          <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>{item.desc}</div>
                        </div>
                        <div style={{ minWidth:95 }}>
                          <button 
                            onClick={() => buyItem(item, "mappy")} 
                            disabled={btnDisabled}
                            style={{
                              background: btnBg, border:"none", color: btnDisabled ? "#777" : "white",
                              padding:"6px 10px", borderRadius:8, cursor: btnDisabled ? "not-allowed" : "pointer",
                              fontWeight:"bold", fontSize:12, width:"100%", fontFamily:"sans-serif"
                            }}
                          >
                            {btnText}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "bag" && (
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(20,184,166,0.2)", borderRadius:16, padding:12, marginBottom:12 }}>
            {/* Equipped Items Area */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, color:"#06b6d4", fontWeight:"bold", marginBottom:6 }}>🛡️ Equipped Gear</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(110px, 1fr))", gap:6 }}>
                {["weapon", "accessory", "aura", "body_armor", "paw_gloves", "tail_enhancements", "head_gear"].map(slot => {
                  const gear = equipped[slot];
                  return (
                    <div key={slot} style={{ background:"rgba(0,0,0,0.3)", padding:6, borderRadius:10, textAlign:"center", border:"1px solid rgba(6,182,212,0.1)" }}>
                      <div style={{ fontSize:9, color:"#a78bfa", textTransform:"uppercase", marginBottom:4, fontWeight:"bold" }}>{slot.replace("_", " ")}</div>
                      {gear ? (
                        <div>
                          <div style={{ fontSize:10, fontWeight:"bold", overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" }}>{gear.ico} {itemDisplayName(gear)}</div>
                          <button 
                            onClick={() => unequipItem(slot, gear)}
                            style={{ background:"rgba(220,38,38,0.25)", border:"none", color:"#fca5a5", padding:"2px 6px", borderRadius:6, fontSize:9, marginTop:4, cursor:"pointer" }}
                          >Unequip</button>
                        </div>
                      ) : (
                        <div style={{ fontSize:10, opacity:0.3, padding:"4px 0" }}>Empty</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Consumables List */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#5eead4", fontWeight:"bold", marginBottom:6 }}>🧪 Consumables</div>
              {invConsumables.length === 0 ? (
                <div style={{ fontSize:11, opacity:0.4, padding:"4px 0" }}>No consumables in hand.</div>
              ) : (
                <div style={{ display:"grid", gap:5 }}>
                  {invConsumables.map((item) => (
                    <div key={item.uid} style={{ background:"rgba(255,255,255,0.03)", padding:8, borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <span style={{ fontWeight:"bold", fontSize:12 }}>{item.ico} {itemDisplayName(item)}</span>
                        <span style={{ fontSize:10, color:"#5eead4", marginLeft:6 }}>({item.desc})</span>
                      </div>
                      <button 
                        onClick={() => useItem(item)}
                        style={{ background:"#0f766e", border:"none", color:"white", padding:"4px 8px", borderRadius:6, fontSize:11, cursor:"pointer" }}
                      >Use</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Equipable Gear List */}
            <div>
              <div style={{ fontSize:12, color:"#a5f3fc", fontWeight:"bold", marginBottom:6 }}>⚔️ Unequipped Gear</div>
              {invEquips.length === 0 ? (
                <div style={{ fontSize:11, opacity:0.4, padding:"4px 0" }}>No unequipped gear in hand.</div>
              ) : (
                <div style={{ display:"grid", gap:5 }}>
                  {invEquips.map((item) => (
                    <div key={item.uid} style={{ background:"rgba(255,255,255,0.03)", padding:8, borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          <span style={{ fontWeight:"bold", fontSize:12 }}>{item.ico} {itemDisplayName(item)}</span>
                          {item.slot && (
                            <span style={{ fontSize:9, background:"rgba(167,139,250,0.15)", color:"#c4b5fd", padding:"1px 6px", borderRadius:4, fontWeight:"bold" }}>
                              {slotDisplayName(item.slot)}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:10, color:"#9ca3af", marginTop:2 }}>{item.desc}</div>
                      </div>
                      <button 
                        onClick={() => equipItem(item)}
                        style={{ background:"#0891b2", border:"none", color:"white", padding:"4px 8px", borderRadius:6, fontSize:11, cursor:"pointer", alignSelf:"center" }}
                      >Equip</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display:"grid", gap:9 }}>
          {remaining > 0 && (
            <button onClick={onReenter} style={{
              background:"rgba(109,40,217,0.3)", border:"1px solid rgba(139,92,246,0.5)",
              color:"#c4b5fd", padding:"13px 16px", borderRadius:13,
              cursor:"pointer", fontWeight:"bold", width:"100%", fontFamily:"sans-serif", textAlign:"left",
            }}>
              <div>✨ Re-enter Dreamscape</div>
              <div style={{ fontSize:11, color:"#7c3aed", marginTop:2 }}>Continue fighting {remaining} remaining enemy{remaining !== 1 ? "s" : ""}.</div>
            </button>
          )}

          <button onClick={onFleeNight} style={{
            background:"rgba(55,65,81,0.5)", border:"1px solid rgba(107,114,128,0.3)",
            color:"#9ca3af", padding:"13px 16px", borderRadius:13,
            cursor:"pointer", fontWeight:"bold", width:"100%", fontFamily:"sans-serif", textAlign:"left",
          }}>
            <div>🚪 Flee the Night</div>
            <div style={{ fontSize:11, color:"#ef4444", marginTop:2 }}>-{fleeHpPenalty} HP penalty. Stay in night phase.</div>
          </button>

          <button onClick={onSleepMorning} style={{
            background:"rgba(15,118,110,0.3)", border:"1px solid rgba(20,184,166,0.3)",
            color:"#5eead4", padding:"13px 16px", borderRadius:13,
            cursor:"pointer", fontWeight:"bold", width:"100%", fontFamily:"sans-serif", textAlign:"left",
          }}>
            <div>☀️ Sleep Until Morning</div>
            <div style={{ fontSize:11, color: remaining > 0 ? "#ef4444" : "#6d28d9", marginTop:2 }}>
              {remaining > 0
                ? `-${moodPenalty} Mood (15 x ${remaining} enemies not defeated).`
                : "HP fully restored in the morning."}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skill Tree Modal ──────────────────────────────────────────────────
function SkillTreeModal({ game, onClose, onUpgrade, currentTier, showBond }) {
  const [tab, setTab] = useState("feral");
  const skills = SKILL_TREE[tab];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", overflowY:"auto", padding:20, zIndex:1000, fontFamily:"sans-serif" }}>
      <div style={{ maxWidth:680, margin:"0 auto", background:"#0d001f", border:"1px solid rgba(139,92,246,0.35)", borderRadius:24, padding:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div style={{ fontSize:24, fontWeight:"bold", color:"#ddd6fe" }}>✨ Luna Upgrade Tree</div>
          <div style={{ color:"#fbbf24", fontSize:15, fontWeight:"bold" }}>💎 {game.player.shards || 0} Shards</div>
        </div>
        <div style={{ display:"flex", gap:10, marginBottom:20 }}>
          {[["feral","🐺 Feral Form","#b45309"],["hybrid","🌙 Hybrid Form","#6d28d9"]].map(([key,label,bg]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex:1, padding:"11px", borderRadius:12, border:"none",
              fontWeight:"bold", fontFamily:"sans-serif",
              background: tab === key ? bg : "rgba(255,255,255,0.05)",
              color: tab === key ? "white" : "#a78bfa", cursor:"pointer",
            }}>{label}</button>
          ))}
        </div>
        <div style={{ display:"grid", gap:10, marginBottom:20 }}>
          {skills.map(skill => {
            const lv = (game.upgrades && game.upgrades[skill.id]) || 0;
            const { price, power } = getSkillStats(skill.baseValue, lv);
            const nextPower = Math.floor(skill.baseValue * Math.pow(1.8, lv + 1));
            const canAfford = (game.player.shards || 0) >= price;
            return (
              <div key={skill.id} style={{ background:"rgba(255,255,255,0.04)", borderRadius:14, padding:14, border:"1px solid rgba(139,92,246,0.12)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:5 }}>
                      <span style={{ fontWeight:"bold", fontSize:15, color:"#ddd6fe" }}>{skill.name}</span>
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:999, letterSpacing:1, background: skill.type === "Active" ? "rgba(59,130,246,0.2)" : "rgba(16,185,129,0.2)", color: skill.type === "Active" ? "#93c5fd" : "#6ee7b7" }}>{skill.type.toUpperCase()}</span>
                      {lv > 0 && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:999, letterSpacing:1, background:"rgba(250,204,21,0.18)", color:"#fde68a" }}>LV.{lv}</span>}
                    </div>
                    <div style={{ fontSize:12, color:"#a78bfa", marginBottom:6 }}>{skill.desc}</div>
                    {skill.type === "Active" && <div style={{ fontSize:11, color:"#818cf8", marginBottom:4 }}>🔮 MP Cost: {skill.mpCost}</div>}
                    <div style={{ fontSize:11, color:"#6b7280" }}>
                      {skill.stat}: {lv === 0 ? <span>Locked — Lv.1 value: {nextPower}</span> : <span style={{ color:"#c4b5fd" }}>{power} → {nextPower} next</span>}
                    </div>
                  </div>
                  <div style={{ minWidth:110, textAlign:"center" }}>
                    <button onClick={() => onUpgrade(skill.id, price)} disabled={!canAfford} style={{
                      background: canAfford ? "#7c3aed" : "rgba(60,60,60,0.4)",
                      border:"1px solid " + (canAfford ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.06)"),
                      color: canAfford ? "white" : "#555",
                      padding:"10px 12px", borderRadius:12, cursor: canAfford ? "pointer" : "not-allowed",
                      width:"100%", fontFamily:"sans-serif",
                    }}>
                      <div style={{ fontWeight:"bold", fontSize:14 }}>💎 {price}</div>
                      <div style={{ fontSize:11, marginTop:2, color: canAfford ? "#c4b5fd" : "#555" }}>{lv === 0 ? "Unlock" : "→ Lv." + (lv+1)}</div>
                    </button>
                    {!canAfford && <div style={{ fontSize:10, color:"#ef4444", marginTop:4 }}>Need {price-(game.player.shards||0)} more</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:12, padding:12, marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ color:currentTier.color, fontWeight:"bold", fontSize:13 }}>{currentTier.label}</span>
            <span style={{ fontSize:12, color:"#a78bfa" }}>{game.mood} / 1500</span>
          </div>
          <StatBar value={game.mood} max={1500} color={currentTier.color} />
          {showBond && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:12, color:"#f472b6", marginBottom:4 }}>💖 Bond: {game.bond} / 200</div>
              <StatBar value={game.bond} max={200} color="#f472b6" />
            </div>
          )}
        </div>
        <Btn color="#7c3aed" onClick={onClose}>Close</Btn>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
export default function DreamGuardian() {
  const resp = useResponsive();
  const [game, setGame]                 = useState(safeLoad);
  const [activeModalInfo, setActiveModalInfo] = useState(null);
  const [showIntro, setShowIntro]       = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showUpgrade, setShowUpgrade]   = useState(false);
  const [showScavenge, setShowScavenge] = useState(false);
  const [showBond, setShowBond]         = useState(true);
  const [musicVol, setMusicVol]         = useState(0.5);
  const [merchantTab, setMerchantTab]   = useState("mouse");
  const [invOpen, setInvOpen]           = useState(false);
  const [eqOpen, setEqOpen]             = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); } catch(e) {}
    }, 600);
    return () => clearTimeout(t);
  }, [game]);

  const equippedStats = useMemo(() => {
    return Object.values(game.equipped)
      .filter((item) => !!item)
      .reduce((acc, item) => {
        if (item.effect) {
          Object.entries(item.effect).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
        }
        return acc;
      }, {});
  }, [game.equipped]);

  const totalAtk   = game.player.atk   + (equippedStats.atk   || 0) + (game.upgrades && game.upgrades.f1 ? getSkillStats(5, game.upgrades.f1).power : 0);
  const totalMaxMp = game.player.maxMp  + (equippedStats.maxMp || 0) + (game.upgrades && game.upgrades.h8 ? getSkillStats(25, game.upgrades.h8).power : 0);
  const totalMaxHp = game.player.maxHp  + (equippedStats.maxHp || 0);
  const currentTier = useMemo(() => getMoodDetails(game.mood), [game.mood]);

  const luckBonus = useMemo(() => {
    const lv = (game.upgrades && game.upgrades.f9) || 0;
    return lv > 0 ? getSkillStats(15, lv).power : 0;
  }, [game.upgrades]);

  const unlockedSkillCount = Object.keys(game.upgrades || {}).length;

  // ── Smart Forging Logic ────────────────────────────────────────────
  const allOwnedItems = useMemo(() => {
    const items = [];
    game.inventory.forEach(item => {
      items.push({ ...item, isEquipped: false, slotName: null });
    });
    Object.entries(game.equipped).forEach(([slot, item]) => {
      if (item) {
        items.push({ ...item, isEquipped: true, slotName: slot });
      }
    });
    return items;
  }, [game.inventory, game.equipped]);

  const forgeGroups = useMemo(() => {
    const groups = {};
    allOwnedItems.forEach(item => {
      const ident = item.id || item.baseName || item.name;
      const key = ident + "_fl" + (item.forgeLevel || 0);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    const pairs = Object.values(groups).filter(g => g.length >= 2);
    return {
      forgeable:   pairs.filter(g => (g[0].forgeLevel || 0) < 5),
      ascendable:  pairs.filter(g => (g[0].forgeLevel || 0) >= 5),
    };
  }, [allOwnedItems]);

  const mergeableGroups  = forgeGroups.forgeable;
  const ascendableGroups = forgeGroups.ascendable;

  const ascendableSingleItems = useMemo(() => {
    return allOwnedItems.filter(item => (item.forgeLevel || 0) >= 5 && item.type === "equipment");
  }, [allOwnedItems]);

  const psycheCount = useMemo(() => {
    return game.inventory.filter(i => i.id === "psyche").length;
  }, [game.inventory]);

  function notify(msg) {
    setGame(g => ({ ...g, toast: msg }));
    setTimeout(() => setGame(g => ({ ...g, toast: "" })), 7800);
  }

  // ── Day actions ──
  function talkToAlex() {
    if (game.talkedToday) { notify("You've already talked to Alex today."); return; }
    const isAwesome = game.mood > 1000;
    
    // Bond chance mechanic:
    // If Awesome: Always exactly +3 bond gain (no secret additions/bonuses)
    // If Stressed: 30% chance to trigger friction deducting 1-3 bond points from the base +4 gain
    const rollChance = Math.random() < 0.30;
    const triggerDeduction = !isAwesome && rollChance;
    const deductionAmount = triggerDeduction ? Math.floor(Math.random() * 3) + 1 : 0;

    setGame(g => {
      const awesome = g.mood > 1000;
      const baseBondGain = awesome ? 3 : 4;
      let totalGain = baseBondGain;
      if (triggerDeduction) {
        totalGain = Math.max(1, totalGain - deductionAmount);
      }
      const nextBond = Math.min(200, g.bond + totalGain);
      return {
        ...g, talkedToday: true,
        bond: nextBond,
      };
    });

    if (isAwesome) {
      notify("Alex smiled warmly! Bond increased (+3) ✨");
    } else {
      if (triggerDeduction) {
        notify(`Alex is extremely stressed... Friction reduced bond gain by ${deductionAmount} (Gained +${4 - deductionAmount}) 💔`);
      } else {
        notify("Spent some quiet time talking with Alex. Bond grew (+4).");
      }
    }
  }

  function onScavengeFinish(coins, shards = 0) {
    setShowScavenge(false);
    setGame(g => ({
      ...g, scavengedToday: true,
      player: { 
        ...g.player, 
        coins: g.player.coins + coins,
        shards: (g.player.shards || 0) + shards
      },
    }));
    let msg = "";
    if (coins > 0) msg += `Luna collected ${coins} coins! 🪙 `;
    if (shards > 0) msg += `Luna found ${shards} Dream Shard! 💎 `;
    if (!msg) msg = "Nothing found this time...";
    notify(msg.trim());
  }

  function alexGoesToWork() {
    const mouseShuffled = [...MOUSE_ITEMS_POOL].sort(() => Math.random() - 0.5);
    const dailyMouse = mouseShuffled.slice(0, 3).map(item => ({
      ...item,
      stock: item.type === "consumable" ? (Math.floor(Math.random() * 5) + 3) : 1
    }));
    const mappyDay  = game.day >= 6;
    const mappyMood = game.mood > 500;
    let dailyMappy = [];
    let mappyAvail = false;
    if (mappyDay && mappyMood) {
      const mappyShuffled = [...MAPPY_ITEMS_POOL].sort(() => Math.random() - 0.5);
      dailyMappy = mappyShuffled.slice(0, 5).map(item => ({
        ...item,
        stock: item.type === "consumable" ? (Math.floor(Math.random() * 5) + 3) : 1
      }));
      mappyAvail = true;
    }

    setGame(g => ({
      ...g, alexWorking: true,
      dailyMouseItems: dailyMouse,
      dailyMappyItems: dailyMappy,
      mappyAvailable: mappyAvail,
    }));

    if (mappyAvail) {
      notify("Alex went to work! 🐭 The Mouse & 🐦 Mappy are open!");
    } else {
      notify(mappyDay
        ? "Alex went to work! 🐭 The Mouse is open. (Mappy needs mood ≥ Tier 2)"
        : "Alex went to work! 🐭 The Mouse is open. (Mappy unlocks Day 6+)");
    }
  }

  function transitionToNight() {
    setGame(g => ({ ...g, phase: "night", alexWorking: false }));
    notify("Night falls across the apartment 🌙");
  }

  // ── Battle ──
  function enterDreamscape() {
    const count = getEnemyCount(game.day, totalAtk, unlockedSkillCount);
    const queue = generateEnemyQueue(count, game.day);
    
    // Form trigger probability calculation
    const isBossFight = count >= 15;
    const hasRem = queue.some(e => e.id === "rem");
    
    let forceHybrid = false;
    let hybridExplain = "";
    const bPlayed = (game.totalBattlesCount || 0) + 1;

    if (hasRem) {
      forceHybrid = true;
      hybridExplain = "Encountering the legendary REM Boss has jolted Luna's neural pathways, instantly awakening her celestial HYBRID Form! Claws gleaming, stats surging!";
    } else if (isBossFight) {
      if (Math.random() < 0.75) {
        forceHybrid = true;
        hybridExplain = "Sensing a colossal nightmare tyrant's presence, Luna channels her deep bond with Alex and unleashes her breathtaking HYBRID Form! (75% Chance)";
      }
    } else {
      if (bPlayed >= 4 && Math.random() < 0.50) {
        forceHybrid = true;
        hybridExplain = "After enduring numerous intense nightmare battles, Luna has unlocked her legendary upright HYBRID Form! Glowing with radiant amethyst starlight!";
      }
    }

    if (forceHybrid) {
      setActiveModalInfo({
        ico: "🔮",
        name: "HYBRID Form Awakened!",
        desc: hybridExplain
      });
    }

    setGame(g => ({
      ...g,
      totalBattlesCount: bPlayed,
      battle: {
        enemyQueue: queue,
        currentIdx: 0,
        totalDefeated: 0,
        log: [
          count + " nightmare" + (count>1?"s":"") + " emerged from the fog!",
          forceHybrid ? "Luna transformed into her mighty Hybrid Form!" : "Luna stands in her feral guardian stance."
        ],
        dodgeActive: false,
        startTime: Date.now(),
        currentForm: forceHybrid ? "hybrid" : "feral",
      },
      voidData: null,
    }));
  }

  function resolveEnemyCounter(battleState, playerState, extraLog) {
    const enemy = battleState.enemyQueue[battleState.currentIdx];
    const effectiveAtk = Math.max(1, enemy.atk - (enemy.debuffAtk || 0));
    
    // f3 (Adrenaline Purr) gives passive dodge chance
    let spdPower = (game.upgrades && game.upgrades.f3) ? getSkillStats(3, game.upgrades.f3).power : 0;
    
    // REM dodge reduction
    let remPenalty = 0;
    if (enemy.id === "rem") {
      remPenalty = enemy.dodgeLowered ? 35 : 15;
    }
    spdPower = Math.max(0, spdPower - remPenalty);

    // active dodge (skip enemy) guarantees dodge, otherwise roll speed
    const isDodged = battleState.dodgeActive || (spdPower > 0 && Math.random() * 100 < spdPower);

    // f6 (Ragdoll Bounce) & h4 (Guardian's Resolve) give defense
    const defBounce = (game.upgrades && game.upgrades.f6) ? getSkillStats(4, game.upgrades.f6).power : 0;
    const defGuard  = (game.upgrades && game.upgrades.h4) ? getSkillStats(4, game.upgrades.h4).power : 0;
    const totalDef  = defBounce + defGuard;

    let dmgToPlayer = 0;
    let dodgeMsg = "";
    let updatedEnemyState = { ...enemy };
    let isTrueLaser = false;

    if (enemy.id === "rem") {
      const roll = Math.random();
      if (roll < 0.25) {
        isTrueLaser = true;
        // True Laser: ignores all armor and reductions! Deals exactly 50 damage
        dmgToPlayer = 50;
        dodgeMsg = "🌌 REM fired a TRUE LASER! Ignored all defenses and dealt 50 True Damage!";
      } else if (roll < 0.50 && !enemy.dodgeLowered) {
        // Dodge lowering vibration
        updatedEnemyState.dodgeLowered = true;
        dmgToPlayer = isDodged ? 0 : Math.max(1, Math.floor(effectiveAtk * 0.5) - totalDef);
        dodgeMsg = isDodged 
          ? "REM used Rapid Vibration! Luna dodged but her dodge chance is now lowered (-35%)!" 
          : `REM used Rapid Vibration! Dealt ${dmgToPlayer} damage and lowered Luna's dodge chance (-35%)!`;
      } else {
        // Normal attack: deals 75% of base attack twice!
        const hit1 = isDodged ? 0 : Math.max(1, Math.floor(effectiveAtk * 0.75) - totalDef);
        
        // second hit has a separate dodge roll if not active dodge
        const hit2Dodge = battleState.dodgeActive || (spdPower > 0 && Math.random() * 100 < spdPower);
        const hit2 = hit2Dodge ? 0 : Math.max(1, Math.floor(effectiveAtk * 0.75) - totalDef);
        
        dmgToPlayer = hit1 + hit2;
        if (hit1 === 0 && hit2 === 0) {
          dodgeMsg = "REM used Normal Strike (Double Hit): Luna dodged both attacks!";
        } else if (hit1 > 0 && hit2 === 0) {
          dodgeMsg = `REM used Normal Strike (Double Hit): 1st hit dealt ${hit1} dmg, 2nd was dodged!`;
        } else if (hit1 === 0 && hit2 > 0) {
          dodgeMsg = `REM used Normal Strike (Double Hit): 1st hit dodged, 2nd dealt ${hit2} dmg!`;
        } else {
          dodgeMsg = `REM used Normal Strike (Double Hit): Dealt ${hit1} + ${hit2} damage!`;
        }
      }
    } else {
      dmgToPlayer = isDodged ? 0 : Math.max(1, effectiveAtk - totalDef);
      dodgeMsg = isDodged ? "Luna dodged the attack!" : "Enemy dealt " + dmgToPlayer + " damage." + (totalDef > 0 ? ` (Blocked ${totalDef})` : "");
    }

    if (dmgToPlayer > 0 && !isTrueLaser) {
      const drPercent = equippedStats.dr || 0;
      if (drPercent > 0) {
        const beforeDr = dmgToPlayer;
        dmgToPlayer = Math.max(1, Math.floor(dmgToPlayer * (1 - drPercent / 100)));
        const prevented = beforeDr - dmgToPlayer;
        if (prevented > 0) {
          dodgeMsg += ` (Absorbed ${prevented} dmg via active DR)`;
        }
      }

      const thornsPercent = equippedStats.thorns || 0;
      if (thornsPercent > 0) {
        const reflected = Math.floor(dmgToPlayer * (thornsPercent / 100));
        if (reflected > 0) {
          updatedEnemyState.hp = Math.max(0, updatedEnemyState.hp - reflected);
          dodgeMsg += ` (Thorns reflected ${reflected} dmg!)`;
        }
      }
    }

    const mpRegen      = ((game.upgrades && game.upgrades.h2) || 0) > 0 ? 3 : 0;
    const newTurns     = Math.max(0, (enemy.debuffTurns || 0) - 1);
    const newDebuff    = newTurns > 0 ? (enemy.debuffAtk || 0) : 0;
    const newHp        = Math.max(0, playerState.hp - dmgToPlayer);
    const newMp        = Math.min(totalMaxMp, playerState.mp + mpRegen);
    const log          = [dodgeMsg, ...extraLog, ...(battleState.log || [])].slice(0, 8);

    return { 
      playerHp: newHp, 
      playerMp: newMp, 
      newDebuffAtk: newDebuff, 
      newDebuffTurns: newTurns, 
      log, 
      dead: newHp <= 0,
      updatedEnemy: updatedEnemyState
    };
  }

  function handleEnemyDefeated(currentGame, currentMp) {
    const b = currentGame.battle;
    if (!b) return;
    const enemy = b.enemyQueue[b.currentIdx];
    const newDefeated = b.totalDefeated + 1;
    const nextIdx = b.currentIdx + 1;

    if (nextIdx >= b.enemyQueue.length) {
      // Mood reward has been decreased by 50%!
      const moodReward = Math.floor((30 * newDefeated) * 0.5);
      let earnedCoins = newDefeated * 10;
      
      const h10Bonus = (currentGame.upgrades && currentGame.upgrades.h10) ? Math.floor(getSkillStats(1, currentGame.upgrades.h10).power) : 0;
      let shardsEarned = newDefeated + (b.enemyQueue.some(e => e.isBoss) ? 3 : 0) + h10Bonus;

      const isVictoryDoubled = (currentGame.bond >= 200);
      if (isVictoryDoubled) {
        earnedCoins *= 2;
        shardsEarned *= 2;
      }

      // Psyche acquisition chance: 15% from SR or Boss battles
      const belongsSpecial = b.enemyQueue.some(e => e.isBoss || e.tier === "SR");
      const obtainedPsyche = belongsSpecial && Math.random() < 0.15;
      const psycheUid = "psyche_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      const psycheItem = {
        id: "psyche",
        name: "Psyche",
        ico: "🧬",
        type: "consumable",
        price: 1000,
        desc: "Ascension item required to level up 5★ items (up to +5).",
        uid: psycheUid,
        baseName: "Psyche",
        forgeLevel: 0
      };

      let totalXpGained = 0;
      b.enemyQueue.forEach(e => {
        totalXpGained += getEnemyXp(e.tier, true);
      });

      setGame(g => {
        const xpNotifications = [];
        const nextPlayer = addPlayerXp({
          ...g.player,
          coins: g.player.coins + earnedCoins,
          shards: (g.player.shards || 0) + shardsEarned,
          hp: totalMaxHp,
          mp: currentMp !== undefined ? currentMp : totalMaxMp,
        }, totalXpGained, xpNotifications);

        const updatedInv = obtainedPsyche ? [...g.inventory, psycheItem] : g.inventory;

        return {
          ...g,
          battle: null,
          voidData: null,
          phase: "day",
          day: g.day + 1,
          talkedToday: false,
          scavengedToday: false,
          player: nextPlayer,
          inventory: updatedInv,
          mood: Math.min(1500, g.mood + moodReward),
          dreamLog: [
            `Night ${g.day}: All ${newDefeated} enemies defeated! (+${moodReward} Mood, +${earnedCoins} coins, +${shardsEarned} shards` + 
            (h10Bonus > 0 ? ` incl. +${h10Bonus} Dreamweaver bonus` : "") + 
            (isVictoryDoubled ? " [Bond 200 Victory Double!]" : "") + 
            `, +${totalXpGained} XP)` + (obtainedPsyche ? " [🧬 Found Psyche!]" : ""),
            ...xpNotifications.map(n => `🌟 ${n}`),
            ...g.dreamLog,
          ],
        };
      });

      let victoryMsg = `Victory! ✨ +${moodReward} Mood · +${earnedCoins} coins · +${shardsEarned} shards · +${totalXpGained} XP · Morning arrives!`;
      if (isVictoryDoubled) {
        victoryMsg += " (Bond 200 Double!)";
      }
      if (obtainedPsyche) {
        victoryMsg += " \n🧬 Found a rare [Psyche] ascension item!";
      }
      notify(victoryMsg);
    } else {
      const nextEnemy = { ...b.enemyQueue[nextIdx] };
      setGame(g => ({
        ...g,
        player: { ...g.player, mp: currentMp !== undefined ? currentMp : g.player.mp },
        battle: {
          ...g.battle,
          currentIdx: nextIdx,
          totalDefeated: newDefeated,
          dodgeActive: false,
          log: [enemy.name + " defeated! Next: " + nextEnemy.name, ...(g.battle.log || [])].slice(0, 8),
        },
      }));
    }
  }

  function doAttack() {
    if (!game.battle) return;
    const { battle, player, upgrades = {} } = game;
    const enemy = battle.enemyQueue[battle.currentIdx];
    const critPct  = (upgrades.f4 || 0) * 5;
    const isCrit   = Math.random() * 100 < critPct;
    
    const pierceDmg = (upgrades.h5 || 0) > 0 ? getSkillStats(4, upgrades.h5).power : 0;
    const baseDmg   = Math.floor((totalAtk + Math.floor(Math.random() * 6)) * (isCrit ? 2 : 1));
    const dmg       = baseDmg + pierceDmg;
    
    const vampHeal = (upgrades.f7 || 0) > 0 ? Math.floor(dmg * (upgrades.f7 || 0) * 0.02) : 0;

    // Apply adaptive boss stats to the boss!
    const adapt = getBossAdaptability(enemy, totalAtk);
    const finalDmgInput = Math.max(1, Math.floor(dmg * (1 - adapt.reduction)));
    const finalReflect = adapt.reflection;

    const newEnemyHp = enemy.hp - finalDmgInput;
    const isDeadFromReflect = (player.hp + vampHeal - finalReflect) <= 0;

    const atkLog = [
      (isCrit ? "⚡ Critical! " : "") + 
      "Luna dealt " + finalDmgInput + " damage" +
      (pierceDmg > 0 ? ` (incl. +${pierceDmg} Pierce)` : "") + 
      (vampHeal > 0 ? " (+" + vampHeal + " vamp)" : "") + 
      "." + (finalReflect > 0 ? ` Recoil: Took ${finalReflect} reflected damage.` : "")
    ];

    if (newEnemyHp <= 0) {
      handleEnemyDefeated(game, player.mp);
      return;
    }

    if (isDeadFromReflect) {
      handleDefeatByEnemy();
      return;
    }

    const nextEnemyQueue = battle.enemyQueue.map((e, i) =>
      i === battle.currentIdx ? { ...e, hp: newEnemyHp } : e
    );
    const next = resolveEnemyCounter(
      { ...battle, enemyQueue: nextEnemyQueue, dodgeActive: false }, { ...player, hp: player.hp + vampHeal - finalReflect }, atkLog
    );
    if (next.dead) { handleDefeatByEnemy(); return; }

    if (next.updatedEnemy && next.updatedEnemy.hp <= 0) {
      handleEnemyDefeated({
        ...game,
        battle: {
          ...game.battle,
          enemyQueue: nextEnemyQueue.map((e, i) =>
            i === battle.currentIdx ? { ...e, hp: 0 } : e
          )
        }
      }, next.playerMp);
      return;
    }

    const newQueue = battle.enemyQueue.map((e, i) =>
      i === battle.currentIdx
        ? { 
            ...e, 
            hp: next.updatedEnemy ? next.updatedEnemy.hp : newEnemyHp, 
            debuffAtk: next.newDebuffAtk, 
            debuffTurns: next.newDebuffTurns,
            dodgeLowered: next.updatedEnemy ? next.updatedEnemy.dodgeLowered : e.dodgeLowered
          }
        : e
    );
    setGame(g => ({
      ...g,
      player: { ...g.player, hp: Math.min(totalMaxHp, next.playerHp), mp: next.playerMp },
      battle: { ...g.battle, dodgeActive: false, enemyQueue: newQueue, log: next.log },
    }));
  }

  function doSkill(skill) {
    if (!game.battle) return;
    const { battle, player, upgrades = {} } = game;
    const enemy = battle.enemyQueue[battle.currentIdx];

    // f10 (Feline Grace) reduces physical skill mana costs
    let actualCost = skill.mpCost || 0;
    if (skill.id.startsWith("f") && upgrades.f10) {
      const reduction = Math.max(0, upgrades.f10 * 2);
      actualCost = Math.max(1, actualCost - reduction);
    }

    if (player.mp < actualCost) { notify("Not enough MP 🧪"); return; }

    // First check REM Magic Shield!
    const isMagical = skill.id.startsWith("h");
    const isRem = enemy.id === "rem";
    let nextMagicShield = enemy.magicShield || 0;
    
    let newEnemyHp     = enemy.hp;
    let newDebuffAtk   = enemy.debuffAtk  || 0;
    let newDebuffTurns = enemy.debuffTurns || 0;
    let newDodge       = battle.dodgeActive;
    let newPlayerMp    = player.mp - actualCost;
    let skipEnemy      = false;
    let skillLog       = "";

    // h5 Star-Touched Nails pierce damage
    const pierceDmg = (upgrades.h5 || 0) > 0 ? getSkillStats(4, upgrades.h5).power : 0;

    if (isRem && isMagical && nextMagicShield > 0) {
      // Magic Shield blocks!
      nextMagicShield -= 1;
      skillLog = `🔮 REM's Magic Shield BLOCKED ${skill.name}! (Shields remaining: ${nextMagicShield})`;
      
      const shieldQueue = game.battle.enemyQueue.map((e, i) =>
        i === battle.currentIdx ? { ...e, magicShield: nextMagicShield } : e
      );

      const mpRegen = (upgrades.h2 || 0) > 0 ? 3 : 0;
      const next = resolveEnemyCounter({ ...battle, enemyQueue: shieldQueue, dodgeActive: newDodge }, { ...player, mp: newPlayerMp }, [skillLog]);
      if (next.dead) { handleDefeatByEnemy(); return; }
      
      const finalQueue = shieldQueue.map((e, i) =>
        i === battle.currentIdx 
          ? { 
              ...e, 
              debuffAtk: next.newDebuffAtk, 
              debuffTurns: next.newDebuffTurns,
              dodgeLowered: next.updatedEnemy ? next.updatedEnemy.dodgeLowered : e.dodgeLowered
            } 
          : e
      );
      setGame(g => ({
        ...g,
        player: { ...g.player, hp: next.playerHp, mp: Math.min(totalMaxMp, next.playerMp + mpRegen) },
        battle: { ...g.battle, dodgeActive: false, enemyQueue: finalQueue, log: next.log },
      }));
      return;
    }

    let initialDmg = 0;
    switch (skill.id) {
      case "f2": { 
        initialDmg = Math.floor(totalAtk*1.5+Math.random()*8) + pierceDmg; 
        break; 
      }
      case "f5": { skipEnemy=true; skillLog="Shadow Blend! Attack negated."; break; }
      case "f8": { newDebuffAtk=4; newDebuffTurns=2; skillLog="Alpha Hiss! Enemy ATK  (2 turns)."; break; }
      case "h1": { 
        initialDmg = Math.floor(player.matk*1.4+Math.random()*10) + pierceDmg; 
        break; 
      }
      case "h3": { 
        initialDmg = Math.floor(player.matk*2.0+Math.random()*15) + pierceDmg; 
        break; 
      }
      case "h6": { 
        initialDmg = Math.floor(player.matk*0.8); 
        skipEnemy=true; 
        newDodge=true; 
        break; 
      }
      case "h7": { newDebuffAtk=5; newDebuffTurns=3; skillLog="Echoing Meow! Enemy ATK  (3 turns)."; break; }
      case "h9": { 
        if ((game.bond || 0) >= 200) {
          initialDmg = Math.floor((game.bond || 0) * 4 + (player.matk || 10) * 5) + pierceDmg;
        } else {
          initialDmg = Math.floor((game.bond || 0) * 2 + (player.matk || 10) * 2) + pierceDmg;
        }
        break; 
      }
      default:   { skillLog=skill.name + " activated!"; }
    }

    const adapt = getBossAdaptability(enemy, totalAtk);
    const finalDmgInput = initialDmg > 0 ? Math.max(1, Math.floor(initialDmg * (1 - adapt.reduction))) : 0;
    const finalReflect = initialDmg > 0 ? adapt.reflection : 0;

    if (initialDmg > 0) {
      newEnemyHp -= finalDmgInput;
      if (skill.id === "f2") {
        skillLog = `Midnight Pounce! ${finalDmgInput} damage` + (pierceDmg > 0 ? ` (+${pierceDmg} Pierce).` : ".") + (finalReflect > 0 ? ` Recoil: Took ${finalReflect} reflection.` : "");
      } else if (skill.id === "h1") {
        skillLog = `Lunar Spark! ${finalDmgInput} magic dmg` + (pierceDmg > 0 ? ` (+${pierceDmg} Pierce).` : ".") + (finalReflect > 0 ? ` Recoil: Took ${finalReflect} reflection.` : "");
      } else if (skill.id === "h3") {
        skillLog = `Violet Tear! ${finalDmgInput} damage` + (pierceDmg > 0 ? ` (+${pierceDmg} Pierce).` : ".") + (finalReflect > 0 ? ` Recoil: Took ${finalReflect} reflection.` : "");
      } else if (skill.id === "h6") {
        skillLog = `Warp Step! Dodge + ${finalDmgInput} counter.` + (finalReflect > 0 ? ` Recoil: Took ${finalReflect} reflection.` : "");
      } else if (skill.id === "h9") {
        if ((game.bond || 0) >= 200) {
          skillLog = `🌌 COSMIC ECLIPSE! (Supreme Affinity Ultimate) deals ${finalDmgInput} cataclysmic damage!` + (finalReflect > 0 ? ` Recoil: Took ${finalReflect} reflection.` : "");
        } else {
          skillLog = `Bond Flare! ${finalDmgInput} damage.` + (finalReflect > 0 ? ` Recoil: Took ${finalReflect} reflection.` : "");
        }
      }
    }

    const isDeadFromRecoil = finalReflect > 0 && (player.hp - finalReflect) <= 0;

    if (newEnemyHp <= 0) {
      const remainingMp = Math.max(0, newPlayerMp);
      setGame(g => ({ ...g, player: { ...g.player, mp: remainingMp } }));
      handleEnemyDefeated(game, remainingMp);
      return;
    }

    if (isDeadFromRecoil) {
      handleDefeatByEnemy();
      return;
    }

    const mpRegen = (upgrades.h2 || 0) > 0 ? 3 : 0;
    const newQueue = game.battle.enemyQueue.map((e, i) =>
      i === battle.currentIdx
        ? { ...e, hp: newEnemyHp, debuffAtk: newDebuffAtk, debuffTurns: newDebuffTurns }
        : e
    );

    if (skipEnemy) {
      setGame(g => ({
        ...g,
        player: { ...g.player, hp: Math.max(1, player.hp - finalReflect), mp: Math.min(totalMaxMp, newPlayerMp + mpRegen) },
        battle: { ...g.battle, dodgeActive: newDodge, enemyQueue: newQueue, log: [skillLog, ...(battle.log||[])].slice(0,8) },
      }));
      return;
    }

    const next = resolveEnemyCounter({ ...battle, enemyQueue: newQueue, dodgeActive: newDodge }, { ...player, hp: player.hp - finalReflect, mp: newPlayerMp }, [skillLog]);
    if (next.dead) { handleDefeatByEnemy(); return; }

    if (next.updatedEnemy && next.updatedEnemy.hp <= 0) {
      handleEnemyDefeated({
        ...game,
        battle: {
          ...game.battle,
          enemyQueue: newQueue.map((e, i) =>
            i === battle.currentIdx ? { ...e, hp: 0 } : e
          )
        }
      }, next.playerMp);
      return;
    }

    const finalQueue = newQueue.map((e, i) =>
      i === battle.currentIdx 
        ? { 
            ...e, 
            hp: next.updatedEnemy ? next.updatedEnemy.hp : newEnemyHp,
            debuffAtk: next.newDebuffAtk, 
            debuffTurns: next.newDebuffTurns,
            dodgeLowered: next.updatedEnemy ? next.updatedEnemy.dodgeLowered : e.dodgeLowered
          } 
        : e
    );
    setGame(g => ({
      ...g,
      player: { ...g.player, hp: next.playerHp, mp: Math.min(totalMaxMp, next.playerMp + mpRegen) },
      battle: { ...g.battle, dodgeActive: false, enemyQueue: finalQueue, log: next.log },
    }));
  }

  function handleDefeatByEnemy() {
    const b = game.battle;
    const defeatedCount = (b && b.totalDefeated) || 0;
    const earnedCoins = defeatedCount * 10;

    let totalXpGained = 0;
    if (b && b.enemyQueue) {
      b.enemyQueue.forEach((enemy, index) => {
        if (index < b.currentIdx) {
          totalXpGained += getEnemyXp(enemy.tier, true);
        }
      });
    }
    // Gain half the sum on loss!
    totalXpGained = Math.floor(totalXpGained * 0.5);

    setGame(g => {
      const xpNotifications = [];
      const nextPlayer = addPlayerXp({
        ...g.player,
        hp: totalMaxHp,
        mp: totalMaxMp,
        shards: (g.player.shards || 0) + 1,
        coins: g.player.coins + earnedCoins,
      }, totalXpGained, xpNotifications);

      return {
        ...g,
        battle: null,
        voidData: null,
        phase: "day",
        day: g.day + 1,
        talkedToday: false,
        scavengedToday: false,
        player: nextPlayer,
        mood: Math.max(0, g.mood - 150),
        dreamLog: [
          `Night ${g.day}: Luna fell in battle (${defeatedCount} enemies defeated). Dawn broke the nightmare. Obtained 1 Dream Shard, +${earnedCoins} coins, and +${totalXpGained} XP.`,
          ...xpNotifications.map(n => `🌟 ${n}`),
          ...g.dreamLog,
        ],
      };
    });
    notify(`Luna fell in battle! 💀 -150 Mood. Morning arrives (+1 Dream Shard, +${earnedCoins} coins, +${totalXpGained} XP).`);
  }

  function handleFleeBattle() {
    const b = game.battle;
    if (!b) return;

    let totalXpGained = 0;
    if (b && b.enemyQueue) {
      b.enemyQueue.forEach((enemy, index) => {
        if (index < b.currentIdx) {
          totalXpGained += getEnemyXp(enemy.tier, true);
        }
      });
    }
    // Receive 50% of the total defeat XP when fleeing!
    totalXpGained = Math.floor(totalXpGained * 0.5);

    const remaining = b.enemyQueue.slice(b.currentIdx);
    setGame(g => {
      const xpNotifications = [];
      const nextPlayer = addPlayerXp({
        ...g.player,
      }, totalXpGained, xpNotifications);

      return {
        ...g,
        player: nextPlayer,
        battle: null,
        voidData: { 
          remainingQueue: remaining, 
          totalDefeated: b.totalDefeated,
          originalQueue: b.enemyQueue,
          currentIdx: b.currentIdx,
          currentForm: b.currentForm
        },
        dreamLog: [
          `Fled from battle. Defeated ${b.currentIdx} enemies, obtained +${totalXpGained} fleeing XP.`,
          ...xpNotifications.map(n => `🌟 ${n}`),
          ...g.dreamLog,
        ],
      };
    });
    notify(`Luna retreated to the Dreamscape Void... Gained +${totalXpGained} fleeing XP!`);
  }

  function handleFleeVoid() {
    const penalty = Math.min(game.player.hp - 1, 25);
    setGame(g => ({
      ...g, voidData: null,
      player: { ...g.player, hp: g.player.hp - penalty },
      mood: Math.max(0, g.mood - 10),
    }));
    notify("Luna fled the Void! -" + penalty + " HP");
  }

  function handleReenterDreamscape() {
    const { voidData } = game;
    if (!voidData || !voidData.remainingQueue) return;
    setGame(g => ({
      ...g,
      battle: {
        enemyQueue: voidData.originalQueue || voidData.remainingQueue,
        currentIdx: voidData.currentIdx !== undefined ? voidData.currentIdx : 0,
        totalDefeated: voidData.totalDefeated,
        log: ["Luna dives back into the Dreamscape!"],
        dodgeActive: false,
        startTime: Date.now(),
        currentForm: voidData.currentForm || "feral",
      },
      voidData: null,
    }));
  }

  function handleSleepFromVoid() {
    const remaining = (game.voidData && game.voidData.remainingQueue && game.voidData.remainingQueue.length) || 0;
    const defeatedCount = (game.voidData && game.voidData.totalDefeated) || 0;
    const earnedCoins = defeatedCount * 10;
    const moodPenalty = remaining * 15;
    const xpGained = defeatedCount * 5;

    setGame(g => {
      const xpNotifications = [];
      const nextPlayer = addPlayerXp({
        ...g.player,
        coins: g.player.coins + earnedCoins,
        hp: totalMaxHp,
        mp: totalMaxMp,
      }, xpGained, xpNotifications);

      return {
        ...g,
        phase: "day",
        day: g.day + 1,
        voidData: null,
        battle: null,
        talkedToday: false,
        scavengedToday: false,
        player: nextPlayer,
        mood: Math.max(0, g.mood - 10 - moodPenalty),
        dreamLog: [
          remaining > 0
            ? `Night ${g.day}: Slept early — ${remaining} nightmares escaped (-${moodPenalty} Mood) but obtained +${earnedCoins} coins and +${xpGained} XP.`
            : `Night ${g.day}: Slept safely. Obtained +${earnedCoins} coins and +${xpGained} XP.`,
          ...xpNotifications.map(n => `🌟 ${n}`),
          ...g.dreamLog,
        ],
      };
    });

    if (moodPenalty > 0) {
      notify(`Dawn breaks... ${remaining} nightmares escaped! -${moodPenalty} Mood | +${earnedCoins} coins, +${xpGained} XP ☀️`);
    } else {
      notify(`Luna rested safely. Morning arrives! (+${earnedCoins} coins, +${xpGained} XP) ☀️`);
    }
  }

  function startDay() {
    setGame(g => ({
      ...g, phase: "day",
      day: g.day + 1,
      voidData: null, battle: null,
      talkedToday: false, scavengedToday: false,
      player: { ...g.player, hp: totalMaxHp, mp: totalMaxMp },
      mood: Math.max(0, g.mood - 10),
    }));
    notify("Morning arrives. Luna is fully rested! ☀️");
  }

  function purchaseUpgrade(skillId, price) {
    if ((game.player.shards || 0) < price) { notify("Not enough Dream Shards 💎"); return; }
    setGame(g => ({
      ...g,
      player:   { ...g.player, shards: g.player.shards - price },
      upgrades: { ...g.upgrades, [skillId]: ((g.upgrades && g.upgrades[skillId]) || 0) + 1 },
    }));
    notify("Skill Upgraded! ✨");
  }

  // ── Save/Load/Delete ──
  function manualSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
      notify("Game Saved 💾");
    } catch(e) {
      notify("Save failed! LocalStorage blocked.");
    }
  }
  function manualLoad() { setGame(safeLoad()); notify("Save Loaded 📂"); }
  function deleteSave()  { localStorage.removeItem(STORAGE_KEY); setGame(defaultState); notify("Save Deleted 🗑️"); }

  // ── Items Acquisition & Equip ──
  function buyMerchantItem(item, merchantType) {
    if (game.player.coins < item.price) { notify("Not enough coins 🪙"); return; }
    
    // Stopper check: has 5-star item of the same name/ID?
    if (hasMaxForgedItem(game, item.id, item.baseName || item.name)) {
      notify("You already have a 5★ forged item of this type!");
      return;
    }

    const itemStock = item.stock !== undefined ? item.stock : 1;
    if (itemStock <= 0) {
      notify("This item is sold out!");
      return;
    }

    const uid = Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    const invItem = {
      ...item,
      uid,
      baseName: item.baseName || item.name,
      forgeLevel: item.forgeLevel || 0,
    };

    const canAutoEquip = item.type === "equipment" && item.slot && !game.equipped[item.slot];

    setGame(g => {
      const updateStockList = (list) => 
        (list || []).map(li => 
          (li.id === item.id || li.name === item.name) ? { ...li, stock: (li.stock !== undefined ? li.stock : 1) - 1 } : li
        );

      if (canAutoEquip) {
        return {
          ...g,
          player: { ...g.player, coins: g.player.coins - item.price },
          equipped: { ...g.equipped, [item.slot]: invItem },
          dailyMouseItems: merchantType === "mouse" ? updateStockList(g.dailyMouseItems) : g.dailyMouseItems,
          dailyMappyItems: merchantType === "mappy" ? updateStockList(g.dailyMappyItems) : g.dailyMappyItems,
        };
      } else {
        return {
          ...g,
          player: { ...g.player, coins: g.player.coins - item.price },
          inventory: [...g.inventory, invItem],
          dailyMouseItems: merchantType === "mouse" ? updateStockList(g.dailyMouseItems) : g.dailyMouseItems,
          dailyMappyItems: merchantType === "mappy" ? updateStockList(g.dailyMappyItems) : g.dailyMappyItems,
        };
      }
    });

    if (canAutoEquip) {
      notify(item.name + " purchased and automatically equipped! ⚔️");
    } else {
      notify(item.name + " purchased! 🎒");
    }
  }

  function unequipItem(slot, gear) {
    setGame(g => {
      const currentEq = g.equipped[slot];
      if (!currentEq) return g;
      return {
        ...g,
        equipped: { ...g.equipped, [slot]: null },
        inventory: [...g.inventory, currentEq],
      };
    });
    notify(itemDisplayName(gear) + " unequipped 🎒");
  }

  function useItem(item) {
    if (item.type !== "consumable") return;

    if (item.id === "deja_vu" || item.id === "dejavu") {
      if (!game.battle) {
        notify("🌌 Déjà Vu can only be used during Dreamscape battles!");
        return;
      }
      setGame(g => {
        const resetQueue = g.battle.enemyQueue.map((e, idx) => {
          if (idx === g.battle.currentIdx) {
            return { ...e, dodgeLowered: false };
          }
          return e;
        });
        return {
          ...g,
          player: {
            ...g.player,
            hp: totalMaxHp,
            mp: totalMaxMp
          },
          battle: {
            ...g.battle,
            dodgeActive: false,
            enemyQueue: resetQueue,
            log: ["🌌 Déjà Vu activated! HP & MP restored, temporal parameters reset.", ...(g.battle.log || [])].slice(0, 8)
          },
          inventory: g.inventory.filter(i => i.uid !== item.uid),
        };
      });
      notify("🌌 DEJA VU: HP & MP fully restored! Temporary status parameter reset.");
      return;
    }

    const eff = item.effect || {};
    setGame(g => {
      const permHpBoost = eff.maxHp || 0;
      const permMpBoost = eff.maxMp || 0;
      const hpHeal = eff.hp || 0;
      const mpHeal = eff.mp || 0;

      const newPlayerMaxHp = g.player.maxHp + permHpBoost;
      const newPlayerMaxMp = g.player.maxMp + permMpBoost;

      const gearMaxHp = Object.values(g.equipped)
        .filter((ei) => !!ei)
        .reduce((sum, ei) => sum + (ei.effect?.maxHp || 0), 0);

      const gearMaxMp = Object.values(g.equipped)
        .filter((ei) => !!ei)
        .reduce((sum, ei) => sum + (ei.effect?.maxMp || 0), 0);

      const newTotalMaxHp = newPlayerMaxHp + gearMaxHp;
      const newTotalMaxMp = newPlayerMaxMp + gearMaxMp;

      return {
        ...g,
        player: {
          ...g.player,
          maxHp: newPlayerMaxHp,
          maxMp: newPlayerMaxMp,
          hp: Math.min(newTotalMaxHp, g.player.hp + hpHeal + permHpBoost),
          mp: Math.min(newTotalMaxMp, g.player.mp + mpHeal + permMpBoost),
        },
        inventory: g.inventory.filter(i => i.uid !== item.uid),
      };
    });
    notify(itemDisplayName(item) + " used");
  }

  function equipItem(item) {
    if (item.type !== "equipment" || !item.slot) return;
    setGame(g => {
      const slot = item.slot;
      const prev = g.equipped[slot];
      let newInv = g.inventory.filter(i => i.uid !== item.uid);
      if (prev) {
        newInv = [...newInv, prev];
      }
      return {
        ...g,
        equipped:  { ...g.equipped, [slot]: item },
        inventory: newInv,
      };
    });
    notify(itemDisplayName(item) + " equipped ⚔️");
  }

  function sellItem(item) {
    const sellPrice = itemSellPrice(item);
    setGame(g => ({
      ...g,
      player:    { ...g.player, coins: g.player.coins + sellPrice },
      inventory: g.inventory.filter(i => i.uid !== item.uid),
    }));
    notify("Sold " + itemDisplayName(item) + " for " + sellPrice + " 🪙");
  }

  const MAX_FORGE = 5;

  function forgeItems(baseId, fl) {
    if (fl >= MAX_FORGE) return;
    const candidates = allOwnedItems.filter(i => 
      (i.id || i.baseName || i.name) === baseId && (i.forgeLevel || 0) === fl
    );
    if (candidates.length < 2) return;

    const base      = candidates[0];
    const newLevel  = fl + 1;
    const stars     = "★".repeat(newLevel);
    const newEffect = {};
    Object.entries(base.effect || {}).forEach(([k, v]) => {
      newEffect[k] = Math.floor(v * 2.5);
    });

    const firstRef = candidates[0];
    const secondRef = candidates[1];

    const forged = {
      id:         base.id,
      ico:        base.ico,
      type:       base.type,
      slot:       base.slot,
      price:      base.price,
      uid:        Date.now() + "_" + Math.random().toString(36).substring(2, 9),
      baseName:   base.baseName || base.name,
      name:       (base.baseName || base.name) + " " + stars,
      forgeLevel: newLevel,
      effect:     newEffect,
      desc:       Object.entries(newEffect).map(([k, v]) => {
                    return "+" + v + " " + k.toUpperCase();
                  }).join(", "),
    };

    const equipSlot = firstRef.isEquipped ? firstRef.slotName : (secondRef.isEquipped ? secondRef.slotName : null);

    setGame(g => {
      const skipUids = [firstRef.uid, secondRef.uid];
      const keptInventory = g.inventory.filter(i => {
        const pos = skipUids.indexOf(i.uid || "");
        if (pos !== -1) { skipUids.splice(pos, 1); return false; }
        return true;
      });

      const nextEquipped = { ...g.equipped };
      if (firstRef.isEquipped && firstRef.slotName) {
        nextEquipped[firstRef.slotName] = null;
      }
      if (secondRef.isEquipped && secondRef.slotName) {
        nextEquipped[secondRef.slotName] = null;
      }

      if (equipSlot) {
        nextEquipped[equipSlot] = forged;
      } else {
        keptInventory.push(forged);
      }

      return {
        ...g,
        inventory: keptInventory,
        equipped:  nextEquipped
      };
    });

    const baseName = base.baseName || base.name;
    if (newLevel === MAX_FORGE) {
      notify("⚒️ " + baseName + " " + stars + " — MAX STARS! Ascension awaits.");
    } else {
      notify("⚒️ " + baseName + " " + stars + " forged!" + (equipSlot ? " Automatically equipped." : " Added to inventory."));
    }
  }

  function ascendItem(itemId, itemUid) {
    const psyche = game.inventory.find(i => i.id === "psyche");
    if (!psyche) {
      notify("You do not have any [Psyche] 🧬 ascension items! Buy them from Mappy or defeat Bosses/SR nightmares.");
      return;
    }

    const targetItem = allOwnedItems.find(i => i.uid === itemUid);
    if (!targetItem) return;

    if ((targetItem.forgeLevel || 0) >= 10) {
      notify("This item has already reached maximum Ascension level (+5)!");
      return;
    }

    const baseName = targetItem.baseName || targetItem.name;
    const newLevel = (targetItem.forgeLevel || 0) + 1;
    const ascensionNum = newLevel - 5;

    const newEffect = {};
    Object.entries(targetItem.effect || {}).forEach(([k, v]) => {
      newEffect[k] = Math.floor(v * 1.45); // Increase by 45% each ascension step!
    });

    const ascendedItem = {
      ...targetItem,
      uid: targetItem.uid, // Keep the same UID to retain equip status!
      forgeLevel: newLevel,
      name: `${baseName} ★★★★★ (+${ascensionNum})`,
      effect: newEffect,
      desc: Object.entries(newEffect).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(", "),
    };

    setGame(g => {
      // Consume 1 psyche
      let psycheRemoved = false;
      const nextInv = g.inventory.filter(i => {
        if (!psycheRemoved && i.id === "psyche") {
          psycheRemoved = true;
          return false;
        }
        return i.uid !== targetItem.uid; // Filter out old target if it was in inventory
      });

      const nextEquipped = { ...g.equipped };
      let wasEquipped = false;
      Object.entries(nextEquipped).forEach(([slot, item]) => {
        if (item && item.uid === targetItem.uid) {
          nextEquipped[slot] = ascendedItem;
          wasEquipped = true;
        }
      });

      if (!wasEquipped) {
        nextInv.push(ascendedItem);
      }

      return {
        ...g,
        inventory: nextInv,
        equipped: nextEquipped
      };
    });

    notify(`🧬 Successfully Ascended ${baseName} to +${ascensionNum}! Stats surged!`);
  }

  // ── Intro Screen ───────────────────────────────────────────
  if (showIntro) return (
    <div style={{ minHeight:"100vh", background:ROOT_BG, color:"#ddd6fe", display:"flex", alignItems:"center", justifyValue:"center", padding:20, fontFamily:"sans-serif", justifyContent:"center" }}>
      <div style={{ maxWidth:580, background:"rgba(10,0,30,0.9)", border:"1px solid rgba(139,92,246,0.3)", borderRadius:24, padding:28 }}>
        <div style={{ fontSize:12, letterSpacing:5, color:"#8b5cf6", marginBottom:12 }}>DREAM GUARDIAN</div>
        <div style={{ fontSize:40, fontWeight:"bold", marginBottom:18 }}>🌙 Luna & Alex</div>
        <div style={{ lineHeight:2, fontSize:15, color:"#c4b5fd", whiteSpace:"pre-line", marginBottom:24 }}>{introText}</div>
        <button onClick={() => setShowIntro(false)} style={{ width:"100%", background:"#7c3aed", border:"none", color:"white", padding:"16px", borderRadius:16, fontSize:16, fontWeight:"bold", cursor:"pointer" }}>
          ✨ Enter The Dreamscape
        </button>
      </div>
    </div>
  );

  return (
    <div className="dg-page" style={{ minHeight:"100dvh", background:ROOT_BG, color:"#ddd6fe", fontFamily:"sans-serif", padding: resp.isMobile ? "12px 10px" : 16, boxSizing:"border-box", overflowX:"hidden" }}>
      <GlobalStyles />
      <div style={{ maxWidth:760, margin:"0 auto" }}>

        {/* Top Navbar */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
          <div>
            <div style={{ fontSize:12, letterSpacing:4, color:"#8b5cf6" }}>DREAM GUARDIAN</div>
            <div style={{ fontSize:30, fontWeight:"bold" }}>🌙 Luna & Alex</div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={() => setShowSettings(true)} style={{ background:"#5b21b6", color:"white", border:"none", padding:"10px 14px", borderRadius:12, cursor:"pointer" }}>⚙️</button>
            <button onClick={manualSave}  style={{ background:"#166534", color:"white", border:"none", padding:"10px 14px", borderRadius:12, cursor:"pointer" }}>💾 Save</button>
            <button onClick={manualLoad}  style={{ background:"#4338ca", color:"white", border:"none", padding:"10px 14px", borderRadius:12, cursor:"pointer" }}>📂 Load</button>
            <button onClick={deleteSave}  style={{ background:"#7f1d1d", color:"white", border:"none", padding:"10px 14px", borderRadius:12, cursor:"pointer" }}>🗑️</button>
          </div>
        </div>

        {game.toast && (
          <div style={{ background:"rgba(90,40,180,0.4)", padding:12, borderRadius:14, marginBottom:14, textAlign:"center" }}>{game.toast}</div>
        )}

        {/* Quick Stats Header */}
        <Card>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <div style={{ marginBottom:6, fontSize:13, color:"#fca5a5" }}>❤️ HP  {game.player.hp} / {totalMaxHp}</div>
              <StatBar value={game.player.hp} max={totalMaxHp} color="#ef4444" />
            </div>
            <div>
              <div style={{ marginBottom:6, fontSize:13, color:"#c4b5fd" }}>🔮 MP  {game.player.mp} / {totalMaxMp}</div>
              <StatBar value={game.player.mp} max={totalMaxMp} color="#8b5cf6" />
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:13, color:"#fde68a" }}>
              <span>⭐ Level {game.player.level || 1}</span>
              <span>{(game.player.xp || 0).toFixed(0)} / {getXpNeeded(game.player.level || 1)} XP</span>
            </div>
            <StatBar value={game.player.xp || 0} max={getXpNeeded(game.player.level || 1)} color="#f59e0b" />
          </div>
          <div style={{ marginTop:14, display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(80px,1fr))", gap:8, fontSize:13 }}>
            <div>🪙 {game.player.coins}</div>
            <div>💎 {game.player.shards || 0}</div>
            <div>📅 Day {game.day}</div>
            <div>⚔️ ATK {totalAtk}</div>
          </div>
        </Card>

        {showBond && (
          <Card>
            <div style={{ marginBottom:6, fontSize:13, color:"#f472b6", fontWeight:"bold" }}>💖 Bond: {game.bond} / 200</div>
            <StatBar value={game.bond} max={200} color="#f472b6" />
            <div style={{ fontSize:11, marginTop:6, opacity:0.6 }}>The stronger the bond, the more Alex's nightmares fade.</div>
          </Card>
        )}

        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ color:currentTier.color, fontWeight:"bold", fontSize:13 }}>{currentTier.label}</span>
            <span style={{ fontSize:12, color:"#a78bfa" }}>{game.mood} / 1500</span>
          </div>
          <StatBar value={game.mood} max={1500} color={currentTier.color} />
        </Card>

        {/* Phase Handler Cards */}
        <Card>
          <div style={{ fontSize:18, fontWeight:"bold", marginBottom:12 }}>
            {game.phase === "day"
              ? (game.alexWorking ? "🌆 Alex is at Work" : "☀️ Daytime — Alex is Home")
              : "🌙 Nighttime"}
          </div>

          {game.phase === "day" ? (
            <div>
              {!game.alexWorking && (
                <>
                  <div style={{ marginBottom:14, lineHeight:1.8, color:"#c4b5fd", fontSize:14 }}>
                    Alex is still home. Spend some time together before the day starts.
                  </div>
                  <div style={{ display:"grid", gap:10, marginBottom:12 }}>
                    <Btn color={game.scavengedToday ? "#4b5563" : "#2563eb"} onClick={() => !game.scavengedToday && setShowScavenge(true)} disabled={game.scavengedToday}>
                      🔍 Scavenge Apartment {game.scavengedToday ? "(Done today)" : ""}
                    </Btn>
                    <Btn color={game.talkedToday ? "#4b5563" : "#ec4899"} onClick={talkToAlex} disabled={game.talkedToday}>
                      💬 Talk to Alex {game.talkedToday ? "(Done today)" : ""}
                    </Btn>
                  </div>
                  <Btn color="#7c3aed" onClick={alexGoesToWork}>
                    👋 Alex Goes to Work (Say Goodbye)
                  </Btn>
                </>
              )}

              {game.alexWorking && (
                <>
                  <div style={{ marginBottom:10, lineHeight:1.8, color:"#c4b5fd", fontSize:14 }}>
                    Alex is at work. Shop before the night begins.
                  </div>

                  <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                    <button onClick={() => setMerchantTab("mouse")} style={{
                      flex:1, padding:"10px", borderRadius:11, border:"none", fontFamily:"sans-serif",
                      background: merchantTab === "mouse" ? "#4338ca" : "rgba(255,255,255,0.05)",
                      color: merchantTab === "mouse" ? "white" : "#a78bfa", cursor:"pointer", fontWeight:"bold",
                    }}>🐭 The Mouse</button>
                    <button onClick={() => game.mappyAvailable && setMerchantTab("mappy")} style={{
                      flex:1, padding:"10px", borderRadius:11, border:"none", fontFamily:"sans-serif",
                      background: !game.mappyAvailable ? "rgba(70,70,70,0.3)" : merchantTab === "mappy" ? "#b45309" : "rgba(255,255,255,0.05)",
                      color: !game.mappyAvailable ? "#555" : merchantTab === "mappy" ? "white" : "#a78bfa",
                      cursor: game.mappyAvailable ? "pointer" : "not-allowed", fontWeight:"bold",
                    }}>
                      🐦 Mappy {!game.mappyAvailable ? (game.day < 6 ? "(Day 6+)" : "(Need Tier 2 Mood)") : ""}
                    </button>
                  </div>

                  {merchantTab === "mouse" && (
                    <div style={{ display:"grid", gap:9, marginBottom:14 }}>
                      {game.dailyMouseItems.length === 0
                        ? <div style={{ color:"#6d28d9", fontSize:13 }}>Nothing in stock today.</div>
                        : game.dailyMouseItems.map((item, i) => {
                          const isMaxed = hasMaxForgedItem(game, item.id, item.baseName || item.name);
                          const stock = item.stock !== undefined ? item.stock : 1;
                          const isSoldOut = stock <= 0;
                          const canAfford = game.player.coins >= item.price;

                          let btnText = `🪙 ${item.price}`;
                          let btnDisabled = false;
                          let btnColor = "#166534";

                          if (isMaxed) {
                            btnText = "5★ Owned";
                            btnDisabled = true;
                          } else if (isSoldOut) {
                            btnText = "Sold Out";
                            btnDisabled = true;
                          } else if (!canAfford) {
                            btnDisabled = true;
                          }

                          return (
                            <div key={i} style={{ background:"rgba(255,255,255,0.04)", padding:12, borderRadius:13, display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, opacity: isSoldOut ? 0.6 : 1 }}>
                              <div>
                                <div style={{ fontWeight:"bold" }}>
                                  {item.ico} {item.name}
                                  <span style={{ fontSize:10, color: isSoldOut ? "#f87171" : "#a78bfa", marginLeft:6 }}>
                                    ({isSoldOut ? "Out of Stock" : `Stock: ${stock}`})
                                  </span>
                                </div>
                                <div style={{ fontSize:12, opacity:0.8, marginTop:3 }}>{item.desc}</div>
                              </div>
                              <div style={{ minWidth:110 }}>
                                <Btn small color={btnColor} onClick={() => buyMerchantItem(item, "mouse")} disabled={btnDisabled}>
                                  {btnText}
                                </Btn>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  )}

                  {merchantTab === "mappy" && game.mappyAvailable && (
                    <div style={{ display:"grid", gap:9, marginBottom:14 }}>
                      {game.dailyMappyItems.length === 0
                        ? <div style={{ color:"#b45309", fontSize:13 }}>Nothing in stock today.</div>
                        : game.dailyMappyItems.map((item, i) => {
                          const isMaxed = hasMaxForgedItem(game, item.id, item.baseName || item.name);
                          const stock = item.stock !== undefined ? item.stock : 1;
                          const isSoldOut = stock <= 0;
                          const canAfford = game.player.coins >= item.price;

                          let btnText = `🪙 ${item.price}`;
                          let btnDisabled = false;
                          let btnColor = "#b45309";

                          if (isMaxed) {
                            btnText = "5★ Owned";
                            btnDisabled = true;
                          } else if (isSoldOut) {
                            btnText = "Sold Out";
                            btnDisabled = true;
                          } else if (!canAfford) {
                            btnDisabled = true;
                          }

                          return (
                            <div key={i} style={{ background:"rgba(180,83,9,0.08)", border:"1px solid rgba(180,83,9,0.2)", padding:12, borderRadius:13, display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, opacity: isSoldOut ? 0.6 : 1 }}>
                              <div>
                                <div style={{ fontWeight:"bold" }}>
                                  {item.ico} {item.name}
                                  <span style={{ fontSize:10, color: isSoldOut ? "#ef4444" : "#fbbf24", marginLeft:6 }}>
                                    ({isSoldOut ? "Out of Stock" : `Stock: ${stock}`})
                                  </span>
                                </div>
                                <div style={{ fontSize:12, opacity:0.8, marginTop:3 }}>{item.desc}</div>
                              </div>
                              <div style={{ minWidth:110 }}>
                                <Btn small color={btnColor} onClick={() => buyMerchantItem(item, "mappy")} disabled={btnDisabled}>
                                  {btnText}
                                </Btn>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  )}

                  {/* Forge & Ascension station pooling both equipped & inventory items */}
                  {(mergeableGroups.length > 0 || ascendableSingleItems.length > 0) && (
                    <div style={{ borderTop:"1px solid rgba(139,92,246,0.2)", paddingTop:12, marginBottom:14 }}>
                      <div style={{ fontSize:13, fontWeight:"bold", color:"#fde68a", marginBottom:5 }}>
                        ⚒️ Forge & Ascension Station
                      </div>
                      <div style={{ fontSize:12, color:"#a78bfa", marginBottom:9 }}>
                        Merge identical items for ★★★★★ (5 stars), then use [Psyche] 🧬 to Ascend single 5★ items up to 5 times (+5).
                      </div>

                      {mergeableGroups.length > 0 && (
                        <div style={{ display:"grid", gap:8, marginBottom: ascendableSingleItems.length > 0 ? 10 : 0 }}>
                          {mergeableGroups.map((items, gi) => {
                            const base      = items[0];
                            const baseName  = base.baseName || base.name;
                            const baseId    = base.id || base.baseName || base.name;
                            const fl        = base.forgeLevel || 0;
                            const newLevel  = fl + 1;
                            const curStars  = "★".repeat(fl);
                            const nxtStars  = "★".repeat(newLevel);
                            const previewEff = {};
                            Object.entries(base.effect || {}).forEach(([k, v]) => {
                              previewEff[k] = Math.floor(v * 2.5);
                            });
                            const isMaxNext = newLevel === 5;
                            return (
                              <div key={gi} style={{
                                background: isMaxNext ? "rgba(220,38,38,0.08)" : "rgba(250,204,21,0.06)",
                                border: "1px solid " + (isMaxNext ? "rgba(220,38,38,0.35)" : "rgba(250,204,21,0.25)"),
                                borderRadius:12, padding:12,
                                display:"flex", justifyContent:"space-between", alignItems:"center", gap:12,
                              }}>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontWeight:"bold", fontSize:14 }}>
                                    {base.ico} {baseName}{curStars}
                                    <span style={{ fontSize:11, color:"#9ca3af", marginLeft:6 }}>× {items.length} owned{items.some(x => x.isEquipped) ? " (1 equipped)" : ""}</span>
                                  </div>
                                  <div style={{ fontSize:11, color:"#6ee7b7", marginTop:3 }}>
                                    → {baseName} {nxtStars}: {Object.entries(previewEff).map(([k, v]) => "+" + v + " " + k.toUpperCase()).join(", ")}
                                  </div>
                                  {isMaxNext && (
                                    <div style={{ fontSize:10, color:"#fca5a5", marginTop:3 }}>
                                      ⚠️ Reaches Max Stars! Ascension can be done next using Psyche.
                                    </div>
                                  )}
                                </div>
                                <button onClick={() => forgeItems(baseId, fl)} style={{
                                  background: isMaxNext ? "#7f1d1d" : "#92400e",
                                  border: "1px solid " + (isMaxNext ? "rgba(220,38,38,0.6)" : "rgba(250,204,21,0.5)"),
                                  color: isMaxNext ? "#fca5a5" : "#fde68a",
                                  padding:"10px 14px", borderRadius:10, minHeight:42,
                                  cursor:"pointer", fontWeight:"bold", fontSize:13, fontFamily:"sans-serif",
                                  whiteSpace:"nowrap",
                                }}>⚒️ Forge{isMaxNext ? " (Final)" : ""}</button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {ascendableSingleItems.length > 0 && (
                        <div style={{ display:"grid", gap:8 }}>
                          <div style={{ fontSize:12, fontWeight:"bold", color:"#c4b5fd", marginBottom:2 }}>
                            🧬 Advanced Ascension Station (Owned Psyche: {psycheCount})
                          </div>
                          {ascendableSingleItems.map((item, gi) => {
                            const baseName = item.baseName || item.name;
                            const isMax = (item.forgeLevel || 0) >= 10;
                            const nextLvl = (item.forgeLevel || 0) - 4;
                            const previewEff = {};
                            Object.entries(item.effect || {}).forEach(([k, v]) => {
                              previewEff[k] = Math.floor(v * 1.45);
                            });
                            return (
                              <div key={gi} style={{ background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.35)", borderRadius:12, padding:12, display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontWeight:"bold", fontSize:14, color:"#c4b5fd" }}>
                                    {item.ico} {item.name}
                                    {item.isEquipped && <span style={{ fontSize:10, color:"#34d399", marginLeft:8, background:"rgba(52,211,153,0.15)", padding:"2px 5px", borderRadius:4 }}>EQUIPPED</span>}
                                  </div>
                                  <div style={{ fontSize:11, color:"#a78bfa", marginTop:3 }}>
                                    {isMax ? "Maximum Ascension level (+5) reached! Supreme Cosmic Tier." : `→ Ascension +${nextLvl}: ${Object.entries(previewEff).map(([k, v]) => "+" + v + " " + k.toUpperCase()).join(", ")}`}
                                  </div>
                                </div>
                                {isMax ? (
                                  <div style={{ background:"rgba(30,0,60,0.5)", border:"1px solid rgba(139,92,246,0.4)", borderRadius:10, padding:"10px 12px", textAlign:"center", minWidth:110 }}>
                                    <div style={{ fontSize:12, color:"#c4b5fd", fontWeight:"bold" }}>✨ Supreme Max</div>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => ascendItem(item.id, item.uid)}
                                    disabled={psycheCount === 0}
                                    style={{
                                      background: psycheCount > 0 ? "rgba(139,92,246,0.25)" : "rgba(156,163,175,0.1)",
                                      border: "1px solid " + (psycheCount > 0 ? "rgba(139,92,246,0.6)" : "rgba(156,163,175,0.2)"),
                                      color: psycheCount > 0 ? "#ddd6fe" : "#6b7280",
                                      borderRadius:10, padding:"8px 12px", textAlign:"center", minWidth:110,
                                      cursor: psycheCount > 0 ? "pointer" : "not-allowed",
                                      fontWeight:"bold", fontSize:12, fontFamily:"sans-serif"
                                    }}
                                  >
                                    🧬 Ascend
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <Btn color="#4338ca" onClick={transitionToNight}>🌙 Transition to Night</Btn>
                </>
              )}
            </div>

          ) : (
            <div>
              <div style={{ marginBottom:12, lineHeight:1.8, color:"#c4b5fd", fontSize:14 }}>
                The portal beneath the bed breathes with purple starlight.
              </div>
              {!game.battle && !game.voidData && (
                <div style={{ display:"grid", gap:10 }}>
                  <Btn onClick={enterDreamscape}>✨ Enter Dreamscape</Btn>
                  <Btn color="#0f766e" onClick={startDay}>☀️ Sleep Until Morning</Btn>
                </div>
              )}
              {game.battle && (
                <div style={{ textAlign:"center", padding:10 }}>
                  <div style={{ fontSize:14, color:"#a78bfa" }}>⚔️ Active Battle in Overlay.</div>
                </div>
              )}
              {game.voidData && !game.battle && (
                <div style={{ textAlign:"center", padding:10 }}>
                  <div style={{ fontSize:14, color:"#6d28d9" }}>🌀 Luna in Dreamscape Void.</div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Upgrade Tree Launcher */}
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontSize:18, fontWeight:"bold" }}>✨ Luna Upgrades</div>
            <button onClick={() => setShowUpgrade(true)} style={{ background:"#7c3aed", border:"none", color:"white", padding:"10px 16px", borderRadius:12, cursor:"pointer" }}>
              Open Tree
            </button>
          </div>
          <div style={{ fontSize:13, color:"#a78bfa" }}>
            Feral: {Object.keys(game.upgrades || {}).filter(k => k.startsWith("f")).length}/10 ·{" "}
            Hybrid: {Object.keys(game.upgrades || {}).filter(k => k.startsWith("h")).length}/10 unlocked
          </div>
        </Card>

        {/* Collapsible Inventory */}
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: invOpen ? 14 : 0 }}>
            <div style={{ fontSize:18, fontWeight:"bold" }}>🎒 Inventory ({game.inventory.length})</div>
            <button onClick={() => setInvOpen(v => !v)} style={{ background:"#4338ca", border:"none", color:"white", padding:"8px 14px", borderRadius:12, cursor:"pointer" }}>
              {invOpen ? "▲ Close" : "▼ Open"}
            </button>
          </div>
          {invOpen && (
            game.inventory.length === 0
              ? <div style={{ color:"#6d28d9", fontSize:14 }}>No items inside.</div>
              : <div style={{ display:"grid", gap:10 }}>
                  {game.inventory.map(item => (
                    <div key={item.uid} style={{
                      background: (item.forgeLevel || 0) > 0 ? "rgba(250,204,21,0.07)" : "rgba(255,255,255,0.04)",
                      border: (item.forgeLevel || 0) > 0 ? "1px solid rgba(250,204,21,0.3)" : "none",
                      padding:12, borderRadius:14,
                      display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap",
                    }}>
                      <div>
                        <div style={{ fontWeight:"bold" }}>{item.ico} {itemDisplayName(item)}</div>
                        <div style={{ fontSize:12, opacity:0.8 }}>{item.desc}</div>
                        {item.type === "equipment" && (
                          <div style={{ fontSize:11, color:"#a78bfa" }}>Slot: {item.slot ? item.slot.toUpperCase() : ""}</div>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                        {item.type === "consumable" && (
                          <button onClick={() => useItem(item)} style={{ background:"#0f766e", border:"none", color:"white", padding:"7px 11px", borderRadius:10, cursor:"pointer", fontFamily:"sans-serif" }}>Use</button>
                        )}
                        {item.type === "equipment" && (
                          <button onClick={() => equipItem(item)} style={{ background:"#7c3aed", border:"none", color:"white", padding:"7px 11px", borderRadius:10, cursor:"pointer", fontFamily:"sans-serif" }}>Equip</button>
                        )}
                        <button onClick={() => sellItem(item)} style={{
                          background:"rgba(180,83,9,0.3)", border:"1px solid rgba(180,83,9,0.4)",
                          color:"#fde68a", padding:"7px 11px", borderRadius:10,
                          cursor:"pointer", fontFamily:"sans-serif", fontSize:12,
                        }}>Sell 🪙{itemSellPrice(item)}</button>
                      </div>
                    </div>
                  ))}
                </div>
          )}
        </Card>

        {/* Collapsible Equipped Gears */}
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: eqOpen ? 14 : 0 }}>
            <div style={{ fontSize:18, fontWeight:"bold" }}>⚔️ Equipped</div>
            <button onClick={() => setEqOpen(v => !v)} style={{ background:"#4338ca", border:"none", color:"white", padding:"8px 14px", borderRadius:12, cursor:"pointer" }}>
              {eqOpen ? "▲ Close" : "▼ Open"}
            </button>
          </div>
          {eqOpen && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
              {["weapon", "accessory", "aura", "body_armor", "paw_gloves", "tail_enhancements", "head_gear"].map(slot => {
                const item = game.equipped[slot];
                return (
                  <div key={slot} style={{ background:"rgba(255,255,255,0.04)", padding:12, borderRadius:14, border:"1px solid rgba(139,92,246,0.15)" }}>
                    <div style={{ fontSize:11, letterSpacing:2, marginBottom:8, color:"#c4b5fd", fontWeight:"bold" }}>{slot.replace("_", " ").toUpperCase()}</div>
                    {item ? (
                      <div>
                        <div style={{ fontWeight:"bold", marginBottom:6 }}>
                          {item.ico} {itemDisplayName(item)}
                        </div>
                        <div style={{ fontSize:11, color:"#9ca3af", marginBottom:6 }}>
                          {item.desc}
                        </div>
                        <button onClick={() => {
                          setGame(g => {
                            const nextEquipped = { ...g.equipped };
                            nextEquipped[slot] = null;
                            return {
                              ...g,
                              inventory: [...g.inventory, item],
                              equipped: nextEquipped
                            };
                          });
                          notify("Item unequipped");
                        }} style={{
                          background:"rgba(100,30,0,0.4)", border:"none", color:"#fca5a5",
                          padding:"5px 10px", borderRadius:8, cursor:"pointer",
                          fontSize:11, fontFamily:"sans-serif",
                        }}>Unequip</button>
                      </div>
                    ) : (
                      <div style={{ opacity:0.4, fontSize:13 }}>Empty Slot</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Log history */}
        <Card>
          <div style={{ fontSize:18, fontWeight:"bold", marginBottom:12 }}>📜 Dream Log</div>
          {game.dreamLog.length === 0
            ? <div style={{ color:"#6d28d9", fontSize:14 }}>No logs recorded yet.</div>
            : <div style={{ display:"grid", gap:8 }}>
                {game.dreamLog.slice(0, 12).map((entry, i) => (
                  <div key={i} style={{ background:"rgba(255,255,255,0.04)", padding:10, borderRadius:10, fontSize:13 }}>
                    {entry}
                  </div>
                ))}
              </div>
          }
        </Card>

      </div>

      {/* Overlays / Popups */}
      {showScavenge && (
        <ScavengeGame
          luckBonus={luckBonus}
          onFinish={onScavengeFinish}
        />
      )}

      {game.battle && (
        <BattleOverlay
          game={game}
          totalAtk={totalAtk}
          totalMaxHp={totalMaxHp}
          totalMaxMp={totalMaxMp}
          onAttack={doAttack}
          onSkill={doSkill}
          onFlee={handleFleeBattle}
          setActiveModalInfo={setActiveModalInfo}
        />
      )}

      {game.voidData && !game.battle && (
        <VoidScreen
          game={game}
          totalMaxHp={totalMaxHp}
          totalMaxMp={totalMaxMp}
          onReenter={handleReenterDreamscape}
          onFleeNight={handleFleeVoid}
          onSleepMorning={handleSleepFromVoid}
          buyItem={buyMerchantItem}
          useItem={useItem}
          equipItem={equipItem}
          unequipItem={unequipItem}
          hasMaxForgedItem={hasMaxForgedItem}
        />
      )}

      {showUpgrade && (
        <SkillTreeModal
          game={game}
          onClose={() => setShowUpgrade(false)}
          onUpgrade={purchaseUpgrade}
          currentTier={currentTier}
          showBond={showBond}
        />
      )}

      {showSettings && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyValue:"center", padding:20, zIndex:999, overflowY:"auto", justifyContent:"center" }}>
          <div style={{ width:"100%", maxWidth:480, background:"#0d001f", borderRadius:24, padding:24, border:"1px solid rgba(139,92,246,0.3)" }}>
            <div style={{ fontSize:22, marginBottom:20, fontWeight:"bold", color:"#ddd6fe" }}>⚙️ Settings</div>
            <div style={{ marginBottom:20 }}>
              <div style={{ marginBottom:10, fontSize:14, color:"#a78bfa" }}>Bond Gauge</div>
              <button onClick={() => setShowBond(!showBond)} style={{ background:"#7c3aed", border:"none", color:"white", padding:"10px 14px", borderRadius:12, cursor:"pointer" }}>
                {showBond ? "Visible ✓" : "Hidden"}
              </button>
            </div>
            <div style={{ marginBottom:24 }}>
              <div style={{ marginBottom:10, fontSize:14, color:"#a78bfa" }}>Music Volume: {Math.round(musicVol * 100)}%</div>
              <input type="range" min="0" max="1" step="0.05" value={musicVol}
                onChange={e => setMusicVol(parseFloat(e.target.value))}
                style={{ width:"100%" }}
              />
            </div>
            <Btn color="#7c3aed" onClick={() => setShowSettings(false)}>Close</Btn>
          </div>
        </div>
      )}

      {activeModalInfo && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center",
          zIndex: 1100, padding: 20, fontFamily: "sans-serif", justifyContent: "center"
        }}>
          <div style={{
            background: "#1e1b4b", border: "1px solid #6d28d9",
            borderRadius: 20, padding: 24, maxWidth: 400, width: "100%",
            color: "#ddd6fe", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            marginTop: "auto", marginBottom: "auto"
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{activeModalInfo.ico || "✨"}</div>
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#fca5a5", marginBottom: 12 }}>{activeModalInfo.name}</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20, color: "#cbd5e1" }}>{activeModalInfo.desc}</div>
            <button onClick={() => setActiveModalInfo(null)} style={{
              background: "#7c3aed", color: "white", border: "none",
              padding: "10px 20px", borderRadius: 10, fontWeight: "bold",
              cursor: "pointer", fontSize: 13, minWidth: 100
            }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

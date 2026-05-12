import React, { useEffect, useMemo, useState } from "react";

/*
  DREAM GUARDIAN
  Stable Mobile-Safe Rebuild
  Single File React Version

  Features Included:
  ✓ Stable save/load system
  ✓ Mobile-safe architecture
  ✓ Responsive UI
  ✓ Dream cycle
  ✓ Inventory system
  ✓ Equipment system
  ✓ Merchant system
  ✓ Dream battles
  ✓ Audio-safe structure
  ✓ Autosave
  ✓ Crash-safe parsing
*/

const STORAGE_KEY = "dream_guardian_save_v2";

const ROOT_BG = "linear-gradient(to bottom, #090014, #140026, #090014)";

const defaultPlayer = {
  hp: 100,
  maxHp: 100,
  mp: 40,
  maxMp: 40,
  atk: 8,
  matk: 12,
  coins: 0,
  shards: 0,
  level: 1,
  exp: 0,
};
const introText = `
Alex never sleeps peacefully anymore.

Every night, something crawls through the Dreamscape.
Something hungry.

Luna began seeing the portal beneath the bed weeks ago.
A breathing violet tear hidden beneath reality itself.

Now every night is a battle.

Protect Alex.
Enter the Dreamscape.
Survive the nightmares.
`;

const defaultState = {
  day: 1,
  phase: "day",
  alexSleeping: false,
  mood: 1001,
  bond: 0,
  player: defaultPlayer,

  inventory: [],
  equipped: {
    weapon: null,
    accessory: null,
    aura: null,
    shards: 0,
    cash: 0,
    coins: 0
  },
  toast: "",
  merchantOpen: false,
  battle: null,
  dreamLog: [],
};

const items = [
  {
    id: "small_potion",
    name: "Small Potion",
    ico: "🧪",
    type: "consumable",
    price: 15,
    desc: "+30 HP",
    effect: { hp: 30 },
  },
  {
    id: "moon_blade",
    name: "Moon Blade",
    ico: "🗡",
    type: "equipment",
    slot: "weapon",
    price: 90,
    desc: "+4 ATK",
    effect: { atk: 4 },
  },
  {
    id: "dream_charm",
    name: "Dream Charm",
    ico: "🔮",
    type: "equipment",
    slot: "accessory",
    price: 75,
    desc: "+20 Max MP",
    effect: { maxMp: 20 },
  },
];

const enemies = [
  {
    id: "fogling",
    name: "Fogling",
    ico: "👁",
    hp: 40,
    atk: 6,
    reward: 20,
    exp: 10,
  },
  {
    id: "night_hound",
    name: "Night Hound",
    ico: "🐺",
    hp: 70,
    atk: 10,
    reward: 35,
    exp: 18,
  },
];

function safeLoad() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return defaultState;

    const parsed = JSON.parse(raw);

    return {
      ...defaultState,
      ...parsed,
      player: {
        ...defaultPlayer,
        ...(parsed.player || {}),
      },
    };
  } catch (err) {
    console.error("SAVE LOAD FAILED", err);
    return defaultState;
  }
}

function StatBar({ value, max, color }) {
  return (


    <div
      style={{
        width: "100%",
        height: 12,
        background: "rgba(255,255,255,0.08)",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${(value / max) * 100}%`,
          height: "100%",
          background: color,
          transition: "0.3s",
        }}
      />
    </div>
  );
}

function Card({ children }) {
  return (
    <div
      style={{
        background: "rgba(18,0,40,0.75)",
        border: "1px solid rgba(139,92,246,0.25)",
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        backdropFilter: "blur(8px)",
      }}
    >
      {children}
    </div>
  );
}

function Btn({ children, onClick, color = "#7c3aed", disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#555" : color,
        border: "none",
        color: "white",
        padding: "12px 16px",
        borderRadius: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: "bold",
        width: "100%",
      }}
    >
      {children}
    </button>
  );
}
const SKILL_TREE = {
  feral: [
    { id: 'f1', name: "Razor Claws", type: "Passive", stat: "ATK", baseValue: 5, desc: "Permanent boost to physical swipes." },
    { id: 'f2', name: "Midnight Pounce", type: "Active", stat: "DMG", baseValue: 20, desc: "High-speed strike from shadows." },
    { id: 'f3', name: "Adrenaline Purr", type: "Passive", stat: "SPD", baseValue: 10, desc: "Movement and dodge speed." },
    { id: 'f4', name: "Feral Reflex", type: "Passive", stat: "CRIT", baseValue: 5, desc: "Chance for 2x damage." },
    { id: 'f5', name: "Shadow Blend", type: "Active", stat: "STEALTH", baseValue: 1, desc: "Invisibility duration (seconds)." },
    { id: 'f6', name: "Ragdoll Bounce", type: "Passive", stat: "DEF", baseValue: 8, desc: "Reduces physical damage taken." },
    { id: 'f7', name: "Thrill of the Hunt", type: "Passive", stat: "VAMP", baseValue: 2, desc: "Heal % of damage dealt." },
    { id: 'f8', name: "Alpha Hiss", type: "Active", stat: "STUN", baseValue: 1.5, desc: "Stun duration on enemies." },
    { id: 'f9', name: "Scent Tracker", type: "Passive", stat: "LUCK", baseValue: 15, desc: "Better scavenging find rates." },
    { id: 'f10', name: "Feline Grace", type: "Passive", stat: "STAM", baseValue: 20, desc: "Reduces MP cost for physical skills." },
  ],
  hybrid: [
    { id: 'h1', name: "Lunar Spark", type: "Active", stat: "MAG", baseValue: 25, desc: "Pure magic projectile (90% Mag)." },
    { id: 'h2', name: "Aura of Devotion", type: "Passive", stat: "REGEN", baseValue: 5, desc: "Passive MP regeneration per turn." },
    { id: 'h3', name: "Violet Tear", type: "Active", stat: "AOE", baseValue: 40, desc: "Explosion hitting all enemies." },
    { id: 'h4', name: "Guardian’s Resolve", type: "Passive", stat: "MDEF", baseValue: 12, desc: "Magic damage resistance." },
    { id: 'h5', name: "Star-Touched Nails", type: "Passive", stat: "PEN", baseValue: 10, desc: "Ignore % of enemy defense." },
    { id: 'h6', name: "Warp Step", type: "Active", stat: "DODGE", baseValue: 25, desc: "Teleport to avoid the next attack." },
    { id: 'h7', name: "Echoing Meow", type: "Active", stat: "DEBUFF", baseValue: 15, desc: "Reduce enemy ATK for 3 turns." },
    { id: 'h8', name: "Astral Fur", type: "Passive", stat: "MAXMP", baseValue: 50, desc: "Massive boost to Mana pool." },
    { id: 'h9', name: "Bond Flare", type: "Active", stat: "ULT", baseValue: 100, desc: "Consumes Bond for screen-wipe." },
    { id: 'h10', name: "Dreamweaver", type: "Passive", stat: "EXP", baseValue: 20, desc: "Gain more EXP from nightmares." },
  ]
};


export default function DreamGuardian() {
  const [game, setGame] = useState(safeLoad);
  // Formula for Price (x2) and Power (x1.8)
  function getSkillStats(baseValue, currentLevel) {
    const price = 10 * Math.pow(2, currentLevel);
    const power = baseValue * Math.pow(1.8, currentLevel);
    return { price: Math.floor(price), power: Math.floor(power) };
  }

  // The function to actually buy the upgrade
  function purchaseUpgrade(skillId, price) {
    if ((game.player.shards || 0) < price) {
      notify("Not enough Dream Shards 💎");
      return;
    }
    setGame((g) => ({
      ...g,
      player: { ...g.player, shards: g.player.shards - price },
      upgrades: { ...g.upgrades, [skillId]: (g.upgrades?.[skillId] || 0) + 1 },
    }));
    notify("Skill Upgraded! ✨");
  }

  const [showIntro, setShowIntro] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showBond, setShowBond] = useState(true);
  const [musicVol, setMusicVol] = useState(0.5);
  const [scavengedToday, setScavengedToday] = useState(false);

  const getMoodDetails = (pts) => {
    if (pts > 1000) return { label: "Tier 3: Awesome", color: "#60a5fa", bonus: "High" };
    if (pts > 500) return { label: "Tier 2: Stressed", color: "#fbbf24", bonus: "Normal" };
    return { label: "Tier 1: Deprived", color: "#ef4444", bonus: "None" };
    <Card>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
    <span style={{ 
      color: game.mood > 1000 ? '#60a5fa' : game.mood > 500 ? '#fbbf24' : '#ef4444',
      fontWeight: 'bold' 
    }}>
      {game.mood > 1000 ? "Tier 3: Awesome" : game.mood > 500 ? "Tier 2: Stressed" : "Tier 1: Deprived"}
    </span>
    <span>{game.mood} / 1500</span>
  </div>
  <StatBar 
    value={game.mood} 
    max={1500} 
    color="linear-gradient(90deg, #3b82f6, #60a5fa)" 
  />
</Card>

  };

  const equippedStats = useMemo(() => {
    const eq = Object.values(game.equipped).filter(Boolean);

    return eq.reduce(
      (acc, item) => {
        Object.entries(item.effect || {}).forEach(([k, v]) => {
          acc[k] = (acc[k] || 0) + v;
        });

        return acc;
      },
      {}
    );
  }, [game.equipped]);

  const currentTier = useMemo(() => getMoodDetails(game.mood), [game.mood]);

  const totalAtk = game.player.atk + (equippedStats.atk || 0);
  const totalMaxMp = game.player.maxMp + (equippedStats.maxMp || 0);

  function notify(msg) {
    setGame((g) => ({ ...g, toast: msg }));

    setTimeout(() => {
      setGame((g) => ({ ...g, toast: "" }));
    }, 2400);
  }

  useEffect(() => {
    const saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
      } catch (err) {
        console.error(err);
      }
    }, 500);

    return () => clearTimeout(saveTimer);
  }, [game]);

  function manualSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
      notify("Game Saved 💾");
    } catch (err) {
      notify("Save failed");
    }
  }

  function manualLoad() {
    const loaded = safeLoad();
    setGame(loaded);
    notify("Save Loaded 📂");
  }

  function deleteSave() {
    localStorage.removeItem(STORAGE_KEY);
    setGame(defaultState);
    notify("Save Deleted 🗑");
  }

  function buyItem(item) {
    if (game.player.coins < item.price) {
      notify("Not enough coins");
      return;
    }

    setGame((g) => ({
      ...g,
      player: {
        ...g.player,
        coins: g.player.coins - item.price,
      },
      inventory: [...g.inventory, { ...item, uid: Date.now() }],
    }));

    notify(`${item.name} purchased`);
  }

  function useItem(item) {
    if (item.type !== "consumable") return;

    setGame((g) => ({
      ...g,
      player: {
        ...g.player,
        hp: Math.min(g.player.maxHp, g.player.hp + (item.effect.hp || 0)),
      },
      inventory: g.inventory.filter((i) => i.uid !== item.uid),
    }));

    notify(`${item.name} used`);
  }

  function equipItem(item) {
    if (item.type !== "equipment") return;

    setGame((g) => ({
      ...g,
      equipped: {
        ...g.equipped,
        [item.slot]: item,
      },
    }));

    notify(`${item.name} equipped ⚔`);
  }
  function talkToAlex() {
    const isGoodMood = game.mood > 1000;

    // Math A: Bond gain logic based on Pillar 11 (Normal vs. Stressed)
    const bondGain = isGoodMood ? 2 : 1;
    const moodGain = isGoodMood ? 3 : 1;

    setGame((g) => ({
      ...g,
      mood: Math.min(1500, g.mood + moodGain),
      // Halt bond gain completely if in Tier 1 (Deprived)
      bond: g.mood > 500 ? Math.min(200, g.bond + bondGain) : g.bond,
    }));

    if (game.mood <= 500) {
      notify("Alex is too tired to connect right now... 🌙");
    } else {
      notify(isGoodMood ? "Alex smiled! Bond increased. ✨" : "Alex is stressed, but your presence helps.");
    }
  }

function scavengeApartment() {
  if (scavengedToday) {
    notify("Luna already scavenged today.");
    return;
  }

  const found = Math.floor(Math.random() * 18) + 6;

  setGame((g) => ({
    ...g,
    player: {
      ...g.player,
      coins: g.player.coins + found,
    },
  }));

  setScavengedToday(true);

  notify(`Luna found ${found} coins 🪙`);
}
function startNight() {
  setGame((g) => ({
    ...g,
    phase: "night",
    alexSleeping: true,
  }));

  notify("Night falls across the apartment 🌙");
}

function startDay() {
    setGame((g) => ({
      ...g,
      phase: "day",
      alexSleeping: false,
      day: g.day + 1,
      // Pillar #13: Daily Reset
      player: {
        ...g.player,
        hp: g.player.maxHp,
        mp: totalMaxMp, // Uses the calculation we added earlier
      },
      // Pillar #9: Alex loses a bit of mood naturally overnight
      mood: Math.max(0, g.mood - 10),
    }));

    setScavengedToday(false);
    notify("Morning arrives. Luna is fully rested! ☀");
  }

function enterDreamscape() {
  const enemy = enemies[Math.floor(Math.random() * enemies.length)];

  setGame((g) => ({
    ...g,
    battle: {
      enemy: { ...enemy },
    },
  }));

  notify(`${enemy.name} emerged from the fog`);
}

function attackEnemy() {
  if (!game.battle) return;

  const dmg = totalAtk + Math.floor(Math.random() * 6);

  const newEnemyHp = game.battle.enemy.hp - dmg;

  if (newEnemyHp <= 0) {
    victory();
    return;
  }

  const enemyDmg = game.battle.enemy.atk;

  const newPlayerHp = Math.max(0, game.player.hp - enemyDmg);

  if (newPlayerHp <= 0) {
    defeat();
    return;
  }

  setGame((g) => ({
    ...g,
    player: {
      ...g.player,
      hp: newPlayerHp,
    },
    battle: {
      enemy: {
        ...g.battle.enemy,
        hp: newEnemyHp,
      },
    },
  }));
}

  function victory() {
    const enemy = game.battle.enemy;

    setGame((g) => ({
      ...g,
      battle: null,
      player: {
        ...g.player,
        coins: g.player.coins + enemy.reward,
        exp: g.player.exp + enemy.exp,
        shards: (g.player.shards || 0) + 1,
      },
      dreamLog: [
        `${enemy.name} defeated on Night ${g.day}`,
        ...g.dreamLog,
      ],
    }));

    notify(`Victory ✨ +${enemy.reward} coins`);
  }


function defeat() {
  setGame((g) => ({
    ...g,
    battle: null,
    player: {
      ...g.player,
      hp: Math.floor(g.player.maxHp * 0.5),
    },
    mood: Math.max(0, g.mood - 10),
  }));

  notify("Luna escaped the nightmare...");
}
if (showIntro) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: ROOT_BG,
        color: "#ddd6fe",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 700,
          background: "rgba(10,0,30,0.85)",
          border: "1px solid rgba(139,92,246,0.25)",
          borderRadius: 24,
          padding: 28,
        }}
      >
        <div
          style={{
            fontSize: 13,
            letterSpacing: 5,
            color: "#8b5cf6",
            marginBottom: 12,
          }}
        >
          DREAM GUARDIAN
        </div>

        <div
          style={{
            fontSize: 42,
            fontWeight: "bold",
            marginBottom: 18,
          }}
        >
          🌙 Luna & Alex
        </div>

        <div
          style={{
            lineHeight: 2,
            fontSize: 15,
            color: "#c4b5fd",
            whiteSpace: "pre-line",
            marginBottom: 24,
          }}
        >
          {introText}
        </div>

        <button
          onClick={() => setShowIntro(false)}
          style={{
            width: "100%",
            background: "#7c3aed",
            border: "none",
            color: "white",
            padding: "16px",
            borderRadius: 16,
            fontSize: 16,
            fontWeight: "bold",
          }}
        >
          ✨ Enter The Dreamscape
        </button>
      </div>
    </div>
  );
}
return (
  <div
    style={{
      minHeight: "100vh",
      background: ROOT_BG,
      color: "#ddd6fe",
      fontFamily: "sans-serif",
      padding: 16,
      boxSizing: "border-box",
    }}
  >
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: 4,
              color: "#8b5cf6",
            }}
          >
            DREAM GUARDIAN
          </div>

          <div style={{ fontSize: 32, fontWeight: "bold" }}>
            🌙 Luna & Alex
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              background: "#5b21b6",
              color: "white",
              border: "none",
              padding: "10px 14px",
              borderRadius: 12,
            }}
          >
            ⚙
          </button>
          <button
            onClick={manualSave}
            style={{
              background: "#166534",
              color: "white",
              border: "none",
              padding: "10px 14px",
              borderRadius: 12,
            }}
          >
            💾 Save
          </button>

          <button
            onClick={manualLoad}
            style={{
              background: "#4338ca",
              color: "white",
              border: "none",
              padding: "10px 14px",
              borderRadius: 12,
            }}
          >
            📂 Load
          </button>

          <button
            onClick={deleteSave}
            style={{
              background: "#7f1d1d",
              color: "white",
              border: "none",
              padding: "10px 14px",
              borderRadius: 12,
            }}
          >
            🗑
          </button>
        </div>
      </div>

      {game.toast && (
        <div
          style={{
            background: "rgba(90,40,180,0.4)",
            padding: 12,
            borderRadius: 14,
            marginBottom: 14,
            textAlign: "center",
          }}
        >
          {game.toast}
        </div>
      )}

      <Card>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          <div>
            <div style={{ marginBottom: 6 }}>❤️ HP</div>
            <StatBar
              value={game.player.hp}
              max={game.player.maxHp}
              color="#ef4444"
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>🔮 MP</div>
            <StatBar
              value={game.player.mp}
              max={totalMaxMp}
              color="#8b5cf6"
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
            gap: 10,
          }}
        >
          <div>🪙 {game.player.coins}</div>
          <div>💎 {game.player.shards || 0}</div>
          <div>📅 Day {game.day}</div>
        </div>
      </Card>
      {showBond && (
        <Card>
          <div style={{ marginBottom: 8, fontSize: 14, color: '#f472b6', fontWeight: 'bold' }}>
            💖 Luna & Alex Bond: {game.bond}%
          </div>
          <StatBar
            value={game.bond}
            max={100}
            color="linear-gradient(90deg, #db2777, #f472b6)"
          />
          <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>
            The stronger the bond, the more Alex's nightmares fade.
          </div>
        </Card>
      )}


      <Card>
        <div style={{ fontSize: 20, marginBottom: 12 }}>
          Apartment Cycle
          {game.phase === "day" && (
            <div style={{ marginBottom: 14 }}>
              <Btn
                color="#2563eb"
                onClick={scavengeApartment}
                disabled={scavengedToday}
              >
                🔍 Scavenge Apartment
              </Btn>
              <Btn color="#ec4899" onClick={talkToAlex}>
                💬 Talk to Alex
              </Btn>
            </div>
          )}
        </div>

        {game.phase === "day" ? (
          <div>
            <div style={{ marginBottom: 14, lineHeight: 1.8 }}>
              Alex heads out during the day while Luna quietly watches the
              apartment windows glow.
            </div>

            <Btn color="#4338ca" onClick={startNight}>
              🌙 Transition To Night
            </Btn>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 14, lineHeight: 1.8 }}>
              The portal beneath the bed breathes with violet light.
            </div>

            {!game.battle ? (
              <div style={{ display: "grid", gap: 10 }}>
                <Btn onClick={enterDreamscape}>
                  ✨ Enter Dreamscape
                </Btn>

                <Btn color="#0f766e" onClick={startDay}>
                  ☀ Sleep Until Morning
                </Btn>
              </div>
            ) : (
              <Card>
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 44 }}>
                    {game.battle.enemy.ico}
                  </div>

                  <div style={{ fontSize: 24 }}>
                    {game.battle.enemy.name}
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>Enemy HP</div>

                <StatBar
                  value={game.battle.enemy.hp}
                  max={100}
                  color="#f97316"
                />

                <div style={{ marginTop: 16 }}>
                  <Btn color="#dc2626" onClick={attackEnemy}>
                    ⚔ Attack
                  </Btn>
                </div>
              </Card>
            )}
          </div>
        )}
      </Card>

      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 20 }}>🐭 Merchant</div>

          <button
            onClick={() =>
              setGame((g) => ({
                ...g,
                merchantOpen: !g.merchantOpen,
              }))
            }
            style={{
              background: "#7c3aed",
              border: "none",
              color: "white",
              padding: "8px 14px",
              borderRadius: 12,
            }}
          >
            {game.merchantOpen ? "Close" : "Open"}
          </button>
        </div>

        {game.merchantOpen && (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  padding: 12,
                  borderRadius: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold" }}>
                    {item.ico} {item.name}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.8,
                      marginTop: 4,
                    }}
                  >
                    {item.desc}
                  </div>
                </div>

                <div style={{ minWidth: 120 }}>
                  <Btn
                    color="#16a34a"
                    onClick={() => buyItem(item)}
                  >
                    🪙 {item.price}
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 20 }}>
            ✨ Luna Upgrades
          </div>

          <button
            onClick={() => setShowUpgrade(true)}
            style={{
              background: "#7c3aed",
              border: "none",
              color: "white",
              padding: "10px 16px",
              borderRadius: 12,
            }}
          >
            Open Tree
          </button>
        </div>

        <div style={{ lineHeight: 1.8 }}>
          Feral Form: 0 / 60
          <br />
          Hybrid Form: 0 / 60
        </div>
      </Card>
      <Card>
        <div style={{ fontSize: 20, marginBottom: 12 }}>
          🎒 Inventory
        </div>

        {game.inventory.length === 0 ? (
          <div>No items collected yet.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {game.inventory.map((item) => (
              <div
                key={item.uid}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  padding: 12,
                  borderRadius: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "bold" }}>
                      {item.ico} {item.name}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.8,
                        marginTop: 4,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {item.type === "consumable" && (
                      <button
                        onClick={() => useItem(item)}
                        style={{
                          background: "#0f766e",
                          border: "none",
                          color: "white",
                          padding: "8px 12px",
                          borderRadius: 10,
                        }}
                      >
                        Use
                      </button>
                    )}

                    {item.type === "equipment" && (
                      <button
                        onClick={() => equipItem(item)}
                        style={{
                          background: "#7c3aed",
                          border: "none",
                          color: "white",
                          padding: "8px 12px",
                          borderRadius: 10,
                        }}
                      >
                        Equip
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: 20, marginBottom: 12 }}>
          ⚔ Equipped
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: 12,
          }}
        >
          {Object.entries(game.equipped).map(([slot, item]) => (
            <div
              key={slot}
              style={{
                background: "rgba(255,255,255,0.04)",
                padding: 12,
                borderRadius: 14,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 2,
                  marginBottom: 8,
                  color: "#a78bfa",
                }}
              >
                {slot.toUpperCase()}
              </div>

              {item ? (
                <div>
                  <div style={{ fontWeight: "bold" }}>
                    {item.ico} {item.name}
                  </div>
                </div>
              ) : (
                <div style={{ opacity: 0.6 }}>Empty Slot</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 20, marginBottom: 12 }}>
          📜 Dream Log
        </div>

        {game.dreamLog.length === 0 ? (
          <div>No dream entries recorded.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {game.dreamLog.map((entry, index) => (
              <div
                key={index}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  padding: 10,
                  borderRadius: 10,
                }}
              >
                {entry}
              </div>
            ))}
          </div>
        )}
      </Card>
      {showSettings && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 999,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 500,
              background: "#140026",
              borderRadius: 24,
              padding: 24,
              border: "1px solid rgba(139,92,246,0.3)",
            }}
          >
            <div
              style={{
                fontSize: 24,
                marginBottom: 20,
              }}
            >
              ⚙ Settings
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 10 }}>
                Bond Gauge
              </div>

              <button
                onClick={() => setShowBond(!showBond)}
                style={{
                  background: "#7c3aed",
                  border: "none",
                  color: "white",
                  padding: "10px 14px",
                  borderRadius: 12,
                }}
              >
                {showBond ? "Visible" : "Hidden"}
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 10 }}>
                Music Volume
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVol}
                onChange={(e) =>
                  setMusicVol(parseFloat(e.target.value))
                }
                style={{
                  width: "100%",
                }}
              />
            </div>

            <Btn
              color="#7c3aed"
              onClick={() => setShowSettings(false)}
            >
              Close
            </Btn>
          </div>
        </div>
      )}
      {showUpgrade && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            overflowY: "auto",
            padding: 20,
            zIndex: 999,
          }}
        >
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              background: "#140026",
              borderRadius: 24,
              padding: 24,
            }}
          >
            <div
              style={{
                fontSize: 30,
                marginBottom: 20,
              }}
            >
              ✨ Luna Upgrade Tree
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 22,
                    marginBottom: 14,
                    color: "#f59e0b",
                  }}
                >
                  🐺 Feral Form
                </div>

                {SKILL_TREE.feral.map((skill, i) => (
                  <div key={skill.id ?? i} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: "bold" }}>
                      {skill.name}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {skill.desc}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div
                  style={{
                    fontSize: 22,
                    marginBottom: 14,
                    color: "#8b5cf6",
                  }}
                >
                  🌙 Hybrid Form
                </div>

                {SKILL_TREE.hybrid.map((skill, i) => (
                  <div key={skill.id ?? i} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: "bold" }}>
                      {skill.name}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {skill.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 'bold', color: currentTier.color }}>{currentTier.label}</span>
                <span style={{ fontSize: 12 }}>{game.mood} / 1500 pts</span>
              </div>
              {/* The bar fills from the top down visually based on your reverse logic */}
              <StatBar value={game.mood} max={1500} color={currentTier.color} />

              {showBond && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>💖 Bond: {game.bond} / 200</div>
                  <StatBar value={game.bond} max={200} color="#f472b6" />
                </div>
              )}
            </Card>
            <div style={{ marginTop: 20 }}>
              <Btn color="#7c3aed" onClick={() => setShowUpgrade(false)}>
                Close
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div> {/* Closes the modal container */}
  </div>
)
}


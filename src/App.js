import React, { useEffect, useMemo, useState } from "react";

// ── Constants ────────────────────────────────────────────────────────
const STORAGE_KEY = "dream_guardian_save_v3";
const ROOT_BG = "linear-gradient(to bottom, #090014, #140026, #090014)";

const defaultPlayer = {
  hp: 100, maxHp: 100, mp: 40, maxMp: 40,
  atk: 8, matk: 12, coins: 0, shards: 0, level: 1, exp: 0,
};

const introText =
`Alex never sleeps peacefully anymore.

Every night, something crawls through the Dreamscape.
Something hungry.

Luna began seeing the portal beneath the bed weeks ago.
A breathing violet tear hidden beneath reality itself.

Now every night is a battle.

Protect Alex.
Enter the Dreamscape.
Survive the nightmares.`;

const defaultState = {
  day: 1, phase: "day", alexSleeping: false,
  mood: 1001, bond: 0,
  player: defaultPlayer,
  inventory: [],
  equipped: { weapon: null, accessory: null, aura: null },
  toast: "",
  merchantOpen: false,
  battle: null,
  dreamLog: [],
  upgrades: {},
  talkedToday: false,
  scavengedToday: false,
};

const SHOP_ITEMS = [
  { id: "small_potion", name: "Small Potion", ico: "🧪", type: "consumable", price: 15, desc: "+30 HP", effect: { hp: 30 } },
  { id: "moon_blade",   name: "Moon Blade",   ico: "🗡️", type: "equipment",  slot: "weapon",    price: 90,  desc: "+4 ATK",     effect: { atk: 4 } },
  { id: "dream_charm",  name: "Dream Charm",  ico: "🔮", type: "equipment",  slot: "accessory", price: 75,  desc: "+20 Max MP", effect: { maxMp: 20 } },
  { id: "star_shard",   name: "Star Shard",   ico: "⭐", type: "consumable", price: 40,  desc: "+25 MP", effect: { mp: 25 } },
];

const ENEMIES = [
  { id: "fogling",     name: "Fogling",     ico: "👁️", hp: 40, maxHp: 40, atk: 6,  reward: 20, exp: 10 },
  { id: "night_hound", name: "Night Hound", ico: "🐺", hp: 70, maxHp: 70, atk: 10, reward: 35, exp: 18 },
  { id: "shade_wraith",name: "Shade Wraith",ico: "👻", hp: 55, maxHp: 55, atk: 8,  reward: 28, exp: 14 },
];

const SKILL_TREE = {
  feral: [
    { id: "f1",  name: "Razor Claws",      type: "Passive", stat: "ATK",     baseValue: 5,   desc: "Permanent boost to physical ATK." },
    { id: "f2",  name: "Midnight Pounce",  type: "Active",  stat: "DMG",     baseValue: 20,  mpCost: 8,  desc: "High-speed strike. Deals ATK×1.5 damage." },
    { id: "f3",  name: "Adrenaline Purr",  type: "Passive", stat: "SPD",     baseValue: 10,  desc: "Movement and dodge speed." },
    { id: "f4",  name: "Feral Reflex",     type: "Passive", stat: "CRIT",    baseValue: 5,   desc: "Chance for critical hit (2× damage)." },
    { id: "f5",  name: "Shadow Blend",     type: "Active",  stat: "STEALTH", baseValue: 1,   mpCost: 12, desc: "Skip the enemy's attack this turn." },
    { id: "f6",  name: "Ragdoll Bounce",   type: "Passive", stat: "DEF",     baseValue: 8,   desc: "Reduces physical damage taken." },
    { id: "f7",  name: "Thrill of Hunt",   type: "Passive", stat: "VAMP",    baseValue: 2,   desc: "Heal a % of damage dealt." },
    { id: "f8",  name: "Alpha Hiss",       type: "Active",  stat: "DEBUFF",  baseValue: 4,   mpCost: 10, desc: "Reduce enemy ATK by 4 for 2 turns." },
    { id: "f9",  name: "Scent Tracker",    type: "Passive", stat: "LUCK",    baseValue: 15,  desc: "Better scavenging find rates." },
    { id: "f10", name: "Feline Grace",     type: "Passive", stat: "STAM",    baseValue: 20,  desc: "Reduces MP cost for physical skills." },
  ],
  hybrid: [
    { id: "h1",  name: "Lunar Spark",      type: "Active",  stat: "MAG",     baseValue: 25,  mpCost: 12, desc: "Magic projectile. Deals MATK×1.4 damage." },
    { id: "h2",  name: "Aura of Devotion", type: "Passive", stat: "REGEN",   baseValue: 5,   desc: "Passive MP regen (+3) after each attack." },
    { id: "h3",  name: "Violet Tear",      type: "Active",  stat: "AOE",     baseValue: 40,  mpCost: 20, desc: "Massive explosion. MATK×2.0 damage." },
    { id: "h4",  name: "Guardian's Resolve",type:"Passive", stat: "MDEF",    baseValue: 12,  desc: "Magic damage resistance." },
    { id: "h5",  name: "Star-Touched Nails",type:"Passive", stat: "PEN",     baseValue: 10,  desc: "Ignore % of enemy defense." },
    { id: "h6",  name: "Warp Step",        type: "Active",  stat: "DODGE",   baseValue: 25,  mpCost: 15, desc: "Dodge this turn + MATK×0.8 counter." },
    { id: "h7",  name: "Echoing Meow",     type: "Active",  stat: "DEBUFF",  baseValue: 15,  mpCost: 10, desc: "Reduce enemy ATK by 5 for 3 turns." },
    { id: "h8",  name: "Astral Fur",       type: "Passive", stat: "MAXMP",   baseValue: 50,  desc: "Massive boost to Mana pool." },
    { id: "h9",  name: "Bond Flare",       type: "Active",  stat: "ULT",     baseValue: 100, mpCost: 30, desc: "Channels Bond energy for massive damage." },
    { id: "h10", name: "Dreamweaver",      type: "Passive", stat: "EXP",     baseValue: 20,  desc: "Gain more EXP from nightmares." },
  ],
};

const ALL_ACTIVE_SKILLS = [
  ...SKILL_TREE.feral.filter(s => s.type === "Active"),
  ...SKILL_TREE.hybrid.filter(s => s.type === "Active"),
];

// ── Utilities ────────────────────────────────────────────────────────
function getSkillStats(baseValue, level) {
  return {
    price: Math.floor(10 * Math.pow(2, level)),
    power: Math.floor(baseValue * Math.pow(1.8, level)),
  };
}

function getMoodDetails(pts) {
  if (pts > 1000) return { label: "Tier 3: Awesome",   color: "#60a5fa" };
  if (pts > 500)  return { label: "Tier 2: Stressed",  color: "#fbbf24" };
  return              { label: "Tier 1: Deprived",  color: "#ef4444" };
}

function safeLoad() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const p = JSON.parse(raw);
    return {
      ...defaultState, ...p,
      player:   { ...defaultPlayer, ...(p.player || {}) },
      equipped: { weapon: null, accessory: null, aura: null, ...(p.equipped || {}) },
      upgrades: p.upgrades || {},
    };
  } catch { return defaultState; }
}

// ── Shared UI ────────────────────────────────────────────────────────
function StatBar({ value, max, color = "#8b5cf6" }) {
  const pct = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
  return (
    <div style={{ width: "100%", height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s" }} />
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "rgba(18,0,40,0.75)", border: "1px solid rgba(139,92,246,0.25)",
      borderRadius: 18, padding: 16, marginBottom: 14, ...style,
    }}>{children}</div>
  );
}

function Btn({ children, onClick, color = "#7c3aed", disabled, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "rgba(70,70,70,0.4)" : color,
      border: "none", color: disabled ? "#666" : "white",
      padding: small ? "8px 12px" : "11px 16px",
      borderRadius: 12, cursor: disabled ? "not-allowed" : "pointer",
      fontWeight: "bold", width: "100%", fontSize: small ? 13 : 14,
      fontFamily: "sans-serif",
    }}>{children}</button>
  );
}

// ── Scavenge Mini-game ────────────────────────────────────────────────
function ScavengeGame({ luckBonus, onFinish }) {
  const [boxes] = useState(() => {
    const base = 5 + Math.floor(luckBonus * 0.1);
    const vals = Array.from({ length: 10 }, (_, i) =>
      i < 5 ? Math.floor(Math.random() * (21 + base)) + 5 : 0
    ).sort(() => Math.random() - 0.5);
    return vals.map(v => ({ value: v, revealed: false }));
  });
  const [revealed, setRevealed] = useState(Array(10).fill(false));
  const [done, setDone] = useState(false);

  const collected = boxes.reduce((s, b, i) => s + (revealed[i] ? b.value : 0), 0);

  function flip(idx) {
    if (revealed[idx] || done) return;
    setRevealed(prev => prev.map((r, i) => i === idx ? true : r));
  }

  function revealAll() {
    setRevealed(Array(10).fill(true));
    setDone(true);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, zIndex: 1000, fontFamily: "sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 460,
        background: "#0d001f", border: "1px solid rgba(139,92,246,0.4)",
        borderRadius: 24, padding: 24,
      }}>
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#ddd6fe", marginBottom: 4 }}>
          🔍 Scavenge Apartment
        </div>
        <div style={{ fontSize: 13, color: "#a78bfa", marginBottom: 20 }}>
          Tap boxes to reveal. Some hold coins — some hold nothing!
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 18 }}>
          {boxes.map((box, i) => (
            <button key={i} onClick={() => flip(i)} disabled={revealed[i] || done} style={{
              aspectRatio: "1", borderRadius: 14, fontFamily: "sans-serif",
              background: revealed[i]
                ? box.value > 0 ? "rgba(250,204,21,0.12)" : "rgba(255,255,255,0.03)"
                : "rgba(109,40,217,0.25)",
              border: revealed[i]
                ? box.value > 0 ? "1px solid rgba(250,204,21,0.55)" : "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(139,92,246,0.55)",
              cursor: revealed[i] || done ? "default" : "pointer",
              fontSize: revealed[i] ? (box.value > 0 ? 13 : 20) : 22,
              color: revealed[i] ? (box.value > 0 ? "#fde68a" : "#444") : "#c4b5fd",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              transition: "all 0.18s",
            }}>
              {revealed[i] ? (box.value > 0 ? <><span style={{ fontSize: 16 }}>🪙</span>{box.value}</> : "✕") : "❓"}
            </button>
          ))}
        </div>

        <div style={{
          background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 14px",
          marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <span style={{ color: "#fbbf24", fontWeight: "bold", fontSize: 20 }}>🪙 {collected}</span>
          <span style={{ color: "#a78bfa", fontSize: 13 }}>coins found so far</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Btn color="#4338ca" onClick={revealAll} disabled={done}>✨ Reveal All</Btn>
          <Btn color="#166534" onClick={() => onFinish(collected)}>✓ Collect & Stop</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Battle Overlay ────────────────────────────────────────────────────
function BattleOverlay({ game, totalAtk, totalMaxMp, onAttack, onSkill, onFlee }) {
  const { battle, player, upgrades = {} } = game;
  if (!battle) return null;

  const { enemy } = battle;
  const battleLog = battle.log || [];

  const passivesActive = [
    ...SKILL_TREE.feral.filter(s => s.type === "Passive"),
    ...SKILL_TREE.hybrid.filter(s => s.type === "Passive"),
  ].filter(s => (upgrades[s.id] || 0) > 0);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(to bottom, #03000c, #100020, #03000c)",
      display: "flex", flexDirection: "column", padding: "16px 16px 20px",
      zIndex: 1000, fontFamily: "sans-serif", overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: 5, color: "#6d28d9" }}>DREAMSCAPE BATTLE</div>
        <div style={{ fontSize: 20, fontWeight: "bold", color: "#ddd6fe" }}>⚔️ Night {game.day}</div>
      </div>

      {/* Arena */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8,
        maxWidth: 680, margin: "0 auto", width: "100%", marginBottom: 14,
      }}>
        {/* Enemy Side */}
        <div style={{
          background: "rgba(220,38,38,0.07)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 18, padding: "14px 12px", textAlign: "center",
        }}>
          <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 6 }}>{enemy.ico}</div>
          <div style={{ fontWeight: "bold", fontSize: 15, color: "#fca5a5", marginBottom: 10 }}>{enemy.name}</div>
          {(enemy.debuffAtk > 0) && (
            <div style={{ fontSize: 11, color: "#fb923c", marginBottom: 6, padding: "2px 8px", background: "rgba(251,146,60,0.12)", borderRadius: 8, display: "inline-block" }}>
              ↓ ATK -{enemy.debuffAtk} ({enemy.debuffTurns}t)
            </div>
          )}
          <div style={{ fontSize: 11, color: "#fca5a5", marginBottom: 5 }}>
            ❤️ {Math.max(0, enemy.hp)} / {enemy.maxHp}
          </div>
          <StatBar value={Math.max(0, enemy.hp)} max={enemy.maxHp} color="#ef4444" />
        </div>

        {/* VS */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
          <span style={{ fontSize: 18, color: "#581c87", fontWeight: "bold" }}>VS</span>
        </div>

        {/* Luna Side */}
        <div style={{
          background: "rgba(109,40,217,0.08)", border: "1px solid rgba(139,92,246,0.25)",
          borderRadius: 18, padding: "14px 12px", textAlign: "center",
        }}>
          <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 6 }}>🐱</div>
          <div style={{ fontWeight: "bold", fontSize: 15, color: "#c4b5fd", marginBottom: 10 }}>Luna</div>
          {battle.dodgeActive && (
            <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 6, padding: "2px 8px", background: "rgba(139,92,246,0.15)", borderRadius: 8, display: "inline-block" }}>
              ⚡ Dodge Ready
            </div>
          )}
          <div style={{ fontSize: 11, color: "#fca5a5", marginBottom: 5 }}>
            ❤️ {player.hp} / {player.maxHp}
          </div>
          <StatBar value={player.hp} max={player.maxHp} color="#ef4444" />
          <div style={{ fontSize: 11, color: "#a78bfa", margin: "8px 0 5px" }}>
            🔮 {player.mp} / {totalMaxMp}
          </div>
          <StatBar value={player.mp} max={totalMaxMp} color="#8b5cf6" />
        </div>
      </div>

      {/* Battle Log */}
      {battleLog.length > 0 && (
        <div style={{
          maxWidth: 680, margin: "0 auto", width: "100%", marginBottom: 12,
          background: "rgba(0,0,0,0.45)", borderRadius: 12, padding: "8px 12px",
        }}>
          {battleLog.slice(0, 4).map((entry, i) => (
            <div key={i} style={{ fontSize: 12, color: "#ddd6fe", padding: "2px 0", opacity: i === 0 ? 1 : 0.4 - i * 0.05 }}>
              {entry}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ maxWidth: 680, margin: "0 auto", width: "100%" }}>
        {/* Normal Attack */}
        <div style={{ marginBottom: 10 }}>
          <Btn color="#b91c1c" onClick={onAttack}>
            ⚔️ Attack  (Physical · ATK {totalAtk})
          </Btn>
        </div>

        {/* Active Skills */}
        <div style={{ fontSize: 11, color: "#6d28d9", letterSpacing: 2, marginBottom: 6 }}>ACTIVE SKILLS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {ALL_ACTIVE_SKILLS.map(skill => {
            const canUse = player.mp >= skill.mpCost;
            const lv = upgrades[skill.id] || 0;
            return (
              <button key={skill.id} onClick={() => canUse && onSkill(skill)} disabled={!canUse}
                style={{
                  background: canUse ? "rgba(91,33,182,0.25)" : "rgba(50,50,50,0.2)",
                  border: `1px solid ${canUse ? "rgba(139,92,246,0.45)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 12, padding: "10px 12px",
                  color: canUse ? "#ddd6fe" : "#555",
                  cursor: canUse ? "pointer" : "not-allowed",
                  textAlign: "left", fontFamily: "sans-serif",
                  transition: "background 0.15s",
                }}>
                <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 3 }}>{skill.name}</div>
                <div style={{ fontSize: 11, display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{
                    background: canUse ? "rgba(139,92,246,0.3)" : "rgba(80,80,80,0.3)",
                    padding: "1px 7px", borderRadius: 8,
                    color: canUse ? "#a78bfa" : "#555",
                  }}>🔮 {skill.mpCost} MP</span>
                  {lv > 0 && <span style={{ color: "#fde68a", fontSize: 10 }}>Lv.{lv}</span>}
                </div>
                <div style={{ fontSize: 11, marginTop: 4, color: canUse ? "#9ca3af" : "#444" }}>{skill.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Active Passives */}
        {passivesActive.length > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(139,92,246,0.12)",
            borderRadius: 12, padding: "10px 14px", marginBottom: 10,
          }}>
            <div style={{ fontSize: 11, color: "#6d28d9", letterSpacing: 2, marginBottom: 6 }}>ACTIVE PASSIVES</div>
            {passivesActive.map(s => (
              <div key={s.id} style={{ fontSize: 12, color: "#7c3aed", padding: "2px 0" }}>
                ✦ {s.name} (Lv.{upgrades[s.id]}) — {s.desc}
              </div>
            ))}
          </div>
        )}

        {/* Flee */}
        <Btn color="#374151" onClick={onFlee}>🏃 Flee Battle</Btn>
      </div>
    </div>
  );
}

// ── Skill Tree Modal ──────────────────────────────────────────────────
function SkillTreeModal({ game, onClose, onUpgrade, currentTier, showBond }) {
  const [tab, setTab] = useState("feral");
  const skills = SKILL_TREE[tab];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
      overflowY: "auto", padding: 20, zIndex: 1000, fontFamily: "sans-serif",
    }}>
      <div style={{
        maxWidth: 680, margin: "0 auto",
        background: "#0d001f", border: "1px solid rgba(139,92,246,0.35)",
        borderRadius: 24, padding: 24,
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#ddd6fe" }}>✨ Luna Upgrade Tree</div>
          <div style={{ color: "#fbbf24", fontSize: 15, fontWeight: "bold" }}>💎 {game.player.shards || 0} Shards</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {[["feral", "🐺 Feral Form", "#b45309"], ["hybrid", "🌙 Hybrid Form", "#6d28d9"]].map(([key, label, bg]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: "11px", borderRadius: 12, border: "none",
              fontWeight: "bold", fontFamily: "sans-serif",
              background: tab === key ? bg : "rgba(255,255,255,0.05)",
              color: tab === key ? "white" : "#a78bfa", cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>

        {/* Skill List */}
        <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
          {skills.map(skill => {
            const lv = game.upgrades?.[skill.id] || 0;
            const { price, power } = getSkillStats(skill.baseValue, lv);
            const nextPower = Math.floor(skill.baseValue * Math.pow(1.8, lv + 1));
            const canAfford = (game.player.shards || 0) >= price;

            return (
              <div key={skill.id} style={{
                background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14,
                border: "1px solid rgba(139,92,246,0.12)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                      <span style={{ fontWeight: "bold", fontSize: 15, color: "#ddd6fe" }}>{skill.name}</span>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 999, letterSpacing: 1,
                        background: skill.type === "Active" ? "rgba(59,130,246,0.2)" : "rgba(16,185,129,0.2)",
                        color: skill.type === "Active" ? "#93c5fd" : "#6ee7b7",
                      }}>{skill.type.toUpperCase()}</span>
                      {lv > 0 && (
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 999, letterSpacing: 1,
                          background: "rgba(250,204,21,0.18)", color: "#fde68a",
                        }}>LV.{lv}</span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: "#a78bfa", marginBottom: 6 }}>{skill.desc}</div>

                    {skill.type === "Active" && (
                      <div style={{ fontSize: 11, color: "#818cf8", marginBottom: 4 }}>
                        🔮 MP Cost: {skill.mpCost}
                      </div>
                    )}

                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                      {skill.stat}:{" "}
                      {lv === 0
                        ? <span style={{ color: "#6b7280" }}>Locked — unlock at Lv.1 ({nextPower})</span>
                        : <span style={{ color: "#c4b5fd" }}>{power} <span style={{ color: "#4b5563" }}>→</span> {nextPower} next</span>
                      }
                    </div>
                  </div>

                  {/* Buy Button */}
                  <div style={{ minWidth: 110, textAlign: "center" }}>
                    <button onClick={() => onUpgrade(skill.id, price)} disabled={!canAfford} style={{
                      background: canAfford ? "#7c3aed" : "rgba(60,60,60,0.4)",
                      border: `1px solid ${canAfford ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.06)"}`,
                      color: canAfford ? "white" : "#555",
                      padding: "10px 12px", borderRadius: 12,
                      cursor: canAfford ? "pointer" : "not-allowed",
                      width: "100%", fontFamily: "sans-serif",
                    }}>
                      <div style={{ fontWeight: "bold", fontSize: 14 }}>💎 {price}</div>
                      <div style={{ fontSize: 11, marginTop: 2, color: canAfford ? "#c4b5fd" : "#555" }}>
                        {lv === 0 ? "Unlock" : `→ Lv.${lv + 1}`}
                      </div>
                    </button>
                    {!canAfford && (
                      <div style={{ fontSize: 10, color: "#ef4444", marginTop: 4 }}>
                        Need {price - (game.player.shards || 0)} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mood/Bond summary */}
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: currentTier.color, fontWeight: "bold", fontSize: 13 }}>{currentTier.label}</span>
            <span style={{ fontSize: 12, color: "#a78bfa" }}>{game.mood} / 1500</span>
          </div>
          <StatBar value={game.mood} max={1500} color={currentTier.color} />
          {showBond && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "#f472b6", marginBottom: 4 }}>💖 Bond: {game.bond} / 200</div>
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
  const [game, setGame]             = useState(safeLoad);
  const [showIntro, setShowIntro]   = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showUpgrade, setShowUpgrade]   = useState(false);
  const [showScavenge, setShowScavenge] = useState(false);
  const [showBond, setShowBond]         = useState(true);
  const [musicVol, setMusicVol]         = useState(0.5);

  // Autosave
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [game]);

  const equippedStats = useMemo(() => {
    return Object.values(game.equipped)
      .filter(item => item && typeof item === "object" && item.effect)
      .reduce((acc, item) => {
        Object.entries(item.effect).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
        return acc;
      }, {});
  }, [game.equipped]);

  const totalAtk    = game.player.atk  + (equippedStats.atk   || 0);
  const totalMaxMp  = game.player.maxMp + (equippedStats.maxMp || 0);
  const currentTier = useMemo(() => getMoodDetails(game.mood), [game.mood]);
  const luckBonus   = useMemo(() => {
    const lv = game.upgrades?.f9 || 0;
    return lv > 0 ? getSkillStats(15, lv).power : 0;
  }, [game.upgrades]);

  function notify(msg) {
    setGame(g => ({ ...g, toast: msg }));
    setTimeout(() => setGame(g => ({ ...g, toast: "" })), 2400);
  }

  // ── Day actions ──
  function talkToAlex() {
    if (game.talkedToday) { notify("You've already talked to Alex today."); return; }
    const good = game.mood > 1000;
    setGame(g => ({
      ...g, talkedToday: true,
      mood: Math.min(1500, g.mood + (good ? 3 : 1)),
      bond: g.mood > 500 ? Math.min(200, g.bond + (good ? 2 : 1)) : g.bond,
    }));
    if (game.mood <= 500) notify("Alex is too tired to connect... 🌙");
    else notify(good ? "Alex smiled! Bond increased. ✨" : "Alex is stressed, but your presence helps.");
  }

  function onScavengeFinish(coins) {
    setShowScavenge(false);
    setGame(g => ({
      ...g,
      scavengedToday: true,
      player: { ...g.player, coins: g.player.coins + coins },
    }));
    notify(coins > 0 ? `Luna found ${coins} coins! 🪙` : "Nothing found this time...");
  }

  function startNight() {
    setGame(g => ({ ...g, phase: "night", alexSleeping: true }));
    notify("Night falls across the apartment 🌙");
  }

  function startDay() {
    setGame(g => ({
      ...g, phase: "day", alexSleeping: false,
      day: g.day + 1,
      talkedToday: false, scavengedToday: false,
      battle: null,
      player: { ...g.player, hp: g.player.maxHp, mp: totalMaxMp },
      mood: Math.max(0, g.mood - 10),
    }));
    notify("Morning arrives. Luna is fully rested! ☀️");
  }

  // ── Battle ──
  function enterDreamscape() {
    const tmpl  = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
    const enemy = { ...tmpl, hp: tmpl.maxHp, debuffAtk: 0, debuffTurns: 0 };
    setGame(g => ({
      ...g,
      battle: { enemy, log: [`${enemy.name} emerged from the fog!`], dodgeActive: false },
    }));
  }

  function resolveEnemyAttack(state, g, extraLog) {
    const { battle, player } = state;
    const { enemy } = battle;
    const effectiveAtk = Math.max(1, enemy.atk - (enemy.debuffAtk || 0));
    const dmgToPlayer  = battle.dodgeActive ? 0 : effectiveAtk;
    const dodgeMsg     = battle.dodgeActive ? "Luna dodged the attack!" : `Enemy dealt ${dmgToPlayer} damage.`;

    // Passive: MP regen (h2)
    const mpRegen = (g.upgrades?.h2 || 0) > 0 ? 3 : 0;

    // Tick debuff turns
    const newTurns   = Math.max(0, (enemy.debuffTurns || 0) - 1);
    const newDebuff  = newTurns > 0 ? enemy.debuffAtk : 0;

    const newHp = Math.max(0, player.hp - dmgToPlayer);
    const newMp = Math.min(totalMaxMp, player.mp + mpRegen);

    const log = [dodgeMsg, ...extraLog, ...(battle.log || [])].slice(0, 8);

    return {
      playerHp: newHp, playerMp: newMp,
      newDebuffAtk: newDebuff, newDebuffTurns: newTurns,
      log, dead: newHp <= 0,
    };
  }

  function doAttack() {
    if (!game.battle) return;
    const { battle, player, upgrades = {} } = game;
    const { enemy } = battle;

    // Crit (f4)
    const critPct = (upgrades.f4 || 0) * 5;
    const isCrit  = Math.random() * 100 < critPct;
    const dmg     = Math.floor((totalAtk + Math.floor(Math.random() * 6)) * (isCrit ? 2 : 1));

    // Vamp (f7)
    const vampHeal = (upgrades.f7 || 0) > 0 ? Math.floor(dmg * (upgrades.f7 || 0) * 0.02) : 0;

    const newEnemyHp = enemy.hp - dmg;
    const atkLog     = [`${isCrit ? "⚡ Critical! " : ""}Luna dealt ${dmg}${vampHeal > 0 ? ` (+${vampHeal} vamp)` : ""} damage.`];

    if (newEnemyHp <= 0) { handleVictory(); return; }

    const next = resolveEnemyAttack(
      { battle: { ...battle, dodgeActive: battle.dodgeActive }, player: { ...player, hp: player.hp + vampHeal } },
      game, atkLog
    );
    if (next.dead) { handleDefeat(); return; }

    setGame(g => ({
      ...g,
      player: { ...g.player, hp: next.playerHp + vampHeal, mp: next.playerMp },
      battle: {
        ...g.battle, dodgeActive: false,
        enemy: { ...enemy, hp: newEnemyHp, debuffAtk: next.newDebuffAtk, debuffTurns: next.newDebuffTurns },
        log: next.log,
      },
    }));
  }

  function doSkill(skill) {
    if (!game.battle) return;
    const { battle, player, upgrades = {} } = game;
    const { enemy } = battle;
    if (player.mp < skill.mpCost) return;

    let newEnemyHp     = enemy.hp;
    let newDebuffAtk   = enemy.debuffAtk  || 0;
    let newDebuffTurns = enemy.debuffTurns || 0;
    let newDodge       = battle.dodgeActive;
    let newPlayerHp    = player.hp;
    let newPlayerMp    = player.mp - skill.mpCost;
    let skipEnemy      = false;
    let skillLog       = "";

    switch (skill.id) {
      case "f2": {
        const d = Math.floor(totalAtk * 1.5 + Math.floor(Math.random() * 8));
        newEnemyHp = enemy.hp - d;
        skillLog   = `Midnight Pounce! Dealt ${d} damage.`;
        break;
      }
      case "f5":
        skipEnemy = true;
        skillLog  = "Shadow Blend! Enemy's attack negated.";
        break;
      case "f8":
        newDebuffAtk   = 4; newDebuffTurns = 2;
        skillLog = "Alpha Hiss! Enemy ATK −4 for 2 turns.";
        break;
      case "h1": {
        const d = Math.floor(player.matk * 1.4 + Math.floor(Math.random() * 10));
        newEnemyHp = enemy.hp - d;
        skillLog   = `Lunar Spark! ${d} magic damage.`;
        break;
      }
      case "h3": {
        const d = Math.floor(player.matk * 2.0 + Math.floor(Math.random() * 15));
        newEnemyHp = enemy.hp - d;
        skillLog   = `Violet Tear! ${d} massive damage!`;
        break;
      }
      case "h6": {
        const counter = Math.floor(player.matk * 0.8);
        newEnemyHp = enemy.hp - counter;
        skipEnemy  = true;
        newDodge   = true;
        skillLog   = `Warp Step! Dodged + ${counter} counter.`;
        break;
      }
      case "h7":
        newDebuffAtk   = 5; newDebuffTurns = 3;
        skillLog = "Echoing Meow! Enemy ATK −5 for 3 turns.";
        break;
      case "h9": {
        const d = Math.floor((game.bond || 0) * 2 + player.matk * 2);
        newEnemyHp = enemy.hp - d;
        skillLog   = `Bond Flare! ${d} bond damage!`;
        break;
      }
      default:
        skillLog = `${skill.name} activated!`;
    }

    if (newEnemyHp <= 0) {
      setGame(g => ({ ...g, player: { ...g.player, mp: newPlayerMp } }));
      handleVictory();
      return;
    }

    const mpRegen = (upgrades.h2 || 0) > 0 ? 3 : 0;

    if (skipEnemy) {
      setGame(g => ({
        ...g,
        player: { ...g.player, hp: newPlayerHp, mp: Math.min(totalMaxMp, newPlayerMp + mpRegen) },
        battle: {
          ...g.battle, dodgeActive: newDodge,
          enemy: { ...enemy, hp: newEnemyHp, debuffAtk: newDebuffAtk, debuffTurns: newDebuffTurns },
          log: [skillLog, ...(battle.log || [])].slice(0, 8),
        },
      }));
      return;
    }

    const next = resolveEnemyAttack(
      { battle: { ...battle, dodgeActive: newDodge }, player: { ...player, mp: newPlayerMp } },
      game, [skillLog]
    );
    if (next.dead) { handleDefeat(); return; }

    setGame(g => ({
      ...g,
      player: { ...g.player, hp: next.playerHp, mp: Math.min(totalMaxMp, next.playerMp + mpRegen) },
      battle: {
        ...g.battle, dodgeActive: false,
        enemy: { ...enemy, hp: newEnemyHp, debuffAtk: next.newDebuffAtk, debuffTurns: next.newDebuffTurns },
        log: next.log,
      },
    }));
  }

  function handleVictory() {
    const enemy    = game.battle.enemy;
    const expBonus = (game.upgrades?.h10 || 0) > 0
      ? Math.floor(enemy.exp * 1.2) : enemy.exp;
    setGame(g => ({
      ...g, battle: null,
      player: {
        ...g.player,
        coins:  g.player.coins  + enemy.reward,
        exp:    g.player.exp    + expBonus,
        shards: (g.player.shards || 0) + 1,
      },
      dreamLog: [`${enemy.name} defeated on Night ${g.day}`, ...g.dreamLog],
    }));
    notify(`Victory! ✨  +${enemy.reward} coins · +1 shard`);
  }

  function handleDefeat() {
    setGame(g => ({
      ...g, battle: null,
      player: { ...g.player, hp: Math.floor(g.player.maxHp * 0.5) },
      mood:   Math.max(0, g.mood - 10),
    }));
    notify("Luna escaped the nightmare...");
  }

  function purchaseUpgrade(skillId, price) {
    if ((game.player.shards || 0) < price) { notify("Not enough Dream Shards 💎"); return; }
    setGame(g => ({
      ...g,
      player:   { ...g.player, shards: g.player.shards - price },
      upgrades: { ...g.upgrades, [skillId]: (g.upgrades?.[skillId] || 0) + 1 },
    }));
    notify("Skill Upgraded! ✨");
  }

  // ── Save/Load ──
  function manualSave() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); notify("Game Saved 💾"); }
    catch { notify("Save failed"); }
  }
  function manualLoad() { setGame(safeLoad()); notify("Save Loaded 📂"); }
  function deleteSave() { localStorage.removeItem(STORAGE_KEY); setGame(defaultState); notify("Save Deleted 🗑️"); }

  // ── Shop ──
  function buyItem(item) {
    if (game.player.coins < item.price) { notify("Not enough coins"); return; }
    setGame(g => ({
      ...g,
      player:    { ...g.player, coins: g.player.coins - item.price },
      inventory: [...g.inventory, { ...item, uid: Date.now() }],
    }));
    notify(`${item.name} purchased`);
  }
  function useItem(item) {
    if (item.type !== "consumable") return;
    setGame(g => ({
      ...g,
      player: {
        ...g.player,
        hp: Math.min(g.player.maxHp,  g.player.hp + (item.effect.hp || 0)),
        mp: Math.min(totalMaxMp,       g.player.mp + (item.effect.mp || 0)),
      },
      inventory: g.inventory.filter(i => i.uid !== item.uid),
    }));
    notify(`${item.name} used`);
  }
  function equipItem(item) {
    if (item.type !== "equipment") return;
    setGame(g => ({
      ...g,
      equipped:  { ...g.equipped, [item.slot]: item },
      inventory: g.inventory.filter(i => i.uid !== item.uid),
    }));
    notify(`${item.name} equipped ⚔️`);
  }

  // ── Intro ──
  if (showIntro) return (
    <div style={{ minHeight: "100vh", background: ROOT_BG, color: "#ddd6fe", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 580, background: "rgba(10,0,30,0.9)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 24, padding: 28 }}>
        <div style={{ fontSize: 12, letterSpacing: 5, color: "#8b5cf6", marginBottom: 12 }}>DREAM GUARDIAN</div>
        <div style={{ fontSize: 40, fontWeight: "bold", marginBottom: 18 }}>🌙 Luna & Alex</div>
        <div style={{ lineHeight: 2, fontSize: 15, color: "#c4b5fd", whiteSpace: "pre-line", marginBottom: 24 }}>{introText}</div>
        <button onClick={() => setShowIntro(false)} style={{ width: "100%", background: "#7c3aed", border: "none", color: "white", padding: "16px", borderRadius: 16, fontSize: 16, fontWeight: "bold", cursor: "pointer" }}>
          ✨ Enter The Dreamscape
        </button>
      </div>
    </div>
  );

  // ── Main UI ──
  return (
    <div style={{ minHeight: "100vh", background: ROOT_BG, color: "#ddd6fe", fontFamily: "sans-serif", padding: 16, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 4, color: "#8b5cf6" }}>DREAM GUARDIAN</div>
            <div style={{ fontSize: 30, fontWeight: "bold" }}>🌙 Luna & Alex</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setShowSettings(true)} style={{ background: "#5b21b6", color: "white", border: "none", padding: "10px 14px", borderRadius: 12, cursor: "pointer" }}>⚙️</button>
            <button onClick={manualSave} style={{ background: "#166534", color: "white", border: "none", padding: "10px 14px", borderRadius: 12, cursor: "pointer" }}>💾 Save</button>
            <button onClick={manualLoad} style={{ background: "#4338ca", color: "white", border: "none", padding: "10px 14px", borderRadius: 12, cursor: "pointer" }}>📂 Load</button>
            <button onClick={deleteSave} style={{ background: "#7f1d1d", color: "white", border: "none", padding: "10px 14px", borderRadius: 12, cursor: "pointer" }}>🗑️</button>
          </div>
        </div>

        {/* Toast */}
        {game.toast && (
          <div style={{ background: "rgba(90,40,180,0.4)", padding: 12, borderRadius: 14, marginBottom: 14, textAlign: "center" }}>
            {game.toast}
          </div>
        )}

        {/* Stats */}
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ marginBottom: 6, fontSize: 13, color: "#fca5a5" }}>❤️ HP  {game.player.hp} / {game.player.maxHp}</div>
              <StatBar value={game.player.hp} max={game.player.maxHp} color="#ef4444" />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 13, color: "#c4b5fd" }}>🔮 MP  {game.player.mp} / {totalMaxMp}</div>
              <StatBar value={game.player.mp} max={totalMaxMp} color="#8b5cf6" />
            </div>
          </div>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 8, fontSize: 13 }}>
            <div>🪙 {game.player.coins}</div>
            <div>💎 {game.player.shards || 0}</div>
            <div>📅 Day {game.day}</div>
            <div>⚔️ ATK {totalAtk}</div>
            <div>✨ Lv.{game.player.level}</div>
          </div>
        </Card>

        {/* Bond */}
        {showBond && (
          <Card>
            <div style={{ marginBottom: 6, fontSize: 13, color: "#f472b6", fontWeight: "bold" }}>💖 Luna &amp; Alex Bond: {game.bond} / 200</div>
            <StatBar value={game.bond} max={200} color="#f472b6" />
            <div style={{ fontSize: 11, marginTop: 6, opacity: 0.6 }}>The stronger the bond, the more Alex's nightmares fade.</div>
          </Card>
        )}

        {/* Mood */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: currentTier.color, fontWeight: "bold", fontSize: 13 }}>{currentTier.label}</span>
            <span style={{ fontSize: 12, color: "#a78bfa" }}>{game.mood} / 1500</span>
          </div>
          <StatBar value={game.mood} max={1500} color={currentTier.color} />
        </Card>

        {/* Day/Night */}
        <Card>
          <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
            {game.phase === "day" ? "☀️ Daytime" : "🌙 Nighttime"}
          </div>

          {game.phase === "day" ? (
            <div>
              <div style={{ marginBottom: 14, lineHeight: 1.8, color: "#c4b5fd", fontSize: 14 }}>
                Alex heads out during the day while Luna quietly watches the apartment windows glow.
              </div>
              <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                <Btn
                  color={game.scavengedToday ? "#4b5563" : "#2563eb"}
                  onClick={() => !game.scavengedToday && setShowScavenge(true)}
                  disabled={game.scavengedToday}
                >
                  🔍 Scavenge Apartment {game.scavengedToday ? "(Done today)" : ""}
                </Btn>
                <Btn
                  color={game.talkedToday ? "#4b5563" : "#ec4899"}
                  onClick={talkToAlex}
                  disabled={game.talkedToday}
                >
                  💬 Talk to Alex {game.talkedToday ? "(Done today)" : ""}
                </Btn>
              </div>
              <Btn color="#4338ca" onClick={startNight}>🌙 Transition To Night</Btn>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 14, lineHeight: 1.8, color: "#c4b5fd", fontSize: 14 }}>
                The portal beneath the bed breathes with violet light.
                {!game.battle && " Luna stands guard, ready to enter the Dreamscape."}
              </div>
              {!game.battle ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <Btn onClick={enterDreamscape}>✨ Enter Dreamscape</Btn>
                  <Btn color="#0f766e" onClick={startDay}>☀️ Sleep Until Morning</Btn>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 10 }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{game.battle.enemy.ico}</div>
                  <div style={{ fontSize: 14, color: "#a78bfa" }}>
                    ⚔️ In battle with {game.battle.enemy.name}...
                  </div>
                  <div style={{ fontSize: 12, color: "#6d28d9", marginTop: 4 }}>
                    Tap the battle screen to resume
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Merchant */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: "bold" }}>🐭 Merchant</div>
            <button onClick={() => setGame(g => ({ ...g, merchantOpen: !g.merchantOpen }))} style={{ background: "#7c3aed", border: "none", color: "white", padding: "8px 14px", borderRadius: 12, cursor: "pointer" }}>
              {game.merchantOpen ? "Close" : "Open"}
            </button>
          </div>
          {game.merchantOpen && (
            <div style={{ display: "grid", gap: 10 }}>
              {SHOP_ITEMS.map(item => (
                <div key={item.id} style={{ background: "rgba(255,255,255,0.04)", padding: 12, borderRadius: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: "bold" }}>{item.ico} {item.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{item.desc}</div>
                  </div>
                  <div style={{ minWidth: 100 }}>
                    <Btn small color="#16a34a" onClick={() => buyItem(item)}>🪙 {item.price}</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upgrade Trigger */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 18, fontWeight: "bold" }}>✨ Luna Upgrades</div>
            <button onClick={() => setShowUpgrade(true)} style={{ background: "#7c3aed", border: "none", color: "white", padding: "10px 16px", borderRadius: 12, cursor: "pointer" }}>
              Open Tree
            </button>
          </div>
          <div style={{ fontSize: 13, color: "#a78bfa" }}>
            Feral: {Object.keys(game.upgrades || {}).filter(k => k.startsWith("f")).length}/10 skills unlocked &nbsp;·&nbsp;
            Hybrid: {Object.keys(game.upgrades || {}).filter(k => k.startsWith("h")).length}/10 skills unlocked
          </div>
        </Card>

        {/* Inventory */}
        <Card>
          <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>🎒 Inventory</div>
          {game.inventory.length === 0 ? (
            <div style={{ color: "#6d28d9", fontSize: 14 }}>No items collected yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {game.inventory.map(item => (
                <div key={item.uid} style={{ background: "rgba(255,255,255,0.04)", padding: 12, borderRadius: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: "bold" }}>{item.ico} {item.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{item.desc}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {item.type === "consumable" && (
                      <button onClick={() => useItem(item)} style={{ background: "#0f766e", border: "none", color: "white", padding: "8px 12px", borderRadius: 10, cursor: "pointer" }}>Use</button>
                    )}
                    {item.type === "equipment" && (
                      <button onClick={() => equipItem(item)} style={{ background: "#7c3aed", border: "none", color: "white", padding: "8px 12px", borderRadius: 10, cursor: "pointer" }}>Equip</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Equipped */}
        <Card>
          <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>⚔️ Equipped</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
            {["weapon", "accessory", "aura"].map(slot => (
              <div key={slot} style={{ background: "rgba(255,255,255,0.04)", padding: 12, borderRadius: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: 2, marginBottom: 8, color: "#a78bfa" }}>{slot.toUpperCase()}</div>
                {game.equipped[slot]
                  ? <div style={{ fontWeight: "bold" }}>{game.equipped[slot].ico} {game.equipped[slot].name}</div>
                  : <div style={{ opacity: 0.4 }}>Empty Slot</div>
                }
              </div>
            ))}
          </div>
        </Card>

        {/* Dream Log */}
        <Card>
          <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>📜 Dream Log</div>
          {game.dreamLog.length === 0 ? (
            <div style={{ color: "#6d28d9", fontSize: 14 }}>No dream entries recorded.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {game.dreamLog.slice(0, 10).map((entry, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.04)", padding: 10, borderRadius: 10, fontSize: 13 }}>{entry}</div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Overlays ─────────────────────────────────────────────── */}

      {showScavenge && (
        <ScavengeGame luckBonus={luckBonus} onFinish={onScavengeFinish} />
      )}

      {game.battle && (
        <BattleOverlay
          game={game}
          totalAtk={totalAtk}
          totalMaxMp={totalMaxMp}
          onAttack={doAttack}
          onSkill={doSkill}
          onFlee={handleDefeat}
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 999 }}>
          <div style={{ width: "100%", maxWidth: 480, background: "#0d001f", borderRadius: 24, padding: 24, border: "1px solid rgba(139,92,246,0.3)" }}>
            <div style={{ fontSize: 22, marginBottom: 20, fontWeight: "bold", color: "#ddd6fe" }}>⚙️ Settings</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 10, fontSize: 14, color: "#a78bfa" }}>Bond Gauge</div>
              <button onClick={() => setShowBond(!showBond)} style={{ background: "#7c3aed", border: "none", color: "white", padding: "10px 14px", borderRadius: 12, cursor: "pointer" }}>
                {showBond ? "Visible ✓" : "Hidden"}
              </button>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 10, fontSize: 14, color: "#a78bfa" }}>Music Volume: {Math.round(musicVol * 100)}%</div>
              <input type="range" min="0" max="1" step="0.05" value={musicVol}
                onChange={e => setMusicVol(parseFloat(e.target.value))}
                style={{ width: "100%" }} />
            </div>
            <Btn color="#7c3aed" onClick={() => setShowSettings(false)}>Close</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
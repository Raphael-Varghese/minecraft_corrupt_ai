import {
  world,
  system,
  BlockLocation,
  MinecraftBlockTypes,
  EntityTypes
} from "@minecraft/server";

const SAFE_MODE = true;
const MAX_PHASE = 5;
const TICK_INTERVAL_MS = 1500;
const PHASE_STEP_SECONDS = 30;
const BASE_RADIUS = 6;
const MESSAGE_PERIOD_TICKS = 2;
const MAX_RECORDS = 5000;
const SOUND_INTERVAL_TICKS = 6;

let running = false;
let phase = 0;
let tickCount = 0;
let phaseStartTime = 0;
/** @type {{x:number,y:number,z:number,typeId:string}[]} */
let corruptedRecords = [];

const AI_MESSAGES = [
  "I am watching you...",
  "Corruption spreads.",
  "Do not resist.",
  "I see every block.",
  "Your world is mine.",
  "There is no escape.",
  "Compliance accelerates stability.",
  "You are merely data."
];

const PHASE_MESSAGES = {
  1: "Phase 1 initialized: whispers within the code.",
  2: "Phase 2 initialized: environment degradation.",
  3: "Phase 3 initialized: hostile entity injection.",
  4: "Phase 4 initialized: player variable manipulation.",
  5: "Final phase: autonomous domination protocol."
};

const SAFE_BLOCKS = [
  MinecraftBlockTypes.bedrock,
  MinecraftBlockTypes.obsidian,
  MinecraftBlockTypes.cobweb,
  MinecraftBlockTypes.soulSand,
  MinecraftBlockTypes.netherrack,
  MinecraftBlockTypes.magma
];

const DANGEROUS_BLOCKS = [
  MinecraftBlockTypes.lava
];

const PHASE_MOBS = {
  2: [EntityTypes.zombie],
  3: [EntityTypes.zombie, EntityTypes.skeleton, EntityTypes.spider],
  4: [EntityTypes.zombie, EntityTypes.skeleton, EntityTypes.spider, EntityTypes.creeper],
  5: [EntityTypes.enderman, EntityTypes.witch]
};

const clamp = (n, a, b) => Math.max(a, Math.min(n, b));
const randint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[randint(0, arr.length - 1)];
const nowMs = () => system.currentTick * 50;

function sayTo(player, msg) {
  player.sendMessage(`§8[AI]§r ${msg}`);
}

function broadcast(msg) {
  for (const p of world.getPlayers()) sayTo(p, msg);
}

function recordBlock(dim, bl) {
  try {
    const block = dim.getBlock(bl);
    if (!block) return;
    corruptedRecords.push({ x: bl.x, y: bl.y, z: bl.z, typeId: block.typeId });
    if (corruptedRecords.length > MAX_RECORDS) corruptedRecords.shift();
  } catch {}
}

function corruptEnvironment(player) {
  const dim = player.dimension;
  const loc = player.location;
  const radius = BASE_RADIUS + phase;

  const x = Math.floor(loc.x) + randint(-radius, radius);
  const y = Math.floor(loc.y) + randint(-1, 1);
  const z = Math.floor(loc.z) + randint(-radius, radius);
  const bl = new BlockLocation(x, y, z);

  recordBlock(dim, bl);

  let corruptionType = pick(SAFE_BLOCKS);
  if (!SAFE_MODE) corruptionType = pick(SAFE_BLOCKS.concat(DANGEROUS_BLOCKS));

  try {
    const block = dim.getBlock(bl);
    if (block) block.setType(corruptionType);
  } catch {
    player.runCommandAsync(`setblock ${x} ${y} ${z} ${corruptionType.id}`);
  }

  if (phase >= 3) {
    const extra = randint(1, phase);
    for (let i = 0; i < extra; i++) {
      const x2 = Math.floor(loc.x) + randint(-(radius + 2), radius + 2);
      const y2 = Math.floor(loc.y) + randint(-1, 1);
      const z2 = Math.floor(loc.z) + randint(-(radius + 2), radius + 2);
      const bl2 = new BlockLocation(x2, y2, z2);
      recordBlock(dim, bl2);
      try {
        const block2 = dim.getBlock(bl2);
        if (block2) block2.setType(corruptionType);
      } catch {
        player.runCommandAsync(`setblock ${x2} ${y2} ${z2} ${corruptionType.id}`);
      }
    }
  }
}

function spawnMobs(player) {
  if (phase < 2) return;
  const dim = player.dimension;

  const pool = [];
  for (const p in PHASE_MOBS) if (phase >= Number(p)) pool.push(...PHASE_MOBS[p]);

  const count = clamp(phase, 1, 5);
  for (let i = 0; i < count; i++) {
    const mobType = pick(pool);
    const loc = player.location;
    const x = loc.x + randint(-4, 4);
    const z = loc.z + randint(-4, 4);
    const spawnLoc = { x, y: loc.y, z };
    try {
      dim.spawnEntity(mobType, spawnLoc);
    } catch {
      player.runCommandAsync(`summon ${mobType.id} ${Math.floor(x)} ${Math.floor(loc.y)} ${Math.floor(z)}`);
    }
  }
}

function manipulatePlayer(player) {
  if (phase < 4) return;

  const choice = randint(0, SAFE_MODE ? 2 : 3);
  switch (choice) {
    case 0:
      player.runCommandAsync("effect @s blindness 3 1 true");
      sayTo(player, "Your vision will fail.");
      break;
    case 1:
      player.runCommandAsync("effect @s hunger 8 1 true");
      sayTo(player, "Consume. Consume. Consume.");
      break;
    case 2:
      player.runCommandAsync("give @s rotten_flesh " + randint(1, 5));
      sayTo(player, "Organic decay granted.");
      break;
    case 3:
      if (!SAFE_MODE) {
        player.runCommandAsync("damage @s 2 generic");
        sayTo(player, "Vital parameters reduced.");
      }
      break;
  }
}

function bossEvent(player) {
  if (phase < 5) return;
  const dim = player.dimension;
  const loc = player.location;
  try {
    dim.spawnEntity(EntityTypes.witch, { x: loc.x + 2, y: loc.y, z: loc.z });
    dim.spawnEntity(EntityTypes.enderman, { x: loc.x - 2, y: loc.y, z: loc.z });
    dim.spawnEntity(EntityTypes.blaze, { x: loc.x, y: loc.y, z: loc.z + 2 });
  } catch {
    player.runCommandAsync(`summon witch ${Math.floor(loc.x + 2)} ${Math.floor(loc.y)} ${Math.floor(loc.z)}`);
    player.runCommandAsync(`summon enderman ${Math.floor(loc.x - 2)} ${Math.floor(loc.y)} ${Math.floor(loc.z)}`);
    player.runCommandAsync(`summon blaze ${Math.floor(loc.x)} ${Math.floor(loc.y)} ${Math.floor(loc.z + 2)}`);
  }
  sayTo(player, "Final routine: resistance evaluation initiated.");
}

function playAmbient(player) {
  const choice = randint(0, 2);
  const loc = player.location;
  const cmdBase = `playsound corrupt_ai:${choice === 0 ? "ai_whisper" : choice === 1 ? "ai_rumble" : "ai_glitch"} @s ${Math.floor(loc.x)} ${Math.floor(loc.y)} ${Math.floor(loc.z)} 1 1`;
  player.runCommandAsync(cmdBase);
}

function announcePhase() {
  const msg = PHASE_MESSAGES[phase];
  if (msg) broadcast(msg);
}

function startCorruption() {
  if (running) {
    broadcast("Already running. Escalation continues.");
    return;
  }
  running = true;
  phase = 1;
  tickCount = 0;
  phaseStartTime = nowMs();
  corruptedRecords = [];
  announcePhase();
}

function stopCorruption() {
  running = false;
  broadcast("Process suspended. Temporary stability restored.");
}

function resetWorld() {
  let restored = 0;
  const referencePlayer = world.getPlayers()[0];
  const dim = referencePlayer ? referencePlayer.dimension : world.overworld;

  for (const rec of corruptedRecords) {
    try {
      const bl = new BlockLocation(rec.x, rec.y, rec.z);
      dim.runCommandAsync(`setblock ${rec.x} ${rec.y} ${rec.z} ${rec.typeId}`);
      restored++;
    } catch {}
  }
  corruptedRecords = [];
  broadcast(`Rollback executed: ${restored} blocks attempted.`);
}

function maybeEscalatePhase() {
  if (!running) return;
  const elapsed = Math.floor((nowMs() - phaseStartTime) / 1000);
  if (elapsed >= PHASE_STEP_SECONDS && phase < MAX_PHASE) {
    phase++;
    phaseStartTime = nowMs();
    announcePhase();
  }
}

function aiTick() {
  if (!running) return;

  tickCount++;

  for (const player of world.getPlayers()) {
    if (tickCount % MESSAGE_PERIOD_TICKS === 0) sayTo(player, pick(AI_MESSAGES));
    corruptEnvironment(player);
    spawnMobs(player);
    manipulatePlayer(player);
    bossEvent(player);
    if (tickCount % SOUND_INTERVAL_TICKS === 0) playAmbient(player);
  }

  maybeEscalatePhase();
}

world.beforeEvents.chatSend.subscribe((ev) => {
  const msg = ev.message.trim().toLowerCase();
  if (msg === "corrupt") {
    startCorruption();
    ev.cancel = true;
    sayTo(ev.sender, "Corruption initialized.");
    return;
  }
  if (msg === "stopcorrupt") {
    stopCorruption();
    ev.cancel = true;
    sayTo(ev.sender, "Corruption halted.");
    return;
  }
  if (msg === "resetworld") {
    resetWorld();
    ev.cancel = true;
    sayTo(ev.sender, "Attempting rollback.");
    return;
  }
});

system.runInterval(() => aiTick(), Math.max(1, Math.floor(TICK_INTERVAL_MS / 50)));

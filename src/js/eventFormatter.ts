// mirrors rmmz-types/lib/data/commands.d.ts.

// We use RawCommand instead of DataCommand as obsolete commands like
// 404, 412 exist only in MV.

export interface RawCommand {
  code: number;
  parameters: unknown[] | undefined;
  indent?: number | null;
}

export interface FormattedCommand {
  name: string;
  detail: string;
  /** commands appearing together with their 1xx variants, can't be dangled */
  is4xx: boolean;
}

// ---------- name lookup helpers -----------------------------------------------

function safeName(arr: { name: string }[] | undefined, id: number): string {
  const e = arr?.[id];
  return e?.name ?? "";
}

function switchLabel(id: number): string {
  const name = $dataSystem?.switches?.[id];
  return name ? `Switch[${id}: ${name}]` : `Switch[${id}]`;
}
function variableLabel(id: number): string {
  const name = $dataSystem?.variables?.[id];
  return name ? `Var[${id}: ${name}]` : `Var[${id}]`;
}
function itemLabel(id: number): string {
  const n = safeName($dataItems as { name: string }[] | undefined, id);
  return n ? `Item[${id}: ${n}]` : `Item[${id}]`;
}
function weaponLabel(id: number): string {
  const n = safeName($dataWeapons as { name: string }[] | undefined, id);
  return n ? `Weapon[${id}: ${n}]` : `Weapon[${id}]`;
}
function armorLabel(id: number): string {
  const n = safeName($dataArmors as { name: string }[] | undefined, id);
  return n ? `Armor[${id}: ${n}]` : `Armor[${id}]`;
}
function actorLabel(id: number): string {
  const n = safeName($dataActors as { name: string }[] | undefined, id);
  return n ? `Actor[${id}: ${n}]` : `Actor[${id}]`;
}
function enemyLabel(id: number): string {
  const n = safeName($dataEnemies as { name: string }[] | undefined, id);
  return n ? `Enemy[${id}: ${n}]` : `Enemy[${id}]`;
}
function commonEventLabel(id: number): string {
  const n = safeName($dataCommonEvents as { name: string }[] | undefined, id);
  return n ? `CommonEvent[${id}: ${n}]` : `CommonEvent[${id}]`;
}
function mapLabel(id: number): string {
  const info = $dataMapInfos?.[id];
  return info?.name ? `Map[${id}: ${info.name}]` : `Map[${id}]`;
}

// ---------- enum labels -------------------------------------------------------

const PARAM_NAMES = [
  "MaxHP",
  "MaxMP",
  "Atk",
  "Def",
  "M.Atk",
  "M.Def",
  "Agi",
  "Luk",
];

const DIRECTION: Record<number, string> = {
  2: "Down",
  4: "Left",
  6: "Right",
  8: "Up",
};

// 0: ==, 1: >=, 2: <=, 3: >, 4: <, 5: !=
const COMPARE = ["==", ">=", "<=", ">", "<", "!="];
// 0: =, 1: +=, 2: -=, 3: *=, 4: /=, 5: %=
const VAR_OP = ["=", "+=", "-=", "*=", "/=", "%="];
// 0: +, 1: -
const VALUE_SIGN = ["+", "-"];

function dirName(d: number): string {
  return DIRECTION[d] ?? `dir(${d})`;
}
function paramName(id: number): string {
  return PARAM_NAMES[id] ?? `Param[${id}]`;
}

//   [0, n]  -> "n"             (constant)
//   [1, v]  -> "Var[v]"        (variable)
function valueOperand(rest: unknown[]): string {
  const t = rest[0];
  if (t === 0) return String(rest[1]);
  if (t === 1) return variableLabel(rest[1] as number);
  return JSON.stringify(rest);
}

//   [0, actorId] -> actor name
//   [1, varId]   -> "Actor(Var[varId])"
function iterateActor(parts: unknown[]): string {
  if (parts[0] === 0) return actorLabel(parts[1] as number);
  return `Actor(${variableLabel(parts[1] as number)})`;
}

// ---------- 122 sub-source (Game Data) decoding -------------------------------

function gameDataSource(rest: unknown[]): string {
  const [kind, ...tail] = rest;
  switch (kind) {
    case 0:
      return `count of ${itemLabel(tail[0] as number)}`;
    case 1:
      return `count of ${weaponLabel(tail[0] as number)}`;
    case 2:
      return `count of ${armorLabel(tail[0] as number)}`;
    case 3: {
      // Actor stat
      const [actorId, statIdx] = tail as [number, number];
      const stat =
        ["Level", "EXP", "HP", "MP", ...PARAM_NAMES, "TP"][statIdx] ??
        `stat[${statIdx}]`;
      return `${actorLabel(actorId)}.${stat}`;
    }
    case 4: {
      const [enemyId, statIdx] = tail as [number, number];
      const stat =
        ["HP", "MP", ...PARAM_NAMES, "TP"][statIdx] ?? `stat[${statIdx}]`;
      return `${enemyLabel(enemyId)}.${stat}`;
    }
    case 5: {
      const [charId, attrIdx] = tail as [number, number];
      const attr =
        ["MapX", "MapY", "Direction", "ScreenX", "ScreenY"][attrIdx] ??
        `attr[${attrIdx}]`;
      return `Character[${charId}].${attr}`;
    }
    case 6:
      return `Party member [${tail[0]}]`;
    case 7: {
      const idx = tail[0] as number;
      const fields = [
        "MapID",
        "PartyMembers",
        "Gold",
        "Steps",
        "PlayTime",
        "Timer",
        "SaveCount",
        "BattleCount",
        "WinCount",
        "EscapeCount",
      ];
      return fields[idx] ?? `system[${idx}]`;
    }
    case 8:
      return `LastAction[${tail[0]}]`;
    default:
      return JSON.stringify(rest);
  }
}

// ---------- 111 Conditional Branch decoding -----------------------------------

function conditionalBranch(p: unknown[]): string {
  const kind = p[0];
  switch (kind) {
    case 0:
      return `${switchLabel(p[1] as number)} is ${p[2] === 0 ? "ON" : "OFF"}`;
    case 1: {
      // Variable. p[2]: 0=value, 1=variable; p[3]: rhs; p[4]: compare
      const lhs = variableLabel(p[1] as number);
      const rhs = p[2] === 0 ? String(p[3]) : variableLabel(p[3] as number);
      const cmp = COMPARE[p[4] as number] ?? `cmp(${p[4]})`;
      return `${lhs} ${cmp} ${rhs}`;
    }
    case 2:
      return `SelfSwitch[${p[1]}] is ${p[2] === 0 ? "ON" : "OFF"}`;
    case 3:
      return `Timer ${p[2] === 0 ? "≥" : "≤"} ${p[1]}s`;
    case 4: {
      // Actor sub-condition
      const aId = p[1] as number;
      const sub = p[2];
      switch (sub) {
        case 0:
          return `${actorLabel(aId)} is in party`;
        case 1:
          return `${actorLabel(aId)} name == "${p[3]}"`;
        case 2:
          return `${actorLabel(aId)} class == ${p[3]}`;
        case 3:
          return `${actorLabel(aId)} learned skill ${p[3]}`;
        case 4:
          return `${actorLabel(aId)} equips ${weaponLabel(p[3] as number)}`;
        case 5:
          return `${actorLabel(aId)} equips ${armorLabel(p[3] as number)}`;
        case 6:
          return `${actorLabel(aId)} has state ${p[3]}`;
        default:
          return `${actorLabel(aId)} sub(${sub})=${p[3]}`;
      }
    }
    case 5: {
      const eId = p[1] as number;
      if (p[2] === 0) return `${enemyLabel(eId)} appeared`;
      return `${enemyLabel(eId)} has state ${p[3]}`;
    }
    case 6:
      return `Character[${p[1]}] facing ${dirName(p[2] as number)}`;
    case 7: {
      const cmp = (["≥", "≤", "<"] as const)[p[2] as number] ?? "?";
      return `Gold ${cmp} ${p[1]}`;
    }
    case 8:
      return `Party has ${itemLabel(p[1] as number)}`;
    case 9:
      return `Party has ${weaponLabel(p[1] as number)}${p[2] ? " (incl. equip)" : ""}`;
    case 10:
      return `Party has ${armorLabel(p[1] as number)}${p[2] ? " (incl. equip)" : ""}`;
    case 11: {
      const trigger =
        (["pressed", "triggered", "repeated"] as const)[p[2] as number] ??
        "pressed";
      return `Button "${p[1]}" is ${trigger}`;
    }
    case 12:
      return `Script: ${p[1]}`;
    case 13:
      return `Vehicle[${p[1]}]`;
    default:
      return JSON.stringify(p);
  }
}

// ---------- 122 Control Variables decoding ------------------------------------

function controlVariables(p: unknown[]): string {
  const [startId, endId, opIdx, srcType, ...rest] = p as [
    number,
    number,
    number,
    number,
    ...unknown[],
  ];
  const op = VAR_OP[opIdx] ?? `op(${opIdx})`;
  const range =
    startId === endId ? variableLabel(startId) : `Var[${startId}..${endId}]`;
  let rhs: string;
  switch (srcType) {
    case 0:
      rhs = String(rest[0]);
      break;
    case 1:
      rhs = variableLabel(rest[0] as number);
      break;
    case 2:
      rhs = `random(${rest[0]}..${rest[1]})`;
      break;
    case 3:
      rhs = gameDataSource(rest);
      break;
    case 4:
      rhs = `script(${rest[0]})`;
      break;
    default:
      rhs = JSON.stringify(rest);
  }
  return `${range} ${op} ${rhs}`;
}

// ---------- main switch -------------------------------------------------------

export function formatCommand(cmd: RawCommand): FormattedCommand {
  // Normalize once. Route-step commands declare `parameters: undefined`,
  // and the cases that handle them don't index into `p` anyway.
  const p: unknown[] = cmd.parameters ?? [];
  switch (cmd.code) {
    // ---- text ----
    case 0:
      return { name: "()", detail: "", is4xx: false };
    case 101:
      return {
        name: "Show Text",
        detail: `talker="${p[4] ?? ""}", face="${p[0] ?? ""}[${p[1]}]", bg=${p[2]}, pos=${p[3]}`,
        is4xx: false,
      };
    case 401:
      return { name: "Text", detail: String(p[0] ?? ""), is4xx: true };
    case 102:
      return {
        name: "Show Choices",
        detail: `[${(p[0] as string[]).join(" | ")}] cancel=${p[1]}, default=${p[2]}`,
        is4xx: false,
      };
    case 402:
      return {
        name: `When [${p[0]}]`,
        detail: "",
        is4xx: true,
      };
    case 403:
      return { name: "When Cancel", detail: "", is4xx: true };
    case 404:
      return { name: "End Choices", detail: "", is4xx: true };
    case 103:
      return {
        name: "Input Number",
        detail: `${variableLabel(p[0] as number)}, max digits=${p[1]}`,
        is4xx: false,
      };
    case 104:
      return {
        name: "Select Item",
        detail: `${variableLabel(p[0] as number)}, type=${p[1] ?? "any"}`,
        is4xx: false,
      };
    case 105:
      return {
        name: "Show Scrolling Text",
        detail: `speed=${p[0]}, noFast=${p[1]}`,
        is4xx: false,
      };
    case 405:
      return {
        name: "Scrolling Text",
        detail: String(p[0] ?? ""),
        is4xx: true,
      };

    // ---- comment / flow ----
    case 108:
      return {
        name: "Comment",
        detail: String(p[0] ?? ""),
        is4xx: false,
      };
    case 408:
      return {
        name: "Comment",
        detail: String(p[0] ?? ""),
        is4xx: true,
      };
    case 109:
      return { name: "Skip", detail: "", is4xx: false };

    case 111:
      return {
        name: "Conditional Branch",
        detail: conditionalBranch(p),
        is4xx: false,
      };
    case 411:
      return { name: "Else", detail: "", is4xx: true };
    case 412:
      return { name: "End If", detail: "", is4xx: true };
    case 112:
      return { name: "Loop", detail: "", is4xx: false };
    case 413:
      return { name: "Repeat Above", detail: "", is4xx: true };
    case 113:
      return { name: "Break Loop", detail: "", is4xx: false };
    case 115:
      return {
        name: "Exit Event Processing",
        detail: "",
        is4xx: false,
      };
    case 117:
      return {
        name: "Common Event",
        detail: commonEventLabel(p[0] as number),
        is4xx: false,
      };
    case 118:
      return {
        name: "Label",
        detail: String(p[0] ?? ""),
        is4xx: false,
      };
    case 119:
      return {
        name: "Jump to Label",
        detail: String(p[0] ?? ""),
        is4xx: false,
      };

    // ---- switches / variables / timer ----
    case 121: {
      const [a, b, v] = p as [number, number, number];
      const range = a === b ? switchLabel(a) : `Switch[${a}..${b}]`;
      return {
        name: "Control Switches",
        detail: `${range} = ${v === 0 ? "ON" : "OFF"}`,
        is4xx: false,
      };
    }
    case 122:
      return {
        name: "Control Variables",
        detail: controlVariables(p),
        is4xx: false,
      };
    case 123:
      return {
        name: "Control Self Switch",
        detail: `SelfSwitch[${p[0]}] = ${p[1] === 0 ? "ON" : "OFF"}`,
        is4xx: false,
      };
    case 124:
      return {
        name: "Control Timer",
        detail: p[0] === 0 ? `start ${p[1]}s` : "stop",
        is4xx: false,
      };

    // ---- party / inventory ----
    case 125:
      return {
        name: "Change Gold",
        detail: `${VALUE_SIGN[p[0] as number] ?? "?"}${valueOperand(p.slice(1))}`,
        is4xx: false,
      };
    case 126:
      return {
        name: "Change Items",
        detail: `${itemLabel(p[0] as number)} ${VALUE_SIGN[p[1] as number]}${valueOperand(p.slice(2))}`,
        is4xx: false,
      };
    case 127: {
      const tail = p.slice(2, -1);
      return {
        name: "Change Weapons",
        detail: `${weaponLabel(p[0] as number)} ${VALUE_SIGN[p[1] as number]}${valueOperand(tail)}${p[p.length - 1] ? " (incl. equip)" : ""}`,
        is4xx: false,
      };
    }
    case 128: {
      const tail = p.slice(2, -1);
      return {
        name: "Change Armors",
        detail: `${armorLabel(p[0] as number)} ${VALUE_SIGN[p[1] as number]}${valueOperand(tail)}${p[p.length - 1] ? " (incl. equip)" : ""}`,
        is4xx: false,
      };
    }
    case 129:
      return {
        name: "Change Party Member",
        detail:
          p[1] === 0
            ? `add ${actorLabel(p[0] as number)}${p[2] ? " (initialize)" : ""}`
            : `remove ${actorLabel(p[0] as number)}`,
        is4xx: false,
      };

    // ---- system flags / audio ----
    case 132:
      return {
        name: "Change Battle BGM",
        detail: (p[0] as { name?: string })?.name ?? "",
        is4xx: false,
      };
    case 133:
      return {
        name: "Change Victory ME",
        detail: (p[0] as { name?: string })?.name ?? "",
        is4xx: false,
      };
    case 134:
      return {
        name: "Change Save Access",
        detail: p[0] === 0 ? "enable" : "disable",
        is4xx: false,
      };
    case 135:
      return {
        name: "Change Menu Access",
        detail: p[0] === 0 ? "enable" : "disable",
        is4xx: false,
      };
    case 136:
      return {
        name: "Change Encounter",
        detail: p[0] === 0 ? "enable" : "disable",
        is4xx: false,
      };
    case 137:
      return {
        name: "Change Formation Access",
        detail: p[0] === 0 ? "enable" : "disable",
        is4xx: false,
      };
    case 138:
      return {
        name: "Change Window Color",
        detail: JSON.stringify(p[0]),
        is4xx: false,
      };
    case 139:
      return {
        name: "Change Default ME",
        detail: (p[0] as { name?: string })?.name ?? "",
        is4xx: false,
      };
    case 140:
      return {
        name: "Change Vehicle BGM",
        detail: `vehicle=${p[0]}, bgm=${(p[1] as { name?: string })?.name ?? ""}`,
        is4xx: false,
      };

    // ---- movement / map ----
    case 201: {
      // [mode, mapId|var, x|var, y|var, direction, fade]
      const mode = p[0];
      const dir = dirName(p[4] as number);
      if (mode === 0) {
        return {
          name: "Transfer Player",
          detail: `${mapLabel(p[1] as number)} (${p[2]}, ${p[3]}) facing ${dir}, fade=${p[5]}`,
          is4xx: false,
        };
      }
      return {
        name: "Transfer Player",
        detail: `via vars (map=${variableLabel(p[1] as number)}, x=${variableLabel(p[2] as number)}, y=${variableLabel(p[3] as number)}) facing ${dir}, fade=${p[5]}`,
        is4xx: false,
      };
    }
    case 202:
      return {
        name: "Set Vehicle Location",
        detail: `vehicle=${p[0]}, ${p[1] === 0 ? `${mapLabel(p[2] as number)} (${p[3]}, ${p[4]})` : "via vars"}`,
        is4xx: false,
      };
    case 203:
      return {
        name: "Set Event Location",
        detail: `char=${p[0]}, ${p[1] === 0 ? `direct (${p[2]}, ${p[3]})` : p[1] === 1 ? "via vars" : `swap with char ${p[2]}`}, facing ${dirName(p[4] as number)}`,
        is4xx: false,
      };
    case 204:
      return {
        name: "Scroll Map",
        detail: `${dirName(p[0] as number)}, distance=${p[1]}, speed=${p[2]}${p[3] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 205:
      return {
        name: "Set Movement Route",
        detail: `char=${p[0]}, ${(p[1] as { list?: unknown[] })?.list?.length ?? 0} step(s)`,
        is4xx: false,
      };
    case 505:
      return {
        name: "  ↳ Route Step",
        detail: `code ${(p[0] as { code?: number })?.code ?? "?"}`,
        is4xx: true,
      };
    case 206:
      return { name: "Get on/off Vehicle", detail: "", is4xx: false };

    // ---- visual ----
    case 211:
      return {
        name: "Change Transparency",
        detail: p[0] === 0 ? "ON" : "OFF",
        is4xx: false,
      };
    case 212:
      return {
        name: "Show Animation",
        detail: `char=${p[0]}, anim=${p[1]}${p[2] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 213:
      return {
        name: "Show Balloon Icon",
        detail: `char=${p[0]}, balloon=${p[1]}${p[2] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 214:
      return { name: "Erase Event", detail: "", is4xx: false };
    case 216:
      return {
        name: "Change Player Followers",
        detail: p[0] === 0 ? "ON" : "OFF",
        is4xx: false,
      };
    case 217:
      return { name: "Gather Followers", detail: "", is4xx: false };
    case 221:
      return { name: "Fadeout Screen", detail: "", is4xx: false };
    case 222:
      return { name: "Fadein Screen", detail: "", is4xx: false };
    case 223:
      return {
        name: "Tint Screen",
        detail: `tone=${JSON.stringify(p[0])}, duration=${p[1]}${p[2] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 224:
      return {
        name: "Flash Screen",
        detail: `color=${JSON.stringify(p[0])}, duration=${p[1]}${p[2] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 225:
      return {
        name: "Shake Screen",
        detail: `power=${p[0]}, speed=${p[1]}, duration=${p[2]}${p[3] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 230:
      return { name: "Wait", detail: `${p[0]} frames`, is4xx: false };

    // ---- pictures ----
    case 231:
      return {
        name: "Show Picture",
        detail: `id=${p[0]}, img="${p[1]}", origin=${p[2]}, x=${p[4]}, y=${p[5]}, scale=(${p[6]}%, ${p[7]}%), opacity=${p[8]}, blend=${p[9]}`,
        is4xx: false,
      };
    case 232:
      return {
        name: "Move Picture",
        detail: `id=${p[0]}, duration=${p[10]}${p[11] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 233:
      return {
        name: "Rotate Picture",
        detail: `id=${p[0]}, speed=${p[1]}`,
        is4xx: false,
      };
    case 234:
      return {
        name: "Tint Picture",
        detail: `id=${p[0]}, tone=${JSON.stringify(p[1])}, duration=${p[2]}${p[3] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 235:
      return {
        name: "Erase Picture",
        detail: `id=${p[0]}`,
        is4xx: false,
      };
    case 236:
      return {
        name: "Set Weather Effect",
        detail: `type=${p[0]}, power=${p[1]}, duration=${p[2]}${p[3] ? ", wait" : ""}`,
        is4xx: false,
      };

    // ---- audio ----
    case 241:
      return {
        name: "Play BGM",
        detail: (p[0] as { name?: string })?.name ?? "",
        is4xx: false,
      };
    case 242:
      return { name: "Fadeout BGM", detail: `${p[0]}s`, is4xx: false };
    case 243:
      return { name: "Save BGM", detail: "", is4xx: false };
    case 244:
      return { name: "Resume BGM", detail: "", is4xx: false };
    case 245:
      return {
        name: "Play BGS",
        detail: (p[0] as { name?: string })?.name ?? "",
        is4xx: false,
      };
    case 246:
      return { name: "Fadeout BGS", detail: `${p[0]}s`, is4xx: false };
    case 249:
      return {
        name: "Play ME",
        detail: (p[0] as { name?: string })?.name ?? "",
        is4xx: false,
      };
    case 250:
      return {
        name: "Play SE",
        detail: (p[0] as { name?: string })?.name ?? "",
        is4xx: false,
      };
    case 251:
      return { name: "Stop SE", detail: "", is4xx: false };
    case 261:
      return {
        name: "Play Movie",
        detail: String(p[0] ?? ""),
        is4xx: false,
      };

    // ---- map appearance ----
    case 281:
      return {
        name: "Change Map Name Display",
        detail: p[0] === 0 ? "ON" : "OFF",
        is4xx: false,
      };
    case 282:
      return {
        name: "Change Tileset",
        detail: `tileset=${p[0]}`,
        is4xx: false,
      };
    case 283:
      return {
        name: "Change Battle Background",
        detail: `bg1="${p[0]}", bg2="${p[1]}"`,
        is4xx: false,
      };
    case 284:
      return {
        name: "Change Parallax",
        detail: `"${p[0]}", loopX=${p[1]}, loopY=${p[2]}, sx=${p[3]}, sy=${p[4]}`,
        is4xx: false,
      };
    case 285: {
      const infoFields = [
        "TerrainTag",
        "EventID",
        "TileID(L1)",
        "TileID(L2)",
        "TileID(L3)",
        "TileID(L4)",
      ];
      const idx = p[1] as number;
      const info =
        idx === -1 ? "RegionID" : (infoFields[idx] ?? `info(${idx})`);
      const loc =
        p[2] === 0
          ? `(${p[3]}, ${p[4]})`
          : `(${variableLabel(p[3] as number)}, ${variableLabel(p[4] as number)})`;
      return {
        name: "Get Location Info",
        detail: `${variableLabel(p[0] as number)} = ${info} at ${loc}`,
        is4xx: false,
      };
    }

    // ---- battle ----
    case 301: {
      const mode = p[0];
      const target =
        mode === 0
          ? `Troop[${p[1]}]`
          : mode === 1
            ? `via ${variableLabel(p[1] as number)}`
            : "RandomEncounter";
      return {
        name: "Battle Processing",
        detail: `${target}${p[2] ? ", canEscape" : ""}${p[3] ? ", canLose" : ""}`,
        is4xx: false,
      };
    }
    case 601:
      return { name: "If Win", detail: "", is4xx: true };
    case 602:
      return { name: "If Escape", detail: "", is4xx: true };
    case 603:
      return { name: "If Lose", detail: "", is4xx: true };
    case 302:
      return {
        name: "Shop Processing",
        detail: `purchaseOnly=${p[p.length - 1]}`,
        is4xx: false,
      };
    case 605:
      return {
        name: "  ↳ Shop Goods",
        detail: JSON.stringify(p),
        is4xx: true,
      };
    case 303:
      return {
        name: "Name Input Processing",
        detail: `${actorLabel(p[0] as number)}, maxLen=${p[1]}`,
        is4xx: false,
      };

    // ---- actor stats ----
    case 311: {
      const head = p.slice(0, 2);
      const sign = VALUE_SIGN[p[2] as number] ?? "?";
      const tail = p.slice(3, -1);
      return {
        name: "Change HP",
        detail: `${iterateActor(head)} ${sign}${valueOperand(tail)}${p[p.length - 1] ? " (allow death)" : ""}`,
        is4xx: false,
      };
    }
    case 312: {
      const head = p.slice(0, 2);
      const sign = VALUE_SIGN[p[2] as number] ?? "?";
      const tail = p.slice(3);
      return {
        name: "Change MP",
        detail: `${iterateActor(head)} ${sign}${valueOperand(tail)}`,
        is4xx: false,
      };
    }
    case 326: {
      const head = p.slice(0, 2);
      const sign = VALUE_SIGN[p[2] as number] ?? "?";
      const tail = p.slice(3);
      return {
        name: "Change TP",
        detail: `${iterateActor(head)} ${sign}${valueOperand(tail)}`,
        is4xx: false,
      };
    }
    case 313: {
      const head = p.slice(0, 2);
      const action = p[2] === 0 ? "+state" : "-state";
      return {
        name: "Change State",
        detail: `${iterateActor(head)} ${action} ${p[3]}`,
        is4xx: false,
      };
    }
    case 314:
      return {
        name: "Recover All",
        detail: iterateActor(p.slice(0, 2)),
        is4xx: false,
      };
    case 315: {
      const head = p.slice(0, 2);
      const sign = VALUE_SIGN[p[2] as number] ?? "?";
      const tail = p.slice(3, -1);
      return {
        name: "Change EXP",
        detail: `${iterateActor(head)} ${sign}${valueOperand(tail)}${p[p.length - 1] ? " (show)" : ""}`,
        is4xx: false,
      };
    }
    case 316: {
      const head = p.slice(0, 2);
      const sign = VALUE_SIGN[p[2] as number] ?? "?";
      const tail = p.slice(3, -1);
      return {
        name: "Change Level",
        detail: `${iterateActor(head)} ${sign}${valueOperand(tail)}${p[p.length - 1] ? " (show)" : ""}`,
        is4xx: false,
      };
    }
    case 317: {
      const head = p.slice(0, 2);
      const paramId = p[2] as number;
      const sign = VALUE_SIGN[p[3] as number] ?? "?";
      const tail = p.slice(4);
      return {
        name: "Change Parameter",
        detail: `${iterateActor(head)}.${paramName(paramId)} ${sign}${valueOperand(tail)}`,
        is4xx: false,
      };
    }
    case 318: {
      const head = p.slice(0, 2);
      const action = p[2] === 0 ? "learn" : "forget";
      return {
        name: "Change Skill",
        detail: `${iterateActor(head)} ${action} skill ${p[3]}`,
        is4xx: false,
      };
    }
    case 319:
      return {
        name: "Change Equipment",
        detail: `${actorLabel(p[0] as number)} slot=${p[1]} → ${itemLabel(p[2] as number)}`,
        is4xx: false,
      };
    case 320:
      return {
        name: "Change Name",
        detail: `${actorLabel(p[0] as number)} = "${p[1]}"`,
        is4xx: false,
      };
    case 321:
      return {
        name: "Change Class",
        detail: `${actorLabel(p[0] as number)} → class ${p[1]}${p[2] ? " (keep EXP)" : ""}`,
        is4xx: false,
      };
    case 322:
      return {
        name: "Change Actor Images",
        detail: `${actorLabel(p[0] as number)}, char="${p[1]}[${p[2]}]", face="${p[3]}[${p[4]}]", battler="${p[5]}"`,
        is4xx: false,
      };
    case 323:
      return {
        name: "Change Vehicle Image",
        detail: `vehicle=${p[0]}, "${p[1]}[${p[2]}]"`,
        is4xx: false,
      };
    case 324:
      return {
        name: "Change Nickname",
        detail: `${actorLabel(p[0] as number)} = "${p[1]}"`,
        is4xx: false,
      };
    case 325:
      return {
        name: "Change Profile",
        detail: `${actorLabel(p[0] as number)} = "${p[1]}"`,
        is4xx: false,
      };

    // ---- enemy stats ----
    case 331: {
      const sign = VALUE_SIGN[p[1] as number] ?? "?";
      const tail = p.slice(2, -1);
      return {
        name: "Change Enemy HP",
        detail: `${enemyLabel(p[0] as number)} ${sign}${valueOperand(tail)}${p[p.length - 1] ? " (allow death)" : ""}`,
        is4xx: false,
      };
    }
    case 332: {
      const sign = VALUE_SIGN[p[1] as number] ?? "?";
      return {
        name: "Change Enemy MP",
        detail: `${enemyLabel(p[0] as number)} ${sign}${valueOperand(p.slice(2))}`,
        is4xx: false,
      };
    }
    case 342: {
      const sign = VALUE_SIGN[p[1] as number] ?? "?";
      return {
        name: "Change Enemy TP",
        detail: `${enemyLabel(p[0] as number)} ${sign}${valueOperand(p.slice(2))}`,
        is4xx: false,
      };
    }
    case 333:
      return {
        name: "Change Enemy State",
        detail: `${enemyLabel(p[0] as number)} ${p[1] === 0 ? "+state" : "-state"} ${p[2]}`,
        is4xx: false,
      };
    case 334:
      return {
        name: "Enemy Recover All",
        detail: enemyLabel(p[0] as number),
        is4xx: false,
      };
    case 335:
      return {
        name: "Enemy Appear",
        detail: enemyLabel(p[0] as number),
        is4xx: false,
      };
    case 336:
      return {
        name: "Enemy Transform",
        detail: `${enemyLabel(p[0] as number)} → ${enemyLabel(p[1] as number)}`,
        is4xx: false,
      };
    case 337:
      return {
        name: "Show Battle Animation",
        detail: `${enemyLabel(p[0] as number)}, anim=${p[1]}${p[2] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 339:
      return {
        name: "Force Action",
        detail: `${p[0] === 0 ? enemyLabel(p[1] as number) : actorLabel(p[1] as number)} uses skill ${p[2]} → target ${p[3]}`,
        is4xx: false,
      };
    case 340:
      return { name: "Abort Battle", detail: "", is4xx: false };

    // ---- system / scripts ----
    case 351:
      return { name: "Open Menu Screen", detail: "", is4xx: false };
    case 352:
      return { name: "Open Save Screen", detail: "", is4xx: false };
    case 353:
      return { name: "Game Over", detail: "", is4xx: false };
    case 354:
      return {
        name: "Return to Title Screen",
        detail: "",
        is4xx: false,
      };
    case 355:
      return {
        name: "Script",
        detail: String(p[0] ?? ""),
        is4xx: false,
      };
    case 655:
      return {
        name: "Script",
        detail: String(p[0] ?? ""),
        is4xx: true,
      };
    case 356:
      return {
        name: "Plugin Command (MV)",
        detail: String(p[0] ?? ""),
        is4xx: false,
      };
    case 357:
      return {
        name: "Plugin Command",
        detail: `${p[0]}.${p[1]} args=${JSON.stringify(p[3])}`,
        is4xx: false,
      };

    default:
      return {
        name: `Unknown (${cmd.code})`,
        detail: JSON.stringify(p),
        is4xx: false,
      };
  }
}

// mirrors rmmz-types/lib/data/commands.d.ts.

/** NOTE
TS's type refinement isn't as reliable as a dependently typed langauge. Probably because
it does not track the correct equality.

Take `gameDataSource` for an example. Within which we should have `tail === tl`.
Meanwhile, e.g. in case 3, only `tail` is refined to 

const tail: [number, 0 | 2 | 1 | 3 | 6 | 7 | 4 | 5 | 8 | 9 | 10 | 11 | 12]

where as `tl` (const tll = tl inside case 3) is not:

const tll: [number] | [number, 0 | 2 | 1 | 3 | 6 | 7 | 4 | 5 | 8 | 9 | 10 | 11 | 12] | [number, 0 | 2 | 1 | 3 | 6 | 7 | 4 | 5 | 8 | 9 | 10] | [number, 0 | 2 | 1 | 3 | 4] | [ActionDataType] | [0 | 2 | 1 | 3 | 6 | 7 | 4 | 5 | 8 | 9]

And indeed, if we destructure `tll` instead of `tail`, the type of `statIdx` won't be refined properly.

Which is why some codes below are either inlined (like cmd.parameters), or pattern matched within each branch again.
*/
import {
  ActionDataType,
  ActorID,
  ArmorID,
  CharacterID,
  ConditionalBranchParams,
  DataCommand,
  EnemyID,
  ItemID,
  IterateActorArguments,
  ValueOperand,
  VariableID,
  VariableOperationType,
  WeaponID,
} from "rmmz-types";

// We use RawCommand instead of DataCommand as obsolete commands like
// 404, 412 exist only in MV.
export interface FormattedCommand {
  name: string;
  detail: string;
  /** commands appearing together with their 1xx variants, can't be dangled. Also includes 6xx */
  is4xx: boolean;
}

/** `P` for `Prod` */
type P<Head, Params = []> = {
  code: Head;
  parameters: Params;
};

type DataCommandExt =
  | DataCommand
  | ({ indent?: number | null } & (P<404> | P<412>));

type GameData =
  | [0, ItemID] /* Item */
  | [1, WeaponID] /* Weapon */
  | [2, ArmorID] /* Armor */
  | [
      3 /* Actor */,
      ActorID,
      (
        /* Level, EXP, HP, MP, (param 0~7), TP */
        0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
      ),
    ]
  | [
      4 /* Enemy */,
      EnemyID,
      (
        /* HP, MP, (param 0~7), TP */
        0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
      ),
    ]
  | [
      5 /* Character */,
      CharacterID,
      (
        /* Map X, Map Y, Direction, Screen X, Screen Y */
        0 | 1 | 2 | 3 | 4
      ),
    ]
  | [6, number] /* Party */
  | [8, ActionDataType] /* Last */
  | [
      7,
      (
        | 0 /* Map ID */
        | 1 /* Party Members */
        | 2 /* Gold */
        | 3 /* Steps */
        | 4 /* Play Time */
        | 5 /* Timer */
        | 6 /* Save Count */
        | 7 /* Battle Count */
        | 8 /* Win Count */
        /* Escape Count */
        | 9
      ),
    ];
type CondData =
  | [0, number] /* Constant */
  | [1, VariableID] /* Variable */
  | [2, number, number] /* Random */
  /* Game Data */
  | [3, ...GameData]
  /* Script */
  | [4, string];

type CondParam = [VariableID, VariableID, VariableOperationType, ...CondData];

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
function valueOperand(rest: ValueOperand): string {
  switch (rest[0]) {
    case 0:
      return rest[1].toString();
    case 1:
      return variableLabel(rest[1]);
    default:
      return JSON.stringify(rest);
  }
}

//   [0, actorId] -> actor name
//   [1, varId]   -> "Actor(Var[varId])"
function iterateActor(parts: IterateActorArguments): string {
  if (parts[0] === 0) return actorLabel(parts[1]);
  else return `Actor(${variableLabel(parts[1])})`;
}

// ---------- 122 sub-source (Game Data) decoding -------------------------------

function gameDataSource(rest: GameData): string {
  switch (rest[0]) {
    case 0: {
      const [_, ...tail] = rest;
      return `count of ${itemLabel(tail[0])}`;
    }
    case 1: {
      const [_, ...tail] = rest;
      return `count of ${weaponLabel(tail[0])}`;
    }
    case 2: {
      const [_, ...tail] = rest;
      return `count of ${armorLabel(tail[0])}`;
    }
    case 3: {
      // Actor stat
      const [_, ...tail] = rest;
      const [actorId, statIdx] = tail;
      const stat =
        ["Level", "EXP", "HP", "MP", ...PARAM_NAMES, "TP"][statIdx] ??
        `stat[${statIdx}]`;
      return `${actorLabel(actorId)}.${stat}`;
    }
    case 4: {
      const [_, ...tail] = rest;
      const [enemyId, statIdx] = tail;
      const stat =
        ["HP", "MP", ...PARAM_NAMES, "TP"][statIdx] ?? `stat[${statIdx}]`;
      return `${enemyLabel(enemyId)}.${stat}`;
    }
    case 5: {
      const [_, ...tail] = rest;
      const [charId, attrIdx] = tail;
      const attr =
        ["MapX", "MapY", "Direction", "ScreenX", "ScreenY"][attrIdx] ??
        `attr[${attrIdx}]`;
      return `Character[${charId}].${attr}`;
    }
    case 6: {
      const [_, ...tail] = rest;
      return `Party member [${tail[0]}]`;
    }
    case 7: {
      const [_, ...tail] = rest;
      const idx = tail[0];
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
    case 8: {
      const [_, ...tail] = rest;
      return `LastAction[${tail[0]}]`;
    }
  }
}

// ---------- 111 Conditional Branch decoding -----------------------------------

function conditionalBranch(p: ConditionalBranchParams): string {
  const kind = p[0];
  switch (kind) {
    case 0:
      return `${switchLabel(p[1])} is ${p[2] === 0 ? "ON" : "OFF"}`;
    case 1: {
      // Variable. p[2]: 0=value, 1=variable; p[3]: rhs; p[4]: compare
      const lhs = variableLabel(p[1]);
      const rhs = p[2] === 0 ? String(p[3]) : variableLabel(p[3]);
      const cmp = COMPARE[p[4]] ?? `cmp(${p[4]})`;
      return `${lhs} ${cmp} ${rhs}`;
    }
    case 2:
      return `SelfSwitch[${p[1]}] is ${p[2] === 0 ? "ON" : "OFF"}`;
    case 3:
      return `Timer ${p[2] === 0 ? "≥" : "≤"} ${p[1]}s`;
    case 4: {
      // Actor sub-condition
      const aId = p[1];
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
          return `${actorLabel(aId)} equips ${weaponLabel(p[3])}`;
        case 5:
          return `${actorLabel(aId)} equips ${armorLabel(p[3])}`;
        case 6:
          return `${actorLabel(aId)} has state ${p[3]}`;
        default:
          return `${actorLabel(aId)} sub(${sub})=${p[3]}`;
      }
    }
    case 5: {
      const eId = p[1];
      if (p[2] === 0) return `${enemyLabel(eId)} appeared`;
      return `${enemyLabel(eId)} has state ${p[3]}`;
    }
    case 6:
      return `Character[${p[1]}] facing ${dirName(p[2])}`;
    case 7: {
      const cmp = ["≥", "≤", "<"][p[2]] ?? "?";
      return `Gold ${cmp} ${p[1]}`;
    }
    case 8:
      return `Party has ${itemLabel(p[1])}`;
    case 9:
      return `Party has ${weaponLabel(p[1])}${p[2] ? " (incl. equip)" : ""}`;
    case 10:
      return `Party has ${armorLabel(p[1])}${p[2] ? " (incl. equip)" : ""}`;
    case 11: {
      const trigger = ["pressed", "triggered", "repeated"][p[2] ?? 0];
      return `Button "${p[1]}" is ${trigger}`;
    }
    case 12:
      return `Script: ${p[1]}`;
    case 13:
      return `Vehicle[${p[1]}]`;
  }
}

// ---------- 122 Control Variables decoding ------------------------------------

function controlVariables(p: CondParam): string {
  const [startId, endId, opIdx, ...tl] = p;
  const op = VAR_OP[opIdx] ?? `op(${opIdx})`;
  const range =
    startId === endId ? variableLabel(startId) : `Var[${startId}..${endId}]`;
  let rhs: string;
  const [cond, ..._] = tl;
  switch (cond) {
    case 0: {
      const [_, ...rest] = tl;
      rhs = rest[0].toString();
      break;
    }
    case 1: {
      const [_, ...rest] = tl;
      rhs = variableLabel(rest[0]);
      break;
    }
    case 2: {
      const [_, ...rest] = tl;
      rhs = `random(${rest[0]}..${rest[1]})`;
      break;
    }
    case 3: {
      const [_, ...rest] = tl;
      rhs = gameDataSource(rest);
      break;
    }
    case 4: {
      const [_, ...rest] = tl;
      rhs = `script(${rest[0]})`;
      break;
    }
  }
  return `${range} ${op} ${rhs}`;
}

// ---------- main switch -------------------------------------------------------

export function formatCommand(cmd: DataCommandExt): FormattedCommand {
  // cmd.parameters is inlined as `const` binding may block some type refinement

  switch (cmd.code) {
    // ---- text ----
    case 0:
      return { name: "()", detail: "", is4xx: false };
    case 101:
      return {
        name: "Show Text",
        detail: `talker="${cmd.parameters[4]}", face="${cmd.parameters[0]}[${cmd.parameters[1]}]", bg=${cmd.parameters[2]}, pos=${cmd.parameters[3]}`,
        is4xx: false,
      };
    case 401:
      return {
        name: "Text",
        detail: cmd.parameters[0],
        is4xx: true,
      };
    case 102:
      return {
        name: "Show Choices",
        detail: `[${cmd.parameters[0].join(" | ")}] cancel=${cmd.parameters[1]}, default=${cmd.parameters[2]}`,
        is4xx: false,
      };
    case 402:
      return {
        name: `When [${cmd.parameters[0]}]`,
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
        detail: `${variableLabel(cmd.parameters[0])}, max digits=${cmd.parameters[1]}`,
        is4xx: false,
      };
    case 104:
      return {
        name: "Select Item",
        detail: `${variableLabel(cmd.parameters[0])}, type=${cmd.parameters[1] ?? "any"}`,
        is4xx: false,
      };
    case 105:
      return {
        name: "Show Scrolling Text",
        detail: `speed=${cmd.parameters[0]}, noFast=${cmd.parameters[1]}`,
        is4xx: false,
      };
    case 405:
      return {
        name: "Scrolling Text",
        detail: cmd.parameters[0],
        is4xx: true,
      };

    // ---- comment / flow ----
    case 108:
      return {
        name: "Comment",
        detail: cmd.parameters[0],
        is4xx: false,
      };
    case 408:
      return {
        name: "Comment",
        detail: cmd.parameters[0],
        is4xx: true,
      };
    case 109:
      return { name: "Skip", detail: "", is4xx: false };

    case 111:
      return {
        name: "Conditional Branch",
        detail: conditionalBranch(cmd.parameters),
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
        detail: commonEventLabel(cmd.parameters[0]),
        is4xx: false,
      };
    case 118:
      return {
        name: "Label",
        detail: cmd.parameters[0],
        is4xx: false,
      };
    case 119:
      return {
        name: "Jump to Label",
        detail: cmd.parameters[0],
        is4xx: false,
      };

    // ---- switches / variables / timer ----
    case 121: {
      const [a, b, v] = cmd.parameters;
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
        detail: controlVariables(cmd.parameters),
        is4xx: false,
      };
    case 123:
      return {
        name: "Control Self Switch",
        detail: `SelfSwitch[${cmd.parameters[0]}] = ${cmd.parameters[1] === 0 ? "ON" : "OFF"}`,
        is4xx: false,
      };
    case 124:
      return {
        name: "Control Timer",
        detail:
          cmd.parameters[0] === 0 ? `start ${cmd.parameters[1]}s` : "stop",
        is4xx: false,
      };

    // ---- party / inventory ----
    case 125:
      return {
        name: "Change Gold",
        detail: `${VALUE_SIGN[cmd.parameters[0]]}${valueOperand([cmd.parameters[1], cmd.parameters[2]])}`,
        is4xx: false,
      };
    case 126:
      return {
        name: "Change Items",
        detail: `${itemLabel(cmd.parameters[0])} ${VALUE_SIGN[cmd.parameters[1]]}${valueOperand([cmd.parameters[2], cmd.parameters[3]])}`,
        is4xx: false,
      };
    case 127: {
      const tail: [0, number] | [1, number] = [
        cmd.parameters[2],
        cmd.parameters[3],
      ];
      return {
        name: "Change Weapons",
        detail: `${weaponLabel(cmd.parameters[0])} ${VALUE_SIGN[cmd.parameters[1]]}${valueOperand(tail)}${cmd.parameters[cmd.parameters.length - 1] ? " (incl. equip)" : ""}`,
        is4xx: false,
      };
    }
    case 128: {
      const tail: [0, number] | [1, number] = [
        cmd.parameters[2],
        cmd.parameters[3],
      ];
      return {
        name: "Change Armors",
        detail: `${armorLabel(cmd.parameters[0])} ${VALUE_SIGN[cmd.parameters[1]]}${valueOperand(tail)}${cmd.parameters[cmd.parameters.length - 1] ? " (incl. equip)" : ""}`,
        is4xx: false,
      };
    }
    case 129:
      return {
        name: "Change Party Member",
        detail:
          cmd.parameters[1] === 0
            ? `add ${actorLabel(cmd.parameters[0])}${cmd.parameters[2] ? " (initialize)" : ""}`
            : `remove ${actorLabel(cmd.parameters[0])}`,
        is4xx: false,
      };

    // ---- system flags / audio ----
    case 132:
      return {
        name: "Change Battle BGM",
        detail: cmd.parameters[0].name,
        is4xx: false,
      };
    case 133:
      return {
        name: "Change Victory ME",
        detail: cmd.parameters[0].name,
        is4xx: false,
      };
    case 134:
      return {
        name: "Change Save Access",
        detail: cmd.parameters[0] === 0 ? "enable" : "disable",
        is4xx: false,
      };
    case 135:
      return {
        name: "Change Menu Access",
        detail: cmd.parameters[0] === 0 ? "enable" : "disable",
        is4xx: false,
      };
    case 136:
      return {
        name: "Change Encounter",
        detail: cmd.parameters[0] === 0 ? "enable" : "disable",
        is4xx: false,
      };
    case 137:
      return {
        name: "Change Formation Access",
        detail: cmd.parameters[0] === 0 ? "enable" : "disable",
        is4xx: false,
      };
    case 138:
      return {
        name: "Change Window Color",
        detail: JSON.stringify(cmd.parameters[0]),
        is4xx: false,
      };
    case 139:
      return {
        name: "Change Default ME",
        detail: cmd.parameters[0].name,
        is4xx: false,
      };
    case 140:
      return {
        name: "Change Vehicle BGM",
        detail: `vehicle=${cmd.parameters[0]}, bgm=${cmd.parameters[1].name}`,
        is4xx: false,
      };

    // ---- movement / map ----
    case 201: {
      // [mode, mapId|var, x|var, y|var, direction, fade]
      const mode = cmd.parameters[0];
      const dir = dirName(cmd.parameters[4]);
      if (mode === 0) {
        return {
          name: "Transfer Player",
          detail: `${mapLabel(cmd.parameters[1])} (${cmd.parameters[2]}, ${cmd.parameters[3]}) facing ${dir}, fade=${cmd.parameters[5]}`,
          is4xx: false,
        };
      }
      return {
        name: "Transfer Player",
        detail: `via vars (map=${variableLabel(cmd.parameters[1])}, x=${variableLabel(cmd.parameters[2])}, y=${variableLabel(cmd.parameters[3])}) facing ${dir}, fade=${cmd.parameters[5]}`,
        is4xx: false,
      };
    }
    case 202:
      return {
        name: "Set Vehicle Location",
        detail: `vehicle=${cmd.parameters[0]}, ${cmd.parameters[1] === 0 ? `${mapLabel(cmd.parameters[2])} (${cmd.parameters[3]}, ${cmd.parameters[4]})` : "via vars"}`,
        is4xx: false,
      };
    case 203:
      return {
        name: "Set Event Location",
        detail: `char=${cmd.parameters[0]}, ${cmd.parameters[1] === 0 ? `direct (${cmd.parameters[2]}, ${cmd.parameters[3]})` : cmd.parameters[1] === 1 ? "via vars" : `swap with char ${cmd.parameters[2]}`}, facing ${dirName(cmd.parameters[4])}`,
        is4xx: false,
      };
    case 204:
      return {
        name: "Scroll Map",
        detail: `${dirName(cmd.parameters[0])}, distance=${cmd.parameters[1]}, speed=${cmd.parameters[2]}${cmd.parameters[3] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 205:
      return {
        name: "Set Movement Route",
        detail: `char=${cmd.parameters[0]}, ${cmd.parameters[1].list.length} step(s)`,
        is4xx: false,
      };
    case 505:
      return {
        name: "  ↳ Route Step",
        detail: `code ${cmd.parameters[0].code}`,
        is4xx: true,
      };
    case 206:
      return { name: "Get on/off Vehicle", detail: "", is4xx: false };

    // ---- visual ----
    case 211:
      return {
        name: "Change Transparency",
        detail: cmd.parameters[0] === 0 ? "ON" : "OFF",
        is4xx: false,
      };
    case 212:
      return {
        name: "Show Animation",
        detail: `char=${cmd.parameters[0]}, anim=${cmd.parameters[1]}${cmd.parameters[2] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 213:
      return {
        name: "Show Balloon Icon",
        detail: `char=${cmd.parameters[0]}, balloon=${cmd.parameters[1]}${cmd.parameters[2] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 214:
      return { name: "Erase Event", detail: "", is4xx: false };
    case 216:
      return {
        name: "Change Player Followers",
        detail: cmd.parameters[0] === 0 ? "ON" : "OFF",
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
        detail: `tone=${JSON.stringify(cmd.parameters[0])}, duration=${cmd.parameters[1]}${cmd.parameters[2] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 224:
      return {
        name: "Flash Screen",
        detail: `color=${JSON.stringify(cmd.parameters[0])}, duration=${cmd.parameters[1]}${cmd.parameters[2] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 225:
      return {
        name: "Shake Screen",
        detail: `power=${cmd.parameters[0]}, speed=${cmd.parameters[1]}, duration=${cmd.parameters[2]}${cmd.parameters[3] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 230:
      return {
        name: "Wait",
        detail: `${cmd.parameters[0]} frames`,
        is4xx: false,
      };

    // ---- pictures ----
    case 231:
      return {
        name: "Show Picture",
        detail: `id=${cmd.parameters[0]}, img="${cmd.parameters[1]}", origin=${cmd.parameters[2]}, x=${cmd.parameters[4]}, y=${cmd.parameters[5]}, scale=(${cmd.parameters[6]}%, ${cmd.parameters[7]}%), opacity=${cmd.parameters[8]}, blend=${cmd.parameters[9]}`,
        is4xx: false,
      };
    case 232:
      return {
        name: "Move Picture",
        detail: `id=${cmd.parameters[0]}, duration=${cmd.parameters[10]}${cmd.parameters[11] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 233:
      return {
        name: "Rotate Picture",
        detail: `id=${cmd.parameters[0]}, speed=${cmd.parameters[1]}`,
        is4xx: false,
      };
    case 234:
      return {
        name: "Tint Picture",
        detail: `id=${cmd.parameters[0]}, tone=${JSON.stringify(cmd.parameters[1])}, duration=${cmd.parameters[2]}${cmd.parameters[3] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 235:
      return {
        name: "Erase Picture",
        detail: `id=${cmd.parameters[0]}`,
        is4xx: false,
      };
    case 236:
      return {
        name: "Set Weather Effect",
        detail: `type=${cmd.parameters[0]}, power=${cmd.parameters[1]}, duration=${cmd.parameters[2]}${cmd.parameters[3] ? ", wait" : ""}`,
        is4xx: false,
      };

    // ---- audio ----
    case 241:
      return {
        name: "Play BGM",
        detail: cmd.parameters[0].name,
        is4xx: false,
      };
    case 242:
      return {
        name: "Fadeout BGM",
        detail: `${cmd.parameters[0]}s`,
        is4xx: false,
      };
    case 243:
      return { name: "Save BGM", detail: "", is4xx: false };
    case 244:
      return { name: "Resume BGM", detail: "", is4xx: false };
    case 245:
      return {
        name: "Play BGS",
        detail: cmd.parameters[0].name,
        is4xx: false,
      };
    case 246:
      return {
        name: "Fadeout BGS",
        detail: `${cmd.parameters[0]}s`,
        is4xx: false,
      };
    case 249:
      return {
        name: "Play ME",
        detail: cmd.parameters[0].name,
        is4xx: false,
      };
    case 250:
      return {
        name: "Play SE",
        detail: cmd.parameters[0].name,
        is4xx: false,
      };
    case 251:
      return { name: "Stop SE", detail: "", is4xx: false };
    case 261:
      return {
        name: "Play Movie",
        detail: cmd.parameters[0],
        is4xx: false,
      };

    // ---- map appearance ----
    case 281:
      return {
        name: "Change Map Name Display",
        detail: cmd.parameters[0] === 0 ? "ON" : "OFF",
        is4xx: false,
      };
    case 282:
      return {
        name: "Change Tileset",
        detail: `tileset=${cmd.parameters[0]}`,
        is4xx: false,
      };
    case 283:
      return {
        name: "Change Battle Background",
        detail: `bg1="${cmd.parameters[0]}", bg2="${cmd.parameters[1]}"`,
        is4xx: false,
      };
    case 284:
      return {
        name: "Change Parallax",
        detail: `"${cmd.parameters[0]}", loopX=${cmd.parameters[1]}, loopY=${cmd.parameters[2]}, sx=${cmd.parameters[3]}, sy=${cmd.parameters[4]}`,
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
      const idx = cmd.parameters[1];
      const info =
        idx === -1 ? "RegionID" : (infoFields[idx] ?? `info(${idx})`);
      const loc =
        cmd.parameters[2] === 0
          ? `(${cmd.parameters[3]}, ${cmd.parameters[4]})`
          : `(${variableLabel(cmd.parameters[3])}, ${variableLabel(cmd.parameters[4])})`;
      return {
        name: "Get Location Info",
        detail: `${variableLabel(cmd.parameters[0])} = ${info} at ${loc}`,
        is4xx: false,
      };
    }

    // ---- battle ----
    case 301: {
      const mode = cmd.parameters[0];
      const target =
        mode === 0
          ? `Troocmd.parameters[${cmd.parameters[1]}]`
          : mode === 1
            ? `via ${variableLabel(cmd.parameters[1])}`
            : "RandomEncounter";
      return {
        name: "Battle Processing",
        detail: `${target}${cmd.parameters[2] ? ", canEscape" : ""}${cmd.parameters[3] ? ", canLose" : ""}`,
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
        detail: `purchaseOnly=${cmd.parameters[cmd.parameters.length - 1]}`,
        is4xx: false,
      };
    case 605:
      return {
        name: "  ↳ Shop Goods",
        detail: JSON.stringify(cmd.parameters),
        is4xx: true,
      };
    case 303:
      return {
        name: "Name Input Processing",
        detail: `${actorLabel(cmd.parameters[0])}, maxLen=${cmd.parameters[1]}`,
        is4xx: false,
      };

    // ---- actor stats ----
    case 311: {
      const head: [0, number] | [1, number] = [
        cmd.parameters[0],
        cmd.parameters[1],
      ];
      const sign = VALUE_SIGN[cmd.parameters[2]];
      const tail: [0, number] | [1, number] = [
        cmd.parameters[3],
        cmd.parameters[4],
      ];
      return {
        name: "Change HP",
        detail: `${iterateActor(head)} ${sign}${valueOperand(tail)}${cmd.parameters[cmd.parameters.length - 1] ? " (allow death)" : ""}`,
        is4xx: false,
      };
    }
    case 312: {
      const head: [0, number] | [1, number] = [
        cmd.parameters[0],
        cmd.parameters[1],
      ];
      const sign = VALUE_SIGN[cmd.parameters[2]];
      const tail: [0, number] | [1, number] = [
        cmd.parameters[3],
        cmd.parameters[4],
      ];
      return {
        name: "Change MP",
        detail: `${iterateActor(head)} ${sign}${valueOperand(tail)}`,
        is4xx: false,
      };
    }
    case 326: {
      const head: [0, number] | [1, number] = [
        cmd.parameters[0],
        cmd.parameters[1],
      ];
      const sign = VALUE_SIGN[cmd.parameters[2]];
      const tail: [0, number] | [1, number] = [
        cmd.parameters[3],
        cmd.parameters[4],
      ];
      return {
        name: "Change TP",
        detail: `${iterateActor(head)} ${sign}${valueOperand(tail)}`,
        is4xx: false,
      };
    }
    case 313: {
      const head: [0, number] | [1, number] = [
        cmd.parameters[0],
        cmd.parameters[1],
      ];
      const action = cmd.parameters[2] === 0 ? "+" : "-";
      return {
        name: "Change State",
        detail: `${iterateActor(head)} ${action}${cmd.parameters[3]}`,
        is4xx: false,
      };
    }
    case 314:
      return {
        name: "Recover All",
        detail: iterateActor([cmd.parameters[0], cmd.parameters[1]]),
        is4xx: false,
      };
    case 315: {
      const head: [0, number] | [1, number] = [
        cmd.parameters[0],
        cmd.parameters[1],
      ];
      const sign = VALUE_SIGN[cmd.parameters[2]];
      const tail: [0, number] | [1, number] = [
        cmd.parameters[3],
        cmd.parameters[4],
      ];
      return {
        name: "Change EXP",
        detail: `${iterateActor(head)} ${sign}${valueOperand(tail)}${cmd.parameters[cmd.parameters.length - 1] ? " (show)" : ""}`,
        is4xx: false,
      };
    }
    case 316: {
      const head: [0, number] | [1, number] = [
        cmd.parameters[0],
        cmd.parameters[1],
      ];
      const sign = VALUE_SIGN[cmd.parameters[2]];
      const tail: [0, number] | [1, number] = [
        cmd.parameters[3],
        cmd.parameters[4],
      ];
      return {
        name: "Change Level",
        detail: `${iterateActor(head)} ${sign}${valueOperand(tail)}${cmd.parameters[cmd.parameters.length - 1] ? " (show)" : ""}`,
        is4xx: false,
      };
    }
    case 317: {
      const head: [0, number] | [1, number] = [
        cmd.parameters[0],
        cmd.parameters[1],
      ];
      const paramId = cmd.parameters[2];
      const sign = VALUE_SIGN[cmd.parameters[3]];
      const tail: [0, number] | [1, number] = [
        cmd.parameters[4],
        cmd.parameters[5],
      ];
      return {
        name: "Change Parameter",
        detail: `${iterateActor(head)}.${paramName(paramId)} ${sign}${valueOperand(tail)}`,
        is4xx: false,
      };
    }
    case 318: {
      const head: [0, number] | [1, number] = [
        cmd.parameters[0],
        cmd.parameters[1],
      ];
      const action = cmd.parameters[2] === 0 ? "learn" : "forget";
      return {
        name: "Change Skill",
        detail: `${iterateActor(head)} ${action} skill ${cmd.parameters[3]}`,
        is4xx: false,
      };
    }
    case 319:
      return {
        name: "Change Equipment",
        detail: `${actorLabel(cmd.parameters[0])} slot=${cmd.parameters[1]} → ${itemLabel(cmd.parameters[2])}`,
        is4xx: false,
      };
    case 320:
      return {
        name: "Change Name",
        detail: `${actorLabel(cmd.parameters[0])} = "${cmd.parameters[1]}"`,
        is4xx: false,
      };
    case 321:
      return {
        name: "Change Class",
        detail: `${actorLabel(cmd.parameters[0])} → class ${cmd.parameters[1]}${cmd.parameters[2] ? " (keep EXP)" : ""}`,
        is4xx: false,
      };
    case 322:
      return {
        name: "Change Actor Images",
        detail: `${actorLabel(cmd.parameters[0])}, char="${cmd.parameters[1]}[${cmd.parameters[2]}]", face="${cmd.parameters[3]}[${cmd.parameters[4]}]", battler="${cmd.parameters[5]}"`,
        is4xx: false,
      };
    case 323:
      return {
        name: "Change Vehicle Image",
        detail: `vehicle=${cmd.parameters[0]}, "${cmd.parameters[1]}[${cmd.parameters[2]}]"`,
        is4xx: false,
      };
    case 324:
      return {
        name: "Change Nickname",
        detail: `${actorLabel(cmd.parameters[0])} = "${cmd.parameters[1]}"`,
        is4xx: false,
      };
    case 325:
      return {
        name: "Change Profile",
        detail: `${actorLabel(cmd.parameters[0])} = "${cmd.parameters[1]}"`,
        is4xx: false,
      };

    // ---- enemy stats ----
    case 331: {
      const sign = VALUE_SIGN[cmd.parameters[1]];
      const tail: [0, number] | [1, number] = [
        cmd.parameters[2],
        cmd.parameters[3],
      ];

      return {
        name: "Change Enemy HP",
        detail: `${enemyLabel(cmd.parameters[0])} ${sign}${valueOperand(tail)}${cmd.parameters[cmd.parameters.length - 1] ? " (allow death)" : ""}`,
        is4xx: false,
      };
    }
    case 332: {
      const sign = VALUE_SIGN[cmd.parameters[1]];
      return {
        name: "Change Enemy MP",
        detail: `${enemyLabel(cmd.parameters[0])} ${sign}${valueOperand([cmd.parameters[2], cmd.parameters[3]])}`,
        is4xx: false,
      };
    }
    case 342: {
      const sign = VALUE_SIGN[cmd.parameters[1]];
      return {
        name: "Change Enemy TP",
        detail: `${enemyLabel(cmd.parameters[0])} ${sign}${valueOperand([cmd.parameters[2], cmd.parameters[3]])}`,
        is4xx: false,
      };
    }
    case 333:
      return {
        name: "Change Enemy State",
        detail: `${enemyLabel(cmd.parameters[0])} ${cmd.parameters[1] === 0 ? "+" : "-"}${cmd.parameters[2]}`,
        is4xx: false,
      };
    case 334:
      return {
        name: "Enemy Recover All",
        detail: enemyLabel(cmd.parameters[0]),
        is4xx: false,
      };
    case 335:
      return {
        name: "Enemy Appear",
        detail: enemyLabel(cmd.parameters[0]),
        is4xx: false,
      };
    case 336:
      return {
        name: "Enemy Transform",
        detail: `${enemyLabel(cmd.parameters[0])} → ${enemyLabel(cmd.parameters[1])}`,
        is4xx: false,
      };
    case 337:
      return {
        name: "Show Battle Animation",
        detail: `${enemyLabel(cmd.parameters[0])}, anim=${cmd.parameters[1]}${cmd.parameters[2] ? ", wait" : ""}`,
        is4xx: false,
      };
    case 339:
      return {
        name: "Force Action",
        detail: `${cmd.parameters[0] === 0 ? enemyLabel(cmd.parameters[1]) : actorLabel(cmd.parameters[1])} uses skill ${cmd.parameters[2]} → target ${cmd.parameters[3]}`,
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
        detail: cmd.parameters[0],
        is4xx: false,
      };
    case 655:
      return {
        name: "Script",
        detail: cmd.parameters[0],
        is4xx: true,
      };
    case 356:
      return {
        name: "Plugin Command (MV)",
        detail: cmd.parameters[0],
        is4xx: false,
      };
    case 357:
      return {
        name: "Plugin Command",
        detail: `${cmd.parameters[0]}.${cmd.parameters[1]} args=${JSON.stringify(cmd.parameters[3])}`,
        is4xx: false,
      };

    default:
      return {
        name: `(Undocumented)`,
        detail: JSON.stringify(cmd.parameters),
        is4xx: false,
      };
  }
}

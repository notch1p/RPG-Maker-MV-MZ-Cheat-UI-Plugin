import { DataManager, Utils } from "rmmz-types";

import { Key } from "./KeyCodes";
import { Alert } from "./AlertHelper";
import { cloneObject } from "./Tools";
import {
  SpeedCheat,
  SceneCheat,
  GeneralCheat,
  BattleCheat,
  MessageCheat,
} from "./CheatHelper";
import { ShortcutMap } from "./ShortcutHelper";

type ParamBag = Record<string, any>;

interface RawShortcutSetting {
  shortcut: string;
  param?: ParamBag;
}

interface ShortcutSetting {
  shortcut: Key;
  param?: ParamBag;
}

interface ShortcutParamConfig {
  name: string;
  desc: string;
  isInvalidValue(value: unknown): string | false;

  convertValue(value: unknown): any;
}

interface ShortcutConfigRaw {
  name: string;
  desc: string;
  necessary?: boolean;
  combiningKeyAlone?: boolean;
  param?: Record<string, ShortcutParamConfig>;
  enterAction?: (param: ParamBag) => void;
  repeatAction?: (param: ParamBag) => void;
  leaveAction?: (param: ParamBag) => void;
}

// default shortcut settings
const defaultShortcutSettings: Record<string, RawShortcutSetting> = {
  toggleCheatModal: {
    shortcut: "ctrl c",
  },

  toggleCheatModalToSaveLocationComponent: {
    shortcut: "ctrl m",
  },

  quickSave: {
    shortcut: "ctrl s",
    param: {
      slot: 1, // 1-indexed
    },
  },

  quickLoad: {
    shortcut: "ctrl q",
    param: {
      slot: 1, // 1-indexed
    },
  },

  openSaveScene: {
    shortcut: "ctrl [",
  },

  openLoadScene: {
    shortcut: "ctrl ]",
  },

  gotoTitle: {
    shortcut: "ctrl t",
  },

  forceVictory: {
    shortcut: "ctrl v",
  },

  forceDefeat: {
    shortcut: "ctrl d",
  },

  forceEscape: {
    shortcut: "ctrl e",
  },

  toggleNoClip: {
    shortcut: "alt w",
  },

  enemyWound: {
    shortcut: "alt 1",
  },

  enemyRecovery: {
    shortcut: "alt 0",
  },

  partyWound: {
    shortcut: "alt 2",
  },

  partyRecovery: {
    shortcut: "alt 9",
  },

  setSpeed: {
    shortcut: "", // no keymap
    param: {
      speed: 5,
    },
  },

  skipMessage: {
    shortcut: "",
    param: {
      accelerate: 1,
    },
  },

  openDevTool: {
    shortcut: "f12",
  },
};

export function isInValueInRange(
  value: unknown,
  lowerBound: number,
  upperBound: number,
): string | false {
  let num: number;
  try {
    num = Number(value);
  } catch {
    return "Value must be a number";
  }

  if (isNaN(num) || !Number.isInteger(num)) {
    return "Value must be a number";
  }

  if (num < lowerBound || upperBound < num) {
    return `Value must be between [${lowerBound}, ${upperBound}]`;
  }

  return false;
}

// immutable
const shortcutConfig: Record<string, ShortcutConfigRaw> = {
  toggleCheatModal: {
    name: "切换作弊窗口",
    desc: "必须项",
    necessary: true,
    enterAction(_param) {
      GeneralCheat.toggleCheatModal();
    },
  },

  toggleCheatModalToSaveLocationComponent: {
    name: "切换“保存位置”窗口",
    desc: "",
    enterAction(_param) {
      GeneralCheat.toggleCheatModal("save-recall-panel");
    },
  },

  quickSave: {
    name: "快速保存",
    desc: "快速保存到指定槽",
    param: {
      slot: {
        name: "存档槽",
        desc: "保存的槽",
        isInvalidValue(value) {
          return isInValueInRange(value, 1, DataManager.maxSavefiles());
        },
        convertValue(value) {
          return Number(value);
        },
      },
    },
    enterAction(param) {
      SceneCheat.quickSave(param.slot);
    },
  },

  quickLoad: {
    name: "快速加载",
    desc: "从指定存档快速加载",
    param: {
      slot: {
        name: "存档槽",
        desc: "加载的槽",
        isInvalidValue(value) {
          return isInValueInRange(value, 1, DataManager.maxSavefiles());
        },
        convertValue(value) {
          return Number(value);
        },
      },
    },
    enterAction(param) {
      SceneCheat.quickLoad(param.slot);
    },
  },

  openSaveScene: {
    name: "打开存档页面",
    desc: "",
    enterAction(_param) {
      SceneCheat.toggleSaveScene();
    },
  },

  openLoadScene: {
    name: "打开加载页面",
    desc: "",
    enterAction(_param) {
      SceneCheat.toggleLoadScene();
    },
  },

  gotoTitle: {
    name: "返回标题",
    desc: "",
    enterAction(_param) {
      SceneCheat.gotoTitle();
    },
  },

  forceVictory: {
    name: "强制胜利",
    desc: "",
    enterAction(_param) {
      BattleCheat.victory();
    },
  },

  forceDefeat: {
    name: "强制失败",
    desc: "",
    enterAction(_param) {
      BattleCheat.defeat();
    },
  },

  forceEscape: {
    name: "强制逃跑",
    desc: "",
    enterAction(_param) {
      BattleCheat.escape();
    },
  },

  toggleNoClip: {
    name: "切换无碰撞（穿墙）",
    desc: "",
    enterAction(_param) {
      GeneralCheat.toggleNoClip(true);
    },
  },

  enemyWound: {
    name: "设置敌人 HP 为 1",
    desc: "",
    enterAction(_param) {
      BattleCheat.changeAllEnemyHealth(1);
    },
  },

  enemyRecovery: {
    name: "恢复所有敌人",
    desc: "填充 HP/MP 到最大",
    enterAction(_param) {
      BattleCheat.recoverAllEnemy();
    },
  },

  partyWound: {
    name: "设置队伍 HP 为 1",
    desc: "",
    enterAction(_param) {
      BattleCheat.changeAllPartyHealth(1);
    },
  },

  partyRecovery: {
    name: "恢复所有己方成员",
    desc: "填充 HP/MP 到最大",
    enterAction(_param) {
      BattleCheat.recoverAllParty();
    },
  },

  setSpeed: {
    name: "设置速度",
    desc: "设置速度为某个值",
    param: {
      speed: {
        name: "速度",
        desc: "设置的速度（1-10）",
        isInvalidValue(value) {
          return isInValueInRange(value, 1, 10);
        },
        convertValue(value) {
          return Number(value);
        },
      },
    },
    enterAction(param) {
      SpeedCheat.removeFixSpeedInterval();
      SpeedCheat.setSpeed(param.speed);
    },
  },

  skipMessage: {
    name: "跳过消息",
    desc: "",
    combiningKeyAlone: true,
    param: {
      accelerate: {
        name: "加速游戏速度",
        desc: "在跳过消息时加速游戏速度",
        isInvalidValue(value) {
          return isInValueInRange(value, 1, 50);
        },
        convertValue(value) {
          return Number(value);
        },
      },
    },
    enterAction(param) {
      MessageCheat.startSkip(param.accelerate);
    },

    leaveAction(_param) {
      MessageCheat.stopSkip();
    },
  },

  openDevTool: {
    name: "打开开发者工具",
    desc: "打开 Chromium 开发者工具",
    enterAction(_param) {
      if (Utils.isNwjs()) {
        require("nw.gui").Window.get().showDevTools();
      }
    },
  },
};

class ShortcutConfig {
  id: string;
  name!: string;
  desc!: string;
  necessary!: boolean;
  combiningKeyAlone!: boolean;
  param!: Record<string, ShortcutParamConfig>;
  enterAction!: (param: ParamBag) => void;
  repeatAction!: (param: ParamBag) => void;
  leaveAction!: (param: ParamBag) => void;

  constructor(id: string, config: ShortcutConfigRaw) {
    this.id = id;

    const fields: (keyof ShortcutConfigRaw)[] = [
      "name",
      "desc",
      "necessary",
      "combiningKeyAlone",
      "param",
      "enterAction",
      "repeatAction",
      "leaveAction",
    ];

    for (const field of fields) {
      (this as any)[field] = (config as any)[field];
    }

    if (!this.necessary) this.necessary = false;
    if (!this.combiningKeyAlone) this.combiningKeyAlone = false;
    if (!this.param) this.param = {};
    if (!this.enterAction) this.enterAction = (_param) => {};
    if (!this.repeatAction) this.repeatAction = (_param) => {};
    if (!this.leaveAction) this.leaveAction = (_param) => {};
  }

  getEnterAction(shortcutSetting: ShortcutSetting): () => void {
    return () => {
      this.enterAction(shortcutSetting.param ?? {});
    };
  }

  getRepeatAction(shortcutSetting: ShortcutSetting): () => void {
    return () => {
      this.repeatAction(shortcutSetting.param ?? {});
    };
  }

  getLeaveAction(shortcutSetting: ShortcutSetting): () => void {
    return () => {
      this.leaveAction(shortcutSetting.param ?? {});
    };
  }
}

/** parse string-written keymap to Key object */
function parseStringToKeyObject(
  src: Record<string, RawShortcutSetting>,
): Record<string, ShortcutSetting> {
  const ret = cloneObject(src) as unknown as Record<string, ShortcutSetting>;

  for (const key of Object.keys(src)) {
    ret[key].shortcut = Key.fromString(src[key].shortcut);
  }

  return ret;
}

function parseKeyObjectToString(
  src: Record<string, ShortcutSetting>,
): Record<string, RawShortcutSetting> {
  const ret = cloneObject(src) as unknown as Record<string, RawShortcutSetting>;

  for (const key of Object.keys(src)) {
    ret[key].shortcut = src[key].shortcut.asString();
  }

  return ret;
}

class GlobalShortcutImpl {
  shortcutSettingsFile!: string;
  shortcutSettings!: Record<string, ShortcutSetting>;
  shortcutConfig!: Record<string, ShortcutConfig>;
  shortcutMap!: ShortcutMap;

  constructor() {
    this.initialize();
  }

  initialize(): void {
    console.log("__global shortcut initialized");

    this.shortcutSettingsFile = "./www/cheat-settings/shortcuts.json";

    // initialize shortcut settings
    this.shortcutSettings = {};
    this.readShortcutSettings();

    // initialize shortcut config
    this.shortcutConfig = {};
    this.initializeShortcutConfig();

    // migrate if settings file is old version
    this.migrateShortcutSettings();

    // initialize shortcut map
    this.shortcutMap = new ShortcutMap();
    this.initializeShortcutMap();
  }

  initializeShortcutConfig(): void {
    this.shortcutConfig = {};

    for (const key of Object.keys(shortcutConfig)) {
      this.shortcutConfig[key] = new ShortcutConfig(key, shortcutConfig[key]);
    }
  }

  migrateShortcutSettings(): void {
    let defaultSettings: Record<string, ShortcutSetting> | null = null;
    const assignedKeys = new Set(
      Object.values(this.shortcutSettings).map((setting) =>
        setting.shortcut.asString(),
      ),
    );

    for (const cfg of Object.values(this.shortcutConfig)) {
      if (!Object.hasOwn(this.shortcutSettings, cfg.id)) {
        // initialize default settings if not initialized
        if (!defaultSettings) {
          defaultSettings = parseStringToKeyObject(defaultShortcutSettings);
        }

        // handle conflict keys
        const defaultSetting = defaultSettings[cfg.id];
        if (
          !defaultSetting.shortcut.isEmpty() &&
          assignedKeys.has(defaultSetting.shortcut.asString())
        ) {
          console.warn(
            `key conflicts while migrating : ${cfg.name} - ${defaultSetting.shortcut.asString()}`,
          );
          defaultSetting.shortcut = Key.createEmpty();
        }

        assignedKeys.add(defaultSetting.shortcut.asString());

        this.shortcutSettings[cfg.id] = defaultSettings[cfg.id];
      }
    }

    // if settings migrated, save to file
    if (defaultSettings) {
      console.warn("__settings migrated");
      this.writeShortcutSettings();
    }
  }

  initializeShortcutMap(): void {
    for (const cfg of Object.values(this.shortcutConfig)) {
      const shortcutSetting = this.shortcutSettings[cfg.id];

      this.shortcutMap.register(
        shortcutSetting.shortcut,
        cfg,
        cfg.getEnterAction(shortcutSetting),
        cfg.getRepeatAction(shortcutSetting),
        cfg.getLeaveAction(shortcutSetting),
      );
    }
  }

  runKeyEnterEvent(e: KeyboardEvent, key: Key): void {
    if (this.shortcutMap.runEnterAction(key)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  }

  runKeyRepeatEvent(e: KeyboardEvent, key: Key): void {
    if (this.shortcutMap.runRepeatAction(key)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  }

  runKeyLeaveEvent(e: KeyboardEvent, key: Key): void {
    if (this.shortcutMap.runLeaveAction(key)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  }

  readRawShortcutSettings(): Record<string, RawShortcutSetting> {
    // if nwjs environment, read shortcut settings from file
    if (Utils.isNwjs()) {
      const fs = require("fs");

      try {
        return JSON.parse(fs.readFileSync(this.shortcutSettingsFile, "utf-8"));
      } catch (err) {
        try {
          this.writeRawShortcutSettings(defaultShortcutSettings);
          return JSON.parse(
            fs.readFileSync(this.shortcutSettingsFile, "utf-8"),
          );
        } catch {
          Alert.warn(
            "Can't initialize shortcut settings file. Use internal data instead.\n(You can use cheat plugin anyway)",
            err,
          );
          return defaultShortcutSettings;
        }
      }
    }

    // if using browser, read default shortcut settings
    console.warn("[cheat plugin warn] Use default settings");
    return defaultShortcutSettings;
  }

  readShortcutSettings(): void {
    const rawSettings = this.readRawShortcutSettings();
    this.shortcutSettings = {};

    try {
      this.shortcutSettings = parseStringToKeyObject(rawSettings);
    } catch (err) {
      Alert.warn(
        "Can't parse shortcut settings. Use default settings instead.\n(You can use cheat plugin anyway)",
        err,
      );

      try {
        this.shortcutSettings = parseStringToKeyObject(defaultShortcutSettings);
      } catch (err2) {
        Alert.error(
          "Can't parse shortcut settings. Cheat plugin will not work properly",
          err2,
        );
      }
    }
  }

  writeRawShortcutSettings(
    shortcutSettings: Record<string, RawShortcutSetting>,
  ): void {
    if (Utils.isNwjs()) {
      const fs = require("fs");
      const path = require("path");

      // remove previous settings file
      try {
        fs.unlinkSync(this.shortcutSettingsFile);
      } catch {
        /* ignore */
      }

      // create parent directory if not exists
      const parentDir = path.dirname(this.shortcutSettingsFile);

      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      // create file
      fs.writeFileSync(
        this.shortcutSettingsFile,
        JSON.stringify(shortcutSettings, null, 2),
      );
    }
  }

  writeShortcutSettings(): void {
    this.writeRawShortcutSettings(
      parseKeyObjectToString(this.shortcutSettings),
    );
  }

  restoreDefaultSettings(): void {
    if (Utils.isNwjs()) {
      try {
        require("fs").unlinkSync(this.shortcutSettingsFile);
      } catch {
        /* ignore */
      }

      this.initialize();
    }
  }

  getSettings(shortcutId: string): ShortcutSetting {
    return this.shortcutSettings[shortcutId];
  }

  getConfig(shortcutId: string): ShortcutConfig {
    return this.shortcutConfig[shortcutId];
  }

  getParamConfig(shortcutId: string, paramId: string): ShortcutParamConfig {
    return this.getConfig(shortcutId).param[paramId];
  }

  getParam(shortcutId: string, paramId: string): any {
    return this.getSettings(shortcutId).param?.[paramId];
  }

  getShortcut(shortcutId: string): Key {
    return this.getSettings(shortcutId).shortcut;
  }

  setShortcut(shortcutId: string, newKey: Key): void {
    // not need to change shortcut
    const prevKey = this.getShortcut(shortcutId);
    if (prevKey.equals(newKey)) {
      return;
    }

    const existingValue = this.shortcutMap.getValue(newKey);
    if (existingValue) {
      throw Error(
        `Conflict with existing shortcut : [${newKey.asDisplayString()}] ${existingValue.name}`,
      );
    }

    // remove prev key binding if prev key exists
    this.shortcutMap.remove(prevKey);

    // bind key
    const currValue = this.getConfig(shortcutId);
    const currSettings = this.getSettings(shortcutId);
    this.shortcutMap.register(
      newKey,
      currValue,
      currValue.getEnterAction(currSettings),
      currValue.getRepeatAction(currSettings),
      currValue.getLeaveAction(currSettings),
    );

    // change settings
    currSettings.shortcut = newKey;

    // write changed settings
    this.writeShortcutSettings();
  }

  setParam(shortcutId: string, paramId: string, newValue: unknown): void {
    const paramConfig = this.getParamConfig(shortcutId, paramId);

    const invalidMsg = paramConfig.isInvalidValue(newValue);

    if (invalidMsg) {
      throw Error(invalidMsg);
    }

    const settings = this.getSettings(shortcutId);
    if (!settings.param) settings.param = {};
    settings.param[paramId] = paramConfig.convertValue(newValue);

    this.writeShortcutSettings();
  }
}

export const GLOBAL_SHORTCUT = new GlobalShortcutImpl();

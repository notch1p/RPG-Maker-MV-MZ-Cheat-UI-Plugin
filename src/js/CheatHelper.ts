import {
  BattleManager,
  DataManager,
  Game_Actor,
  Game_Enemy,
  Game_Player,
  Scene_Battle,
  Scene_Load,
  Scene_Map,
  Scene_Save,
  Scene_Title,
  SceneManager,
  SoundManager,
  Window_BattleLog,
  Window_Message,
  Window_ScrollText,
} from "rmmz-types";

// rmmz-types' Game_Battler declares `isActor()/isEnemy()` as type predicates
// (`this is Game_Actor`), but Game_Actor / Game_Enemy redeclare them with
// plain `boolean`. That makes the concrete classes *not* assignable to
// Game_Battler structurally. For helpers that take any party/troop member,
// use the union instead.
type Battler = Game_Actor | Game_Enemy;

import { Spriteset_Base } from "rmmz-types/lib/sprites";
// $game* / $data* engine globals are reassigned on save load; using them as
// free identifiers preserves live binding. Declared in src/types/rmmz.d.ts.

import { Alert } from "./AlertHelper";
import { KeyValueStorage } from "./KeyValueStorage";

// Fields we stash on Game_Actor instances when god-mode patches their
// HP/MP/TP-changing methods. Lifted out as an intersection type so we can
// drop `as any` at the patch sites and still get autocomplete on the bkup
// names, while reusing the real method signatures from rmmz-types.
type ActorMethodBackup = {
  gainHP_bkup?: Game_Actor["gainHp"];
  setHp_bkup?: Game_Actor["setHp"];
  gainMp_bkup?: Game_Actor["gainMp"];
  setMp_bkup?: Game_Actor["setMp"];
  gainTp_bkup?: Game_Actor["gainTp"];
  setTp_bkup?: Game_Actor["setTp"];
  paySkillCost_bkup?: Game_Actor["paySkillCost"];
};
type PatchedActor = Game_Actor & ActorMethodBackup;

interface GodModeData {
  godMode: boolean;
  godModeInterval: ReturnType<typeof setInterval> | null;
}

export class GeneralCheat {
  // godModeMap is created lazily on first access.
  static godModeMap?: Map<Game_Actor, GodModeData>;

  // will be replaced from main component
  static toggleCheatModal(_componentName: string | null = null): void {}

  static openCheatModal(_componentName: string | null = null): void {}

  static toggleNoClip(notify = false): void {
    $gamePlayer._through = !$gamePlayer._through;

    if (notify) {
      Alert.success(`穿墙状态: ${$gamePlayer._through}`);
    }
  }

  static getGodModeOnActorIds(): number[] {
    if (!this.godModeMap) {
      return [];
    }

    const ret: number[] = [];

    for (const actor of this.godModeMap.keys()) {
      const data = this.godModeMap.get(actor)!;

      if (data.godMode) {
        ret.push(actor._actorId);
      }
    }

    return ret;
  }

  static getGodModeData(actor: Game_Actor): GodModeData {
    if (!this.godModeMap) {
      this.godModeMap = new Map();
    }

    const existing = this.godModeMap.get(actor);
    if (existing) {
      return existing;
    }

    const defaultData: GodModeData = {
      godMode: false,
      godModeInterval: null,
    };

    this.godModeMap.set(actor, defaultData);

    return defaultData;
  }

  static godModeOn(actor: Game_Actor): void {
    if (!this.isGodMode(actor)) {
      const godModeData = this.getGodModeData(actor);
      godModeData.godMode = true;

      const a = actor as PatchedActor;

      a.gainHP_bkup = a.gainHp;
      a.gainHp = function (value: number) {
        value = a.mhp;
        a.gainHP_bkup!(value);
      };

      a.setHp_bkup = a.setHp;
      a.setHp = function (hp: number) {
        hp = a.mhp;
        a.setHp_bkup!(hp);
      };

      a.gainMp_bkup = a.gainMp;
      a.gainMp = function (value: number) {
        value = a.mmp;
        a.gainMp_bkup!(value);
      };

      a.setMp_bkup = a.setMp;
      a.setMp = function (mp: number) {
        mp = a.mmp;
        a.setMp_bkup!(mp);
      };

      a.gainTp_bkup = a.gainTp;
      a.gainTp = function (value: number) {
        value = a.maxTp();
        a.gainTp_bkup!(value);
      };

      a.setTp_bkup = a.setTp;
      a.setTp = function (tp: number) {
        tp = a.maxTp();
        a.setTp_bkup!(tp);
      };

      a.paySkillCost_bkup = a.paySkillCost;
      a.paySkillCost = function (_skill) {
        // do nothing
      };

      godModeData.godModeInterval = setInterval(function () {
        a.gainHp(a.mhp);
        a.gainMp(a.mmp);
        a.gainTp(a.maxTp());
      }, 1000);

      //      (this as any).saveCheatSettings?.();
    }
  }

  static godModeOff(actor: Game_Actor): void {
    if (actor instanceof Game_Actor && this.isGodMode(actor)) {
      const godModeData = this.getGodModeData(actor);
      godModeData.godMode = false;

      if (godModeData.godModeInterval) {
        clearInterval(godModeData.godModeInterval);
      }
      godModeData.godModeInterval = null;

      // actor.godMode field remains in save file, but backup methods aren't

      const a = actor as PatchedActor;
      if (a.gainHP_bkup) {
        a.gainHp = a.gainHP_bkup;
        a.setHp = a.setHp_bkup!;
        a.gainMp = a.gainMp_bkup!;
        a.setMp = a.setMp_bkup!;
        a.gainTp = a.gainTp_bkup!;
        a.setTp = a.setTp_bkup!;
        a.paySkillCost = a.paySkillCost_bkup!;
      }

      //      (this as any).saveCheatSettings?.();
    }
  }

  static toggleGodMode(actor: Game_Actor): void {
    if (this.isGodMode(actor)) {
      this.godModeOff(actor);
    } else {
      this.godModeOn(actor);
    }
  }

  static isGodMode(actor: Game_Actor): boolean {
    return this.getGodModeData(actor).godMode;
  }
}

type SceneOption = () => boolean;

export class GameSpeedCheat {
  static _sceneOptions?: Record<string, SceneOption>;
  static rate?: number;
  static sceneOption?: SceneOption;
  static origin_SceneManager_updateScene?: typeof SceneManager.updateScene;
  static origin_Scene_Map_update?: Scene_Map["update"];
  static origin_Spriteset_Base_update?: Spriteset_Base["update"];
  static isApplied?: boolean;

  static sceneOptions(): Record<string, SceneOption> {
    if (!this._sceneOptions) {
      this._sceneOptions = {
        all() {
          return true;
        },

        battle() {
          return SceneManager._scene instanceof Scene_Battle;
        },
      };
    }

    return this._sceneOptions;
  }

  static getRate(): number {
    return this.rate ?? 1;
  }

  static getSceneOption(): SceneOption {
    return this.sceneOption ?? this.sceneOptions().all;
  }

  static removeApplied(): void {
    if (this.isApplied) {
      SceneManager.updateScene = this.origin_SceneManager_updateScene!;
      Scene_Map.prototype.update = this.origin_Scene_Map_update!;
      Spriteset_Base.prototype.update = this.origin_Spriteset_Base_update!;
      this.isApplied = false;
    }
  }

  static setGameSpeed(rate: number, sceneOption?: SceneOption): void {
    // backup original functions
    if (!this.origin_SceneManager_updateScene) {
      this.origin_SceneManager_updateScene = SceneManager.updateScene;
    }

    if (!this.origin_Scene_Map_update) {
      this.origin_Scene_Map_update = Scene_Map.prototype.update;
    }

    if (!this.origin_Spriteset_Base_update) {
      this.origin_Spriteset_Base_update = Spriteset_Base.prototype.update;
    }

    if (!sceneOption) {
      sceneOption = GameSpeedCheat.sceneOptions().all;
    }

    this.rate = rate;
    this.sceneOption = sceneOption;

    // remove previously modified functions
    this.removeApplied();

    // if rate is 1, do not modify functions
    if (Math.abs(rate - 1.0) < Number.EPSILON) {
      return;
    }

    // updateScene triggers event such as key input, mouse input ...
    // It occurs double click.
    const SceneManager_updateScene = this.origin_SceneManager_updateScene!;
    let currentUpdateSceneRate = 0;
    SceneManager.updateScene = function () {
      if (!sceneOption!()) {
        SceneManager_updateScene.call(this);
        return;
      }

      currentUpdateSceneRate += rate;
      const currStep = Math.floor(currentUpdateSceneRate);
      currentUpdateSceneRate -= currStep;

      if (currStep > 0) {
        // update original frame
        SceneManager_updateScene.call(this);

        // update duplicated frames
        for (let i = 0; i < currStep - 1; ++i) {
          SceneManager.updateInputData();
          SceneManager.changeScene();
          SceneManager_updateScene.call(this);
        }
      }
    };

    this.isApplied = true;
  }

  static __writeSettings(rate: number, sceneOption: SceneOption): void {
    const options = GameSpeedCheat.sceneOptions();
    const sceneOptionKey = Object.keys(GameSpeedCheat.sceneOptions()).find(
      (key) => options[key] === sceneOption,
    );

    const storage = new KeyValueStorage("./www/cheat-settings/gameSpeed.json");

    storage.setItem(
      "data",
      JSON.stringify({ rate, sceneOption: sceneOptionKey }),
    );
  }

  static __readSettings(): void {
    const storage = new KeyValueStorage("./www/cheat-settings/gameSpeed.json");

    const json = storage.getItem("data");

    if (!json) {
      return;
    }

    const data = JSON.parse(json);

    GameSpeedCheat.setGameSpeed(
      data.rate,
      GameSpeedCheat.sceneOptions()[data.sceneOption],
    );
  }
}

export class SpeedCheat {
  // WARN: declaring static variable occurs error in nw.js (why?)
  // — preserved as optional; assignment goes through SpeedCheat.fixed = ...
  static fixed?: ReturnType<typeof setInterval>;

  static isFixed(): boolean {
    return !!SpeedCheat.fixed;
  }

  static setFixSpeedInterval(speed: number): void {
    if (SpeedCheat.isFixed()) {
      SpeedCheat.removeFixSpeedInterval();
    }

    SpeedCheat.fixed = setInterval(() => {
      SpeedCheat.__setSpeed(speed);
    }, 1000);
  }

  static removeFixSpeedInterval(): void {
    if (SpeedCheat.isFixed()) {
      clearInterval(SpeedCheat.fixed!);
      SpeedCheat.fixed = undefined;
    }
  }

  static __setSpeed(speed: number): void {
    $gamePlayer.setMoveSpeed(speed);
  }

  static setSpeed(speed: number, fixed = false): void {
    SpeedCheat.__setSpeed(speed);

    if (fixed) {
      SpeedCheat.setFixSpeedInterval(speed);
    } else {
      SpeedCheat.removeFixSpeedInterval();
    }
  }

  static __writeSettings(speed: number, fixed: boolean): void {
    const storage = new KeyValueStorage("./www/cheat-settings/speed.json");

    storage.setItem("data", JSON.stringify({ speed, fixed }));
  }

  static __readSettings(): void {
    const storage = new KeyValueStorage("./www/cheat-settings/speed.json");

    const json = storage.getItem("data");

    if (!json) {
      return;
    }

    const data = JSON.parse(json);

    if (data.fixed) {
      SpeedCheat.setSpeed(data.speed, data.fixed);
    }
  }
}

export class SceneCheat {
  static gotoTitle(): void {
    SceneManager.goto(Scene_Title);
  }

  static toggleSaveScene(): void {
    if (SceneManager._scene?.constructor === Scene_Save) {
      SceneManager.pop();
    } else if (SceneManager._scene?.constructor === Scene_Load) {
      SceneManager.goto(Scene_Save);
    } else {
      SceneManager.push(Scene_Save);
    }
  }

  static toggleLoadScene(): void {
    if (SceneManager._scene?.constructor === Scene_Load) {
      SceneManager.pop();
    } else if (SceneManager._scene?.constructor === Scene_Save) {
      SceneManager.goto(Scene_Load);
    } else {
      SceneManager.push(Scene_Load);
    }
  }

  static quickSave(slot = 1): void {
    $gameSystem.onBeforeSave();
    DataManager.saveGame(slot);

    Alert.success(`保存进度到存档 ${slot}`);
  }

  static quickLoad(slot = 1): void {
    DataManager.loadGame(slot);
    SceneManager.goto(Scene_Map);

    Alert.success(`从存档 ${slot} 加载游戏`);
  }
}

export class BattleCheat {
  static canEncounter_bkup?: Game_Player["canEncounter"];
  static disableRandomEncounter?: boolean;

  static recover(member: Battler): void {
    member.setHp(member.mhp);
    member.setMp(member.mmp);
    // member.setTp(member.maxTp())
    // Some games use TP for lust value, so do not recover TP
  }

  static recoverAllEnemy(): void {
    for (const member of $gameTroop.members()) {
      this.recover(member);
    }

    Alert.success("恢复所有敌人的生命值");
  }

  static recoverAllParty(): void {
    for (const member of $gameParty.members()) {
      this.recover(member);
    }

    Alert.success("恢复所有己方成员");
  }

  static fillTpAllEnemy(): void {
    for (const member of $gameTroop.members()) {
      member.setTp(member.maxTp());
    }

    Alert.success("补满所有敌人的TP");
  }

  static fillTpAllParty(): void {
    for (const member of $gameParty.members()) {
      member.setTp(member.maxTp());
    }

    Alert.success("补满所有己方成员的TP");
  }

  static changeAllEnemyHealth(newHp: number): void {
    for (const member of $gameTroop.members()) {
      member.setHp(newHp);
    }

    Alert.success(`设定所有敌人HP为 ${newHp}`);
  }

  static changeAllPartyHealth(newHp: number): void {
    for (const member of $gameParty.members()) {
      member.setHp(newHp);
    }

    Alert.success(`设定所有队员HP为 ${newHp}`);
  }

  static canExecuteBattleEndProcess(): boolean {
    return (
      !!SceneManager._scene &&
      SceneManager._scene.constructor === Scene_Battle &&
      BattleManager._phase !== "battleEnd"
    );
  }

  static encounterBattle(): void {
    $gamePlayer._encounterCount = 0;
  }

  static victory(): boolean {
    if (this.canExecuteBattleEndProcess()) {
      $gameTroop.members().forEach((enemy) => {
        enemy.addNewState(enemy.deathStateId());
      });
      BattleManager.processVictory();
      Alert.success("强制胜利!");
      return true;
    }
    return false;
  }

  static defeat(): boolean {
    if (this.canExecuteBattleEndProcess()) {
      $gameParty.members().forEach((actor) => {
        actor.addNewState(actor.deathStateId());
      });
      BattleManager.processDefeat();
      Alert.success("强制失败...");
      return true;
    }
    return false;
  }

  static escape(): boolean {
    if (this.canExecuteBattleEndProcess()) {
      $gameParty.performEscape();
      SoundManager.playEscape();
      BattleManager._escaped = true;
      BattleManager.processEscape();
      Alert.success("强制逃跑...");
      return true;
    }
    return false;
  }

  static abort(): boolean {
    if (this.canExecuteBattleEndProcess()) {
      $gameParty.performEscape();
      SoundManager.playEscape();
      BattleManager._escaped = true;
      BattleManager.processAbort();
      Alert.success("强制结束战斗");
      return true;
    }
    return false;
  }

  static toggleDisableRandomEncounter(): void {
    // change $gamePlayer.canEncounter function
    // if canEncounter is false, $gamePlayer.updateEncounterCount() do not
    // decrease $gamePlayer._encounterCount
    if (this.isDisableRandomEncounter()) {
      if (this.canEncounter_bkup) {
        $gamePlayer.canEncounter = this.canEncounter_bkup;
      }
    } else {
      this.canEncounter_bkup = $gamePlayer.canEncounter;

      $gamePlayer.canEncounter = function () {
        return false;
      };
    }

    this.disableRandomEncounter = !this.isDisableRandomEncounter();
  }

  static isDisableRandomEncounter(): boolean {
    return !!this.disableRandomEncounter;
  }
}

export class MessageCheat {
  static skip = false;
  static gameSpeedBackup: { rate: number; sceneOption: SceneOption } | null =
    null;

  static initialize(): void {
    this.skip = false;

    // Skip message display animation
    // It seems to be executed whenever each character is output in the message window
    const _Window_Message_updateShowFast =
      Window_Message.prototype.updateShowFast;
    Window_Message.prototype.updateShowFast = function () {
      _Window_Message_updateShowFast.call(this);
      if (MessageCheat.skip) {
        this._showFast = true;
        this._pauseSkip = true;
      }
    };

    // Skip waiting for input after displaying text
    // It seems to always run every few ms
    const _Window_Message_updateInput = Window_Message.prototype.updateInput;
    Window_Message.prototype.updateInput = function () {
      const ret = _Window_Message_updateInput.call(this);

      if (this.pause && MessageCheat.skip) {
        this.pause = false;

        if (!this._textState) {
          this.terminateMessage();
        }
        return true;
      }

      return ret;
    };

    // Accelerates the scrolling message speed
    const Window_ScrollText_scrollSpeed =
      Window_ScrollText.prototype.scrollSpeed;
    Window_ScrollText.prototype.scrollSpeed = function () {
      let ret = Window_ScrollText_scrollSpeed.call(this);

      if (MessageCheat.skip) {
        ret *= 100;
      }

      return ret;
    };

    // --------------------------- battle log
    // Accelerates the battle log output speed
    const _Window_BattleLog_messageSpeed =
      Window_BattleLog.prototype.messageSpeed;
    Window_BattleLog.prototype.messageSpeed = function () {
      let ret = _Window_BattleLog_messageSpeed.call(this);

      if (MessageCheat.skip) {
        ret = 1;
      }

      return ret;
    };
  }

  static startSkip(gameSpeed: number): void {
    if (gameSpeed === 1) {
      this.gameSpeedBackup = null;
    } else {
      this.gameSpeedBackup = {
        rate: GameSpeedCheat.getRate(),
        sceneOption: GameSpeedCheat.getSceneOption(),
      };

      GameSpeedCheat.setGameSpeed(gameSpeed, GameSpeedCheat.sceneOptions().all);
    }

    this.skip = true;
  }

  static stopSkip(): void {
    if (this.gameSpeedBackup) {
      GameSpeedCheat.setGameSpeed(
        this.gameSpeedBackup.rate,
        this.gameSpeedBackup.sceneOption,
      );
      this.gameSpeedBackup = null;
    }

    this.skip = false;
  }
}

async function multiRetryAction(
  action: () => void,
  intervalTimeout: number,
  maxTryCount: number,
): Promise<void> {
  let tryCount = 0;

  const interval = setInterval(() => {
    try {
      ++tryCount;
      action();
    } catch (e) {
      console.log(e);
      if (tryCount < maxTryCount) {
        return;
      }
    }

    clearInterval(interval);
  }, intervalTimeout);
}

function initialize(): void {
  const intervalTimeout = 500;
  const maxTryCount = 100;

  const initializeActions = [
    SpeedCheat.__readSettings,
    GameSpeedCheat.__readSettings,
  ];

  initializeActions.forEach((action) =>
    multiRetryAction(action, intervalTimeout, maxTryCount),
  );
}

initialize();

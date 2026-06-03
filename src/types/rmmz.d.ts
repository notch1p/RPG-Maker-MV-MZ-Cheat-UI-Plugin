// Engine globals declared as ambient free identifiers (NOT as
// `import { … } from "rmmz-types"`), because RPG Maker reassigns them on
// `DataManager.createGameObjects()` — which fires on new game *and* on
// every save load. Importing them once and destructuring off `window`
// would freeze a stale reference; treating them as free globals keeps the
// scope-chain lookup fresh on every access (live binding by default).
//
// All non-reassigned engine symbols (Game_Actor, SceneManager,
// Window_Message, …) are imported explicitly from "rmmz-types".

import type * as RMMZ from "rmmz-types";
declare global {
  // $game* — reassigned on new game / save load
  const $gameTemp: RMMZ.Game_Temp;
  const $gameSystem: RMMZ.Game_System;
  const $gameScreen: RMMZ.Game_Screen;
  const $gameTimer: RMMZ.Game_Timer;
  const $gameMessage: RMMZ.Game_Message;
  const $gameSwitches: RMMZ.Game_Switches;
  const $gameVariables: RMMZ.Game_Variables;
  const $gameSelfSwitches: RMMZ.Game_SelfSwitches;
  const $gameActors: RMMZ.Game_Actors;
  const $gameParty: RMMZ.Game_Party;
  const $gameTroop: RMMZ.Game_Troop;
  const $gameMap: RMMZ.Game_Map;
  const $gamePlayer: RMMZ.Game_Player;

  // $data* — loaded from JSON, reassigned on new game / save load
  const $dataActors: RMMZ.DataActor[];
  const $dataClasses: RMMZ.DataClass[];
  const $dataSkills: RMMZ.DataSkill[];
  const $dataItems: RMMZ.DataItem[];
  const $dataWeapons: RMMZ.DataWeapon[];
  const $dataArmors: RMMZ.DataArmor[];
  const $dataEnemies: RMMZ.DataEnemy[];
  const $dataTroops: RMMZ.DataTroop[];
  const $dataStates: RMMZ.DataState[];
  const $dataAnimations: RMMZ.DataAnimation[];
  const $dataTilesets: RMMZ.DataTileset[];
  const $dataCommonEvents: RMMZ.DataCommonEvent[];
  const $dataSystem: RMMZ.DataSystem;
  const $dataMapInfos: RMMZ.DataMapInfo[];
  const $dataMap: RMMZ.DataMap;

  // NW.js exposes Node's `require` to the renderer (nodeRemote).
  const require: (id: string) => any;

  // NW.js shell bindings used for opening external links from the cheat UI.
  const nw: {
    Shell: {
      openExternal: (url: string) => void;
      openItem: (path: string) => void;
      showItemInFolder: (path: string) => void;
    };

    gui?: any;
  };
}

export {};

import { MAX_KEY_CODE } from "./KeyCodes";
import type { Key } from "./KeyCodes";

export interface ShortcutAction {
  value: any;
  enterAction: () => void;
  repeatAction: () => void;
  leaveAction: () => void;
}

export class ShortcutMap {
  actionTable: (ShortcutAction | null | undefined)[];

  constructor() {
    this.actionTable = new Array(2 * 2 * 2 * 2 * (MAX_KEY_CODE + 1));
  }

  static toInt(booleanVar: boolean): number {
    // Number(booleanVar) / booleanVar|0 ... can be slot
    return booleanVar === true ? 1 : 0;
  }

  /** get flatten index of key */
  static tableIndex(key: Key): number {
    return (
      this.toInt(key.ctrl) +
      2 * this.toInt(key.alt) +
      4 * this.toInt(key.shift) +
      8 * this.toInt(key.meta) +
      16 * key.code
    );
  }

  register(
    key: Key,

    value: any,
    enterAction: () => void,
    repeatAction: () => void,
    leaveAction: () => void,
  ): void {
    if (!key || key.isEmpty()) {
      return;
    }

    this.actionTable[ShortcutMap.tableIndex(key)] = {
      value,
      enterAction,
      repeatAction,
      leaveAction,
    };
  }

  /** remove key-action; returns previous value of removed key */

  remove(key: Key): any {
    if (!key || key.isEmpty()) {
      return null;
    }

    const idx = ShortcutMap.tableIndex(key);
    const removed = this.actionTable[idx];

    this.actionTable[idx] = null;

    if (removed) {
      return removed.value;
    }

    return null;
  }

  getValue(key: Key): any {
    const item = this.getItem(key);

    if (item) {
      return item.value;
    }

    return null;
  }

  runEnterAction(key: Key): boolean {
    const item = this.getItem(key);

    if (item) {
      item.enterAction();
      return true;
    }

    return false;
  }

  runRepeatAction(key: Key): boolean {
    const item = this.getItem(key);

    if (item) {
      item.repeatAction();
      return true;
    }

    return false;
  }

  runLeaveAction(key: Key): boolean {
    const item = this.getItem(key);

    if (item) {
      item.leaveAction();
      return true;
    }

    return false;
  }

  getItem(key: Key): ShortcutAction | null {
    const index = ShortcutMap.tableIndex(key);

    if (index < this.actionTable.length && this.actionTable[index]) {
      return this.actionTable[index]!;
    }

    return null;
  }
}

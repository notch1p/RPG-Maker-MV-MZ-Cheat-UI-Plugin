import { Utils } from "rmmz-types";

export class KeyValueStorage {
  filePath?: string;
  fileEncoding?: BufferEncoding;

  fileSystem?: any;

  pathModule?: any;

  constructor(filePath: string) {
    if (Utils.isNwjs()) {
      this.filePath = filePath;
      this.fileEncoding = "utf-8";
      this.fileSystem = require("fs");
      this.pathModule = require("path");
    }
  }

  getItem(key: string): string | null | undefined {
    if (!Utils.isNwjs()) {
      return localStorage.getItem(key);
    }

    return this.__getItemFromFile(key);
  }

  setItem(key: string, value: string): void {
    if (!Utils.isNwjs()) {
      localStorage.setItem(key, value);
      return;
    }

    this.__setItemToFile(key, value);
  }

  __readFile(): Record<string, string> {
    if (!this.fileSystem.existsSync(this.filePath)) {
      return {};
    }

    try {
      return JSON.parse(
        this.fileSystem.readFileSync(this.filePath, this.fileEncoding),
      );
    } catch {
      return {};
    }
  }

  __getItemFromFile(key: string): string | undefined {
    return this.__readFile()[key];
  }

  __setItemToFile(key: string, value: string): void {
    const parentDir = this.pathModule.dirname(this.filePath);
    if (!this.fileSystem.existsSync(parentDir)) {
      this.fileSystem.mkdirSync(parentDir, { recursive: true });
    }

    const data = this.__readFile();

    data[key] = value;

    this.fileSystem.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }
}

export const KEY_VALUE_STORAGE = new KeyValueStorage(
  "./www/cheat-settings/kv-storage.json",
);

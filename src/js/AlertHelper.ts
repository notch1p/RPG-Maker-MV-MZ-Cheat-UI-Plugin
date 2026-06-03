type Level = "success" | "info" | "warn" | "error";

export class Alert {
  static alertInternal(
    level: Level,
    msg: string,
    err: unknown = null,
    _timeout = 1500,
  ): void {
    if (err) {
      alert(`[cheat plugin ${level}] ${msg}\n\n[cause] ${err}`);
    } else {
      alert(`[cheat plugin ${level}] ${msg}`);
    }
  }

  static success(msg: string, err: unknown = null, timeout = 1500): void {
    this.alertInternal("success", msg, err, timeout);
  }

  static info(msg: string, err: unknown = null, timeout = 1500): void {
    this.alertInternal("info", msg, err, timeout);
  }

  static warn(msg: string, err: unknown = null, timeout = 1500): void {
    this.alertInternal("warn", msg, err, timeout);
  }

  static error(msg: string, err: unknown = null, timeout = 1500): void {
    this.alertInternal("error", msg, err, timeout);
  }
}

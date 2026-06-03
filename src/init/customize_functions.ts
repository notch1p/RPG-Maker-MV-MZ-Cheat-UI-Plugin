import { Utils, TouchInput } from "rmmz-types";
import { MessageCheat } from "@/js/CheatHelper";

/**
 * Returns true if the click landed on cheat-plugin UI and should NOT be
 * forwarded to RMMZ. Walks event.target up the DOM and looks for the Vue
 * app root or Vuetify's overlay container (where teleported snackbars,
 * tooltips, menus, dialogs live in Vuetify 4).
 *
 * Coordinate-based bbox tests miss teleported overlays entirely. Target
 * traversal is robust whether the modal is open or closed — a snackbar
 * popping while the modal is closed still absorbs its own clicks.
 */
function isClickOnCheatUI(event: MouseEvent): boolean {
  const target = event.target as Element | null;
  if (!target || typeof target.closest !== "function") return false;
  return !!target.closest("#app, .v-overlay-container");
}

export function customizeRPGMakerFunctions(): void {
  // rmmz-types narrows RPGMAKER_NAME to the literal "MZ", but the plugin
  // still ships against MV builds via the same tarball — cast to widen.
  if ((Utils.RPGMAKER_NAME as string) === "MV") {
    // WARN: directly changing engine code can be dangerous.
    // Remove preventDefault on wheel events.
    TouchInput._onWheel = function (this: any) {
      // Relies on the legacy global `event` object exposed by the engine —
      // do not refactor without verifying that wheel events still propagate.
      const ev = window.event as WheelEvent | undefined;
      if (!ev) return;
      this._events.wheelX += ev.deltaX;
      this._events.wheelY += ev.deltaY;
    };

    const TouchInput_onMouseDown = TouchInput._onMouseDown;
    TouchInput._onMouseDown = function (this, event) {
      if (isClickOnCheatUI(event)) return;
      TouchInput_onMouseDown.call(this, event);
    };
  } else {
    // MZ
    TouchInput._onWheel = function (this) {
      const ev = window.event as WheelEvent | undefined;
      if (!ev) return;
      this._newState.wheelX += ev.deltaX;
      this._newState.wheelY += ev.deltaY;
    };

    const TouchInput_onMouseDown = TouchInput._onMouseDown;
    TouchInput._onMouseDown = function (this, event) {
      if (isClickOnCheatUI(event)) return;
      TouchInput_onMouseDown.call(this, event);
    };
  }

  MessageCheat.initialize();
}

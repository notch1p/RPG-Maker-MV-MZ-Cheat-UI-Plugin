import js from "@eslint/js";
import tseslint from "typescript-eslint";
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "cheat-engine/**",
      "node_modules/**",
      "tools/**",
      "dist/**",
      "*.tar.gz",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    files: ["src/**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
  {
    files: ["src/**/*.ts", "src/**/*.vue"],
    languageOptions: {
      globals: {
        // Browser / DOM globals used by source.
        window: "readonly",
        document: "readonly",
        console: "readonly",
        localStorage: "readonly",
        alert: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        performance: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLCanvasElement: "readonly",
        CanvasRenderingContext2D: "readonly",
        KeyboardEvent: "readonly",
        MouseEvent: "readonly",
        Event: "readonly",
        Node: "readonly",
        Element: "readonly",
        Proxy: "readonly",
        IntersectionObserver: "readonly",
        nw: "readonly",

        // $game* / $data* live as free globals to preserve live binding
        // across save loads (see src/types/rmmz.d.ts). Everything else is
        // imported from "rmmz-types".
        $gameTemp: "readonly",
        $gameSystem: "readonly",
        $gameScreen: "readonly",
        $gameTimer: "readonly",
        $gameMessage: "readonly",
        $gameSwitches: "readonly",
        $gameVariables: "readonly",
        $gameSelfSwitches: "readonly",
        $gameActors: "readonly",
        $gameParty: "readonly",
        $gameTroop: "readonly",
        $gameMap: "readonly",
        $gamePlayer: "readonly",
        $dataActors: "readonly",
        $dataClasses: "readonly",
        $dataSkills: "readonly",
        $dataItems: "readonly",
        $dataWeapons: "readonly",
        $dataArmors: "readonly",
        $dataEnemies: "readonly",
        $dataTroops: "readonly",
        $dataStates: "readonly",
        $dataAnimations: "readonly",
        $dataTilesets: "readonly",
        $dataCommonEvents: "readonly",
        $dataSystem: "readonly",
        $dataMapInfos: "readonly",
        $dataMap: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // NW.js's renderer exposes Node's `require` globally; we use it to
      // access Node built-ins (fs, path, nw.gui). ES `import` for those
      // modules doesn't work reliably from a bundled renderer module.
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Vuetify uses dot-notation slot names like #item.value which the rule
      // mis-parses as `slot:item` + `.value` modifier. We need them for
      // v-data-table; the dynamic syntax `#[\`item.value\`]` is the
      // alternative but uglier.
      "vue/valid-v-slot": "off",
      // GeneralPanel renders Shiki-highlighted HTML (which we generate
      // ourselves from JSON-serialized event commands) via v-html. The
      // input is trusted — no user-supplied strings reach this attribute.
      "vue/no-v-html": "off",
    },
  },
  prettier,
);

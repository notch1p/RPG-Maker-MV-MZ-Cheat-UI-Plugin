import { createApp, h } from "vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { VTreeview } from "vuetify/components/VTreeview";
import { zhHans } from "vuetify/locale";
import "vuetify/styles";
// MDI font CSS + Roboto CSS are vendored under cheat/css/ and linked by
// cheat/init/import.js.

import MainComponent from "@/MainComponent.vue";

const vuetify = createVuetify({
  components: { ...components, VTreeview },
  directives,
  locale: { locale: "zhHans", messages: { zhHans } },
  theme: { defaultTheme: "dark" },
});

const mountTarget = document.querySelector("#app");
if (mountTarget) {
  createApp({ render: () => h(MainComponent) })
    .use(vuetify)
    .mount(mountTarget);
}

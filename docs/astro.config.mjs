import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import mermaid from "astro-mermaid";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "STAIRS",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/thomas/STAIRS",
        },
      ],
      sidebar: [
        {
          label: "Learning Path",
          items: [{ autogenerate: { directory: "" } }],
        },
      ],
    }),
    mermaid(),
  ],
});

import { defineMarkdocConfig, component } from "@astrojs/markdoc/config";
import prism from "@astrojs/markdoc/prism";

export default defineMarkdocConfig({
    extends: [prism()],
    tags: {
        youtube: {
            render: component("./src/components/YouTubeEmbed.astro"),
            attributes: {
                id: { type: String, required: true },
            },
        },
    },
});

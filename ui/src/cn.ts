import { extendTailwindMerge } from "tailwind-merge";

export const cn = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        "lifeos-background",
        "lifeos-surface",
        "lifeos-border",
        "lifeos-primary",
        "lifeos-muted",
        "lifeos-accent",
        "lifeos-accent-dark",
        "lifeos-accent-ink",
      ],
    },
  },
});

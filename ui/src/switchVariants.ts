import { cva, type VariantProps } from "class-variance-authority";

export const switchTrackVariants = cva(
  "relative inline-flex shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lifeos-accent-dark",
  {
    variants: {
      checked: {
        true: "bg-lifeos-accent",
        false: "bg-stone-300 dark:bg-stone-700",
      },
      disabled: {
        true: "cursor-not-allowed opacity-60",
        false: "cursor-pointer",
      },
      size: {
        sm: "h-5 w-9 p-0.5",
        md: "h-6 w-11 p-0.5",
      },
    },
    defaultVariants: {
      checked: false,
      disabled: false,
      size: "md",
    },
  },
);

export const switchThumbVariants = cva(
  "pointer-events-none block rounded-full bg-white shadow transition-transform",
  {
    variants: {
      checked: {
        true: "translate-x-4",
        false: "translate-x-0",
      },
      size: {
        sm: "size-4",
        md: "size-5",
      },
    },
    defaultVariants: {
      checked: false,
      size: "md",
    },
    compoundVariants: [
      { checked: true, size: "md", className: "translate-x-5" },
    ],
  },
);

export type SwitchVariantProps = VariantProps<typeof switchTrackVariants>;

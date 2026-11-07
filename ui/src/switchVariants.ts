import { cva, type VariantProps } from "class-variance-authority";

export const switchTrackVariants = cva(
  "relative inline-flex shrink-0 items-center rounded-full border p-0.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none",
  {
    variants: {
      checked: {
        true: "border-primary bg-primary",
        false: "border-line-strong bg-surface-sunken",
      },
      disabled: {
        true: "cursor-not-allowed opacity-60",
        false: "cursor-pointer",
      },
      size: {
        sm: "h-5 w-9",
        md: "h-7 w-12",
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
  "pointer-events-none block rounded-full transition-transform duration-150 motion-reduce:transition-none",
  {
    variants: {
      checked: {
        true: "bg-on-primary",
        false: "translate-x-0 bg-ink-muted",
      },
      size: {
        sm: "size-3.5",
        md: "size-5",
      },
    },
    defaultVariants: {
      checked: false,
      size: "md",
    },
    compoundVariants: [
      { checked: true, size: "sm", className: "translate-x-4" },
      { checked: true, size: "md", className: "translate-x-5" },
    ],
  },
);

export type SwitchVariantProps = VariantProps<typeof switchTrackVariants>;

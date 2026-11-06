import { cva, type VariantProps } from "class-variance-authority";

// Variant order matters: `selected` and then `disabled` come last so their
// classes win the tailwind-merge pass in `cn`.
export const buttonVariants = cva(
  "inline-flex flex-row items-center justify-center gap-2 rounded-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-hover",
        secondary:
          "border border-line-strong bg-surface text-ink hover:bg-surface-sunken active:bg-surface-sunken",
        tertiary:
          "bg-transparent text-primary-text hover:bg-primary-soft active:bg-primary-soft",
        danger: "bg-danger text-on-danger hover:opacity-90 active:opacity-80",
        icon: "border border-line-strong bg-surface text-ink hover:bg-surface-sunken active:bg-surface-sunken",
      },
      size: {
        sm: "min-h-9 px-3 text-label",
        md: "min-h-target-min px-4 text-label",
        lg: "min-h-target-touch px-5 text-label",
        icon: "size-target-min p-0",
      },
      selected: {
        true: "border border-primary bg-primary-soft text-primary-text hover:bg-primary-soft",
        false: "",
      },
      disabled: {
        true: "cursor-not-allowed border-line bg-surface-sunken text-ink-muted hover:bg-surface-sunken hover:opacity-100 active:bg-surface-sunken active:opacity-100",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      selected: false,
      disabled: false,
    },
    compoundVariants: [
      { variant: "icon", size: "sm", className: "size-9 p-0" },
      { variant: "icon", size: "lg", className: "size-target-touch p-0" },
      {
        variant: "tertiary",
        disabled: true,
        className: "bg-transparent hover:bg-transparent active:bg-transparent",
      },
    ],
  },
);

export const buttonLabelVariants = cva("text-label", {
  variants: {
    variant: {
      primary: "text-on-primary",
      secondary: "text-ink",
      tertiary: "text-primary-text",
      danger: "text-on-danger",
      icon: "text-ink",
    },
    selected: {
      true: "text-primary-text",
      false: "",
    },
    disabled: {
      true: "text-ink-muted",
      false: "",
    },
  },
  defaultVariants: {
    variant: "primary",
    selected: false,
    disabled: false,
  },
});

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

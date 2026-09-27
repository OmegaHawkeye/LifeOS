import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lifeos-accent-dark disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-lifeos-accent text-lifeos-accent-ink hover:bg-lifeos-accent-dark active:bg-lifeos-accent-dark disabled:bg-stone-300 disabled:text-stone-600 dark:disabled:bg-stone-700 dark:disabled:text-stone-300",
        secondary:
          "border border-lifeos-border bg-lifeos-surface text-lifeos-primary hover:bg-lifeos-background active:bg-stone-100 disabled:bg-stone-200 disabled:text-stone-500 dark:border-white/15 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800 dark:active:bg-stone-800 dark:disabled:bg-stone-700 dark:disabled:text-stone-400",
        tertiary:
          "bg-transparent text-lifeos-primary hover:bg-lifeos-background active:bg-stone-100 disabled:bg-stone-100 disabled:text-stone-500 dark:text-stone-100 dark:hover:bg-white/10 dark:active:bg-white/10 dark:disabled:bg-stone-800 dark:disabled:text-stone-400",
        danger:
          "bg-red-700 text-white hover:bg-red-800 active:bg-red-900 disabled:bg-stone-300 disabled:text-stone-600 dark:disabled:bg-stone-700 dark:disabled:text-stone-300",
        icon: "border border-lifeos-border bg-lifeos-surface text-lifeos-primary hover:bg-lifeos-background disabled:bg-stone-200 disabled:text-stone-500 dark:border-white/15 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800 dark:disabled:bg-stone-700 dark:disabled:text-stone-400",
      },
      size: {
        sm: "min-h-9 rounded-lg px-3 py-1.5 text-sm",
        md: "min-h-11 rounded-xl px-4 py-2 text-sm",
        lg: "min-h-12 rounded-xl px-5 py-3 text-base",
        icon: "size-11 rounded-lg p-0",
      },
      disabled: {
        true: "cursor-not-allowed",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      disabled: false,
    },
    compoundVariants: [
      { variant: "icon", size: "sm", className: "size-9 p-0" },
      { variant: "icon", size: "lg", className: "size-12 p-0" },
    ],
  },
);

export const buttonLabelVariants = cva("text-sm font-semibold", {
  variants: {
    variant: {
      primary: "text-lifeos-accent-ink",
      secondary: "text-lifeos-primary",
      tertiary: "text-lifeos-primary dark:text-stone-100",
      danger: "text-white",
      icon: "text-lifeos-primary",
    },
    disabled: {
      true: "text-stone-500 dark:text-stone-400",
      false: "",
    },
  },
  defaultVariants: {
    variant: "primary",
    disabled: false,
  },
});

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

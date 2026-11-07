import type { ReactNode } from "react";
import type { LifeOSIconName } from "./AppIcon.types";
import type { ModuleTone } from "./tones";

export type SignalCardProps = {
  module: ModuleTone;
  title: string;
  /** Period or time context, e.g. "October" or "Today 18:30". */
  eyebrow?: string;
  icon?: LifeOSIconName;
  /** The headline figure, already formatted. */
  value?: string;
  unit?: string;
  /** "up" means better, not bigger. */
  trend?: "up" | "down" | "flat";
  trendText?: string;
  detail?: string;
  /** The next concrete step, shown in the footer. */
  next?: string;
  action?: string;
  onAction?: () => void;
  /** Delay for the entrance animation, so a row of cards can stagger. */
  enterDelayMs?: number;
  children?: ReactNode;
};

export declare function SignalCard(props: SignalCardProps): ReactNode;

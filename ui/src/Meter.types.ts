import type { ReactNode } from "react";
import type { ModuleTone } from "./tones";

export type MeterTone = ModuleTone | "warning" | "danger";

export type MeterProps = {
  label: string;
  value: number;
  max?: number;
  /** Draws a tick at this value, e.g. a protein target. */
  target?: number;
  /** Formatted value, e.g. "€412". */
  valueText: string;
  /** Formatted limit, e.g. "of €500". */
  ofText?: string;
  tone?: MeterTone;
  /** States the meter in words, e.g. "€88 left". Required for warning and danger. */
  note?: string;
};

export declare function Meter(props: MeterProps): ReactNode;

import type { ReactNode } from "react";

export type SegmentedOption = { value: string; label: string };

export type SegmentedControlProps = {
  /** Names the group for assistive technology. */
  label: string;
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  /** Stretch to the full width, as on phones and in sheets. */
  block?: boolean;
};

export declare function SegmentedControl(
  props: SegmentedControlProps,
): ReactNode;

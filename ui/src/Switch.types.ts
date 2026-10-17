import type { ReactNode } from "react";

export type SwitchProps = {
  /** States the "on" condition, e.g. "Back up every night". */
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export declare function Switch(props: SwitchProps): ReactNode;

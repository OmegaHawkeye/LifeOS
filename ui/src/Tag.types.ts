import type { ReactNode } from "react";
import type { ModuleTone } from "./tones";

export type TagTone =
  ModuleTone | "neutral" | "positive" | "warning" | "danger" | "now";

export type TagProps = {
  children: ReactNode;
  tone?: TagTone;
};

export declare function Tag(props: TagProps): ReactNode;

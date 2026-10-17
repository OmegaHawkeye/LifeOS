// Literal class names per tone, so Tailwind's source scan can see every utility.
export type ModuleTone =
  "finance" | "fitness" | "nutrition" | "health" | "routines";

export const moduleTileClasses: Record<ModuleTone, string> = {
  finance: "bg-finance-soft text-finance",
  fitness: "bg-fitness-soft text-fitness",
  nutrition: "bg-nutrition-soft text-nutrition",
  health: "bg-health-soft text-health",
  routines: "bg-routines-soft text-routines",
};

export const moduleTextClasses: Record<ModuleTone, string> = {
  finance: "text-finance",
  fitness: "text-fitness",
  nutrition: "text-nutrition",
  health: "text-health",
  routines: "text-routines",
};

export const moduleFillClasses: Record<ModuleTone, string> = {
  finance: "bg-finance",
  fitness: "bg-fitness",
  nutrition: "bg-nutrition",
  health: "bg-health",
  routines: "bg-routines",
};

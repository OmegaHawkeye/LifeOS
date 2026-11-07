import type { ReactNode } from "react";
import type { LifeOSIconName } from "./AppIcon.types";

export type AppNavItem = {
  id: string;
  /** Full name, used in the sidebar and as the accessible name. */
  label: string;
  /** Short name for the tab bar and rail, e.g. "Money" for Finance. */
  shortLabel?: string;
  icon: LifeOSIconName;
  href?: string;
  /** Left out of the phone tab bar, e.g. Settings, which phones reach from the header. */
  hideOnPhone?: boolean;
};

export type AppNavLinkProps = {
  item: AppNavItem;
  className: string;
  current: boolean;
  children: ReactNode;
};

export type AppNavLayout = "tabbar" | "rail" | "sidebar";

export type AppNavProps = {
  items: readonly AppNavItem[];
  current: string;
  owner?: string;
  onSignOut?: () => void;
  /** Accessible name of the navigation landmark. */
  label?: string;
  /**
   * Web: renders each item as a router link. Defaults to a plain anchor.
   * The web nav changes layout with the tablet: and desktop: breakpoints.
   */
  renderLink?: (props: AppNavLinkProps) => ReactNode;
  /** Native: the layout for the current window width; see appNavLayout(). */
  layout?: AppNavLayout;
  /** Native: called with the item id. */
  onNavigate?: (id: string) => void;
};

export type LogoMarkProps = { size?: number };

export declare function AppNav(props: AppNavProps): ReactNode;
export declare function LogoMark(props: LogoMarkProps): ReactNode;
export declare function appNavLayout(width: number): AppNavLayout;

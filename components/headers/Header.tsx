import { siteConfig } from "@/content/site-config";

import HeaderPillFloating from "./HeaderPillFloating";
import HeaderSplitEdges from "./HeaderSplitEdges";
import HeaderTransparentGhost from "./HeaderTransparentGhost";
import HeaderFullscreenOverlay from "./HeaderFullscreenOverlay";
import HeaderBottomDock from "./HeaderBottomDock";
import HeaderBurgerOnly from "./HeaderBurgerOnly";
import HeaderGlassPlasma from "./HeaderGlassPlasma";
import HeaderCenterLogoSplit from "./HeaderCenterLogoSplit";
import HeaderCommandBar from "./HeaderCommandBar";

export const HEADER_VARIANTS = {
  "pill-floating":       HeaderPillFloating,
  "split-edges":         HeaderSplitEdges,
  "transparent-ghost":   HeaderTransparentGhost,
  "fullscreen-overlay":  HeaderFullscreenOverlay,
  "bottom-dock":         HeaderBottomDock,
  "burger-only":         HeaderBurgerOnly,
  "glass-plasma":        HeaderGlassPlasma,
  "center-logo-split":   HeaderCenterLogoSplit,
  "command-bar":         HeaderCommandBar,
} as const;

export type HeaderVariantId = keyof typeof HEADER_VARIANTS;

export default function Header() {
  const variant =
    (siteConfig as any).headerVariant as HeaderVariantId | undefined;

  const Component = (variant && HEADER_VARIANTS[variant]) || HeaderPillFloating;

  return <Component />;
}

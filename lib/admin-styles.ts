// Shared dark/light style classes for all admin pages
export function getAdminStyles(dark: boolean) {
  return {
    // Backgrounds
    pageBg: dark ? "bg-[#0a0b0f]" : "bg-[#f5f6f8]",
    cardBg: dark ? "bg-[#151721]" : "bg-white",
    cardBorder: dark ? "border-white/[0.06]" : "border-gray-200/80",
    inputBg: dark ? "bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400",
    inputRing: dark ? "focus:ring-white/10" : "focus:ring-gray-300",

    // Text
    textPrimary: dark ? "text-white" : "text-gray-900",
    textSecondary: dark ? "text-gray-400" : "text-gray-500",
    textMuted: dark ? "text-gray-600" : "text-gray-400",
    textLabel: dark ? "text-gray-500" : "text-gray-500",

    // Interactive
    hoverBg: dark ? "hover:bg-white/[0.04]" : "hover:bg-gray-50",
    activeBg: dark ? "bg-white/[0.06]" : "bg-gray-50",
    divider: dark ? "divide-white/[0.04]" : "divide-gray-100",
    borderLight: dark ? "border-white/[0.04]" : "border-gray-100",

    // Specific
    sectionBg: dark ? "bg-white/[0.02]" : "bg-gray-50",
    tagBg: dark ? "bg-white/[0.06]" : "bg-gray-100",
  };
}

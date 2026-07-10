"use client";

import { AdminThemeProvider, useAdminTheme } from "@/lib/admin-theme";

/**
 * Route-transition skeletons. Rendered by loading.tsx boundaries while a
 * server page fetches — the admin must never show a frozen/blank screen on
 * navigation. Mirrors the AdminShell proportions (sidebar rail + header +
 * content blocks) so the swap to the real page doesn't jump.
 */

function Bone({ className }: { className: string }) {
  const { theme } = useAdminTheme();
  const tone = theme === "dark" ? "bg-white/[0.06]" : "bg-gray-200/80";
  return <div className={`rounded-lg animate-pulse ${tone} ${className}`} />;
}

/** Content-area skeleton — used inside a layout that already renders the shell. */
export function ContentSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-6xl w-full">
      <Bone className="h-7 w-48 mb-2" />
      <Bone className="h-4 w-80 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bone key={i} className="h-32" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}

function ShellSkeletonInner() {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  return (
    <div className={`min-h-screen flex ${dark ? "bg-[#0a0b0f]" : "bg-[#f5f6f8]"}`}>
      {/* Sidebar rail (desktop) */}
      <div className={`hidden lg:flex flex-col w-64 shrink-0 border-r p-4 gap-3 ${dark ? "bg-[#0f1117] border-white/[0.06]" : "bg-white border-gray-200/80"}`}>
        <Bone className="h-10 w-40 mb-4" />
        {Array.from({ length: 9 }).map((_, i) => (
          <Bone key={i} className="h-9" />
        ))}
      </div>
      {/* Main column */}
      <div className="flex-1 min-w-0">
        <div className={`h-14 border-b flex items-center px-6 ${dark ? "border-white/[0.06]" : "border-gray-200/80"}`}>
          <Bone className="h-5 w-32" />
        </div>
        <ContentSkeleton />
      </div>
    </div>
  );
}

/** Full-page skeleton for /admin route transitions (shell not mounted yet). */
export default function AdminShellSkeleton() {
  return (
    <AdminThemeProvider>
      <ShellSkeletonInner />
    </AdminThemeProvider>
  );
}

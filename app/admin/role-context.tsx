"use client";

import { createContext, useContext } from "react";

type RoleContextType = {
  role: string;
  permissions: string[];
  masking: Record<string, boolean>;
  has: (permission: string) => boolean;
  canUnmaskEmail: boolean;
  canUnmaskPhone: boolean;
  canUnmaskName: boolean;
  canSeeRevenue: boolean;
};

const RoleContext = createContext<RoleContextType>({
  role: "viewer",
  permissions: [],
  masking: {},
  has: () => false,
  canUnmaskEmail: false,
  canUnmaskPhone: false,
  canUnmaskName: true,
  canSeeRevenue: false,
});

export function AdminRoleProvider({
  role,
  permissions,
  masking,
  children,
}: {
  role: string;
  permissions: string[];
  masking: Record<string, boolean>;
  children: React.ReactNode;
}) {
  const isSuper = role === "owner" || role === "admin";

  const has = (permission: string) => {
    if (isSuper) return true;
    return permissions.includes(permission);
  };

  const value: RoleContextType = {
    role,
    permissions,
    masking,
    has,
    canUnmaskEmail: isSuper || masking.unmaskEmail === true,
    canUnmaskPhone: isSuper || masking.unmaskPhone === true,
    canUnmaskName: isSuper || masking.unmaskName !== false, // default true
    canSeeRevenue: isSuper || masking.seeRevenue === true,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}

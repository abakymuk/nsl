"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Permissions {
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  orgRole: string | null;
  loading: boolean;
}

// Cache permissions globally to avoid duplicate fetches
let cachedPermissions: Omit<Permissions, "loading"> | null = null;
let permissionsFetchPromise: Promise<Omit<Permissions, "loading">> | null = null;

async function fetchPermissions(): Promise<Omit<Permissions, "loading">> {
  // If already fetching, return existing promise
  if (permissionsFetchPromise) {
    return permissionsFetchPromise;
  }

  // If already cached, return cached value
  if (cachedPermissions) {
    return cachedPermissions;
  }

  // Start new fetch
  permissionsFetchPromise = (async () => {
    try {
      const res = await fetch("/api/auth/permissions");
      if (res.ok) {
        const data = await res.json();
        cachedPermissions = {
          isSuperAdmin: data.isSuperAdmin ?? false,
          isOrgAdmin: data.orgRole === "admin",
          orgRole: data.orgRole ?? null,
        };
      } else {
        cachedPermissions = {
          isSuperAdmin: false,
          isOrgAdmin: false,
          orgRole: null,
        };
      }
    } catch {
      cachedPermissions = {
        isSuperAdmin: false,
        isOrgAdmin: false,
        orgRole: null,
      };
    }
    permissionsFetchPromise = null;
    return cachedPermissions;
  })();

  return permissionsFetchPromise;
}

// Clear cache on auth state change
export function clearPermissionsCache() {
  cachedPermissions = null;
  permissionsFetchPromise = null;
}

export function usePermissions(): Permissions {
  const [permissions, setPermissions] = useState<Permissions>({
    isSuperAdmin: cachedPermissions?.isSuperAdmin ?? false,
    isOrgAdmin: cachedPermissions?.isOrgAdmin ?? false,
    orgRole: cachedPermissions?.orgRole ?? null,
    loading: !cachedPermissions,
  });

  const loadPermissions = useCallback(async () => {
    const result = await fetchPermissions();
    setPermissions({
      ...result,
      loading: false,
    });
  }, []);

  useEffect(() => {
    // If no user, skip
    const supabase = createClient();

    // Initial load
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        loadPermissions();
      } else {
        setPermissions({
          isSuperAdmin: false,
          isOrgAdmin: false,
          orgRole: null,
          loading: false,
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          // Clear cache and refetch on auth change
          clearPermissionsCache();
          loadPermissions();
        } else {
          clearPermissionsCache();
          setPermissions({
            isSuperAdmin: false,
            isOrgAdmin: false,
            orgRole: null,
            loading: false,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadPermissions]);

  return permissions;
}

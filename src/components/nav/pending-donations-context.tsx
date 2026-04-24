"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { getPendingDonationsCount } from "@/lib/actions/donations";

type PendingDonationsContextValue = {
  pendingCount: number;
  refresh: () => Promise<void>;
};

const PendingDonationsContext = createContext<PendingDonationsContextValue | null>(
  null
);

export function PendingDonationsProvider({ children }: { children: ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    const result = await getPendingDonationsCount();
    if (typeof result.data === "number") {
      setPendingCount(result.data);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <PendingDonationsContext.Provider value={{ pendingCount, refresh }}>
      {children}
    </PendingDonationsContext.Provider>
  );
}

export function usePendingDonations(): PendingDonationsContextValue {
  const ctx = useContext(PendingDonationsContext);
  if (!ctx) {
    return { pendingCount: 0, refresh: async () => {} };
  }
  return ctx;
}

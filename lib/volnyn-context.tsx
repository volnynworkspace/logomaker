"use client";

import { createContext, useContext, useMemo } from "react";
import { useSearchParams } from "next/navigation";

interface VolnynSession {
  isVolnynSession: boolean;
  volnynUserId: string;
  timestamp: string;
  callbackUrl: string;
  signature: string;
}

const VolnynContext = createContext<VolnynSession>({
  isVolnynSession: false,
  volnynUserId: "",
  timestamp: "",
  callbackUrl: "",
  signature: "",
});

export function VolnynProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();

  const session = useMemo<VolnynSession>(() => {
    const volnynUserId = searchParams.get("volnyn_user_id") || "";
    const timestamp = searchParams.get("timestamp") || "";
    const callbackUrl = searchParams.get("callback_url") || "";
    const signature = searchParams.get("signature") || "";

    const isVolnynSession = !!(volnynUserId && timestamp && callbackUrl && signature);

    return { isVolnynSession, volnynUserId, timestamp, callbackUrl, signature };
  }, [searchParams]);

  return (
    <VolnynContext.Provider value={session}>
      {children}
    </VolnynContext.Provider>
  );
}

export function useVolnynSession() {
  return useContext(VolnynContext);
}

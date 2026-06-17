import { createContext, useContext, useState, useEffect } from "react";
import { useListStavby } from "@workspace/api-client-react";

interface StavbaContextValue {
  stavbaId: number | null;
  setStavbaId: (id: number | null) => void;
}

const StavbaContext = createContext<StavbaContextValue>({
  stavbaId: null,
  setStavbaId: () => {},
});

export function StavbaProvider({ children }: { children: React.ReactNode }) {
  const [stavbaId, setStavbaIdState] = useState<number | null>(() => {
    const saved = localStorage.getItem("selectedStavbaId");
    return saved ? parseInt(saved) : null;
  });

  const setStavbaId = (id: number | null) => {
    setStavbaIdState(id);
    if (id === null) {
      localStorage.removeItem("selectedStavbaId");
    } else {
      localStorage.setItem("selectedStavbaId", String(id));
    }
  };

  return (
    <StavbaContext.Provider value={{ stavbaId, setStavbaId }}>
      {children}
    </StavbaContext.Provider>
  );
}

export function useStavba() {
  return useContext(StavbaContext);
}

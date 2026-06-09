/**
 * useCurrentUser — always returns the real authenticated user.
 *
 * The old dummy/role-switching behaviour has been removed.  All pages that
 * previously consumed this hook continue to work unchanged because the shape
 * of the returned `currentUser` object is the same.
 */
import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface CurrentUserContextType {
  currentUser: CurrentUser;
  // setCurrentUser kept for API compatibility — no-op in the real-user world
  setCurrentUser: (user: CurrentUser) => void;
}

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined);

interface CurrentUserProviderProps {
  children: ReactNode;
}

export function CurrentUserProvider({ children }: CurrentUserProviderProps) {
  const { user } = useAuth();

  const currentUser: CurrentUser = user
    ? { id: user.id, name: user.name, email: user.email, role: user.role }
    : { id: 0, name: "Loading…", email: "", role: "user" };

  const setCurrentUser = (_u: CurrentUser) => {
    // no-op — role switching has been removed
  };

  return (
    <CurrentUserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (context === undefined) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return context;
}

// Kept for any lingering import — empty array, unused
export const DUMMY_USERS: CurrentUser[] = [];
export type { CurrentUser as DummyUser };

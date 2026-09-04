"use client";

import { createContext, useContext } from "react";
type UserAccount = { id: string; name: string; mail: string; url?: string };

interface AuthContextValue {
  user: UserAccount;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({
  user,
  children,
}: {
  user: UserAccount;
  children: React.ReactNode;
}) {
  return (
    <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user.mail) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

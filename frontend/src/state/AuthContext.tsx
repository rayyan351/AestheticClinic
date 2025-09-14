import { createContext, useContext } from "react";

export type Role = "patient" | "doctor" | "admin";

export type User = {
  id?: string;
  name: string;
  email: string;
  role: Role;
};

export type AuthCtx = {
  user: User | null;
  setUser: (u: User | null) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
};


export const AuthContext = createContext<AuthCtx>({
  user: null,
  setUser: () => {

  },
  loading: true,
  setLoading: () => {
 
  },
});

export const useAuth = () => useContext(AuthContext);

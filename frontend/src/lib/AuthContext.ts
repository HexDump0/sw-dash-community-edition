import { createContext } from 'react';
import type { ReviewerInfo } from './api';

export interface AuthState {
  reviewer: ReviewerInfo | null;
  loading: boolean;
  error: string | null;
  login: (curl: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

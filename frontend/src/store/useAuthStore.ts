import { create } from 'zustand';
import { clearTokens, getAccessToken, saveTokens } from '../utils/tokenStorage';
import { configureApiAuthHandlers } from '../api/client';
import { getMe, login as loginApi } from '../api/auth';

export interface User {
  id: number;
  email: string;
  nickname: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  isHydrating: boolean;

  hydrate: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoggedIn: false,
  isHydrating: true,

  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),

  hydrate: async () => {
    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        set({
          user: null,
          accessToken: null,
          isLoggedIn: false,
          isHydrating: false,
        });
        return;
      }

      const me = await getMe();

      set({
        user: me,
        accessToken,
        isLoggedIn: true,
        isHydrating: false,
      });
    } catch (error) {
      await clearTokens();
      set({
        user: null,
        accessToken: null,
        isLoggedIn: false,
        isHydrating: false,
      });
    }
  },

  login: async (payload) => {
    const data = await loginApi(payload);

    const accessToken = data.access;
    const refreshToken = data.refresh;

    if (!accessToken || !refreshToken) {
      throw new Error('로그인 응답에 access/refresh token이 없습니다.');
    }

    await saveTokens(accessToken, refreshToken);

    const me = await getMe();

    set({
      user: me,
      accessToken,
      isLoggedIn: true,
      isHydrating: false,
    });
  },

  logout: async () => {
    await clearTokens();

    set({
      user: null,
      accessToken: null,
      isLoggedIn: false,
      isHydrating: false,
    });
  },
}));

configureApiAuthHandlers({
  onUnauthorized: () => useAuthStore.getState().logout(),
  onAccessTokenRefreshed: (token) => useAuthStore.getState().setAccessToken(token),
});
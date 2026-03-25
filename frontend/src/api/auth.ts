import { api } from './client';

export interface SignupPayload {
  email: string;
  nickname: string;
  password: string;
  password_confirm: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const signup = async (payload: SignupPayload) => {
  const { data } = await api.post('/users/signup/', payload);
  return data;
};

export const login = async (payload: LoginPayload) => {
  const { data } = await api.post('/users/login/', payload);
  return data;
};

export const getMe = async () => {
  const { data } = await api.get('/users/me/');
  return data;
};

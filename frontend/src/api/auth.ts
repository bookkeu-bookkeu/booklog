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

export interface User {
  id: number;
  email: string;
  nickname: string;
  status: string;
  is_active: boolean;
  is_staff: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateMePayload {
  email?: string;
  current_password: string;
  new_password?: string;
  new_password_confirm?: string;
}

export const signup = async (payload: SignupPayload) => {
  const { data } = await api.post('/users/signup/', payload);
  return data;
};

export const login = async (payload: LoginPayload) => {
  const { data } = await api.post('/users/login/', payload);
  return data;
};

export const getMe = async (): Promise<User> => {
  const { data } = await api.get<User>('/users/me/');
  return data;
};

export const updateMe = async (payload: UpdateMePayload): Promise<User> => {
  const { data } = await api.patch<User>('/users/me/', payload);
  return data;
};

export const deleteMe = async (): Promise<void> => {
  await api.delete('/users/me/');
};

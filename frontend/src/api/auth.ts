import axios from 'axios';
import { api } from './client';
import { API_BASE_URL, REFRESH_PATH } from '../constants/config';

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

export const refreshAccessToken = async (refresh: string) => {
  const { data } = await axios.post(
    `${API_BASE_URL}${REFRESH_PATH}`,
    { refresh },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  return data;
};
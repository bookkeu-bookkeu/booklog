import axios from 'axios';
import { API_BASE_URL, REFRESH_PATH } from '../constants/config';

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

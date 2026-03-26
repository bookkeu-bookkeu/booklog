import { api } from './client';

export interface CurrentUserRbti {
  id: number;
  rbti_code: string;
  rbti_name: string;
  rbti_description?: string;
  axis_1?: string;
  axis_2?: string;
  axis_3?: string;
  analytic_score?: number;
  immersion_score?: number;
  critical_score?: number;
  empathy_score?: number;
  practical_score?: number;
  expansion_score?: number;
  source_type?: string;
  source_ref_id?: number | null;
  created_at?: string;
}

export interface CurrentUserRbtiResponse {
  has_rbti: boolean;
  axis_definitions: Array<{
    axis: number;
    left_code: string;
    left_name: string;
    right_code: string;
    right_name: string;
  }>;
  current_rbti: CurrentUserRbti | null;
}

export async function getCurrentUserRbti(): Promise<CurrentUserRbtiResponse> {
  const response = await api.get<CurrentUserRbtiResponse>('/rbti/me/');
  return response.data;
}

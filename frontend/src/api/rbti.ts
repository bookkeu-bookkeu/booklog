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

export interface RbtiSurveyChoice {
  id: number;
  label: string;
  choice_text: string;
  sort_order: number;
}

export interface RbtiSurveyQuestion {
  id: number;
  question_text: string;
  axis_type: string;
  order_no: number;
  choices: RbtiSurveyChoice[];
}

export interface RbtiSurveyQuestionResponse {
  count: number;
  questions: RbtiSurveyQuestion[];
}

export interface RbtiSurveyAnswerPayload {
  question_id: number;
  choice_id: number;
}

export interface RbtiSurveySubmitPayload {
  is_retest?: boolean;
  answers: RbtiSurveyAnswerPayload[];
}

export interface RbtiSurveySubmitResponse {
  detail: string;
  axis_definitions: CurrentUserRbtiResponse['axis_definitions'];
  session_id: number;
  saved_answer_count: number;
  raw_scores: Record<string, number>;
  percentage_scores: Record<string, number>;
  current_rbti: CurrentUserRbti;
}

export async function getCurrentUserRbti(): Promise<CurrentUserRbtiResponse> {
  const response = await api.get<CurrentUserRbtiResponse>('/rbti/me/');
  return response.data;
}

export async function getRbtiSurveyQuestions(
  options: { random?: boolean } = {},
): Promise<RbtiSurveyQuestionResponse> {
  const response = await api.get<RbtiSurveyQuestionResponse>('/rbti/questions/', {
    params: {
      ...(options.random ? { random: true } : {}),
    },
  });
  return response.data;
}

export async function submitRbtiSurvey(
  payload: RbtiSurveySubmitPayload,
): Promise<RbtiSurveySubmitResponse> {
  const response = await api.post<RbtiSurveySubmitResponse>('/rbti/submit/', payload);
  return response.data;
}

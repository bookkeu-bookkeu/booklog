import { api } from './client';

export interface ReviewItem {
  id: number;
  user_nickname: string;
  book: number;
  book_title: string;
  book_thumbnail_url?: string;
  rating: number;
  content: string;
  visibility: 'public' | 'private';
  rbti_code?: string | null;
  rbti_name?: string | null;
  like_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewLikeResponse {
  liked: boolean;
  created?: boolean;
  deleted?: boolean;
  like_count: number;
  detail?: string;
}

export interface QuoteNoteItem {
  id: number;
  user_nickname: string;
  book: number;
  book_title: string;
  book_thumbnail_url?: string;
  book_isbn13?: string;
  book_publisher?: string;
  book_authors?: string[];
  quoted_text: string;
  note?: string;
  page_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQuoteNotePayload {
  book_id: number;
  user_book_id?: number | null;
  quoted_text: string;
  note?: string;
  page_number?: number | null;
}

export interface UpdateQuoteNotePayload {
  quoted_text?: string;
  note?: string;
  page_number?: number | null;
}

export interface CreateReviewPayload {
  book_id: number;
  user_book_id?: number | null;
  rating: number;
  content: string;
  visibility: ReviewVisibility;
}

export interface UpdateReviewPayload {
  rating?: number;
  content?: string;
  visibility?: ReviewVisibility;
}

export type ReviewVisibility = 'public' | 'private';

export type GetBookReviewsOptions = {
  mine?: boolean;
  visibility?: ReviewVisibility;
  rbtiCode?: string;
};

export interface BookRbtiFilterOption {
  id: number;
  code: string;
  name: string;
  axis_1: string;
  axis_2: string;
  axis_3: string;
  description: string;
  public_review_count: number;
  my_review_count: number;
}

export interface BookTopPositiveRbti {
  code: string;
  name: string;
  axis_1: string;
  axis_2: string;
  axis_3: string;
  description: string;
  positive_ratio: number;
  review_count: number;
  avg_review_score: number;
  representative_review?: {
    id: number;
    user_nickname: string;
    rating: number;
    content: string;
    like_count: number;
  } | null;
}

export interface BookTopPositiveRbtiResponse {
  book_id: number;
  has_result: boolean;
  top_rbti: BookTopPositiveRbti | null;
}

export async function getBookReviews(
  bookId?: number,
  options?: GetBookReviewsOptions
): Promise<ReviewItem[]> {
  const response = await api.get<ReviewItem[]>('/reviews/', {
    params: {
      ...(typeof bookId === 'number' ? { book_id: bookId } : {}),
      ...(options?.mine ? { mine: 'true' } : {}),
      ...(options?.visibility ? { visibility: options.visibility } : {}),
      ...(options?.rbtiCode ? { rbti_code: options.rbtiCode } : {}),
    },
  });

  return response.data ?? [];
}

export async function getLikedReviews(): Promise<ReviewItem[]> {
  const response = await api.get<ReviewItem[]>('/reviews/liked/');
  return response.data ?? [];
}

export async function likeReview(reviewId: number): Promise<ReviewLikeResponse> {
  const response = await api.post<ReviewLikeResponse>(`/reviews/${reviewId}/like/`);
  return response.data;
}

export async function unlikeReview(reviewId: number): Promise<ReviewLikeResponse> {
  const response = await api.delete<ReviewLikeResponse>(`/reviews/${reviewId}/like/`);
  return response.data;
}

export async function createReview(payload: CreateReviewPayload): Promise<ReviewItem> {
  const response = await api.post<ReviewItem>('/reviews/', payload, {
    timeout: 120000,
  });
  return response.data;
}

export async function updateReview(
  reviewId: number,
  payload: UpdateReviewPayload
): Promise<ReviewItem> {
  const response = await api.patch<ReviewItem>(`/reviews/${reviewId}/`, payload, {
    timeout: 120000,
  });
  return response.data;
}

export async function deleteReview(reviewId: number): Promise<void> {
  await api.delete(`/reviews/${reviewId}/`);
}

export async function getBookRbtiFilters(bookId: number): Promise<BookRbtiFilterOption[]> {
  const response = await api.get<BookRbtiFilterOption[]>('/rbti/filters/', {
    params: {
      book_id: bookId,
    },
  });

  return response.data ?? [];
}

export async function getBookTopPositiveRbti(
  bookId: number
): Promise<BookTopPositiveRbtiResponse> {
  const response = await api.get<BookTopPositiveRbtiResponse>(
    `/reviews/books/${bookId}/top-positive-rbti/`
  );

  return response.data;
}

export async function getQuoteNotes(bookId?: number): Promise<QuoteNoteItem[]> {
  const response = await api.get<QuoteNoteItem[]>('/reviews/quotes/', {
    params: typeof bookId === 'number' ? { book_id: bookId } : undefined,
  });

  return response.data ?? [];
}

export async function createQuoteNote(
  payload: CreateQuoteNotePayload
): Promise<QuoteNoteItem> {
  const response = await api.post<QuoteNoteItem>('/reviews/quotes/', payload);
  return response.data;
}

export async function updateQuoteNote(
  quoteNoteId: number,
  payload: UpdateQuoteNotePayload
): Promise<QuoteNoteItem> {
  const response = await api.patch<QuoteNoteItem>(`/reviews/quotes/${quoteNoteId}/`, payload);
  return response.data;
}

export async function deleteQuoteNote(quoteNoteId: number): Promise<void> {
  await api.delete(`/reviews/quotes/${quoteNoteId}/`);
}

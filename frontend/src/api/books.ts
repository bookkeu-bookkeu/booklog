import { api } from './client';
import { Book, BookSearchResponse } from '../navigation/types';

export async function searchBooks(query: string, page = 1, size = 20): Promise<BookSearchResponse> {
  const response = await api.get<BookSearchResponse>('/books/search/', {
    params: {
      query,
      page,
      size,
    },
  });

  return response.data;
}

/**
 * 가정:
 * - 백엔드에서 로그인 사용자 기준 RBTI 추천 도서를 내려주는 엔드포인트가 존재
 * - 응답 형식은 search와 동일하게 results 배열 포함
 */
export async function getRbtiRecommendedBooks(page = 1, size = 10): Promise<Book[]> {
  const response = await api.get<BookSearchResponse>('/books/recommendations/rbti/', {
    params: {
      page,
      size,
    },
  });

  return response.data.results ?? [];
}
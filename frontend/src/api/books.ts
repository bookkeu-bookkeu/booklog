import { api } from './client';
import { Book, BookSearchResponse } from '../navigation/types';

export type UserShelfCode = 'WANT' | 'READING' | 'DONE';

export interface UserLibraryBook {
  id: number;
  book_id: number;
  book_title: string;
  book_thumbnail_url: string;
  book_isbn13: string;
  book_publisher: string;
  book_authors: string[];
  shelf_code: UserShelfCode;
  shelf_name: string;
  started_at: string | null;
  finished_at: string | null;
  rating: number | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

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

export async function getMyLibraryBooks(shelf?: UserShelfCode): Promise<UserLibraryBook[]> {
  const response = await api.get<UserLibraryBook[]>('/reading/user-books/', {
    params: shelf ? { shelf } : undefined,
  });

  return response.data ?? [];
}
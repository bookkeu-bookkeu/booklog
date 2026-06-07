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
  book_category?: string;
  book_authors: string[];
  shelf_code: UserShelfCode;
  shelf_name: string;
  started_at: string | null;
  finished_at: string | null;
  book_type: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateLibraryBookPayload {
  shelf_code?: UserShelfCode;
  started_at?: string | null;
  finished_at?: string | null;
  book_type?: string | null;
  is_favorite?: boolean;
}

export type RbtiRecommendedBook = Book & {
  id: number;
  rbti_code: string;
  rbti_name: string;
  positive_ratio: number;
  review_count: number;
  avg_review_score: number;
};

export interface RbtiRecommendedBooksResponse {
  rbti_code: string | null;
  rbti_name: string | null;
  positive_threshold: number;
  results: RbtiRecommendedBook[];
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
export async function getRbtiRecommendedBooks(size = 10): Promise<RbtiRecommendedBooksResponse> {
  const response = await api.get<RbtiRecommendedBooksResponse>('/books/recommendations/rbti/', {
    params: {
      size,
    },
  });

  return response.data;
}

export async function getMyLibraryBooks(shelf?: UserShelfCode): Promise<UserLibraryBook[]> {
  const response = await api.get<UserLibraryBook[]>('/reading/user-books/', {
    params: shelf ? { shelf } : undefined,
  });

  return response.data ?? [];
}

export async function getExternalBookDetailByIsbn(isbn: string): Promise<Book> {
  const response = await api.get<Book>('/books/external/', {
    params: {
      isbn,
    },
  });

  return response.data;
}

export interface ImportedBookResponse {
  id: number;
  isbn13: string;
  title: string;
  publisher: string;
  contents?: string;
  description?: string;
  category?: string;
  kdc?: string;
  subject?: string;
  thumbnail_url: string;
}

export async function importBookByIsbn13(isbn13: string): Promise<ImportedBookResponse> {
  const response = await api.post<ImportedBookResponse>('/books/import/', {
    isbn13,
  });

  return response.data;
}

export async function addBookToLibrary(
  bookId: number,
  shelfCode: UserShelfCode = 'WANT'
): Promise<UserLibraryBook> {
  const response = await api.post<UserLibraryBook>('/reading/user-books/', {
    book_id: bookId,
    shelf_code: shelfCode,
  });

  return response.data;
}

export async function removeBookFromLibrary(userLibraryBookId: number): Promise<void> {
  await api.delete(`/reading/user-books/${userLibraryBookId}/`);
}

export async function resetMyLibrary(): Promise<{ deleted_count: number }> {
  const response = await api.delete<{ deleted_count: number }>('/reading/user-books/');
  return response.data;
}

export async function updateLibraryBookShelf(
  userLibraryBookId: number,
  shelfCode: UserShelfCode
): Promise<UserLibraryBook> {
  return updateLibraryBook(userLibraryBookId, { shelf_code: shelfCode });
}

export async function updateLibraryBook(
  userLibraryBookId: number,
  payload: UpdateLibraryBookPayload
): Promise<UserLibraryBook> {
  const response = await api.patch<UserLibraryBook>(
    `/reading/user-books/${userLibraryBookId}/`,
    payload
  );

  return response.data;
}

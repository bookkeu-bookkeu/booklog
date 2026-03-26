import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type SearchStackParamList = {
  SearchHome: undefined;
  SearchInput: {
    initialKeyword?: string;
  } | undefined;
  SearchResult: {
    keyword: string;
  };
  BookDetail: {
    book: Book;
  };
  BookReview: {
    book?: Book;
  };
  BookReviewCreate: {
    book?: Book;
  };
  QuoteNote: {
    book?: Book;
  };
  QuoteNoteBookSelect: {
    book?: Book;
    mode?: 'quote' | 'review';
  };
  QuoteNoteCreate: {
    book?: Book;
    quoteNoteId?: number;
    initialPageNumber?: number | null;
    initialQuotedText?: string;
  };
};

export type MainTabParamList = {
  Home: undefined;
  Search: NavigatorScreenParams<SearchStackParamList> | undefined;
  Library: undefined;
  MyPage: undefined;
};

export interface Book {
  source: string;
  external_api_id: string;
  title: string;
  contents: string;
  url: string;
  isbn: string;
  isbn10?: string;
  isbn13?: string;
  authors: string[];
  translators?: string[];
  publisher: string;
  published_at: string;
  thumbnail: string;
  price?: number;
  sale_price?: number;
  status?: string;
  is_in_library?: boolean;
}

export interface BookSearchResponse {
  total_count: number;
  pageable_count: number;
  is_end: boolean;
  page: number;
  size: number;
  results: Book[];
}

export interface RecentSearchItem {
  id: string;
  keyword: string;
}
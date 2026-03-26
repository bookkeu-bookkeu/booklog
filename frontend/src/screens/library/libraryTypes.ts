import { Book } from '../../navigation/types';

export type ShelfTabKey = 'wish' | 'reading' | 'done';

export type TabTransitionState = {
  from: ShelfTabKey;
  to: ShelfTabKey;
  direction: 1 | -1;
};

export type LibraryBook = {
  id: string;
  title: string;
  author: string;
  publisher: string;
  thumbnail?: string;
  detailBook: Book;
};

export const TAB_ORDER: ShelfTabKey[] = ['wish', 'reading', 'done'];

export const ESTIMATED_GRID_ROW_HEIGHT = 248;

export const INITIAL_BOOKS_BY_TAB: Record<ShelfTabKey, LibraryBook[]> = {
  wish: [],
  reading: [],
  done: [],
};

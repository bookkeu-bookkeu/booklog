import { UserLibraryBook } from '../../api/books';
import { LibraryBook, ShelfTabKey } from './libraryTypes';

export function mapShelfCodeToTab(shelfCode: UserLibraryBook['shelf_code']): ShelfTabKey {
  if (shelfCode === 'WANT') return 'wish';
  if (shelfCode === 'READING') return 'reading';
  return 'done';
}

export function mapUserLibraryBook(item: UserLibraryBook): LibraryBook {
  return {
    id: String(item.id),
    title: item.book_title?.trim() || '제목 없음',
    author: item.book_authors?.length ? item.book_authors.join(', ') : '저자 미상',
    publisher: item.book_publisher?.trim() || '출판사',
    thumbnail: item.book_thumbnail_url?.trim() || undefined,
  };
}

import { UserLibraryBook } from '../../api/books';
import { LibraryBook, ShelfTabKey } from './libraryTypes';

export function mapShelfCodeToTab(shelfCode: UserLibraryBook['shelf_code']): ShelfTabKey {
  if (shelfCode === 'WANT') return 'want';
  if (shelfCode === 'READING') return 'reading';
  return 'done';
}

export function mapUserLibraryBook(item: UserLibraryBook): LibraryBook {
  const title = item.book_title?.trim() || '제목 없음';
  const publisher = item.book_publisher?.trim() || '출판사';
  const thumbnail = item.book_thumbnail_url?.trim() || '';
  const isbn13 = item.book_isbn13?.trim() || '';

  return {
    id: String(item.id),
    title,
    author: item.book_authors?.length ? item.book_authors.join(', ') : '저자 미상',
    publisher,
    thumbnail: thumbnail || undefined,
    detailBook: {
      source: 'library',
      external_api_id: String(item.book_id),
      title,
      contents: '',
      url: '',
      isbn: isbn13,
      isbn13,
      authors: item.book_authors ?? [],
      publisher,
      published_at: '',
      thumbnail,
      is_in_library: true,
    },
  };
}

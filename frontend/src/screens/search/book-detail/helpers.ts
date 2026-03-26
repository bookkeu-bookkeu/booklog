export function getAuthorText(book: any) {
  if (Array.isArray(book?.authors) && book.authors.length > 0) {
    return book.authors.join(', ');
  }

  if (typeof book?.authors === 'string' && book.authors.trim()) {
    return book.authors.trim();
  }

  if (typeof book?.author === 'string' && book.author.trim()) {
    return book.author.trim();
  }

  return '';
}

export function getPublisherText(book: any) {
  if (typeof book?.publisher === 'string' && book.publisher.trim()) {
    return book.publisher.trim();
  }
  return '문학동네';
}

export function getIsbnText(book: any) {
  if (typeof book?.isbn13 === 'string' && book.isbn13.trim()) {
    return book.isbn13.trim();
  }
  if (typeof book?.isbn === 'string' && book.isbn.trim()) {
    return book.isbn.trim();
  }
  return '9788954640312';
}

export function getPublishedYear(date?: string) {
  if (typeof date === 'string' && date.length >= 4) {
    return date.slice(0, 4);
  }
  return '2026';
}

export function getBookIsbn13(book: any) {
  return typeof book?.isbn13 === 'string' && book.isbn13.trim()
    ? book.isbn13.trim()
    : typeof book?.isbn === 'string' && book.isbn.trim()
    ? book.isbn
        .trim()
        .split(' ')
        .find((part: string) => part.length === 13 && /^\d+$/.test(part)) ?? ''
    : '';
}

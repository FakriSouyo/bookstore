'use server';

import {
  attachBookImage,
  createBook,
  deleteBookImage,
  setBookStatus,
  setPrimaryImage,
  updateBook,
  type BookInput,
} from '@/lib/services/books';
import type { BookStatus } from '@/types/database';

export async function createBookAction(input: BookInput) {
  return createBook(input);
}

export async function updateBookAction(id: string, input: BookInput) {
  return updateBook(id, input);
}

export async function setBookStatusAction(id: string, status: BookStatus) {
  return setBookStatus(id, status);
}

export async function attachBookImageAction(bookId: string, storagePath: string, url: string) {
  return attachBookImage(bookId, storagePath, url);
}

export async function setPrimaryImageAction(bookId: string, imageId: string) {
  return setPrimaryImage(bookId, imageId);
}

export async function deleteBookImageAction(imageId: string) {
  return deleteBookImage(imageId);
}

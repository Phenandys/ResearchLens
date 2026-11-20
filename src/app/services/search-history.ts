import {isPlatformBrowser} from '@angular/common';
import {inject, Injectable, PLATFORM_ID, signal} from '@angular/core';
import {SearchHistoryEntry} from '../models/paper.model';

const STORAGE_KEY = 'researchlens_search_history_v1';
const MAX_HISTORY_ENTRIES = 8;

@Injectable({providedIn: 'root'})
export class SearchHistory {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly entriesState = signal<SearchHistoryEntry[]>(this.loadFromStorage());

  readonly entries = this.entriesState.asReadonly();

  record(query: string, limit: number): void {
    const normalized = query.trim();
    if (!normalized) {
      return;
    }

    this.entriesState.update((existing) => {
      const filtered = existing.filter(
        (entry) => entry.query.toLowerCase() !== normalized.toLowerCase(),
      );
      const next: SearchHistoryEntry[] = [
        {query: normalized, limit, timestamp: Date.now()},
        ...filtered,
      ].slice(0, MAX_HISTORY_ENTRIES);

      this.saveToStorage(next);
      return next;
    });
  }

  remove(query: string): void {
    this.entriesState.update((existing) => {
      const next = existing.filter((entry) => entry.query !== query);
      this.saveToStorage(next);
      return next;
    });
  }

  clear(): void {
    this.entriesState.set([]);
    this.saveToStorage([]);
  }

  private loadFromStorage(): SearchHistoryEntry[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter(
          (item): item is SearchHistoryEntry =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as SearchHistoryEntry).query === 'string' &&
            typeof (item as SearchHistoryEntry).limit === 'number' &&
            typeof (item as SearchHistoryEntry).timestamp === 'number',
        )
        .slice(0, MAX_HISTORY_ENTRIES);
    } catch {
      return [];
    }
  }

  private saveToStorage(entries: SearchHistoryEntry[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Ignore storage quota or private-browsing exceptions
    }
  }
}

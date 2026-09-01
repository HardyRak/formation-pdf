import { Injectable } from '@nestjs/common';

export interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  requestHeaders: Record<string, unknown>;
  responseHeaders: Record<string, unknown>;
  requestBody: unknown;
  message: string;
}

@Injectable()
export class LogService {
  private readonly entries: LogEntry[] = [];
  private readonly maxEntries = 200;

  addEntry(entry: LogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  getEntries(): LogEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }

  getLatest(): LogEntry | null {
    return this.entries.length > 0 ? { ...this.entries[this.entries.length - 1] } : null;
  }

  clear(): void {
    this.entries.length = 0;
  }
}

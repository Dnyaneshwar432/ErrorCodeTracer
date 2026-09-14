import { DatasetMetadata, ErrorRecord, SearchMatch, SearchMode } from '../types/errorCode';
import { normalizeErrorCode } from './dataNormalizer';

export class ErrorIndex {
  // Map of normalized uppercase code -> Array of records with that code
  private codeMap: Map<string, ErrorRecord[]> = new Map();
  // Unique list of normalized codes for autocomplete and partial search
  private uniqueCodes: string[] = [];
  // Microservice -> Records map
  private msMap: Map<string, ErrorRecord[]> = new Map();
  // All records list
  private records: ErrorRecord[] = [];
  // Metadata summary
  private metadata: DatasetMetadata | null = null;

  constructor(records: ErrorRecord[] = [], meta?: Partial<DatasetMetadata>) {
    this.build(records, meta);
  }

  public build(records: ErrorRecord[], meta?: Partial<DatasetMetadata>): void {
    this.records = records;
    this.codeMap.clear();
    this.msMap.clear();

    const distribution: Record<string, number> = {};

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const codeKey = rec.normalizedCode;

      // Add to codeMap
      const existing = this.codeMap.get(codeKey);
      if (existing) {
        existing.push(rec);
      } else {
        this.codeMap.set(codeKey, [rec]);
      }

      // Add to msMap
      const msKey = rec.microservice || 'Microservice not specified';
      const msExisting = this.msMap.get(msKey);
      if (msExisting) {
        msExisting.push(rec);
      } else {
        this.msMap.set(msKey, [rec]);
      }

      distribution[msKey] = (distribution[msKey] || 0) + 1;
    }

    this.uniqueCodes = Array.from(this.codeMap.keys()).sort();

    this.metadata = {
      id: meta?.id || `ds_${Date.now()}`,
      fileName: meta?.fileName || 'unknown.xlsx',
      fileSize: meta?.fileSize || 0,
      uploadedAt: meta?.uploadedAt || new Date().toISOString(),
      totalRecords: records.length,
      uniqueErrorCodes: this.codeMap.size,
      uniqueMicroservices: this.msMap.size,
      microserviceDistribution: distribution,
      sheetNames: meta?.sheetNames || [],
      selectedSheet: meta?.selectedSheet || 'all'
    };
  }

  public getMetadata(): DatasetMetadata | null {
    return this.metadata;
  }

  public getAllRecords(): ErrorRecord[] {
    return this.records;
  }

  public getMicroservices(): string[] {
    return Array.from(this.msMap.keys()).sort((a, b) => {
      // Sort by record count descending
      const countA = this.msMap.get(a)?.length || 0;
      const countB = this.msMap.get(b)?.length || 0;
      if (countB !== countA) return countB - countA;
      return a.localeCompare(b);
    });
  }

  /**
   * Instant search by query and optional microservice filter
   */
  public search(
    query: string,
    options: {
      mode?: SearchMode;
      microservice?: string;
      maxResults?: number;
    } = {}
  ): {
    matches: SearchMatch[];
    suggestions: string[];
    isExact: boolean;
  } {
    const rawQuery = query.trim();
    if (!rawQuery) {
      return { matches: [], suggestions: [], isExact: false };
    }

    const normalizedQuery = normalizeErrorCode(rawQuery);
    const mode = options.mode || 'exact';
    const filterMs = options.microservice && options.microservice !== 'all' ? options.microservice : null;
    const max = options.maxResults || 200;

    // 1. EXACT SEARCH
    if (mode === 'exact') {
      const exactList = this.codeMap.get(normalizedQuery);
      if (exactList && exactList.length > 0) {
        const filtered = filterMs ? exactList.filter((r) => r.microservice === filterMs) : exactList;
        return {
          matches: filtered.map((record) => ({ record, matchType: 'exact', score: 1 })),
          suggestions: [],
          isExact: true
        };
      }

      // If no exact match found, find fuzzy suggestions
      const suggestions = this.getFuzzySuggestions(normalizedQuery, 5);
      return { matches: [], suggestions, isExact: false };
    }

    // 2. PARTIAL SEARCH
    const matches: SearchMatch[] = [];
    const lowerQuery = normalizedQuery;

    // First check exact match
    const exactList = this.codeMap.get(lowerQuery);
    if (exactList) {
      const filtered = filterMs ? exactList.filter((r) => r.microservice === filterMs) : exactList;
      filtered.forEach((record) => matches.push({ record, matchType: 'exact', score: 100 }));
    }

    // Next check prefix matches
    for (const code of this.uniqueCodes) {
      if (matches.length >= max) break;
      if (code === lowerQuery) continue;

      if (code.startsWith(lowerQuery)) {
        const list = this.codeMap.get(code) || [];
        const filtered = filterMs ? list.filter((r) => r.microservice === filterMs) : list;
        filtered.forEach((record) => matches.push({ record, matchType: 'prefix', score: 80 }));
      }
    }

    // Next check substring matches
    for (const code of this.uniqueCodes) {
      if (matches.length >= max) break;
      if (code === lowerQuery || code.startsWith(lowerQuery)) continue;

      if (code.includes(lowerQuery)) {
        const list = this.codeMap.get(code) || [];
        const filtered = filterMs ? list.filter((r) => r.microservice === filterMs) : list;
        filtered.forEach((record) => matches.push({ record, matchType: 'substring', score: 50 }));
      }
    }

    const suggestions = matches.length === 0 ? this.getFuzzySuggestions(normalizedQuery, 5) : [];

    return {
      matches: matches.slice(0, max),
      suggestions,
      isExact: matches.some((m) => m.matchType === 'exact')
    };
  }

  /**
   * Fast autocomplete lookup for dropdown
   */
  public getAutocomplete(prefix: string, max: number = 10): string[] {
    const cleanPrefix = normalizeErrorCode(prefix);
    if (!cleanPrefix || cleanPrefix.length < 1) return [];

    const results: string[] = [];
    const prefixMatches: string[] = [];
    const substringMatches: string[] = [];

    for (let i = 0; i < this.uniqueCodes.length; i++) {
      const code = this.uniqueCodes[i];
      if (code.startsWith(cleanPrefix)) {
        prefixMatches.push(code);
        if (prefixMatches.length >= max) break;
      } else if (code.includes(cleanPrefix) && substringMatches.length < max) {
        substringMatches.push(code);
      }
    }

    results.push(...prefixMatches);
    if (results.length < max) {
      const needed = max - results.length;
      results.push(...substringMatches.slice(0, needed));
    }

    return results;
  }

  /**
   * Calculates Levenshtein edit distance for typo detection
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    if (m === 0) return n;
    if (n === 0) return m;

    let prevRow = new Array(n + 1);
    let currRow = new Array(n + 1);

    for (let j = 0; j <= n; j++) prevRow[j] = j;

    for (let i = 1; i <= m; i++) {
      currRow[0] = i;
      const char1 = s1.charCodeAt(i - 1);

      for (let j = 1; j <= n; j++) {
        const cost = char1 === s2.charCodeAt(j - 1) ? 0 : 1;
        currRow[j] = Math.min(
          currRow[j - 1] + 1, // insertion
          prevRow[j] + 1, // deletion
          prevRow[j - 1] + cost // substitution
        );
      }

      const temp = prevRow;
      prevRow = currRow;
      currRow = temp;
    }

    return prevRow[n];
  }

  /**
   * Smart fuzzy suggestions for typo correction
   */
  public getFuzzySuggestions(query: string, maxSuggestions: number = 3): string[] {
    if (!query || query.length < 2) return [];

    const candidates: { code: string; distance: number; score: number }[] = [];
    const maxAllowedDistance = query.length <= 4 ? 1 : query.length <= 7 ? 2 : 3;

    for (const code of this.uniqueCodes) {
      // If code starts with or ends with query
      if (code.startsWith(query) || code.includes(query)) {
        candidates.push({ code, distance: 0, score: 100 });
        continue;
      }

      // Skip distance calc if length diff is greater than max allowed distance
      if (Math.abs(code.length - query.length) > maxAllowedDistance) continue;

      const dist = this.levenshteinDistance(query, code);
      if (dist <= maxAllowedDistance) {
        candidates.push({ code, distance: dist, score: 100 - dist * 20 });
      }
    }

    candidates.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.code.localeCompare(b.code);
    });

    return candidates.slice(0, maxSuggestions).map((c) => c.code);
  }
}

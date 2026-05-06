/**
 * API Quota Manager — Military-grade YouTube API usage control
 *
 * YouTube Data API v3 quota: 10,000 units/day (resets at midnight Pacific)
 *
 * Cost per operation:
 *   search.list        = 100 units
 *   videos.list        = 1 unit
 *   channels.list      = 1 unit
 *   videoCategories    = 1 unit
 *
 * This module tracks every API call, enforces daily limits, and prevents
 * quota exhaustion through smart budgeting and priority-based allocation.
 */

// ── Quota Constants ──────────────────────────────────────────────────────────

const DAILY_QUOTA_LIMIT = 10000;
const QUOTA_KEY = 'sb_api_quota';
const QUOTA_RESET_KEY = 'sb_api_quota_reset';

const QUOTA_COST = {
  search: 100,
  videos: 1,
  channels: 1,
  categories: 1,
} as const;

export type ApiOperation = keyof typeof QUOTA_COST;

// ── Priority Levels ──────────────────────────────────────────────────────────
// Higher priority operations get budget first. If quota is low, only
// P0 (critical) operations proceed.

export type Priority = 'P0_CRITICAL' | 'P1_HIGH' | 'P2_STANDARD' | 'P3_LOW';

const PRIORITY_THRESHOLD = {
  P0_CRITICAL: 0,      // Always allowed (even at 0 quota remaining)
  P1_HIGH: 1000,       // Need at least 1,000 units remaining
  P2_STANDARD: 3000,   // Need at least 3,000 units remaining
  P3_LOW: 5000,        // Need at least 5,000 units remaining
} as const;

// ── Daily Budget Allocation ──────────────────────────────────────────────────
// How the 10,000 quota is divided per cycle (~10 min refresh cycle)

const BUDGET_ALLOCATION = {
  // 40% → Trusted channel fetches (highest quality, guaranteed results)
  trustedChannels: 0.40,
  // 25% → Category search queries (breadth coverage)
  categorySearch: 0.25,
  // 15% → Highlight-specific queries (user-requested)
  highlights: 0.15,
  // 10% → Video detail enrichment (stats, duration)
  enrichment: 0.10,
  // 10% → Emergency reserve (retries, fallback fetches)
  reserve: 0.10,
} as const;

// ── Quota State ─────────────────────────────────────────────────────────────

interface QuotaState {
  used: number;
  lastResetDate: string; // ISO date string YYYY-MM-DD (Pacific)
  operationLog: Array<{
    operation: ApiOperation;
    cost: number;
    timestamp: number;
    priority: Priority;
  }>;
}

function getTodayPacific(): string {
  // Get current date in Pacific timezone (YouTube quota resets at midnight PT)
  const now = new Date();
  const pacific = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return pacific.toISOString().split('T')[0];
}

function loadState(): QuotaState {
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    if (!raw) return createFreshState();
    const state: QuotaState = JSON.parse(raw);
    // Reset if new day
    if (state.lastResetDate !== getTodayPacific()) {
      return createFreshState();
    }
    return state;
  } catch {
    return createFreshState();
  }
}

function createFreshState(): QuotaState {
  return {
    used: 0,
    lastResetDate: getTodayPacific(),
    operationLog: [],
  };
}

function saveState(state: QuotaState): void {
  try {
    // Only keep last 50 log entries to prevent localStorage bloat
    const trimmedLog = state.operationLog.slice(-50);
    localStorage.setItem(QUOTA_KEY, JSON.stringify({ ...state, operationLog: trimmedLog }));
  } catch {
    // localStorage full — clear old log and retry
    state.operationLog = state.operationLog.slice(-10);
    try {
      localStorage.setItem(QUOTA_KEY, JSON.stringify(state));
    } catch {
      // Give up silently — quota tracking is best-effort
    }
  }
}

// ── Core API ─────────────────────────────────────────────────────────────────

export class ApiQuotaManager {
  private state: QuotaState;

  constructor() {
    this.state = loadState();
  }

  /** Check how much quota remains today */
  get remaining(): number {
    return Math.max(0, DAILY_QUOTA_LIMIT - this.state.used);
  }

  /** Check how much quota has been used today */
  get used(): number {
    return this.state.used;
  }

  /** Percentage of daily quota used (0-100) */
  get usagePercent(): number {
    return Math.round((this.state.used / DAILY_QUOTA_LIMIT) * 100);
  }

  /** Whether we're in quota conservation mode (>80% used) */
  get isConservationMode(): boolean {
    return this.usagePercent >= 80;
  }

  /** Whether quota is completely exhausted */
  get isExhausted(): boolean {
    return this.remaining <= 0;
  }

  /**
   * Request permission to make an API call.
   * Returns true if the operation should proceed, false if it should be skipped.
   *
   * @param operation - Type of API call
   * @param priority - Priority level (P0 always allowed)
   */
  canProceed(operation: ApiOperation, priority: Priority = 'P2_STANDARD'): boolean {
    const cost = QUOTA_COST[operation];
    const threshold = PRIORITY_THRESHOLD[priority];

    // P0 operations always proceed (unless truly exhausted and we risk hard cap)
    if (priority === 'P0_CRITICAL') {
      return this.remaining >= cost || cost <= 1;
    }

    // In conservation mode, only P0 and P1 proceed
    if (this.isConservationMode && priority !== 'P0_CRITICAL' && priority !== 'P1_HIGH') {
      return false;
    }

    // Check remaining against priority threshold
    if (this.remaining < threshold + cost) {
      return false;
    }

    return true;
  }

  /**
   * Record that an API call was made.
   * Call this AFTER the API request completes (success or failure).
   */
  recordUsage(operation: ApiOperation, priority: Priority = 'P2_STANDARD'): void {
    const cost = QUOTA_COST[operation];
    this.state.used += cost;
    this.state.operationLog.push({
      operation,
      cost,
      timestamp: Date.now(),
      priority,
    });
    saveState(this.state);
  }

  /**
   * Get budget allocation for a specific category.
   * Returns how many units are available for that category.
   */
  getBudgetFor(category: keyof typeof BUDGET_ALLOCATION): number {
    const allocation = BUDGET_ALLOCATION[category] * DAILY_QUOTA_LIMIT;
    const alreadyUsed = this.state.operationLog.reduce((sum, entry) => {
      // Rough attribution based on operation type
      if (category === 'trustedChannels' && entry.operation === 'search') return sum + entry.cost;
      if (category === 'categorySearch' && entry.operation === 'search') return sum + entry.cost;
      if (category === 'highlights' && entry.operation === 'search') return sum + entry.cost;
      if (category === 'enrichment' && entry.operation === 'videos') return sum + entry.cost;
      return sum;
    }, 0);

    return Math.max(0, Math.floor(allocation - alreadyUsed));
  }

  /** Reset quota tracking (for testing or manual override) */
  reset(): void {
    this.state = createFreshState();
    saveState(this.state);
  }

  /** Get a summary of today's usage for logging/debugging */
  getSummary(): {
    used: number;
    remaining: number;
    percent: number;
    conservationMode: boolean;
    operationCounts: Record<ApiOperation, number>;
  } {
    const operationCounts = {} as Record<ApiOperation, number>;
    for (const op of Object.keys(QUOTA_COST) as ApiOperation[]) {
      operationCounts[op] = this.state.operationLog
        .filter(e => e.operation === op)
        .reduce((sum, e) => sum + 1, 0);
    }

    return {
      used: this.state.used,
      remaining: this.remaining,
      percent: this.usagePercent,
      conservationMode: this.isConservationMode,
      operationCounts,
    };
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const quotaManager = new ApiQuotaManager();

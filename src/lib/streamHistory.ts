/**
 * Stream History utilities for tracking daily plays per track/album
 */

export interface StreamHistoryEntry {
  total: number; // cumulative streams up to this date
  daily: number | null; // new streams added on this date
}

export interface StreamHistory {
  [date: string]: StreamHistoryEntry;
}

/**
 * Get today's date in YYYY-MM-DD format (GMT)
 */
export function getTodayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Add or update a stream history entry for a specific date
 */
export function addStreamHistoryEntry(
  currentHistory: StreamHistory | undefined,
  dateStr: string,
  totalStreams: number,
  previousTotalStreams: number = 0
): StreamHistory {
  if (!currentHistory) {
    currentHistory = {};
  }

  // Calculate daily gain (new streams on this date)
  let dailyStreams = 0;

  // If there's a previous entry, calculate based on difference
  if (Object.keys(currentHistory).length > 0) {
    // Get the most recent previous entry
    const sortedDates = Object.keys(currentHistory).sort();
    const lastDate = sortedDates[sortedDates.length - 1];
    const lastEntry = currentHistory[lastDate];

    if (lastEntry && dateStr > lastDate) {
      dailyStreams = Math.max(0, totalStreams - lastEntry.total);
    } else if (dateStr === lastDate) {
      // Same day update
      dailyStreams = lastEntry.daily || 0;
    }
  } else {
    // First entry
    dailyStreams = totalStreams - previousTotalStreams;
  }

  return {
    ...currentHistory,
    [dateStr]: {
      total: totalStreams,
      daily: dailyStreams > 0 ? dailyStreams : null
    }
  };
}

/**
 * Get the daily gain for a specific date
 */
export function getDailyStreamsForDate(
  history: StreamHistory | undefined,
  dateStr: string
): number {
  if (!history || !history[dateStr]) {
    return 0;
  }
  return history[dateStr].daily || 0;
}

/**
 * Get total streams from history
 */
export function getTotalStreamsFromHistory(
  history: StreamHistory | undefined
): number {
  if (!history) {
    return 0;
  }

  const sortedDates = Object.keys(history).sort();
  if (sortedDates.length === 0) {
    return 0;
  }

  const lastDate = sortedDates[sortedDates.length - 1];
  return history[lastDate]?.total || 0;
}

/**
 * Get last N days of history
 */
export function getRecentHistory(
  history: StreamHistory | undefined,
  days: number = 7
): StreamHistory {
  if (!history) {
    return {};
  }

  const sortedDates = Object.keys(history).sort().reverse().slice(0, days);
  const recent: StreamHistory = {};

  sortedDates.forEach(date => {
    recent[date] = history[date];
  });

  return recent;
}

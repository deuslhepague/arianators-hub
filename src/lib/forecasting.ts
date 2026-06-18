/**
 * Advanced Forecasting Utilities for Spotify Track Streams
 */

export interface StreamHistoryEntry {
  total: number;
  daily: number | null;
}

export interface ForecastResult {
  daysToGoal: number | null;
  dailyVelocity: number;
}

/**
 * Calculates the forecasted daily pace and estimated days to reach a target stream count.
 * Discards the oldest history entry to ignore the high initial import stream spike.
 *
 * - < 7 days: Linear projection (simple average)
 * - 7 to 30 days: Weighted Moving Average (recent days weighted higher)
 * - 31 to 90 days: Weighted Base Pace + Weekly Seasonality
 * - > 90 days: Holt-Winters Multiplicative/Additive Triple Exponential Smoothing
 */
export function calculateForecast(
  streamsMap: Record<string, StreamHistoryEntry> | undefined,
  currentTotal: number,
  targetStreams: number,
  fallbackDailyGain: number = 0
): ForecastResult {
  const remaining = targetStreams - currentTotal;
  if (remaining <= 0) {
    return { daysToGoal: 0, dailyVelocity: fallbackDailyGain };
  }

  if (!streamsMap || Object.keys(streamsMap).length === 0) {
    const rawDays = fallbackDailyGain > 0 ? Math.ceil(remaining / fallbackDailyGain) : null;
    return {
      daysToGoal: (rawDays !== null && rawDays <= 1825) ? rawDays : null,
      dailyVelocity: fallbackDailyGain
    };
  }

  // 1. Sort history chronologically
  const sortedDates = Object.keys(streamsMap).sort();
  
  // Extract and clean daily values by reconstructing them from cumulative total streams
  const dailyValues: { date: string; daily: number; dayOfWeek: number }[] = [];
  if (sortedDates.length > 1) {
    let lastValidDateStr = sortedDates[0];
    let lastValidTotal = streamsMap[lastValidDateStr]?.total ?? 0;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const currDateStr = sortedDates[i];
      const currTotal = streamsMap[currDateStr]?.total ?? 0;
      
      if (currTotal > lastValidTotal) {
        const diffStreams = currTotal - lastValidTotal;
        const prevDate = new Date(lastValidDateStr + "T00:00:00");
        const currDate = new Date(currDateStr + "T00:00:00");
        const diffTime = currDate.getTime() - prevDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          const avgDaily = diffStreams / diffDays;
          if (avgDaily > 0 && avgDaily < 100_000_000) {
            // Fill in the timeline to maintain correct seasonality and density
            for (let d = 1; d <= diffDays; d++) {
              const targetDate = new Date(prevDate.getTime() + d * 24 * 60 * 60 * 1000);
              const targetDateStr = targetDate.toISOString().split('T')[0];
              dailyValues.push({
                date: targetDateStr,
                daily: avgDaily,
                dayOfWeek: targetDate.getDay()
              });
            }
          }
        }
        
        lastValidDateStr = currDateStr;
        lastValidTotal = currTotal;
      }
    }
  }

  const n = dailyValues.length;

  // Fallback if we don't have enough cleaned historical data points
  if (n === 0) {
    const rawDays = fallbackDailyGain > 0 ? Math.ceil(remaining / fallbackDailyGain) : null;
    return {
      daysToGoal: (rawDays !== null && rawDays <= 1825) ? rawDays : null,
      dailyVelocity: fallbackDailyGain
    };
  }

  // CASE 1: Less than 7 days of history -> Linear projection
  if (n < 7) {
    const sum = dailyValues.reduce((acc, curr) => acc + curr.daily, 0);
    const avg = sum / n;
    const velocity = Math.round(avg);
    const rawDays = velocity > 0 ? Math.ceil(remaining / velocity) : null;
    return {
      daysToGoal: (rawDays !== null && rawDays <= 1825) ? rawDays : null,
      dailyVelocity: velocity
    };
  }

  // CASE 2: 7 to 30 days of history -> Weighted Moving Average (WMA)
  if (n <= 30) {
    let weightedSum = 0;
    let weightSum = 0;
    for (let i = 0; i < n; i++) {
      const weight = i + 1; // higher weight for more recent dates
      weightedSum += dailyValues[i].daily * weight;
      weightSum += weight;
    }
    const velocity = Math.round(weightedSum / weightSum);
    const rawDays = velocity > 0 ? Math.ceil(remaining / velocity) : null;
    return {
      daysToGoal: (rawDays !== null && rawDays <= 1825) ? rawDays : null,
      dailyVelocity: velocity
    };
  }

  // CASE 3: 31 to 90 days of history -> WMA Base Pace + Weekly Seasonality
  if (n <= 90) {
    // 1. Calculate overall WMA base pace (using last 30 days)
    const recentValues = dailyValues.slice(-30);
    const m = recentValues.length;
    let weightedSum = 0;
    let weightSum = 0;
    for (let i = 0; i < m; i++) {
      const weight = i + 1;
      weightedSum += recentValues[i].daily * weight;
      weightSum += weight;
    }
    const basePace = weightedSum / weightSum;

    // 2. Calculate seasonal index for each day of the week (0-6)
    const dowSum: Record<number, number> = {};
    const dowCount: Record<number, number> = {};
    for (let i = 0; i < 7; i++) {
      dowSum[i] = 0;
      dowCount[i] = 0;
    }

    dailyValues.forEach(val => {
      dowSum[val.dayOfWeek] += val.daily;
      dowCount[val.dayOfWeek] += 1;
    });

    const dowAverage: Record<number, number> = {};
    let overallSum = 0;
    let overallCount = 0;

    for (let i = 0; i < 7; i++) {
      if (dowCount[i] > 0) {
        dowAverage[i] = dowSum[i] / dowCount[i];
        overallSum += dowAverage[i];
        overallCount++;
      } else {
        dowAverage[i] = basePace;
      }
    }
    const overallAvg = overallCount > 0 ? overallSum / overallCount : basePace;

    const seasonalIndices: Record<number, number> = {};
    for (let i = 0; i < 7; i++) {
      seasonalIndices[i] = overallAvg > 0 ? dowAverage[i] / overallAvg : 1.0;
    }

    // 3. Project day-by-day
    let accumulatedStreams = 0;
    let days = 0;
    const startDay = new Date();
    
    // Safety cap at 1825 days (5 years)
    while (accumulatedStreams < remaining && days < 1825) {
      days++;
      const currentProjDate = new Date();
      currentProjDate.setDate(startDay.getDate() + days);
      const dow = currentProjDate.getDay();
      const factor = seasonalIndices[dow] ?? 1.0;
      accumulatedStreams += basePace * factor;
    }

    return {
      daysToGoal: days < 1825 ? days : null,
      dailyVelocity: Math.round(basePace)
    };
  }

  // CASE 4: > 90 days of history -> Holt-Winters additive triple exponential smoothing
  try {
    const period = 7; // Weekly seasonality
    const alpha = 0.2; // Level smoothing factor
    const beta = 0.1;  // Trend smoothing factor
    const gamma = 0.3; // Seasonal smoothing factor

    // Values array
    const Y = dailyValues.map(v => v.daily);

    // Initial level
    let level = 0;
    for (let i = 0; i < period; i++) {
      level += Y[i];
    }
    level /= period;

    // Initial trend
    let trend = 0;
    for (let i = 0; i < period; i++) {
      trend += (Y[period + i] - Y[i]) / period;
    }
    trend /= period;

    // Initial seasonal indices
    const seasonal: number[] = [];
    for (let i = 0; i < period; i++) {
      seasonal.push(Y[i] - level);
    }

    // Run Holt-Winters smoothing
    for (let t = period; t < n; t++) {
      const obs = Y[t];
      const prevLevel = level;
      const prevTrend = trend;
      const seasonalIndex = t % period;
      const prevSeasonal = seasonal[seasonalIndex];

      // Update level, trend, and seasonality
      level = alpha * (obs - prevSeasonal) + (1 - alpha) * (prevLevel + prevTrend);
      trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
      seasonal[seasonalIndex] = gamma * (obs - level) + (1 - gamma) * prevSeasonal;
    }

    // Project forward with Damped Trend to prevent inflation
    let accumulatedStreams = 0;
    let days = 0;
    const phi = 0.85; // Strong damping factor to prevent runaway projections from peaks/tours
    let dampedTrend = trend;
    let currentLevel = level;
    
    // Safety cap at 1825 days (5 years)
    while (accumulatedStreams < remaining && days < 1825) {
      days++;
      const seasonalIndex = (n + days - 1) % period;
      dampedTrend = dampedTrend * phi;
      currentLevel = currentLevel + dampedTrend;
      const projectedValue = Math.max(1, currentLevel + seasonal[seasonalIndex]);
      accumulatedStreams += projectedValue;
    }

    const currentVelocity = Math.max(1, Math.round(level + trend));

    return {
      daysToGoal: days < 1825 ? days : null,
      dailyVelocity: currentVelocity
    };
  } catch (error) {
    // Fallback if Holt-Winters fails
    const sum = dailyValues.slice(-30).reduce((acc, curr) => acc + curr.daily, 0);
    const avg = sum / Math.min(30, n);
    const velocity = Math.round(avg);
    const rawDays = velocity > 0 ? Math.ceil(remaining / velocity) : null;
    return {
      daysToGoal: (rawDays !== null && rawDays <= 1825) ? rawDays : null,
      dailyVelocity: velocity
    };
  }
}

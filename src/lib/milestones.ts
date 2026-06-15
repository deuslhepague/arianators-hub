const MILESTONE_TARGETS = [
  100_000,
  500_000,
  1_000_000,
  5_000_000,
  10_000_000,
  20_000_000,
  50_000_000,
  100_000_000,
  150_000_000,
  200_000_000,
  250_000_000,
  300_000_000,
  400_000_000,
  500_000_000,
  600_000_000,
  700_000_000,
  750_000_000,
  800_000_000,
  900_000_000,
  1_000_000_000,
  1_250_000_000,
  1_500_000_000,
  2_000_000_000,
  2_500_000_000,
  3_000_000_000,
  4_000_000_000,
  5_000_000_000,
] as const;

const MILESTONE_LABELS: Record<number, string> = {
  100_000: "100 Thousand Streams",
  500_000: "500 Thousand Streams",
  1_000_000: "1 Million Streams",
  5_000_000: "5 Million Streams",
  10_000_000: "10 Million Streams",
  20_000_000: "20 Million Streams",
  50_000_000: "50 Million Streams",
  100_000_000: "100 Million Streams",
  150_000_000: "150 Million Streams",
  200_000_000: "200 Million Streams",
  250_000_000: "250 Million Streams",
  300_000_000: "300 Million Streams",
  400_000_000: "400 Million Streams",
  500_000_000: "500 Million Streams",
  600_000_000: "600 Million Streams",
  700_000_000: "700 Million Streams",
  750_000_000: "750 Million Streams",
  800_000_000: "800 Million Streams",
  900_000_000: "900 Million Streams",
  1_000_000_000: "1 Billion Streams",
  1_250_000_000: "1.25 Billion Streams",
  1_500_000_000: "1.5 Billion Streams",
  2_000_000_000: "2 Billion Streams",
  2_500_000_000: "2.5 Billion Streams",
  3_000_000_000: "3 Billion Streams",
  4_000_000_000: "4 Billion Streams",
  5_000_000_000: "5 Billion Streams",
};

export interface Milestone {
  milestoneName: string;
  milestoneTarget: number;
}

export function getMilestoneForStreams(streams: number): Milestone {
  const safeStreams = Math.max(0, Math.floor(streams || 0));

  for (const target of MILESTONE_TARGETS) {
    if (safeStreams < target) {
      return {
        milestoneName: MILESTONE_LABELS[target],
        milestoneTarget: target,
      };
    }
  }

  const nextBillion = Math.ceil(safeStreams / 1_000_000_000) * 1_000_000_000;
  const billions = nextBillion / 1_000_000_000;

  return {
    milestoneName: `${Number.isInteger(billions) ? billions : billions.toFixed(2)} Billion Streams`,
    milestoneTarget: nextBillion,
  };
}

export function getMilestoneProgressPercent(totalStreams: number, milestoneTarget: number): number {
  if (!Number.isFinite(milestoneTarget) || milestoneTarget <= 0) {
    return 0;
  }

  return Math.min((Math.max(0, totalStreams) / milestoneTarget) * 100, 100);
}

export function getDaysToMilestone(
  totalStreams: number,
  milestoneTarget: number,
  dailyPace: number
): number | null {
  const remaining = milestoneTarget - totalStreams;
  if (remaining <= 0) return 0;
  if (!Number.isFinite(dailyPace) || dailyPace <= 0) return null;

  return Math.ceil(remaining / dailyPace);
}

export function getStreamsRemaining(totalStreams: number, milestoneTarget: number): number {
  return Math.max(0, milestoneTarget - totalStreams);
}

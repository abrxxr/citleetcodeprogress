import { WeeklyEntry } from "@/hooks/useWeeklyEntries";

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earned: boolean;
}

export function computeBadges(entries: WeeklyEntry[], isTopPerformer = false): Badge[] {
  const contestStar = entries.some((e) => e.problems_solved_contest === 4);

  // On Fire: 3+ consecutive weeks with 3+ solved
  let onFire = false;
  let streak = 0;
  const sorted = [...entries].sort((a, b) => a.week_number - b.week_number);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].problems_solved_contest >= 3) {
      streak++;
      if (streak >= 3) { onFire = true; break; }
    } else {
      streak = 0;
    }
  }

  // Consistency King: 4+ consecutive weeks submitted
  let consistencyKing = false;
  let consStreak = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].week_number === sorted[i - 1].week_number + 1) {
      consStreak++;
      if (consStreak >= 4) { consistencyKing = true; break; }
    } else {
      consStreak = 1;
    }
  }

  return [
    { id: "contest_star", name: "Contest Star", emoji: "🌟", description: "Solved 4/4 in a contest", earned: contestStar },
    { id: "on_fire", name: "On Fire", emoji: "🔥", description: "3+ weeks in a row with 3+ solved", earned: onFire },
    { id: "consistency_king", name: "Consistency King", emoji: "💎", description: "4+ consecutive weeks submitted", earned: consistencyKing },
    { id: "top_performer", name: "Top Performer", emoji: "🏆", description: "Ranked #1 on leaderboard", earned: isTopPerformer },
  ];
}

export function getMotivationalMessage(avgSolved: number): string {
  if (avgSolved >= 3.5) return "🔥 You're absolutely crushing it! Keep that momentum going!";
  if (avgSolved >= 2.5) return "💪 Great progress! You're getting stronger every week.";
  if (avgSolved >= 1.5) return "📈 You're improving! Stay consistent and results will follow.";
  if (avgSolved >= 0.5) return "🌱 Every problem solved is a step forward. Keep practicing!";
  return "🚀 Start your journey! Submit your first contest entry.";
}

export function getPerformanceTrend(entries: WeeklyEntry[]): "improving" | "stable" | "declining" {
  if (entries.length < 3) return "stable";
  const sorted = [...entries].sort((a, b) => a.week_number - b.week_number);
  const recent = sorted.slice(-3);
  const diff = recent[2].problems_solved_contest - recent[0].problems_solved_contest;
  if (diff > 0) return "improving";
  if (diff < 0) return "declining";
  return "stable";
}

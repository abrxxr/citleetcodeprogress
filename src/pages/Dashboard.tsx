import { useAuth } from "@/contexts/AuthContext";
import { useWeeklyEntries } from "@/hooks/useWeeklyEntries";
import { computeBadges, getMotivationalMessage, getPerformanceTrend } from "@/lib/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, Minus, Target, Flame, Star, Calendar } from "lucide-react";

export default function Dashboard() {
  const { profile } = useAuth();
  const { data: entries = [], isLoading } = useWeeklyEntries();

  const totalSolved = entries.reduce((s, e) => s + e.problems_solved_contest + e.practice_problems_solved, 0);
  const contestAvg = entries.length ? (entries.reduce((s, e) => s + e.problems_solved_contest, 0) / entries.length).toFixed(1) : "0";
  const bestWeek = entries.length ? Math.max(...entries.map((e) => e.problems_solved_contest)) : 0;

  // Current streak
  const sorted = [...entries].sort((a, b) => b.week_number - a.week_number);
  let currentStreak = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || sorted[i].week_number === sorted[i - 1].week_number - 1) {
      if (sorted[i].problems_solved_contest > 0) currentStreak++;
      else break;
    } else break;
  }

  const avgSolved = entries.length ? entries.reduce((s, e) => s + e.problems_solved_contest, 0) / entries.length : 0;
  const trend = getPerformanceTrend(entries);
  const badges = computeBadges(entries);
  const message = getMotivationalMessage(avgSolved);

  const chartData = [...entries]
    .sort((a, b) => a.week_number - b.week_number)
    .map((e) => ({
      week: `W${e.week_number}`,
      contest: e.problems_solved_contest,
      practice: e.practice_problems_solved,
      total: e.problems_solved_contest + e.practice_problems_solved,
    }));

  const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;
  const trendColor = trend === "improving" ? "text-primary" : trend === "declining" ? "text-destructive" : "text-muted-foreground";

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {profile?.name || "Student"}!</h1>
        <p className="text-muted-foreground text-sm mt-1">{message}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Target className="h-3.5 w-3.5" /> Total Solved
            </div>
            <p className="text-2xl font-bold">{totalSolved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Star className="h-3.5 w-3.5" /> Contest Avg
            </div>
            <p className="text-2xl font-bold">{contestAvg}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Flame className="h-3.5 w-3.5" /> Best Week
            </div>
            <p className="text-2xl font-bold">{bestWeek}/4</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Calendar className="h-3.5 w-3.5" /> Streak
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{currentStreak}</p>
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <Badge key={b.id} variant={b.earned ? "default" : "outline"} className={`text-sm py-1.5 px-3 ${!b.earned ? "opacity-40" : ""}`}>
                {b.emoji} {b.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Weekly Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--card-foreground))" }} />
                <Bar dataKey="contest" name="Contest" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="practice" name="Practice" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Entries table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Weekly Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No entries yet. Submit your first week!</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead>Contest</TableHead>
                    <TableHead>Solved</TableHead>
                    <TableHead>Practice</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...entries].sort((a, b) => b.week_number - a.week_number).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono">W{e.week_number}</TableCell>
                      <TableCell>{e.contest_name || "—"}</TableCell>
                      <TableCell>{e.problems_solved_contest}/4</TableCell>
                      <TableCell>{e.practice_problems_solved}</TableCell>
                      <TableCell className="font-semibold">{e.problems_solved_contest + e.practice_problems_solved}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

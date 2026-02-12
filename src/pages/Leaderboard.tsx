import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { Trophy, Medal, Award, Search } from "lucide-react";
import { computeBadges } from "@/lib/badges";

interface LeaderboardEntry {
  user_id: string;
  name: string;
  register_number: string;
  total_solved: number;
  contest_avg: number;
  entries_count: number;
  badges: ReturnType<typeof computeBadges>;
}

export default function Leaderboard() {
  const [search, setSearch] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, register_number");
      const { data: allEntries } = await supabase.from("weekly_entries").select("*");
      if (!profiles || !allEntries) return [];

      const result: LeaderboardEntry[] = profiles.map((p) => {
        const userEntries = allEntries.filter((e) => e.user_id === p.user_id);
        const totalSolved = userEntries.reduce((s, e) => s + e.problems_solved_contest + e.practice_problems_solved, 0);
        const contestAvg = userEntries.length ? userEntries.reduce((s, e) => s + e.problems_solved_contest, 0) / userEntries.length : 0;
        return {
          user_id: p.user_id,
          name: p.name,
          register_number: p.register_number,
          total_solved: totalSolved,
          contest_avg: Math.round(contestAvg * 100) / 100,
          entries_count: userEntries.length,
          badges: computeBadges(userEntries as any),
        };
      });

      result.sort((a, b) => b.total_solved - a.total_solved);
      // Mark top performer
      if (result.length > 0) {
        result[0].badges = computeBadges(allEntries.filter((e) => e.user_id === result[0].user_id) as any, true);
      }
      return result;
    },
  });

  const { data: comparisonData = [] } = useQuery({
    queryKey: ["comparison", compareIds],
    queryFn: async () => {
      if (compareIds.length < 2) return [];
      const { data } = await supabase.from("weekly_entries").select("*").in("user_id", compareIds).order("week_number");
      if (!data) return [];

      const weeks = [...new Set(data.map((e) => e.week_number))].sort((a, b) => a - b);
      return weeks.map((w) => {
        const row: any = { week: `W${w}` };
        compareIds.forEach((id) => {
          const entry = data.find((e) => e.user_id === id && e.week_number === w);
          const profile = leaderboard.find((l) => l.user_id === id);
          row[profile?.name || id] = entry ? entry.problems_solved_contest : 0;
        });
        return row;
      });
    },
    enabled: compareIds.length >= 2 && showCompare,
  });

  const filtered = leaderboard.filter(
    (l) => l.name.toLowerCase().includes(search.toLowerCase()) || l.register_number.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const rankIcon = (i: number) => {
    if (i === 0) return <Trophy className="h-4 w-4 text-accent" />;
    if (i === 1) return <Medal className="h-4 w-4 text-muted-foreground" />;
    if (i === 2) return <Award className="h-4 w-4 text-accent" />;
    return <span className="text-xs text-muted-foreground">#{i + 1}</span>;
  };

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or reg no." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Tabs defaultValue="total">
        <TabsList>
          <TabsTrigger value="total">Total Solved</TabsTrigger>
          <TabsTrigger value="average">Contest Average</TabsTrigger>
        </TabsList>

        <TabsContent value="total">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">⚡</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Reg No.</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Badges</TableHead>
                    <TableHead className="w-10">Compare</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l, i) => (
                    <TableRow key={l.user_id} className={i < 3 ? "bg-primary/5" : ""}>
                      <TableCell>{rankIcon(leaderboard.indexOf(l))}</TableCell>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="font-mono text-xs">{l.register_number}</TableCell>
                      <TableCell className="font-bold">{l.total_solved}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {l.badges.filter((b) => b.earned).map((b) => (
                            <span key={b.id} title={b.name}>{b.emoji}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Checkbox checked={compareIds.includes(l.user_id)} onCheckedChange={() => toggleCompare(l.user_id)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="average">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">⚡</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Reg No.</TableHead>
                    <TableHead>Avg</TableHead>
                    <TableHead>Entries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filtered].sort((a, b) => b.contest_avg - a.contest_avg).map((l, i) => (
                    <TableRow key={l.user_id} className={i < 3 ? "bg-primary/5" : ""}>
                      <TableCell>{rankIcon(i)}</TableCell>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="font-mono text-xs">{l.register_number}</TableCell>
                      <TableCell className="font-bold">{l.contest_avg}</TableCell>
                      <TableCell>{l.entries_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Comparison */}
      {compareIds.length >= 2 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Student Comparison</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowCompare(!showCompare)}>
              {showCompare ? "Hide Chart" : "Compare"}
            </Button>
          </CardHeader>
          {showCompare && comparisonData.length > 0 && (
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--card-foreground))" }} />
                  <Legend />
                  {compareIds.map((id, idx) => {
                    const profile = leaderboard.find((l) => l.user_id === id);
                    return <Line key={id} type="monotone" dataKey={profile?.name || id} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} />;
                  })}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

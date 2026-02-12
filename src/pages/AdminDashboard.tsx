import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, Check, X, Eye } from "lucide-react";

export default function AdminDashboard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const { data: students = [] } = useQuery({
    queryKey: ["admin_students"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: entries } = await supabase.from("weekly_entries").select("*");
      if (!profiles || !entries) return [];
      return profiles.map((p) => {
        const userEntries = entries.filter((e) => e.user_id === p.user_id);
        const total = userEntries.reduce((s, e) => s + e.problems_solved_contest + e.practice_problems_solved, 0);
        return { ...p, total_solved: total, entries_count: userEntries.length, entries: userEntries };
      });
    },
  });

  const { data: adminRequests = [] } = useQuery({
    queryKey: ["admin_requests"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_requests").select("*, profiles!admin_requests_user_id_fkey(name, register_number)").eq("status", "pending");
      return data || [];
    },
  });

  const handleRequest = useMutation({
    mutationFn: async ({ id, userId, action }: { id: string; userId: string; action: "approved" | "denied" }) => {
      await supabase.from("admin_requests").update({ status: action }).eq("id", id);
      if (action === "approved") {
        await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" as any }, { onConflict: "user_id,role" });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_requests"] });
      toast({ title: "Request processed" });
    },
  });

  const exportCSV = () => {
    const rows = [["Name", "Register Number", "Email", "Total Solved", "Entries"]];
    students.forEach((s) => rows.push([s.name, s.register_number, s.email, String(s.total_solved), String(s.entries_count)]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_data.csv";
    a.click();
  };

  const filtered = students.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.register_number.toLowerCase().includes(search.toLowerCase())
  );

  const selectedStudentData = students.find((s) => s.user_id === selectedStudent);
  const selectedChartData = selectedStudentData?.entries
    ?.sort((a: any, b: any) => a.week_number - b.week_number)
    .map((e: any) => ({ week: `W${e.week_number}`, contest: e.problems_solved_contest, practice: e.practice_problems_solved })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="requests">
            Requests {adminRequests.length > 0 && <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">{adminRequests.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Reg No.</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Entries</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.user_id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="font-mono text-xs">{s.register_number}</TableCell>
                      <TableCell className="font-bold">{s.total_solved}</TableCell>
                      <TableCell>{s.entries_count}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedStudent(s.user_id)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardContent className="pt-4">
              {adminRequests.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No pending requests.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Reg No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminRequests.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.profiles?.name}</TableCell>
                        <TableCell className="font-mono text-xs">{r.profiles?.register_number}</TableCell>
                        <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleRequest.mutate({ id: r.id, userId: r.user_id, action: "approved" })}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRequest.mutate({ id: r.id, userId: r.user_id, action: "denied" })}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Student detail dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedStudentData?.name} — Weekly Performance</DialogTitle>
          </DialogHeader>
          {selectedChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={selectedChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--card-foreground))" }} />
                <Bar dataKey="contest" name="Contest" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="practice" name="Practice" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No entries for this student.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

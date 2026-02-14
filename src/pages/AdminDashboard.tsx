import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, Download, Check, X, Eye, KeyRound, Users, AlertTriangle, 
  CheckCircle2, Shield, UserCog, ClipboardList, BarChart3, Mail, Hash
} from "lucide-react";

export default function AdminDashboard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [weekFilter, setWeekFilter] = useState<string>("latest");
  const [resetDialog, setResetDialog] = useState<{ userId: string; name: string; regNo: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [detailDialog, setDetailDialog] = useState<any | null>(null);

  const { data: students = [] } = useQuery({
    queryKey: ["admin_students"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: entries } = await supabase.from("weekly_entries").select("*");
      const { data: allowed } = await supabase.from("allowed_students").select("register_number, section");
      if (!profiles || !entries) return [];
      return profiles.map((p) => {
        const userEntries = entries.filter((e) => e.user_id === p.user_id);
        const total = userEntries.reduce((s, e) => s + e.problems_solved_contest + e.practice_problems_solved, 0);
        const section = allowed?.find((a) => a.register_number === p.register_number)?.section || "A";
        return { ...p, total_solved: total, entries_count: userEntries.length, entries: userEntries, section };
      });
    },
  });

  const { data: allAllowed = [] } = useQuery({
    queryKey: ["admin_allowed"],
    queryFn: async () => {
      const { data } = await supabase.from("allowed_students").select("*");
      return data || [];
    },
  });

  const { data: adminRequests = [] } = useQuery({
    queryKey: ["admin_requests"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_requests").select("*").eq("status", "pending");
      return data || [];
    },
  });

  const allWeeks = useMemo(() => {
    const weeks = new Set<number>();
    students.forEach((s) => s.entries.forEach((e: any) => weeks.add(e.week_number)));
    return [...weeks].sort((a, b) => b - a);
  }, [students]);

  const latestWeek = allWeeks[0] || 1;
  const currentWeek = weekFilter === "latest" ? latestWeek : parseInt(weekFilter);

  const registeredRegNums = new Set(students.map((s) => s.register_number));
  const unregistered = allAllowed.filter((a) => !registeredRegNums.has(a.register_number));

  const submissionStatus = useMemo(() => {
    const submitted: typeof students = [];
    const notSubmitted: typeof students = [];
    students.forEach((s) => {
      const hasEntry = s.entries.some((e: any) => e.week_number === currentWeek);
      if (hasEntry) submitted.push(s);
      else notSubmitted.push(s);
    });
    return { submitted, notSubmitted };
  }, [students, currentWeek]);

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

  const resetPassword = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ userId, newPassword: password }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to reset password");
      return result;
    },
    onSuccess: () => {
      toast({ title: "Password reset successfully" });
      setResetDialog(null);
      setNewPassword("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const exportCSV = () => {
    const rows = [["Name", "Register Number", "Section", "Email", "Total Solved", "Entries"]];
    students.forEach((s) => rows.push([s.name, s.register_number, s.section, s.email, String(s.total_solved), String(s.entries_count)]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_data.csv";
    a.click();
  };

  const filterBySection = (list: any[]) => {
    if (sectionFilter === "all") return list;
    return list.filter((s) => s.section === sectionFilter);
  };

  const filtered = filterBySection(students).filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.register_number.toLowerCase().includes(search.toLowerCase())
  );

  const selectedStudentData = students.find((s) => s.user_id === selectedStudent);
  const selectedChartData = selectedStudentData?.entries
    ?.sort((a: any, b: any) => a.week_number - b.week_number)
    .map((e: any) => ({ week: `W${e.week_number}`, contest: e.problems_solved_contest, practice: e.practice_problems_solved })) || [];

  // Section-wise stats
  const sectionStats = useMemo(() => {
    const sections: Record<string, { total: number; count: number; submitted: number }> = {};
    students.forEach((s) => {
      if (!sections[s.section]) sections[s.section] = { total: 0, count: 0, submitted: 0 };
      sections[s.section].total += s.total_solved;
      sections[s.section].count += 1;
      if (s.entries.some((e: any) => e.week_number === currentWeek)) sections[s.section].submitted += 1;
    });
    return sections;
  }, [students, currentWeek]);

  return (
    <div className="space-y-6">
      {/* Admin header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Control Panel</h1>
            <p className="text-sm text-muted-foreground">Manage students, passwords, and submissions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Section" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              <SelectItem value="A">Section A</SelectItem>
              <SelectItem value="B">Section B</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-primary text-xs mb-1"><Users className="h-3.5 w-3.5" /> Total Registered</div>
            <p className="text-2xl font-bold">{students.length}<span className="text-sm font-normal text-muted-foreground">/{allAllowed.length}</span></p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs mb-1"><CheckCircle2 className="h-3.5 w-3.5" /> W{currentWeek} Submitted</div>
            <p className="text-2xl font-bold">{submissionStatus.submitted.length}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-destructive text-xs mb-1"><AlertTriangle className="h-3.5 w-3.5" /> W{currentWeek} Pending</div>
            <p className="text-2xl font-bold">{submissionStatus.notSubmitted.length}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs mb-1"><UserCog className="h-3.5 w-3.5" /> Not Registered</div>
            <p className="text-2xl font-bold">{unregistered.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Section breakdown */}
      {Object.keys(sectionStats).length > 0 && sectionFilter === "all" && (
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(sectionStats).sort().map(([sec, stats]) => (
            <Card key={sec}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">Section {sec}</Badge>
                  <span className="text-xs text-muted-foreground">{stats.count} students</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Avg Solved</span>
                    <p className="font-bold text-sm">{stats.count ? (stats.total / stats.count).toFixed(1) : 0}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">W{currentWeek} Submitted</span>
                    <p className="font-bold text-sm">{stats.submitted}/{stats.count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students" className="gap-1.5">
            <UserCog className="h-3.5 w-3.5" /> Student Management
          </TabsTrigger>
          <TabsTrigger value="submissions" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Submissions
          </TabsTrigger>
          <TabsTrigger value="unregistered" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Unregistered
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5">
            Requests {adminRequests.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{adminRequests.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* All students — primary admin tab */}
        <TabsContent value="students" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or register number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <p className="text-xs text-muted-foreground">{filtered.length} students found</p>
          </div>

          <Card>
            <CardContent className="pt-4 p-0 sm:p-4 sm:pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Reg No.</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Total Solved</TableHead>
                      <TableHead>Weeks</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => (
                      <TableRow key={s.user_id} className="group">
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="font-mono text-xs">{s.register_number}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{s.section}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{s.email}</TableCell>
                        <TableCell className="font-bold">{s.total_solved}</TableCell>
                        <TableCell>{s.entries_count}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailDialog(s)} title="View full details">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedStudent(s.user_id)} title="View chart">
                              <BarChart3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setResetDialog({ userId: s.user_id, name: s.name, regNo: s.register_number })} title="Reset password">
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No students found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submission tracking tab */}
        <TabsContent value="submissions" className="space-y-4">
          <div className="flex gap-2 items-center">
            <Label className="text-sm">Week:</Label>
            <Select value={weekFilter} onValueChange={setWeekFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest (W{latestWeek})</SelectItem>
                {allWeeks.map((w) => (
                  <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" /> Not Submitted ({filterBySection(submissionStatus.notSubmitted).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {filterBySection(submissionStatus.notSubmitted).length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">All students submitted! 🎉</p>
                  ) : (
                    filterBySection(submissionStatus.notSubmitted).map((s) => (
                      <div key={s.user_id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 text-sm">
                        <span>{s.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{s.register_number}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Submitted ({filterBySection(submissionStatus.submitted).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {filterBySection(submissionStatus.submitted).map((s) => {
                    const entry = s.entries.find((e: any) => e.week_number === currentWeek);
                    return (
                      <div key={s.user_id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 text-sm">
                        <span>{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{entry?.problems_solved_contest}/4 + {entry?.practice_problems_solved}p</span>
                          <span className="font-mono text-xs text-muted-foreground">{s.register_number}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Unregistered students */}
        <TabsContent value="unregistered">
          <Card>
            <CardContent className="pt-4">
              {filterBySection(unregistered).length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">All students have registered! 🎉</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Reg No.</TableHead>
                      <TableHead>Section</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterBySection(unregistered).map((s) => (
                      <TableRow key={s.register_number}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="font-mono text-xs">{s.register_number}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{s.section}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin requests */}
        <TabsContent value="requests">
          <Card>
            <CardContent className="pt-4">
              {adminRequests.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No pending requests.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminRequests.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.user_id}</TableCell>
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

      {/* Student detail dialog — full info */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" /> Student Details
            </DialogTitle>
            <DialogDescription>Full information and controls for this student</DialogDescription>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Full Name</Label>
                  <p className="font-medium">{detailDialog.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Register Number</Label>
                  <p className="font-mono text-sm">{detailDialog.register_number}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Section</Label>
                  <Badge variant="outline">{detailDialog.section}</Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="text-sm text-muted-foreground">{detailDialog.email}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Total Problems Solved</Label>
                  <p className="text-xl font-bold text-primary">{detailDialog.total_solved}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Weeks Submitted</Label>
                  <p className="text-xl font-bold">{detailDialog.entries_count}</p>
                </div>
              </div>

              {/* Week-by-week breakdown */}
              {detailDialog.entries?.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Weekly Breakdown</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Week</TableHead>
                          <TableHead className="text-xs">Contest</TableHead>
                          <TableHead className="text-xs">Solved</TableHead>
                          <TableHead className="text-xs">Practice</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...detailDialog.entries].sort((a: any, b: any) => b.week_number - a.week_number).map((e: any) => (
                          <TableRow key={e.id}>
                            <TableCell className="text-xs font-mono">W{e.week_number}</TableCell>
                            <TableCell className="text-xs">{e.contest_name || "—"}</TableCell>
                            <TableCell className="text-xs font-bold">{e.problems_solved_contest}/4</TableCell>
                            <TableCell className="text-xs">{e.practice_problems_solved}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => { setDetailDialog(null); setSelectedStudent(detailDialog.user_id); }}
                >
                  <BarChart3 className="h-4 w-4 mr-2" /> View Chart
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => { setDetailDialog(null); setResetDialog({ userId: detailDialog.user_id, name: detailDialog.name, regNo: detailDialog.register_number }); }}
                >
                  <KeyRound className="h-4 w-4 mr-2" /> Reset Password
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Student chart dialog */}
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

      {/* Password reset dialog */}
      <Dialog open={!!resetDialog} onOpenChange={() => { setResetDialog(null); setNewPassword(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-destructive" /> Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{resetDialog?.name}</strong> ({resetDialog?.regNo})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <Button
              className="w-full"
              variant="destructive"
              disabled={resetPassword.isPending || newPassword.length < 6}
              onClick={() => resetDialog && resetPassword.mutate({ userId: resetDialog.userId, password: newPassword })}
            >
              {resetPassword.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

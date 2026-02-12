import { useState } from "react";
import { useSubmitEntry, useWeeklyEntries, useDeleteEntry } from "@/hooks/useWeeklyEntries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit2 } from "lucide-react";

export default function SubmitEntry() {
  const { toast } = useToast();
  const { data: entries = [] } = useWeeklyEntries();
  const submitEntry = useSubmitEntry();
  const deleteEntry = useDeleteEntry();

  const [form, setForm] = useState({ weekNumber: "", contestName: "", problemsSolved: "0", practiceSolved: "0" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const weekNum = parseInt(form.weekNumber);
    if (!weekNum || weekNum < 1) {
      toast({ title: "Invalid week number", variant: "destructive" });
      return;
    }
    try {
      await submitEntry.mutateAsync({
        week_number: weekNum,
        contest_name: form.contestName || undefined,
        problems_solved_contest: parseInt(form.problemsSolved),
        practice_problems_solved: parseInt(form.practiceSolved),
      });
      toast({ title: editingId ? "Entry updated!" : "Entry submitted!" });
      setForm({ weekNumber: "", contestName: "", problemsSolved: "0", practiceSolved: "0" });
      setEditingId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEdit = (entry: any) => {
    setForm({
      weekNumber: String(entry.week_number),
      contestName: entry.contest_name || "",
      problemsSolved: String(entry.problems_solved_contest),
      practiceSolved: String(entry.practice_problems_solved),
    });
    setEditingId(entry.id);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry.mutateAsync(id);
      toast({ title: "Entry deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const totalWeekly = parseInt(form.problemsSolved) + parseInt(form.practiceSolved);
  const cumulative = entries.reduce((s, e) => s + e.problems_solved_contest + e.practice_problems_solved, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Submit Weekly Entry</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{editingId ? "Edit Entry" : "New Entry"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Week Number</Label>
                <Input type="number" min={1} required value={form.weekNumber} onChange={(e) => setForm({ ...form, weekNumber: e.target.value })} placeholder="e.g. 1" />
              </div>
              <div className="space-y-2">
                <Label>Contest Name (optional)</Label>
                <Input value={form.contestName} onChange={(e) => setForm({ ...form, contestName: e.target.value })} placeholder="e.g. Weekly Contest 380" />
              </div>
              <div className="space-y-2">
                <Label>Problems Solved in Contest (0–4)</Label>
                <Select value={form.problemsSolved} onValueChange={(v) => setForm({ ...form, problemsSolved: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Practice Problems Solved</Label>
                <Input type="number" min={0} value={form.practiceSolved} onChange={(e) => setForm({ ...form, practiceSolved: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>This week total: <strong className="text-foreground">{totalWeekly}</strong></span>
              <span>Cumulative: <strong className="text-foreground">{cumulative + totalWeekly}</strong></span>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitEntry.isPending}>
                {submitEntry.isPending ? "Saving..." : editingId ? "Update Entry" : "Submit Entry"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm({ weekNumber: "", contestName: "", problemsSolved: "0", practiceSolved: "0" }); }}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Past entries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Past Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No entries yet.</p>
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
                    <TableHead className="w-20">Actions</TableHead>
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
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(e)}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
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

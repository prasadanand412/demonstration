import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search, Heart, Footprints, Flame, Droplets } from "lucide-react";
import { format } from "date-fns";

interface FitnessLog {
  id: string;
  date: string;
  steps: number;
  distance_km: number;
  calories: number;
  water_ml: number;
  heart_rate: number | null;
  notes: string | null;
}

export default function FitnessLogs() {
  const [logs, setLogs] = useState<FitnessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<FitnessLog | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [stepsMin, setStepsMin] = useState("");
  const [stepsMax, setStepsMax] = useState("");
  const [hrMin, setHrMin] = useState("");
  const [hrMax, setHrMax] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    steps: 0,
    distance_km: 0,
    calories: 0,
    water_ml: 0,
    heart_rate: "",
    notes: "",
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("fitness_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch fitness logs", variant: "destructive" });
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const logData = {
      user_id: user.id,
      date: formData.date,
      steps: formData.steps,
      distance_km: formData.distance_km,
      calories: formData.calories,
      water_ml: formData.water_ml,
      heart_rate: formData.heart_rate ? parseInt(formData.heart_rate) : null,
      notes: formData.notes || null,
    };

    let error;
    if (editingLog) {
      ({ error } = await supabase.from("fitness_logs").update(logData).eq("id", editingLog.id));
    } else {
      ({ error } = await supabase.from("fitness_logs").insert(logData));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: editingLog ? "Log updated" : "Log added" });
      setIsDialogOpen(false);
      resetForm();
      fetchLogs();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("fitness_logs").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete log", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Log deleted" });
      fetchLogs();
    }
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      steps: 0,
      distance_km: 0,
      calories: 0,
      water_ml: 0,
      heart_rate: "",
      notes: "",
    });
    setEditingLog(null);
  };

  const openEditDialog = (log: FitnessLog) => {
    setEditingLog(log);
    setFormData({
      date: log.date,
      steps: log.steps,
      distance_km: log.distance_km,
      calories: log.calories,
      water_ml: log.water_ml,
      heart_rate: log.heart_rate?.toString() || "",
      notes: log.notes || "",
    });
    setIsDialogOpen(true);
  };

  const getHeartRateBadge = (hr: number | null) => {
    if (!hr) return null;
    if (hr > 100) return <Badge variant="destructive">Tachycardia</Badge>;
    if (hr < 60) return <Badge className="bg-yellow-500">Bradycardia</Badge>;
    return <Badge className="bg-green-500">Normal</Badge>;
  };

  const filteredLogs = logs.filter((log) => {
    if (searchTerm && !log.notes?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (dateFilter && log.date !== dateFilter) return false;
    if (stepsMin && log.steps < parseInt(stepsMin)) return false;
    if (stepsMax && log.steps > parseInt(stepsMax)) return false;
    if (hrMin && log.heart_rate && log.heart_rate < parseInt(hrMin)) return false;
    if (hrMax && log.heart_rate && log.heart_rate > parseInt(hrMax)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Daily Fitness Log</h1>
          <p className="text-muted-foreground">Track your daily fitness activities and heart rate</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Today's Log
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingLog ? "Edit Log" : "Add Fitness Log"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Steps</Label>
                  <Input type="number" min="0" value={formData.steps} onChange={(e) => setFormData({ ...formData, steps: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Distance (km)</Label>
                  <Input type="number" min="0" step="0.01" value={formData.distance_km} onChange={(e) => setFormData({ ...formData, distance_km: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Calories Burned</Label>
                  <Input type="number" min="0" value={formData.calories} onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Water Intake (ml)</Label>
                  <Input type="number" min="0" value={formData.water_ml} onChange={(e) => setFormData({ ...formData, water_ml: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <Label>Heart Rate (BPM)</Label>
                <Input type="number" min="30" max="220" value={formData.heart_rate} onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })} placeholder="Optional" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="How did you feel today?" />
              </div>
              <Button type="submit" className="w-full">{editingLog ? "Update Log" : "Add Log"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Footprints className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{logs[0]?.steps || 0}</p>
              <p className="text-xs text-muted-foreground">Today's Steps</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{logs[0]?.heart_rate || "--"}</p>
              <p className="text-xs text-muted-foreground">Heart Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Flame className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{logs[0]?.calories || 0}</p>
              <p className="text-xs text-muted-foreground">Calories</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Droplets className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{logs[0]?.water_ml || 0}</p>
              <p className="text-xs text-muted-foreground">Water (ml)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search notes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Input type="date" placeholder="Filter by date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            <Input type="number" placeholder="Min steps" value={stepsMin} onChange={(e) => setStepsMin(e.target.value)} />
            <Input type="number" placeholder="Min HR" value={hrMin} onChange={(e) => setHrMin(e.target.value)} />
            <Input type="number" placeholder="Max HR" value={hrMax} onChange={(e) => setHrMax(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Calories</TableHead>
                <TableHead>Water</TableHead>
                <TableHead>Heart Rate</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No fitness logs found</TableCell></TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{format(new Date(log.date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{log.steps.toLocaleString()}</TableCell>
                    <TableCell>{log.distance_km} km</TableCell>
                    <TableCell>{log.calories}</TableCell>
                    <TableCell>{log.water_ml} ml</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {log.heart_rate || "--"}
                        {getHeartRateBadge(log.heart_rate)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{log.notes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(log)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(log.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Syringe, Plus, Trash2 } from "lucide-react";

export default function Vaccinations() {
  const { toast } = useToast();
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    vaccine_name: "",
    date_taken: new Date().toISOString().split("T")[0],
    next_due_date: "",
    notes: "",
  });

  useEffect(() => {
    loadVaccinations();
  }, []);

  const loadVaccinations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("vaccinations")
      .select("*")
      .eq("user_id", user.id)
      .order("date_taken", { ascending: false });

    if (data) setVaccinations(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("vaccinations").insert({
      user_id: user.id,
      ...formData,
      next_due_date: formData.next_due_date || null,
    });

    if (!error) {
      toast({ title: "Success", description: "Vaccination added" });
      setOpen(false);
      setFormData({ vaccine_name: "", date_taken: new Date().toISOString().split("T")[0], next_due_date: "", notes: "" });
      loadVaccinations();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("vaccinations").delete().eq("id", id);
    toast({ title: "Deleted" });
    loadVaccinations();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold">Vaccinations</h2>
          <p className="text-muted-foreground">Track immunization history</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-warning text-warning-foreground hover:bg-warning/90">
              <Plus className="mr-2 h-4 w-4" />
              Add Vaccination
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add Vaccination</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label>Vaccine Name *</Label>
                  <Input value={formData.vaccine_name} onChange={(e) => setFormData({ ...formData, vaccine_name: e.target.value })} required />
                </div>
                <div>
                  <Label>Date Taken *</Label>
                  <Input type="date" value={formData.date_taken} onChange={(e) => setFormData({ ...formData, date_taken: e.target.value })} required />
                </div>
                <div>
                  <Label>Next Due Date</Label>
                  <Input type="date" value={formData.next_due_date} onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="health-card">
        <CardHeader><CardTitle>Vaccination History</CardTitle></CardHeader>
        <CardContent>
          {vaccinations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Syringe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No vaccinations recorded.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vaccine</TableHead>
                  <TableHead>Date Taken</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vaccinations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.vaccine_name}</TableCell>
                    <TableCell>{new Date(v.date_taken).toLocaleDateString()}</TableCell>
                    <TableCell>{v.next_due_date ? new Date(v.next_due_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(v.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
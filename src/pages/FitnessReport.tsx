import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileDown, Loader2, Activity, Heart, Footprints } from "lucide-react";
import { format, subDays } from "date-fns";

export default function FitnessReport() {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { toast } = useToast();

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
        return;
      }

      const response = await supabase.functions.invoke("generate-fitness-pdf", {
        body: { start_date: startDate, end_date: endDate },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Convert base64 to blob and download
      const base64Data = response.data.pdf;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fitness-report-${startDate}-to-${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Success", description: "Fitness report downloaded!" });
    } catch (error: any) {
      console.error("PDF generation error:", error);
      toast({ title: "Error", description: error.message || "Failed to generate PDF", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Fitness Report Export</h1>
        <p className="text-muted-foreground">Generate a comprehensive PDF report of your fitness data</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-primary" />
              Download Fitness Report
            </CardTitle>
            <CardDescription>
              Select a date range and generate a professional PDF report with all your fitness data, charts, and health metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
            </div>
            <Button
              onClick={handleDownload}
              disabled={loading}
              className="w-full gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Download Fitness Report (PDF)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What's Included</CardTitle>
            <CardDescription>Your fitness report will contain:</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Heart className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Health ID Card</p>
                  <p className="text-sm text-muted-foreground">Your profile and medical info</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Activity className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="font-medium">Heart Rate Analysis</p>
                  <p className="text-sm text-muted-foreground">Min, max, and average BPM</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Footprints className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Activity Summary</p>
                  <p className="text-sm text-muted-foreground">Steps, distance, calories, water</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileDown className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Daily Logs Table</p>
                  <p className="text-sm text-muted-foreground">Detailed data for each day</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

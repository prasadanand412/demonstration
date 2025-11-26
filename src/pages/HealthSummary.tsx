import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HealthSummary() {
  const { toast } = useToast();

  const handleDownload = () => {
    toast({
      title: "PDF Generation",
      description: "PDF export functionality will be available soon with edge function implementation",
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold mb-2">Health Summary</h2>
        <p className="text-muted-foreground">Download your complete health record</p>
      </div>

      <Card className="health-card">
        <CardHeader>
          <CardTitle>Export Your Health Data</CardTitle>
          <CardDescription>
            Generate a comprehensive PDF containing all your health records, including profile, medical reports, doctor visits, medications, and vaccinations.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          <div className="rounded-full bg-gradient-to-br from-primary to-secondary p-6">
            <FileDown className="h-12 w-12 text-white" />
          </div>
          <Button
            size="lg"
            onClick={handleDownload}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-lg px-8 py-6"
          >
            <FileDown className="mr-2 h-5 w-5" />
            Download Health Summary (PDF)
          </Button>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Your health summary will include your complete medical history formatted in a professional, easy-to-read document.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
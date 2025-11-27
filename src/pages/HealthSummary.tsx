import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function HealthSummary() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to download your health summary",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('generate-health-summary-pdf', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate PDF');
      }

      // The response.data should be the PDF blob
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `health-summary-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Your health summary PDF has been downloaded",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
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
            disabled={isGenerating}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-lg px-8 py-6"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-5 w-5" />
                Download Health Summary (PDF)
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Your health summary will include your complete medical history formatted in a professional, easy-to-read document.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

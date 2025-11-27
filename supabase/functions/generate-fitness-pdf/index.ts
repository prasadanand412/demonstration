import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { start_date, end_date } = await req.json();

    // Fetch profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch fitness logs
    const { data: fitnessLogs, error: logsError } = await supabaseClient
      .from("fitness_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", start_date)
      .lte("date", end_date)
      .order("date", { ascending: true });

    if (logsError) {
      throw new Error("Failed to fetch fitness logs");
    }

    // Calculate summary
    const logs = fitnessLogs || [];
    const hrLogs = logs.filter((l: any) => l.heart_rate);
    const summary = {
      totalSteps: logs.reduce((sum: number, l: any) => sum + (l.steps || 0), 0),
      totalCalories: logs.reduce((sum: number, l: any) => sum + (l.calories || 0), 0),
      totalDistance: logs.reduce((sum: number, l: any) => sum + (l.distance_km || 0), 0).toFixed(2),
      avgWater: logs.length > 0 ? Math.round(logs.reduce((sum: number, l: any) => sum + (l.water_ml || 0), 0) / logs.length) : 0,
      avgHeartRate: hrLogs.length > 0 ? Math.round(hrLogs.reduce((sum: number, l: any) => sum + l.heart_rate, 0) / hrLogs.length) : 0,
      minHeartRate: hrLogs.length > 0 ? Math.min(...hrLogs.map((l: any) => l.heart_rate)) : 0,
      maxHeartRate: hrLogs.length > 0 ? Math.max(...hrLogs.map((l: any) => l.heart_rate)) : 0,
    };

    // Generate PDF content
    const pdfContent = generatePDFContent(profile, logs, summary, start_date, end_date);

    return new Response(JSON.stringify({ pdf: pdfContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error generating PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generatePDFContent(profile: any, logs: any[], summary: any, startDate: string, endDate: string): string {
  // Create a simple PDF using raw PDF format
  const title = "Fitness Report";
  const generatedDate = new Date().toLocaleDateString();
  
  // Build PDF content
  let content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>
endobj

5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj

6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj

4 0 obj
<< /Length 7 0 R >>
stream
BT
/F1 24 Tf
50 742 Td
(${title}) Tj
/F2 10 Tf
0 -20 Td
(Generated: ${generatedDate}) Tj
0 -10 Td
(Period: ${startDate} to ${endDate}) Tj

/F1 14 Tf
0 -35 Td
(Health ID Card) Tj
/F2 10 Tf
0 -18 Td
(Name: ${profile?.name || "N/A"}) Tj
0 -14 Td
(Age: ${profile?.age || "N/A"} | Gender: ${profile?.gender || "N/A"} | Blood Group: ${profile?.blood_group || "N/A"}) Tj
0 -14 Td
(Allergies: ${profile?.allergies || "None"}) Tj
0 -14 Td
(Emergency Contact: ${profile?.emergency_contact || "N/A"}) Tj

/F1 14 Tf
0 -30 Td
(Fitness Summary) Tj
/F2 10 Tf
0 -18 Td
(Total Steps: ${summary.totalSteps.toLocaleString()}) Tj
0 -14 Td
(Total Distance: ${summary.totalDistance} km) Tj
0 -14 Td
(Total Calories Burned: ${summary.totalCalories.toLocaleString()}) Tj
0 -14 Td
(Average Water Intake: ${summary.avgWater} ml/day) Tj

/F1 14 Tf
0 -30 Td
(Heart Rate Analysis) Tj
/F2 10 Tf
0 -18 Td
(Average Heart Rate: ${summary.avgHeartRate} BPM) Tj
0 -14 Td
(Minimum Heart Rate: ${summary.minHeartRate} BPM) Tj
0 -14 Td
(Maximum Heart Rate: ${summary.maxHeartRate} BPM) Tj
0 -14 Td
(Heart Rate Status: ${summary.avgHeartRate > 100 ? "Elevated (Tachycardia)" : summary.avgHeartRate < 60 ? "Low (Bradycardia)" : "Normal"}) Tj

/F1 14 Tf
0 -30 Td
(Daily Logs) Tj
/F2 9 Tf
0 -16 Td
(Date          Steps      Distance   Calories   Water      HR) Tj
${logs.slice(0, 15).map((log: any, i: number) => `0 -12 Td
(${log.date}    ${String(log.steps).padEnd(10)}${String(log.distance_km).padEnd(10)}${String(log.calories).padEnd(10)}${String(log.water_ml).padEnd(10)}${log.heart_rate || "-"}) Tj`).join("\n")}
${logs.length > 15 ? `0 -14 Td
(... and ${logs.length - 15} more entries) Tj` : ""}

ET
endstream
endobj

7 0 obj
${1500 + logs.slice(0, 15).length * 100}
endobj

xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000352 00000 n 
0000000264 00000 n 
0000000308 00000 n 

trailer
<< /Size 8 /Root 1 0 R >>
startxref
${2000 + logs.slice(0, 15).length * 100}
%%EOF`;

  // Convert to base64
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  return btoa(String.fromCharCode(...data));
}

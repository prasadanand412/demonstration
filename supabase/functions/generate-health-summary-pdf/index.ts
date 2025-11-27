import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating health summary PDF for user:', user.id);

    // Fetch all user data in parallel
    const [profileResult, reportsResult, visitsResult, medicationsResult, vaccinationsResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('medical_reports').select('*').eq('user_id', user.id).order('report_date', { ascending: false }),
      supabase.from('doctor_visits').select('*').eq('user_id', user.id).order('visit_date', { ascending: false }),
      supabase.from('medications').select('*').eq('user_id', user.id).order('start_date', { ascending: false }),
      supabase.from('vaccinations').select('*').eq('user_id', user.id).order('date_taken', { ascending: false }),
    ]);

    const profile = profileResult.data;
    const reports = reportsResult.data || [];
    const visits = visitsResult.data || [];
    const medications = medicationsResult.data || [];
    const vaccinations = vaccinationsResult.data || [];

    console.log('Fetched data:', {
      profile: !!profile,
      reports: reports.length,
      visits: visits.length,
      medications: medications.length,
      vaccinations: vaccinations.length,
    });

    // Generate PDF content
    const pdfContent = generatePDFContent(profile, reports, visits, medications, vaccinations, user.email || '');
    
    return new Response(pdfContent.buffer as ArrayBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="health-summary-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating health summary PDF:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate PDF', details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface Profile {
  name: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  allergies?: string;
  emergency_contact?: string;
}

interface MedicalReport {
  report_name: string;
  report_type: string;
  report_date: string;
  description?: string;
}

interface DoctorVisit {
  doctor_name: string;
  specialization?: string;
  visit_date: string;
  diagnosis?: string;
  notes?: string;
}

interface Medication {
  medicine_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  is_active?: boolean;
  notes?: string;
}

interface Vaccination {
  vaccine_name: string;
  date_taken: string;
  next_due_date?: string;
  notes?: string;
}

function generatePDFContent(
  profile: Profile | null,
  reports: MedicalReport[],
  visits: DoctorVisit[],
  medications: Medication[],
  vaccinations: Vaccination[],
  email: string
): Uint8Array {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // PDF generation using raw PDF structure
  let content = '';
  let yPos = 750;
  const lineHeight = 14;
  const pageWidth = 612;
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);
  
  const objects: string[] = [];
  let objectCount = 0;
  
  // Helper to add object
  const addObject = (obj: string): number => {
    objectCount++;
    objects.push(obj);
    return objectCount;
  };
  
  // Catalog
  addObject('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  
  // Pages object (will be updated later)
  const pagesObjIndex = addObject(''); // placeholder
  
  // Font
  addObject('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  addObject('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');
  
  // Build content streams for pages
  const pages: { contentObj: number; length: number; stream: string }[] = [];
  let currentStream = '';
  let currentY = 750;
  
  const startNewPage = () => {
    if (currentStream) {
      const contentObjNum = objectCount + 1;
      pages.push({ contentObj: contentObjNum, length: currentStream.length, stream: currentStream });
    }
    currentStream = 'BT\n';
    currentY = 750;
  };
  
  const addText = (text: string, x: number, y: number, fontSize: number = 10, bold: boolean = false) => {
    const font = bold ? '/F2' : '/F1';
    const escapedText = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    currentStream += `${font} ${fontSize} Tf\n${x} ${y} Td\n(${escapedText}) Tj\n0 0 Td\n`;
  };
  
  const checkNewPage = (neededSpace: number) => {
    if (currentY - neededSpace < 50) {
      currentStream += 'ET\n';
      startNewPage();
      return true;
    }
    return false;
  };
  
  // Start first page
  startNewPage();
  
  // Title
  addText('PERSONAL HEALTH RECORD', margin, currentY, 18, true);
  currentY -= 25;
  addText('Complete Health Summary', margin, currentY, 12, false);
  currentY -= 15;
  addText(`Generated: ${today}`, margin, currentY, 10, false);
  currentY -= 40;
  
  // Health ID Card Section
  addText('HEALTH ID CARD', margin, currentY, 14, true);
  currentY -= 25;
  
  if (profile) {
    addText(`Name: ${profile.name || 'N/A'}`, margin, currentY, 10, false);
    currentY -= lineHeight;
    addText(`Email: ${email}`, margin, currentY, 10, false);
    currentY -= lineHeight;
    addText(`Age: ${profile.age || 'N/A'}`, margin, currentY, 10, false);
    addText(`Gender: ${profile.gender || 'N/A'}`, margin + 150, currentY, 10, false);
    currentY -= lineHeight;
    addText(`Blood Group: ${profile.blood_group || 'N/A'}`, margin, currentY, 10, false);
    currentY -= lineHeight;
    addText(`Allergies: ${profile.allergies || 'None reported'}`, margin, currentY, 10, false);
    currentY -= lineHeight;
    addText(`Emergency Contact: ${profile.emergency_contact || 'N/A'}`, margin, currentY, 10, false);
  } else {
    addText('Profile not set up', margin, currentY, 10, false);
  }
  currentY -= 35;
  
  // Medical Reports Section
  checkNewPage(80);
  addText('MEDICAL REPORTS', margin, currentY, 14, true);
  currentY -= 20;
  
  if (reports.length > 0) {
    addText('Report Name', margin, currentY, 9, true);
    addText('Type', margin + 180, currentY, 9, true);
    addText('Date', margin + 280, currentY, 9, true);
    currentY -= lineHeight;
    
    for (const report of reports) {
      checkNewPage(lineHeight + 5);
      const reportName = (report.report_name || '').substring(0, 30);
      const reportType = (report.report_type || '').substring(0, 15);
      addText(reportName, margin, currentY, 9, false);
      addText(reportType, margin + 180, currentY, 9, false);
      addText(report.report_date || '', margin + 280, currentY, 9, false);
      currentY -= lineHeight;
    }
  } else {
    addText('No medical reports recorded', margin, currentY, 10, false);
    currentY -= lineHeight;
  }
  currentY -= 25;
  
  // Doctor Visits Section
  checkNewPage(80);
  addText('DOCTOR VISITS', margin, currentY, 14, true);
  currentY -= 20;
  
  if (visits.length > 0) {
    addText('Doctor', margin, currentY, 9, true);
    addText('Specialization', margin + 150, currentY, 9, true);
    addText('Date', margin + 280, currentY, 9, true);
    addText('Diagnosis', margin + 360, currentY, 9, true);
    currentY -= lineHeight;
    
    for (const visit of visits) {
      checkNewPage(lineHeight + 5);
      const doctorName = (visit.doctor_name || '').substring(0, 20);
      const spec = (visit.specialization || '').substring(0, 18);
      const diagnosis = (visit.diagnosis || 'N/A').substring(0, 20);
      addText(doctorName, margin, currentY, 9, false);
      addText(spec, margin + 150, currentY, 9, false);
      addText(visit.visit_date || '', margin + 280, currentY, 9, false);
      addText(diagnosis, margin + 360, currentY, 9, false);
      currentY -= lineHeight;
    }
  } else {
    addText('No doctor visits recorded', margin, currentY, 10, false);
    currentY -= lineHeight;
  }
  currentY -= 25;
  
  // Medications Section
  checkNewPage(80);
  addText('MEDICATIONS', margin, currentY, 14, true);
  currentY -= 20;
  
  if (medications.length > 0) {
    addText('Medicine', margin, currentY, 9, true);
    addText('Dosage', margin + 140, currentY, 9, true);
    addText('Frequency', margin + 230, currentY, 9, true);
    addText('Status', margin + 340, currentY, 9, true);
    addText('Start Date', margin + 420, currentY, 9, true);
    currentY -= lineHeight;
    
    for (const med of medications) {
      checkNewPage(lineHeight + 5);
      const medName = (med.medicine_name || '').substring(0, 20);
      const dosage = (med.dosage || '').substring(0, 12);
      const frequency = (med.frequency || '').substring(0, 15);
      const status = med.is_active ? 'Active' : 'Completed';
      addText(medName, margin, currentY, 9, false);
      addText(dosage, margin + 140, currentY, 9, false);
      addText(frequency, margin + 230, currentY, 9, false);
      addText(status, margin + 340, currentY, 9, false);
      addText(med.start_date || '', margin + 420, currentY, 9, false);
      currentY -= lineHeight;
    }
  } else {
    addText('No medications recorded', margin, currentY, 10, false);
    currentY -= lineHeight;
  }
  currentY -= 25;
  
  // Vaccinations Section
  checkNewPage(80);
  addText('VACCINATIONS', margin, currentY, 14, true);
  currentY -= 20;
  
  if (vaccinations.length > 0) {
    addText('Vaccine', margin, currentY, 9, true);
    addText('Date Taken', margin + 200, currentY, 9, true);
    addText('Next Due', margin + 320, currentY, 9, true);
    currentY -= lineHeight;
    
    for (const vac of vaccinations) {
      checkNewPage(lineHeight + 5);
      const vacName = (vac.vaccine_name || '').substring(0, 30);
      addText(vacName, margin, currentY, 9, false);
      addText(vac.date_taken || '', margin + 200, currentY, 9, false);
      addText(vac.next_due_date || 'N/A', margin + 320, currentY, 9, false);
      currentY -= lineHeight;
    }
  } else {
    addText('No vaccinations recorded', margin, currentY, 10, false);
    currentY -= lineHeight;
  }
  currentY -= 30;
  
  // Footer
  checkNewPage(40);
  addText('This document was generated by Personal Health Record Manager', margin, currentY, 8, false);
  currentY -= 12;
  addText('For medical emergencies, please contact your healthcare provider immediately.', margin, currentY, 8, false);
  
  // Close last stream
  currentStream += 'ET\n';
  const contentObjNum = objectCount + 1;
  pages.push({ contentObj: contentObjNum, length: currentStream.length, stream: currentStream });
  
  // Add content objects
  for (const page of pages) {
    addObject(`${page.contentObj} 0 obj\n<< /Length ${page.stream.length} >>\nstream\n${page.stream}endstream\nendobj\n`);
  }
  
  // Add page objects
  const pageObjNums: number[] = [];
  for (let i = 0; i < pages.length; i++) {
    const pageObjNum = objectCount + 1;
    pageObjNums.push(pageObjNum);
    addObject(`${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${pages[i].contentObj} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj\n`);
  }
  
  // Update pages object
  const kidsArray = pageObjNums.map(n => `${n} 0 R`).join(' ');
  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${kidsArray}] /Count ${pages.length} >>\nendobj\n`;
  
  // Build PDF
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  
  // Cross-reference table
  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objectCount + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 0; i < objectCount; i++) {
    const offset = offsets[i].toString().padStart(10, '0');
    pdf += `${offset} 00000 n \n`;
  }
  
  // Trailer
  pdf += 'trailer\n';
  pdf += `<< /Size ${objectCount + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF';
  
  return new TextEncoder().encode(pdf);
}

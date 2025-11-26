import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Stethoscope, Pill, Syringe, User, FilePlus, CalendarPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--success))", "hsl(var(--warning))"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalReports: 0,
    totalVisits: 0,
    activeMedications: 0,
    nextVaccination: null as string | null,
  });
  const [visitData, setVisitData] = useState<any[]>([]);
  const [reportTypeData, setReportTypeData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load stats
    const [reports, visits, medications, vaccinations] = await Promise.all([
      supabase.from("medical_reports").select("*", { count: "exact" }).eq("user_id", user.id),
      supabase.from("doctor_visits").select("*", { count: "exact" }).eq("user_id", user.id),
      supabase.from("medications").select("*", { count: "exact" }).eq("user_id", user.id).eq("is_active", true),
      supabase.from("vaccinations").select("*").eq("user_id", user.id).order("next_due_date", { ascending: true }),
    ]);

    setStats({
      totalReports: reports.count || 0,
      totalVisits: visits.count || 0,
      activeMedications: medications.count || 0,
      nextVaccination: vaccinations.data?.[0]?.next_due_date || null,
    });

    // Process visit data by month
    if (visits.data) {
      const visitsByMonth: Record<string, number> = {};
      visits.data.forEach((visit: any) => {
        const month = new Date(visit.visit_date).toLocaleString("default", { month: "short" });
        visitsByMonth[month] = (visitsByMonth[month] || 0) + 1;
      });
      setVisitData(
        Object.entries(visitsByMonth).map(([month, count]) => ({ month, count }))
      );
    }

    // Process report types
    if (reports.data) {
      const reportTypes: Record<string, number> = {};
      reports.data.forEach((report: any) => {
        reportTypes[report.report_type] = (reportTypes[report.report_type] || 0) + 1;
      });
      setReportTypeData(
        Object.entries(reportTypes).map(([type, count]) => ({ name: type, value: count }))
      );
    }
  };

  const quickActions = [
    { icon: User, label: "Edit Profile", path: "/profile", color: "primary" },
    { icon: FilePlus, label: "Add Report", path: "/reports", color: "secondary" },
    { icon: CalendarPlus, label: "Add Visit", path: "/visits", color: "success" },
    { icon: Pill, label: "Add Medication", path: "/medications", color: "warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold mb-2">Dashboard</h2>
        <p className="text-muted-foreground">Welcome to your health record overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medical Reports</CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalReports}</div>
            <p className="text-xs text-muted-foreground mt-1">Total documents</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doctor Visits</CardTitle>
            <Stethoscope className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalVisits}</div>
            <p className="text-xs text-muted-foreground mt-1">Recorded visits</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Medications</CardTitle>
            <Pill className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeMedications}</div>
            <p className="text-xs text-muted-foreground mt-1">Current prescriptions</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Vaccination</CardTitle>
            <Syringe className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {stats.nextVaccination
                ? new Date(stats.nextVaccination).toLocaleDateString()
                : "None due"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Upcoming due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="health-card">
          <CardHeader>
            <CardTitle>Doctor Visits by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {visitData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={visitData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No visit data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="health-card">
          <CardHeader>
            <CardTitle>Reports by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {reportTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reportTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No report data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-xl font-display font-semibold mb-4">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card
              key={action.label}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
              onClick={() => navigate(action.path)}
            >
              <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
                <div className={`rounded-full bg-${action.color}/10 p-4`}>
                  <action.icon className={`h-6 w-6 text-${action.color}`} />
                </div>
                <p className="font-medium text-center">{action.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
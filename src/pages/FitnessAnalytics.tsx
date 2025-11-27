import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Heart, Footprints, Flame, Droplets, MapPin, AlertTriangle, CheckCircle } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

interface FitnessLog {
  id: string;
  date: string;
  steps: number;
  distance_km: number;
  calories: number;
  water_ml: number;
  heart_rate: number | null;
}

interface WeeklySummary {
  avgHeartRate: number;
  totalSteps: number;
  totalCalories: number;
  totalDistance: number;
  avgWater: number;
}

export default function FitnessAnalytics() {
  const [logs, setLogs] = useState<FitnessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [latestHR, setLatestHR] = useState<number | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("fitness_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", thirtyDaysAgo)
      .order("date", { ascending: true });

    if (!error && data) {
      setLogs(data);
      calculateWeeklySummary(data);
      const latest = data.filter(l => l.heart_rate).pop();
      setLatestHR(latest?.heart_rate || null);
    }
    setLoading(false);
  };

  const calculateWeeklySummary = (data: FitnessLog[]) => {
    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);

    const weekLogs = data.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= weekStart && logDate <= weekEnd;
    });

    if (weekLogs.length === 0) {
      setWeeklySummary(null);
      return;
    }

    const hrLogs = weekLogs.filter(l => l.heart_rate);
    setWeeklySummary({
      avgHeartRate: hrLogs.length > 0 ? Math.round(hrLogs.reduce((sum, l) => sum + (l.heart_rate || 0), 0) / hrLogs.length) : 0,
      totalSteps: weekLogs.reduce((sum, l) => sum + l.steps, 0),
      totalCalories: weekLogs.reduce((sum, l) => sum + l.calories, 0),
      totalDistance: Math.round(weekLogs.reduce((sum, l) => sum + l.distance_km, 0) * 100) / 100,
      avgWater: Math.round(weekLogs.reduce((sum, l) => sum + l.water_ml, 0) / weekLogs.length),
    });
  };

  const chartData = logs.map(log => ({
    date: format(new Date(log.date), "MMM d"),
    steps: log.steps,
    heartRate: log.heart_rate || 0,
    calories: log.calories,
    water: log.water_ml,
  }));

  const getHeartRateAlert = () => {
    if (!latestHR) return null;
    if (latestHR > 100) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Tachycardia Alert</AlertTitle>
          <AlertDescription>Your heart rate ({latestHR} BPM) is above 100 BPM. Consider consulting a healthcare provider if this persists.</AlertDescription>
        </Alert>
      );
    }
    if (latestHR < 60) {
      return (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-700 dark:text-yellow-400">Bradycardia Alert</AlertTitle>
          <AlertDescription className="text-yellow-600 dark:text-yellow-300">Your heart rate ({latestHR} BPM) is below 60 BPM. This may be normal for athletes, but consult a doctor if you experience symptoms.</AlertDescription>
        </Alert>
      );
    }
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-700 dark:text-green-400">Heart Rate Normal</AlertTitle>
        <AlertDescription className="text-green-600 dark:text-green-300">Your heart rate ({latestHR} BPM) is within the normal range (60-100 BPM).</AlertDescription>
      </Alert>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Fitness Analytics</h1>
        <p className="text-muted-foreground">Track your fitness trends and health metrics</p>
      </div>

      {/* Heart Rate Alert */}
      {getHeartRateAlert()}

      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="p-4 text-center">
            <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{weeklySummary?.avgHeartRate || "--"}</p>
            <p className="text-xs text-muted-foreground">Avg Heart Rate</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 text-center">
            <Footprints className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{weeklySummary?.totalSteps.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground">Total Steps</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-4 text-center">
            <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{weeklySummary?.totalCalories.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground">Calories Burned</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4 text-center">
            <MapPin className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{weeklySummary?.totalDistance || 0}</p>
            <p className="text-xs text-muted-foreground">Distance (km)</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4 text-center">
            <Droplets className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{weeklySummary?.avgWater || 0}</p>
            <p className="text-xs text-muted-foreground">Avg Water (ml)</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Steps Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Footprints className="h-5 w-5 text-primary" /> Steps per Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="steps" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Heart Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" /> Heart Rate Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis domain={[40, 120]} className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="heartRate" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Calories Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" /> Calories Burned Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="calories" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Water Intake Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" /> Water Intake Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="water" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

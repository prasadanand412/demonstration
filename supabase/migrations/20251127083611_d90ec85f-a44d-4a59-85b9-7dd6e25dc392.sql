-- Create fitness_logs table
CREATE TABLE public.fitness_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  steps INTEGER DEFAULT 0,
  distance_km DECIMAL(5,2) DEFAULT 0,
  calories INTEGER DEFAULT 0,
  water_ml INTEGER DEFAULT 0,
  heart_rate INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.fitness_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own fitness logs" ON public.fitness_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fitness logs" ON public.fitness_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fitness logs" ON public.fitness_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fitness logs" ON public.fitness_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_fitness_logs_updated_at
  BEFORE UPDATE ON public.fitness_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Unique constraint for one log per day per user
ALTER TABLE public.fitness_logs ADD CONSTRAINT unique_user_date UNIQUE (user_id, date);
export interface ResumeBullet {
  id: string; // From Supabase (UUID)
  user_id: string; // From Supabase
  role: string;
  industry?: string;
  character_limit: number; // Added character limit
  raw_point: string;       // Matched column name
  optimized_result: string;// Matched column name
  created_at: string;      // Matched timezone timestamp
}

export interface BenchmarkingData {
  topSkills: string[];
  coreResponsibilities: string[];
  kpis: string[];
  atsKeywords: string[];
}

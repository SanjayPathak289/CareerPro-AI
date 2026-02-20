export interface ResumeBullet {
  id: string;
  role: string;
  industry?: string;
  raw: string;
  optimized: string;
  timestamp: number;
}

export interface BenchmarkingData {
  topSkills: string[];
  coreResponsibilities: string[];
  kpis: string[];
  atsKeywords: string[];
}

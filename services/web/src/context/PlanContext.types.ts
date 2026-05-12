export interface PinnedTarget {
  id: string;
  common_name?: string | null;
  target_type?: string | null;
  score: number;
}

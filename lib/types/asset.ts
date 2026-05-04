import type { Platform } from './domain';

// Asset — a single piece of generated content for one platform.

export type AssetFormat =
  | 'long-form-post'
  | 'short-post'
  | 'carousel-outline'
  | 'thread'
  | 'video-script'
  | 'image-caption';

export type AssetStatus =
  | 'draft'
  | 'critic-pass'
  | 'critic-fail'
  | 'approved'
  | 'edited'
  | 'rejected'
  | 'scheduled'
  | 'exported';

export interface VisualBrief {
  prompt: string;
  references?: string[];     // URLs or descriptions
  aspect_ratio: '1:1' | '4:5' | '9:16' | '16:9';
  notes?: string;
}

export interface Asset {
  id: string;
  campaign_id: string;
  platform: Platform;
  format: AssetFormat;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  visual_brief?: VisualBrief;
  body_embedding?: number[]; // pgvector — for similarity search across past campaigns
  status: AssetStatus;
  critic_report_id?: string;
  parent_version_id?: string; // points to previous version on regeneration
  created_at: string;
}

// CreativeBrief — output of stage 4 (Creative Director), input of stage 5.

export interface CreativeBrief {
  platform: Platform;
  format: AssetFormat;
  hook_angle: string;
  hook_type: string;
  target_length_chars: number;
  tone_directives: string[];
  visual_direction?: string;
  cta_variant: string;
}

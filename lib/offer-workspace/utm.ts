/**
 * UTM mock — pure tracking-tag generator.
 *
 * Produces a stable `?utm_*` query string from offer + asset + channel.
 * Mock V1: nothing is actually published, no real link rewriter.
 * The UI renders this as "Tracking prêt" so the user knows the structure
 * is in place even though no traffic flows yet.
 */

import type { Asset, Offer } from './types';

export interface Utm {
  utm_campaign: string;
  utm_source: string;
  utm_medium: string;
  utm_content: string;
}

/** ASCII-safe slug. Lowercase, dashes, no diacritics. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

const CHANNEL_TO_MEDIUM: Record<string, string> = {
  linkedin: 'social',
  instagram: 'social',
  facebook: 'social',
  x: 'social',
  tiktok: 'social',
  email: 'email',
  landing_page: 'web',
};

export function mediumFromChannel(channel: string): string {
  return CHANNEL_TO_MEDIUM[channel] ?? 'other';
}

/**
 * Builds a deterministic UTM tuple. The `utm_campaign` slug is derived from
 * the offer's name (preferred) or id; the `utm_content` slug from the asset
 * kind + suffix.
 */
export function buildUtm(
  offer: Offer,
  channel: string,
  asset?: Asset,
): Utm {
  const campaignBase = offer.name?.trim().length ? offer.name : offer.id;
  return {
    utm_campaign: slugify(campaignBase) || 'offer',
    utm_source: slugify(channel) || 'unknown',
    utm_medium: mediumFromChannel(channel),
    utm_content: asset
      ? `${slugify(asset.kind)}-${asset.id.slice(-6)}`
      : 'generic',
  };
}

/** Renders a UTM tuple into a query string starting with `?`. */
export function utmToQuery(utm: Utm): string {
  const sp = new URLSearchParams();
  sp.set('utm_campaign', utm.utm_campaign);
  sp.set('utm_source', utm.utm_source);
  sp.set('utm_medium', utm.utm_medium);
  sp.set('utm_content', utm.utm_content);
  return `?${sp.toString()}`;
}

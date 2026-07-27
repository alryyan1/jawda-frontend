// src/utils/labResultFlags.ts
// Shared abnormal-result detection, extracted from the duplicated logic in
// ResultEntryPanel.tsx (isResultAbnormal) and ActionsButtonsPanel.tsx
// (isNumericAbnormal/isQualitativeAbnormal) so new read-only views (Doctor
// Portal) don't need a third copy.
import type { ChildTestWithResult } from '@/types/labWorkflow';

const POSITIVE_LIKE = /positive|reactive|detected|present|yes|true/i;
const NEGATIVE_LIKE = /negative|non\s*reactive|not\s*detected|absent|no|false/i;

const toComparableName = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'Positive' : 'Negative';
  if (typeof value === 'object' && value !== null && 'name' in (value as Record<string, unknown>)) {
    return String((value as { name?: string }).name || '');
  }
  return String(value ?? '');
};

export const isValueEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'object' && 'name' in (value as Record<string, unknown>)) {
    const name = (value as { name?: string }).name || '';
    return String(name).trim() === '';
  }
  return false;
};

/** True when `value` falls outside the child test's numeric bounds or qualitative expectation. */
export const isChildTestResultAbnormal = (ct: ChildTestWithResult, value: unknown): boolean => {
  if (value === undefined || value === null) return false;

  const hasNumericBounds = (ct.low !== null && ct.low !== undefined) || (ct.upper !== null && ct.upper !== undefined);
  if (hasNumericBounds) {
    const parsed = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN;
    if (!Number.isFinite(parsed)) return false;
    const low = typeof ct.low === 'number' ? ct.low : ct.low != null ? Number(ct.low) : undefined;
    const upper = typeof ct.upper === 'number' ? ct.upper : ct.upper != null ? Number(ct.upper) : undefined;
    if (low !== undefined && upper !== undefined) return parsed < low || parsed > upper;
    if (low !== undefined) return parsed < low;
    if (upper !== undefined) return parsed > upper;
    return false;
  }

  const vName = toComparableName(value);
  const options = ct.options || [];
  if (options.length > 0 || ct.defval) {
    if (POSITIVE_LIKE.test(vName)) return true;
    if (NEGATIVE_LIKE.test(vName)) return false;
    if (ct.defval && typeof ct.defval === 'string') {
      return vName.trim().toLowerCase() !== ct.defval.trim().toLowerCase();
    }
  }
  return false;
};

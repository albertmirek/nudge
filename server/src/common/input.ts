import { BadRequestException } from '@nestjs/common';

/** Parse only explicitly writable fields; never pass an HTTP body directly to the ORM. */
export function objectInput(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Expected a JSON object');
  }
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some((key) => !keys.includes(key))) {
    throw new BadRequestException('Unknown field');
  }
  return result;
}

export function textInput(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new BadRequestException(
      `${field} must be a non-empty string of at most ${max} characters`,
    );
  }
  return value.trim();
}

/** Optional free text: `null` or an empty string clears the field. */
export function optionalTextInput(value: unknown, field: string, max: number): string | null {
  if (value === null || value === '') return null;
  return textInput(value, field, max);
}

/** Optional calendar date in YYYY-MM-DD form; `null` or an empty string clears the field. */
export function optionalDateInput(value: unknown, field: string): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${field} must be a YYYY-MM-DD date`);
  }
  // Date.UTC normalizes out-of-range days (Feb 30 -> Mar 2), so round-trip to catch them.
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException(`${field} must be a valid calendar date`);
  }
  return value;
}

/** ISO timestamp that is not in the future (e.g. when contact last happened). */
export function pastTimestampInput(value: unknown, field: string): Date {
  const parsed = typeof value === 'string' ? new Date(value) : new Date(Number.NaN);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${field} must be an ISO timestamp`);
  }
  if (parsed.getTime() > Date.now()) {
    throw new BadRequestException(`${field} cannot be in the future`);
  }
  return parsed;
}

export function booleanInput(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new BadRequestException(`${field} must be a boolean`);
  return value;
}

export function enumInput<T extends string>(
  value: unknown,
  values: readonly T[],
  field: string,
): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value as T;
}

export function revisionInput(value: unknown): number {
  const body = objectInput(value, ['revision']);
  if (
    typeof body.revision !== 'number' ||
    !Number.isSafeInteger(body.revision) ||
    body.revision < 1
  ) {
    throw new BadRequestException('revision must be a positive integer');
  }
  return body.revision;
}

export function noteInput(value: unknown, required: boolean): { note?: string | null } {
  const body = objectInput(value, ['note']);
  if (body.note === undefined) {
    if (required) throw new BadRequestException('note is required');
    return {};
  }
  if (body.note === null || body.note === '') return { note: null };
  return { note: textInput(body.note, 'note', 10000) };
}

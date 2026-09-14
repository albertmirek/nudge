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

import type { ErrorCode, ParseError } from './types.js';

export const errorMessages: Record<ErrorCode, string> = {
  LF001: 'Missing or invalid header line (expected "laneflow" as the first non-blank line)',
  LF002: 'Unsupported version in header',
  LF003: 'Sections appear out of order',
  LF004: 'Invalid direction value (expected "TB" or "LR")',
  LF010: 'Duplicate lane id',
  LF011: 'Malformed lane declaration',
  LF020: 'Unknown lane id in node declaration',
  LF021: 'Duplicate node id',
  LF022: 'Unrecognized shape syntax',
  LF023: 'Empty label inside a shape',
  LF030: 'Unknown node id in flow',
  LF031: 'Malformed arrow',
  LF032: 'Arrow label contains forbidden characters',
  LF999: 'Unexpected token or general syntax error',
};

export function makeError(code: ErrorCode, line: number, detail?: string): ParseError {
  const base = errorMessages[code];
  const message = detail ? `${base}: ${detail}` : base;
  return { code, message, line };
}

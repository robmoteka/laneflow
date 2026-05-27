export type Shape = 'event' | 'endEvent' | 'task' | 'gateway';

export type FlowType = 'sequence' | 'message';

export type Direction = 'TB' | 'LR';

export interface Lane {
  id: string;
  label: string | null;
  line: number;
}

export interface NodeDecl {
  id: string;
  laneId: string;
  shape: Shape;
  label: string;
  line: number;
}

export interface Flow {
  source: string;
  target: string;
  label: string | null;
  flowType: FlowType;
  line: number;
}

export interface Document {
  version: string | null;
  direction: Direction | null;
  lanes: Lane[];
  nodes: NodeDecl[];
  flows: Flow[];
}

export interface ParseError {
  code: ErrorCode;
  message: string;
  line: number;
}

export interface ParseResult {
  document: Document;
  errors: ParseError[];
}

export type ErrorCode =
  | 'LF001'
  | 'LF002'
  | 'LF003'
  | 'LF004'
  | 'LF010'
  | 'LF011'
  | 'LF020'
  | 'LF021'
  | 'LF022'
  | 'LF023'
  | 'LF030'
  | 'LF031'
  | 'LF032'
  | 'LF999';

#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parse } from './parser.js';
import type { ParseError } from './types.js';

const USAGE = `laneflow — reference parser for LaneFlow v0.1

Usage:
  laneflow validate <file>         Parse <file>, print errors, exit 1 if any
  laneflow parse <file> [--json]   Parse <file>, print the AST (JSON if --json)
  laneflow --help                  Show this help

Exit codes:
  0  success / no errors
  1  parse errors found
  2  CLI usage error / file I/O error
`;

function readSource(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`error: cannot read ${path}: ${msg}\n`);
    process.exit(2);
  }
}

function formatErrors(file: string, errors: ParseError[]): string {
  return errors
    .map((e) => `${file}:${e.line}: ${e.code} ${e.message}`)
    .join('\n');
}

function main(argv: string[]): number {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    process.stdout.write(USAGE);
    return argv.length === 0 ? 2 : 0;
  }

  const cmd = argv[0];
  const file = argv[1];

  if (cmd !== 'validate' && cmd !== 'parse') {
    process.stderr.write(`error: unknown command "${cmd}"\n\n${USAGE}`);
    return 2;
  }

  if (!file) {
    process.stderr.write(`error: missing file argument\n\n${USAGE}`);
    return 2;
  }

  const source = readSource(file);
  const result = parse(source);

  if (cmd === 'validate') {
    if (result.errors.length === 0) {
      process.stdout.write(`${file}: OK\n`);
      return 0;
    }
    process.stderr.write(`${formatErrors(file, result.errors)}\n`);
    process.stderr.write(`${result.errors.length} error(s)\n`);
    return 1;
  }

  // cmd === 'parse'
  const json = argv.includes('--json');
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    const d = result.document;
    process.stdout.write(`# LaneFlow document\n`);
    process.stdout.write(`version: ${d.version ?? '(unspecified)'}\n`);
    process.stdout.write(`direction: ${d.direction ?? '(default)'}\n`);
    process.stdout.write(`lanes (${d.lanes.length}):\n`);
    for (const l of d.lanes) {
      process.stdout.write(`  - ${l.id}${l.label ? ` "${l.label}"` : ''}\n`);
    }
    process.stdout.write(`nodes (${d.nodes.length}):\n`);
    for (const n of d.nodes) {
      process.stdout.write(`  - ${n.id} [${n.shape}] in ${n.laneId}: ${n.label}\n`);
    }
    process.stdout.write(`flows (${d.flows.length}):\n`);
    for (const f of d.flows) {
      const lbl = f.label ? ` -- ${f.label} --` : ' --';
      process.stdout.write(`  - ${f.source}${lbl}> ${f.target} (${f.flowType})\n`);
    }
    if (result.errors.length > 0) {
      process.stderr.write(`\n${formatErrors(file, result.errors)}\n`);
      return 1;
    }
  }
  return result.errors.length === 0 ? 0 : 1;
}

process.exit(main(process.argv.slice(2)));

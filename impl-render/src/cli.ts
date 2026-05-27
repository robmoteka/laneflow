#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { renderToSvg, renderToPng } from './index.js';
import type { ThemeName } from './theme.js';

interface Args {
  command: string;
  input?: string;
  output?: string;
  theme: ThemeName;
  direction?: 'TB' | 'LR';
  scale: number;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    command: argv[0] ?? '',
    theme: 'light',
    scale: 1,
    help: false,
  };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o' || a === '--output') {
      args.output = argv[++i];
    } else if (a === '--theme') {
      const v = argv[++i];
      if (v !== 'light' && v !== 'dark') throw new Error(`Unknown theme: ${v}`);
      args.theme = v;
    } else if (a === '--direction') {
      const v = argv[++i];
      if (v !== 'TB' && v !== 'LR') throw new Error(`Unknown direction: ${v}`);
      args.direction = v;
    } else if (a === '--scale') {
      args.scale = Number(argv[++i]);
      if (!Number.isFinite(args.scale) || args.scale <= 0) throw new Error('--scale must be a positive number');
    } else if (a === '-h' || a === '--help') {
      args.help = true;
    } else if (!args.input) {
      args.input = a;
    } else {
      throw new Error(`Unexpected argument: ${a}`);
    }
  }
  return args;
}

const USAGE = `laneflow-render render <file.laneflow> [options]

Options:
  -o, --output <path>    Output file. Format is inferred from extension (.svg or .png).
                         If omitted, SVG is written to stdout.
  --theme <name>         light (default) or dark.
  --direction <TB|LR>    Override the document direction.
  --scale <n>            PNG scale factor (default 1). Ignored for SVG output.
  -h, --help             Show this message.

Examples:
  laneflow-render render diagram.laneflow -o diagram.svg
  laneflow-render render diagram.laneflow -o diagram.png --theme dark --scale 2
`;

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '-h' || argv[0] === '--help') {
    process.stdout.write(USAGE);
    return;
  }

  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(USAGE);
    return;
  }

  if (args.command !== 'render') {
    process.stderr.write(`Unknown command: ${args.command}\n\n${USAGE}`);
    process.exit(2);
  }
  if (!args.input) {
    process.stderr.write(`Missing input file.\n\n${USAGE}`);
    process.exit(2);
  }

  const source = readFileSync(resolve(args.input), 'utf8');
  const format = inferFormat(args.output);

  if (format === 'svg') {
    const svg = renderToSvg(source, { theme: args.theme, direction: args.direction });
    if (args.output) writeFileSync(resolve(args.output), svg);
    else process.stdout.write(svg);
    return;
  }

  const png = renderToPng(source, {
    theme: args.theme,
    direction: args.direction,
    scale: args.scale,
  });
  if (!args.output) {
    process.stderr.write('PNG output requires -o <file.png>.\n');
    process.exit(2);
  }
  writeFileSync(resolve(args.output), png);
}

function inferFormat(output: string | undefined): 'svg' | 'png' {
  if (!output) return 'svg';
  const ext = extname(output).toLowerCase();
  if (ext === '.png') return 'png';
  return 'svg';
}

try {
  main();
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}

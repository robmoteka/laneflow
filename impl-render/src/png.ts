import { Resvg } from '@resvg/resvg-js';

export function renderPng(svg: string, scale = 1): Uint8Array {
  const resvg = new Resvg(svg, {
    fitTo: scale === 1 ? { mode: 'original' } : { mode: 'zoom', value: scale },
    background: 'rgba(0, 0, 0, 0)',
  });
  return resvg.render().asPng();
}

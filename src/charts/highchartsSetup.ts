// Highcharts 13 ships two builds: the root `highcharts/*` files are UMD
// (they expect a `window.Highcharts`/CJS global and, when pulled through
// Vite's ESM pipeline, resolve to a factory result rather than a callable
// init function — calling it throws "HighchartsMore is not a function").
// The `highcharts/esm/*` build is real ESM: each module file does
// `import * as Highcharts from './highcharts.js'` internally and registers
// itself against that shared singleton as a side effect of being imported —
// there is nothing to call. Every import below (main + modules) must resolve
// through the `esm/` subpath so they all share the exact same singleton;
// mixing root (`highcharts/highcharts-more`) and `esm/` imports would create
// two independent Highcharts instances and modules would silently fail to
// attach to the one actually rendering charts.
import Highcharts from 'highcharts/esm/highcharts';
import 'highcharts/esm/highcharts-more';
import 'highcharts/esm/highcharts-3d';
import 'highcharts/esm/modules/solid-gauge';
import 'highcharts/esm/modules/accessibility';
import 'highcharts/esm/modules/exporting';
import HighchartsReactImport from 'highcharts-react-official';

type HighchartsReactComponentType = typeof HighchartsReactImport;

// `highcharts-react-official` ships a UMD bundle whose CJS exports object is
// itself `{ default: <component> }` (for compatibility with `import {
// HighchartsReact } from ...`). Vite's dependency pre-bundler converts that
// UMD file to ESM by exporting the raw CJS exports object as the module's
// own `default` binding, without a second unwrap — so a plain `import
// HighchartsReact from 'highcharts-react-official'` resolves one level too
// shallow (an object, not the component), and React throws "Element type is
// invalid ... got: object" the moment it's rendered. Confirmed by inspecting
// the resolved module shape in a real browser (not assumed). Every chart
// page must import the component from here instead of the package directly.
export const HighchartsReact: HighchartsReactComponentType =
  (HighchartsReactImport as unknown as { default?: HighchartsReactComponentType }).default ?? HighchartsReactImport;

// Medical design-system chart theme — flat, desaturated, no default Highcharts branding colors.
Highcharts.setOptions({
  chart: {
    style: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
    backgroundColor: 'transparent',
  },
  colors: ['#1e5e9e', '#2878c8', '#5da9ea', '#238a57', '#b7791f', '#c83e4d', '#8792a2'],
  title: { style: { display: 'none' } },
  credits: { enabled: false },
  legend: { itemStyle: { color: '#5f6b7a', fontWeight: '500', fontSize: '12px' } },
  xAxis: {
    lineColor: '#dce4ec',
    tickColor: '#dce4ec',
    labels: { style: { color: '#8792a2', fontSize: '11px' } },
  },
  yAxis: {
    gridLineColor: '#eef2f6',
    labels: { style: { color: '#8792a2', fontSize: '11px' } },
    title: { text: undefined },
  },
  tooltip: {
    backgroundColor: '#172033',
    style: { color: '#ffffff', fontSize: '12px' },
    borderWidth: 0,
    borderRadius: 8,
  },
  plotOptions: {
    series: { animation: { duration: 400 } },
    area: { fillOpacity: 0.12 },
  },
  // Applies to every chart built on this shared instance: on narrow
  // viewports (tablet/mobile), flatten the 3D perspective and shrink the
  // legend instead of letting a tilted chart overflow its card.
  responsive: {
    rules: [
      {
        condition: { maxWidth: 640 },
        chartOptions: {
          chart: { options3d: { alpha: 6, beta: 6, depth: 40 } },
          legend: { itemStyle: { fontSize: '10px' } },
        },
      },
    ],
  },
});

/** Shared 3D projection settings for pie/column charts — call inside a
 * chart's `chart` option, e.g. `chart: { type: 'column', ...chart3dDefaults }`. */
export const chart3dDefaults = {
  options3d: { enabled: true, alpha: 12, beta: 18, depth: 60, viewDistance: 60 },
};

export default Highcharts;

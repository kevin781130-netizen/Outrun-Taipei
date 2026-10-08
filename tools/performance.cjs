'use strict';
// V54: repeatable fixed-state renderer benchmark (not a real-device FPS claim).
// Run: CHROMIUM_PATH=/usr/bin/chromium node tools/performance.cjs
// Options: PERF_SAMPLES=60 PERF_OUTPUT=test-results/performance.json
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require(
  process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright'
    : 'playwright'
);

const sourcePath = path.resolve(process.env.PERF_INDEX || path.join(__dirname, '..', 'index.html'));
const reportPath = path.resolve(process.env.PERF_OUTPUT || path.join(__dirname, '..', 'test-results', 'performance.json'));
const samples = Number(process.env.PERF_SAMPLES || 60);
const warmup = 20;
if (!Number.isInteger(samples) || samples < 20 || samples > 1000) {
  throw new Error('PERF_SAMPLES must be an integer between 20 and 1000');
}
const source = fs.readFileSync(sourcePath, 'utf8');
const marker = 'applyRuleLabels(); resetGame(); updateHUD(); drawRouteMap(); render(0);';
if (!source.includes(marker)) throw new Error('Benchmark hook marker is missing');
const injected = source.replace(marker, 'window.__audit=code=>eval(code);' + marker);
const server = http.createServer((_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(injected);
});
const p95 = sorted => sorted[Math.ceil(sorted.length * 0.95) - 1];

(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const launchOptions = { headless: true };
    if (process.env.CHROMIUM_PATH) launchOptions.executablePath = process.env.CHROMIUM_PATH;
    browser = await chromium.launch(launchOptions);
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.__benchmarkRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = () => 0; // Disable the normal game loop only.
      let seed = 540;
      Math.random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
    });
    await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'load' });
    const run = code => page.evaluate(expression => window.__audit(expression), code);
    const routes = await run('STAGES.flat().map(stage => stage.id)');
    if (routes.length !== 15 || new Set(routes).size !== 15 ||
        routes.some(id => !/^[0-9][A-Z]$/.test(id))) {
      throw new Error('Expected exactly 15 unique route IDs');
    }
    const rows = [];
    const setup = (id, mood) =>
      "(()=>{const start=performance.now();" +
      "v34Mode='cruise';selectedRoute=routeForId('" + id + "');" +
      "skyMood='" + mood + "';resetGame();gameStarted=true;raceActive=true;" +
      "paused=false;gameOver=false;inRadioScreen=false;" +
      "overlay.classList.add('hidden');speed=220;playerX=0;" +
      "playerZ=200*SEGMENT_LENGTH;simulationTime=10;" +
      "traffic.forEach((car,i)=>{car.z=playerZ+(15+i*8)*SEGMENT_LENGTH;" +
      "car.x=(i%3-1)*.55;car.laneTarget=car.x;});" +
      "return performance.now()-start;})()";
    for (const id of routes) {
      for (const mood of ['sunset', 'neon']) {
        const sceneSetupMs = await run(setup(id, mood));
        const coldRenderMs = await run("(()=>{const started=performance.now();render(0);return performance.now()-started;})()");
        const renderStats = await run(`(()=>{
          for(let i=0;i<${warmup};i++)render(0);
          const times=[];
          for(let i=0;i<${samples};i++){
            const start=performance.now();render(0);
            times.push(performance.now()-start);
          }
          times.sort((a,b)=>a-b);
          return {
            renderMeanMs:times.reduce((a,b)=>a+b,0)/times.length,
            renderP95Ms:times[Math.ceil(times.length*.95)-1],
            cache:typeof v54CacheStats==='function'?v54CacheStats():null
          };
        })()`);
        const frameStats = await run(`new Promise(resolve=>{
          let previous=null;const intervals=[];
          function frame(timestamp){
            if(previous!==null)intervals.push(timestamp-previous);
            previous=timestamp;render(0);
            if(intervals.length<${samples})window.__benchmarkRAF(frame);
            else {
              intervals.sort((a,b)=>a-b);
              resolve({
                rafFps:1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length),
                frameP95Ms:intervals[Math.ceil(intervals.length*.95)-1]
              });
            }
          }
          window.__benchmarkRAF(frame);
        })`);
        rows.push({ id, mood, segment: 200, speed: 220, sceneSetupMs, coldRenderMs, ...renderStats, ...frameStats });
        console.log(id + '/' + mood + ' render=' + renderStats.renderMeanMs.toFixed(2) +
          'ms frameP95=' + frameStats.frameP95Ms.toFixed(2) + 'ms');
      }
    }
    // Post-GC JS heap is NOT browser RSS, GPU memory, or full device memory.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const memory = [];
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const id of routes) {
        for (const mood of ['sunset', 'neon']) {
          await run(setup(id, mood));
          await run('render(0)');
        }
      }
      await cdp.send('HeapProfiler.collectGarbage');
      const { metrics } = await cdp.send('Performance.getMetrics');
      memory.push({
        cycle,
        jsHeapUsedBytes: metrics.find(item => item.name === 'JSHeapUsedSize')?.value ?? null,
        cache: await run("typeof v54CacheStats==='function'?v54CacheStats():null")
      });
    }
    if (errors.length) throw new Error('Browser runtime errors:\n' + errors.join('\n'));
    const report = {
      schema: 1,
      sourceSHA256: crypto.createHash('sha256').update(source).digest('hex'),
      browser: browser.version(),
      device: 'Headless Chromium desktop; not physical phone hardware',
      viewport: { width: 1280, height: 800 },
      samples,
      warmup,
      measurement: 'Fixed-state render CPU; RAF cadence without game update; post-GC JS heap',
      coldStartMeasurement: 'Route setup includes resetGame and landmark build; first render timed before warmup',
      rows,
      memory,
      runtimeErrors: errors
    };
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    console.log('Benchmark saved to ' + reportPath);
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

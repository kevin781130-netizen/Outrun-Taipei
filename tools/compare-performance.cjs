'use strict';
// Compare measurements from the same hardware/browser/scene matrix.
// Usage: node tools/compare-performance.cjs test-results/before.json test-results/after.json
const fs = require('node:fs');
const path = require('node:path');

function readReport(filename) {
  const report = JSON.parse(fs.readFileSync(path.resolve(filename), 'utf8'));
  if (report.schema !== 1 || !Array.isArray(report.rows) || report.rows.length !== 30) {
    throw new Error(filename + ': expected schema 1 with 30 scene measurements');
  }
  if (!Array.isArray(report.memory) || report.memory.length !== 3) {
    throw new Error(filename + ': expected three post-GC memory samples');
  }
  if (!/^[a-f0-9]{64}$/i.test(report.sourceSHA256 || '')) {
    throw new Error(filename + ': source hash is missing or invalid');
  }
  const sceneKeys = new Set();
  for (const row of report.rows) {
    if (!/^[1-5][A-E]$/.test(row.id) || !['sunset', 'neon'].includes(row.mood)) {
      throw new Error(filename + ': invalid scene ID or mood');
    }
    const key = row.id + '/' + row.mood;
    if (sceneKeys.has(key)) throw new Error(filename + ': duplicate scene ' + key);
    sceneKeys.add(key);
    for (const field of ['renderMeanMs', 'renderP95Ms', 'frameP95Ms', 'rafFps']) {
      if (!Number.isFinite(row[field]) || row[field] <= 0) {
        throw new Error(filename + ': invalid ' + field + ' in ' + key);
      }
    }
    for (const field of ['sceneSetupMs', 'coldRenderMs']) {
      if (field in row && (!Number.isFinite(row[field]) || row[field] < 0)) {
        throw new Error(filename + ': invalid ' + field + ' in ' + key);
      }
    }
  }
  if (sceneKeys.size !== 30) throw new Error(filename + ': incomplete scene matrix');
  return report;
}

function compare(before, after) {
  for (const field of ['schema', 'browser', 'samples', 'warmup', 'device', 'measurement']) {
    if (before[field] !== after[field]) throw new Error('Incompatible reports: ' + field);
  }
  if (JSON.stringify(before.viewport) !== JSON.stringify(after.viewport)) {
    throw new Error('Incompatible reports: viewport');
  }
  const hasCold = before.rows.every(row=>Number.isFinite(row.sceneSetupMs)&&Number.isFinite(row.coldRenderMs)) &&
    after.rows.every(row=>Number.isFinite(row.sceneSetupMs)&&Number.isFinite(row.coldRenderMs));
  const anyCold = [...before.rows,...after.rows].some(row=>'sceneSetupMs' in row||'coldRenderMs' in row);
  if(anyCold&&!hasCold)throw new Error('Incompatible reports: cold-start metrics coverage');
  const oldRows = new Map(before.rows.map(row => [row.id + '/' + row.mood, row]));
  const rows = after.rows.map(next => {
    const key = next.id + '/' + next.mood;
    const old = oldRows.get(key);
    if (!old) throw new Error('Missing baseline scene: ' + key);
    for (const field of ['segment', 'speed']) {
      if (old[field] !== next[field]) throw new Error('Scene state differs: ' + key + '/' + field);
    }
    return {
      scene: key,
      beforeMeanMs: old.renderMeanMs,
      afterMeanMs: next.renderMeanMs,
      beforeRenderP95Ms: old.renderP95Ms,
      afterRenderP95Ms: next.renderP95Ms,
      improvementPercent: (1 - next.renderMeanMs / old.renderMeanMs) * 100,
      beforeFrameP95Ms: old.frameP95Ms,
      afterFrameP95Ms: next.frameP95Ms,
      beforeRafFps: old.rafFps,
      afterRafFps: next.rafFps,
      ...(hasCold?{
        beforeSceneSetupMs:old.sceneSetupMs,
        afterSceneSetupMs:next.sceneSetupMs,
        beforeColdRenderMs:old.coldRenderMs,
        afterColdRenderMs:next.coldRenderMs
      }:{})
    };
  });
  const mean = arr => arr.reduce((sum, value) => sum + value, 0) / arr.length;
  const beforeMean = mean(rows.map(row => row.beforeMeanMs));
  const afterMean = mean(rows.map(row => row.afterMeanMs));
  return {
    schema: 1,
    sourceSHA256: { before: before.sourceSHA256, after: after.sourceSHA256 },
    comparedScenes: rows.length,
    beforeMeanRenderMs: beforeMean,
    afterMeanRenderMs: afterMean,
    aggregateRenderImprovementPercent: (1 - afterMean / beforeMean) * 100,
    meetsAggregate20PercentTarget: afterMean <= beforeMean * 0.8,
    coldStartAvailable:hasCold,
    coldStart:hasCold?{
      beforeMeanSceneSetupMs:mean(rows.map(row=>row.beforeSceneSetupMs)),
      afterMeanSceneSetupMs:mean(rows.map(row=>row.afterSceneSetupMs)),
      beforeMeanFirstRenderMs:mean(rows.map(row=>row.beforeColdRenderMs)),
      afterMeanFirstRenderMs:mean(rows.map(row=>row.afterColdRenderMs))
    }:null,
    regressedScenes: rows.filter(row => row.improvementPercent < 0).map(row => row.scene),
    rows,
    memory: {
      beforePostGcHeapBytes: before.memory.map(item => item.jsHeapUsedBytes),
      afterPostGcHeapBytes: after.memory.map(item => item.jsHeapUsedBytes)
    },
    limitations: [
      'Only identical headless Chromium environments should be compared.',
      'RAF cadence excludes game simulation updates and is not real gameplay FPS.',
      'JS heap is not total browser/GPU memory; mobile testing is not covered.',
      'Visual parity and published Web acceptance require separate verification.'
    ]
  };
}

if (require.main === module) {
  if (process.argv.length !== 4) {
    console.error('Usage: node tools/compare-performance.cjs BEFORE.json AFTER.json');
    process.exitCode = 2;
  } else {
    try {
      const report = compare(readReport(process.argv[2]), readReport(process.argv[3]));
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
module.exports = { compare, readReport };

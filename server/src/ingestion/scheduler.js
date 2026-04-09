/**
 * Ingestion Scheduler
 * Uses node-cron to run data ingestion workers on a schedule.
 * Imported once in src/index.js.
 */

const cron = require('node-cron');
const ticketmaster = require('./ticketmaster');
const chicagoOpenData = require('./chicago-open-data');
const predicthq = require('./predicthq');
const { run: runDataQuality } = require('../services/ai/agents/dataQualityAgent');
const suburbsIcal = require('./suburbs-ical');

async function runAll() {
  try { await ticketmaster(); } catch (err) { console.error('[scheduler] Ticketmaster failed:', err.message); }
  try { await predicthq(); } catch (err) { console.error('[scheduler] PredictHQ failed:', err.message); }
  try { await chicagoOpenData(); } catch (err) { console.error('[scheduler] Chicago Open Data failed:', err.message); }
}

function start() {
  // Run immediately on startup so data is fresh after each deploy
  console.log('[scheduler] Running initial ingestion on startup...');
  runAll();

  // Ticketmaster — every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('[scheduler] Running Ticketmaster ingestion...');
    try { await ticketmaster(); }
    catch (err) { console.error('[scheduler] Ticketmaster failed:', err.message); }
  });

  // PredictHQ — every 12 hours (free tier: 100 req/day)
  cron.schedule('0 */12 * * *', async () => {
    console.log('[scheduler] Running PredictHQ ingestion...');
    try { await predicthq(); }
    catch (err) { console.error('[scheduler] PredictHQ failed:', err.message); }
  });

  // Chicago Open Data — daily at 3am
  cron.schedule('0 3 * * *', async () => {
    console.log('[scheduler] Running Chicago Open Data ingestion...');
    try { await chicagoOpenData(); }
    catch (err) { console.error('[scheduler] Chicago Open Data failed:', err.message); }
  });

  // Suburban iCal feeds — daily at 3am
  cron.schedule('30 3 * * *', async () => {
    console.log('[scheduler] Running suburban iCal ingestion…');
    try { await suburbsIcal(); }
    catch (err) { console.error('[scheduler] Suburbs iCal failed:', err.message); }
  });

  // Data Quality Agent — nightly at 2am
  cron.schedule('0 2 * * *', async () => {
    console.log('[scheduler] Running data quality pass…');
    try { await runDataQuality(); }
    catch (err) { console.error('[scheduler] Data quality failed:', err.message); }
  });

  console.log('[scheduler] Cron jobs registered. Ticketmaster=6h, PredictHQ=12h, OpenData=3am, SuburbsIcal=3:30am, DataQuality=2am');
}

module.exports = { start };

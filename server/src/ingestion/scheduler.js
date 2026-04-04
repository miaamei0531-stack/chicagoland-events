/**
 * Ingestion Scheduler
 * Uses node-cron to run data ingestion workers on a schedule.
 * Imported once in src/index.js.
 */

const cron = require('node-cron');
const eventbrite = require('./eventbrite');
const chicagoOpenData = require('./chicago-open-data');

function start() {
  // Eventbrite — every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('[scheduler] Running Eventbrite ingestion...');
    try { await eventbrite(); }
    catch (err) { console.error('[scheduler] Eventbrite failed:', err.message); }
  });

  // Chicago Open Data — daily at 3am
  cron.schedule('0 3 * * *', async () => {
    console.log('[scheduler] Running Chicago Open Data ingestion...');
    try { await chicagoOpenData(); }
    catch (err) { console.error('[scheduler] Chicago Open Data failed:', err.message); }
  });

  console.log('[scheduler] Cron jobs registered. Eventbrite=every 6h, OpenData=daily 3am');
}

module.exports = { start };

/**
 * Manual ingestion trigger endpoints — for testing only.
 * Hit these to run a worker immediately without waiting for cron.
 *
 * POST /api/v1/ingest/eventbrite
 * POST /api/v1/ingest/chicago-open-data
 */

const router = require('express').Router();
const ticketmaster = require('../ingestion/ticketmaster');
const chicagoOpenData = require('../ingestion/chicago-open-data');

router.post('/ticketmaster', async (req, res) => {
  try {
    const summary = await ticketmaster();
    res.json({ ok: true, ...summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/chicago-open-data', async (req, res) => {
  try {
    const summary = await chicagoOpenData();
    res.json({ ok: true, ...summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

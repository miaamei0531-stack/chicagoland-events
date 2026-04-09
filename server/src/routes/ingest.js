/**
 * Manual ingestion trigger endpoints — for testing only.
 * Responds immediately with 202, runs ingestion in the background.
 *
 * POST /api/v1/ingest/ticketmaster
 * POST /api/v1/ingest/predicthq
 * POST /api/v1/ingest/chicago-open-data
 */

const router = require('express').Router();
const ticketmaster = require('../ingestion/ticketmaster');
const chicagoOpenData = require('../ingestion/chicago-open-data');
const predicthq = require('../ingestion/predicthq');
const suburbsIcal = require('../ingestion/suburbs-ical');
const { run: runDataQuality } = require('../services/ai/agents/dataQualityAgent');

function fireAndForget(name, fn, res) {
  res.json({ ok: true, message: `${name} ingestion started in background — check Railway logs for results` });
  fn().then((summary) => {
    console.log(`[ingest/${name}] complete:`, summary);
  }).catch((err) => {
    console.error(`[ingest/${name}] failed:`, err.message);
  });
}

router.post('/ticketmaster', (req, res) => {
  fireAndForget('ticketmaster', ticketmaster, res);
});

router.post('/chicago-open-data', (req, res) => {
  fireAndForget('chicago-open-data', chicagoOpenData, res);
});

router.post('/predicthq', (req, res) => {
  fireAndForget('predicthq', predicthq, res);
});

router.post('/suburbs', (req, res) => {
  fireAndForget('suburbs-ical', suburbsIcal, res);
});

router.post('/data-quality', (req, res) => {
  fireAndForget('data-quality', runDataQuality, res);
});

module.exports = router;

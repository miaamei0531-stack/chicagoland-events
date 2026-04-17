const router = require('express').Router();

router.get('/health', (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  res.json({
    status: 'ok',
    timestamp: new Date(),
    anthropic_key_set: !!key,
    anthropic_key_prefix: key ? key.slice(0, 10) + '...' : null,
  });
});

module.exports = router;

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Verifies Supabase JWT from Authorization: Bearer <token>
async function checkAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

// Extends checkAuth — also checks users.is_admin = TRUE
async function checkAdmin(req, res, next) {
  await checkAuth(req, res, async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !data?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.adminUser = data;
    next();
  });
}

module.exports = { checkAuth, checkAdmin };

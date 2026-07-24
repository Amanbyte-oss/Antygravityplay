const SUPABASE_URL = 'https://oropqrxbsgzluauvmllz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yb3Bxcnhic2d6bHVhdXZtbGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MDQ0MjcsImV4cCI6MjEwMDI4MDQyN30.W0fvGAVSUrTv9MWjV3hThCN7lcnzgSwm_M8gUxX8zOs';

module.exports = async (req, res) => {
  const path = req.query.path || '/videos?select=*&order=created_at.desc';
  const url = SUPABASE_URL + '/rest/v1' + path;
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Accept': 'application/json'
      }
    });
    const data = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
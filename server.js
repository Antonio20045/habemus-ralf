const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const app = express();
app.use((req, res, next) => {
  if ((req.headers.host || "").startsWith("habemus-ralf")) return res.redirect(301, "https://ralf-geburtstag.onrender.com" + req.originalUrl);
  next();
});
app.use(express.json());
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) res.on("finish", () => console.log(new Date().toISOString(), req.method, req.path, res.statusCode));
  next();
});
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false });
const IMG_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_39D0KSypCuHJsfWF7pCt6O8TFgd/hf_20260716_100007_649c28bf-f489-4bdf-96e9-bcb6d9f062b6.png";
app.get("/papst-ralf.png", (_q, res) => res.redirect(302, IMG_URL));
app.get("/api/entries", async (_q, res) => {
  try { const r = await pool.query("SELECT id, name, msg, created_at FROM entries ORDER BY id DESC LIMIT 500"); res.json({ entries: r.rows }); }
  catch (e) { res.status(500).json({ error: "db" }); }
});
app.post("/api/entries", async (q, res) => {
  try {
    const name = String(q.body.name || "").trim().slice(0, 60);
    const msg = String(q.body.msg || "").trim().slice(0, 8000);
    if (!name || !msg) return res.status(400).json({ error: "missing" });
    await pool.query("INSERT INTO entries (name, msg) VALUES ($1, $2)", [name, msg]);
    const r = await pool.query("SELECT id, name, msg FROM entries ORDER BY id DESC LIMIT 500");
    res.json({ entries: r.rows });
  } catch (e) { res.status(500).json({ error: "db" }); }
});
app.get("/api/scores", async (_q, res) => {
  try { const r = await pool.query("SELECT name, score FROM scores ORDER BY score DESC, id ASC LIMIT 10"); res.json({ scores: r.rows }); }
  catch (e) { res.status(500).json({ error: "db" }); }
});
app.post("/api/scores", async (q, res) => {
  try {
    const name = String(q.body.name || "").trim().slice(0, 40);
    const score = Math.max(0, Math.min(1000000, parseInt(q.body.score, 10) || 0));
    if (!name) return res.status(400).json({ error: "missing" });
    await pool.query("INSERT INTO scores (name, score) VALUES ($1, $2)", [name, score]);
    const r = await pool.query("SELECT name, score FROM scores ORDER BY score DESC, id ASC LIMIT 10");
    res.json({ scores: r.rows });
  } catch (e) { res.status(500).json({ error: "db" }); }
});
app.get("/api/cleanup-q7v2", async (_q, res) => {
  try {
    await pool.query("DELETE FROM entries WHERE id = 6");
    const r = await pool.query("SELECT id, name FROM entries ORDER BY id DESC LIMIT 20");
    res.json({ done: true, entries: r.rows });
  } catch (e) { res.status(500).json({ error: "db" }); }
});
app.get("*", (_q, res) => res.sendFile(path.join(__dirname, "index.html")));
const port = process.env.PORT || 3000;
const SELF_URL = process.env.RENDER_EXTERNAL_URL;
if (SELF_URL) setInterval(() => { fetch(SELF_URL).catch(() => {}); }, 5 * 60 * 1000);
const init = async () => {
  try { await pool.query("CREATE TABLE IF NOT EXISTS entries (id SERIAL PRIMARY KEY, name TEXT NOT NULL, msg TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now())"); } catch (e) {}
  try { await pool.query("CREATE TABLE IF NOT EXISTS scores (id SERIAL PRIMARY KEY, name TEXT NOT NULL, score INTEGER NOT NULL, created_at TIMESTAMPTZ DEFAULT now())"); } catch (e) {}
  app.listen(port, () => console.log("up " + port));
};
init();

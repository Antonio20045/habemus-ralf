const express = require("express");
const { Pool } = require("pg");
const app = express();
app.use(express.json());
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false });
const PAGE_URL = "https://d2ol7oe51mr4n9.cloudfront.net/user_39D0KSypCuHJsfWF7pCt6O8TFgd/d1fd7887-0101-4362-b9e3-782ecf62f0b6.txt";
const IMG_URL = "https://d2ol7oe51mr4n9.cloudfront.net/user_39D0KSypCuHJsfWF7pCt6O8TFgd/hf_20260715_202804_8f0ad4e4-54fb-4b1c-909d-e160850eb205.png";
let cache = null;
async function page() { if (!cache) cache = await fetch(PAGE_URL).then(r => r.text()); return cache; }
app.get("/papst-ralf.png", (_q, res) => res.redirect(302, IMG_URL));
app.get("/api/entries", async (_q, res) => {
  try { const r = await pool.query("SELECT id, name, msg FROM entries ORDER BY id DESC LIMIT 500"); res.json({ entries: r.rows }); }
  catch (e) { res.status(500).json({ error: "db" }); }
});
app.post("/api/entries", async (q, res) => {
  try {
    const name = String(q.body.name || "").trim().slice(0, 60);
    const msg = String(q.body.msg || "").trim().slice(0, 600);
    if (!name || !msg) return res.status(400).json({ error: "missing" });
    await pool.query("INSERT INTO entries (name, msg) VALUES ($1, $2)", [name, msg]);
    const r = await pool.query("SELECT id, name, msg FROM entries ORDER BY id DESC LIMIT 500");
    res.json({ entries: r.rows });
  } catch (e) { res.status(500).json({ error: "db" }); }
});
app.get("*", async (_q, res) => { try { res.type("html").send(await page()); } catch (e) { res.status(500).send("Seite konnte nicht geladen werden."); } });
const port = process.env.PORT || 3000;
pool.query("CREATE TABLE IF NOT EXISTS entries (id SERIAL PRIMARY KEY, name TEXT NOT NULL, msg TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now())").catch(() => {}).finally(() => app.listen(port, () => console.log("up " + port)));

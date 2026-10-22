export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.SITE_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!supabaseUrl || !serviceKey || !adminPassword) {
    return res.status(500).json({ error: "Сервер не настроен: проверьте переменные окружения." });
  }

  const restUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/applications`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json"
  };

  if (req.method === "POST") {
    const b = req.body || {};
    const name = String(b.name || "").trim();
    const age = Number(b.age);
    const streamer = String(b.streamer || "").trim();
    const webcam = String(b.webcam || "").trim();
    const watching = String(b.watching || "").trim();
    const discord = String(b.discord || "").trim();
    const idea = String(b.idea || "").trim();
    if (!name || !Number.isInteger(age) || age < 13 || age > 99 ||
        !streamer || webcam !== "Да" || !watching || !discord) {
      return res.status(400).json({ error: "Проверьте обязательные поля. Нужна работающая веб-камера." });
    }
    try {
      const parsed = new URL(discord);
      if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("bad url");
    } catch {
      return res.status(400).json({ error: "Укажите корректную ссылку Discord." });
    }
    const response = await fetch(restUrl, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ name, age, streamer, webcam, watching, discord, idea })
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Supabase insert failed", response.status, detail);
      return res.status(502).json({ error: "Не удалось сохранить заявку. Попробуйте позже." });
    }
    return res.status(201).json({ ok: true });
  }

  if (req.method === "GET") {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (token.length !== adminPassword.length ||
        !cryptoSafeEqual(token, adminPassword)) {
      return res.status(401).json({ error: "Неверный пароль организатора." });
    }
    const response = await fetch(`${restUrl}?select=id,created_at,name,age,streamer,webcam,watching,discord,idea&order=created_at.desc&limit=500`, { headers });
    if (!response.ok) {
      console.error("Supabase select failed", response.status, await response.text());
      return res.status(502).json({ error: "Не удалось получить заявки из базы." });
    }
    return res.status(200).json({ applications: await response.json() });
  }
  res.setHeader("Allow", "GET, POST, OPTIONS");
  return res.status(405).json({ error: "Метод не поддерживается." });
}
function cryptoSafeEqual(a, b) {
  // Constant-time comparison for same-length strings.
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

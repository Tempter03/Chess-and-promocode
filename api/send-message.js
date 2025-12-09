export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN не задан' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (error) {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
  }

  const { chatId, text } = body || {};
  if (!chatId || !text) {
    res.status(400).json({ error: 'chatId и text обязательны' });
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.description || 'Telegram API error');
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram send error', error);
    res.status(500).json({ error: 'Не удалось отправить сообщение в Telegram' });
  }
}


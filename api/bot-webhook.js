const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.TELEGRAM_WEBAPP_URL;

async function sendTelegram(chatId, text, extra = {}) {
  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.description || 'Telegram API error');
  }
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!TOKEN) {
    res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN не задан' });
    return;
  }
  if (!WEBAPP_URL) {
    res.status(500).json({ error: 'TELEGRAM_WEBAPP_URL не задан' });
    return;
  }

  const update = req.body;
  const message = update?.message;
  const chatId = message?.chat?.id;
  const text = message?.text || '';

  if (!chatId) {
    res.status(200).json({ ok: true });
    return;
  }

  // Приветствие на /start с кнопкой для запуска WebApp
  if (text.startsWith('/start')) {
    try {
      await sendTelegram(chatId, 'Добро пожаловать! Запускайте игру:', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Запустить игру',
                web_app: { url: WEBAPP_URL },
              },
            ],
          ],
        },
      });
    } catch (error) {
      console.error('Send welcome error', error);
    }
  }

  // Всегда отвечаем 200, чтобы Telegram считал апдейт обработанным
  res.status(200).json({ ok: true });
}


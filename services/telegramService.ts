import { config } from '../config';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export const shareToTelegram = async (message: string): Promise<{ ok: boolean, error?: string }> => {
  const { telegramBotToken, telegramChannelId } = config;
  const placeholderChannelId = 'PASTE_YOUR_CHANNEL_ID_HERE';

  if (!telegramBotToken || telegramBotToken === 'YOUR_TELEGRAM_BOT_TOKEN') {
    const errorMsg = 'Telegram Bot Token is not configured in config.ts.';
    console.error(errorMsg);
    return { ok: false, error: errorMsg };
  }

  // Explicitly check for the placeholder value to ensure it has been configured.
  if (telegramChannelId === placeholderChannelId || !telegramChannelId) {
    const errorMsg = `Telegram Channel ID is not configured. Please open config.ts and replace '${placeholderChannelId}' with your actual channel ID.`;
    console.error(errorMsg);
    return { ok: false, error: errorMsg };
  }

  const url = `${TELEGRAM_API_BASE}${telegramBotToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramChannelId,
        text: message,
        parse_mode: 'Markdown', // Using Markdown for formatting
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      // Use JSON.stringify for console logging to prevent '[object Object]' and provide a clear, debuggable error.
      console.error('Telegram API Error:', JSON.stringify(result, null, 2));
      // Return the user-friendly description string from the API response for the UI.
      return { ok: false, error: result.description || 'An unknown error occurred with the Telegram API.' };
    }

    return { ok: true };
  } catch (error) {
    console.error('Failed to send message to Telegram:', error);
    let errorMessage = 'An unknown network error occurred.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { ok: false, error: errorMessage };
  }
};
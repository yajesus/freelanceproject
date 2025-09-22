// utils/telegram.ts

import { TELEGRAM_BOT_AUTO_REPLY } from './consts';
import { InvoiceItem } from './types';

const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN;

/**
 * Escapes special characters for Telegram's MarkdownV2 format
 * @param text The text to escape
 * @returns The escaped text
 */
export function escapeMarkdownV2(text: string): string {
  // Characters that need to be escaped in MarkdownV2
  const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];

  let escaped = text;

  // Escape each special character
  specialChars.forEach((char) => {
    const regex = new RegExp(`\\${char}`, 'g');
    escaped = escaped.replace(regex, `\\${char}`);
  });

  return escaped;
}

/**
 * Creates a payment invoice link in Telegram
 * @param item The invoice item data
 * @returns The invoice link or null if creation failed
 */
export async function createInvoiceLink(item: InvoiceItem): Promise<string | null> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('Telegram bot token is missing');
    }

    if (!item.name || !item.description || !item.prices || item.prices.length === 0) {
      throw new Error('Missing required invoice data');
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`;

    const formdata = new FormData();
    formdata.append('title', item.name);
    formdata.append('description', item.description);
    formdata.append('payload', item.payload || '{}');
    formdata.append('provider_token', item.provider_token || '');
    formdata.append('currency', item.currency || 'XTR');
    formdata.append('prices', JSON.stringify(item.prices));
    console.log(formdata);

    const response = await fetch(url, {
      method: 'POST',
      body: formdata
    });

    const data = await response.json();
    console.log('Invoice data:', data);

    if (!data.ok) {
      return null;
    }

    return data.result; // Invoice link
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Invoice creation failed:', errorMessage);
    return null;
  }
}

/**
 * Sends a message to a Telegram user
 * @param chatId The Telegram chat ID
 * @param text Custom message text in MarkdownV2
 * @returns Success status
 */
export async function sendMessageToUser(
  chatId: number,
  text?: string,
  button?: string,
  buttonLink?: string
): Promise<boolean> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('Telegram bot token is missing');
    }

    if (!chatId) {
      throw new Error('Invalid chat ID');
    }

    const messageText = text || TELEGRAM_BOT_AUTO_REPLY;
    const escapedText = escapeMarkdownV2(messageText);

    const formdata = new FormData();
    formdata.append('chat_id', chatId.toString());
    formdata.append('text', escapedText);
    formdata.append('parse_mode', 'MarkdownV2');

    if (button && buttonLink) {
      formdata.append('reply_markup', JSON.stringify({ inline_keyboard: [[{ text: button, url: buttonLink }]] }));
    }

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      body: formdata,
      redirect: 'follow' as RequestRedirect
    });

    const data = await response.json();
    console.log('Send message response:', data);

    // Check if Telegram API returned success
    if (!response.ok || !data.ok) {
      console.error(`Telegram API error for chat ${chatId}:`, data.description || 'Unknown error');
      throw new Error(data.description || 'Unknown error');
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to send message to chat ${chatId}:`, errorMessage);
    return false;
  }
}

/**
 * Sends a photo to a Telegram user
 * @param chatId The Telegram chat ID
 * @param photo The URL or filedId of the photo to send
 * @param caption Custom message text in MarkdownV2
 * @param button The button text
 * @param buttonLink The button link
 * @returns Success status
 */
export async function sendPhotoToUser(
  chatId: string,
  photo: string,
  caption?: string,
  button?: string,
  buttonLink?: string
): Promise<boolean> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('Telegram bot token is missing');
    }

    if (!chatId || !photo) {
      throw new Error('Invalid chat ID');
    }

    const escapedCaption = caption ? escapeMarkdownV2(caption) : '';

    const formdata = new FormData();
    formdata.append('chat_id', chatId);
    formdata.append('photo', photo);
    formdata.append('caption', escapedCaption);
    formdata.append('parse_mode', 'MarkdownV2');

    if (button && buttonLink) {
      formdata.append(
        'reply_markup',
        JSON.stringify({
          inline_keyboard: [[{ text: button, url: buttonLink }]]
        })
      );
    }

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: formdata,
      redirect: 'follow' as RequestRedirect
    });

    const data = await response.json();
    console.log('Send photo:', data);

    if (!response.ok || !data.ok) {
      console.error(`Telegram API error for chat ${chatId}:`, data.description || 'Unknown error');
      throw new Error(data.description || 'Unknown error');
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to send photo to chat ${chatId}:`, errorMessage);
    return false;
  }
}

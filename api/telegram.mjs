import { db, supabaseHeaders } from './content.mjs';

const categories = { breakfast: 'Завтраки', main: 'Основное', desserts: 'Десерты', drinks: 'Напитки' };
const fields = { name: 'новое название', description: 'новое описание', price: 'новую цену числом, например 350' };
const galleryNames = ['Большое фото «Наш зал»', 'Фото «Тёплый свет»', 'Фото «Ваш уголок»'];
const cancel = [[['Отмена', 'home']]];
const isItemId = value => /^\d+$/.test(value);
const parsePrice = text => Number(text.replace(/\s/g, '').match(/\d+/)?.[0]);

async function tg(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description}`);
  return data.result;
}

const send = (chat, text, rows = []) => tg('sendMessage', {
  chat_id: chat,
  text,
  reply_markup: { inline_keyboard: rows.map(row => row.map(([label, data]) => ({ text: label, callback_data: data }))) }
});

const upsert = (table, row) => db(table, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(row) });
const setState = (chat, state) => upsert('bot_state', { chat_id: chat, state });
const getSetting = async key => (await db(`settings?key=eq.${key}&select=value`))[0]?.value;
const setSetting = (key, value) => upsert('settings', { key, value });
const updateItem = (id, values) => db(`menu_items?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(values) });

const home = chat => send(chat, 'Что изменить на сайте?', [
  [['Меню', 'menu']],
  [['Фото на главном экране', 'photo:hero']],
  [['Фото «Уют в деталях»', 'gallery']],
  [['График работы', 'hours']]
]);

async function showCategory(chat, category) {
  const items = await db(`menu_items?category=eq.${category}&select=id,name,price&order=sort,id`);
  return send(chat, `${categories[category]}. Выберите блюдо:`, [
    ...items.map(item => [[`${item.name} · ${item.price} ₽`, `item:${item.id}`]]),
    [['Добавить блюдо', `add:${category}`]],
    [['Назад', 'menu']]
  ]);
}

async function showItem(chat, id) {
  const [item] = await db(`menu_items?id=eq.${id}`);
  if (!item) return send(chat, 'Блюдо не найдено.', [[['К меню', 'menu']]]);
  return send(chat, `${item.name}\n${item.description}\n${item.price} ₽\nРаздел: ${categories[item.category]}${item.image ? '' : '\nБез фото'}`, [
    [['Название', `edit:${id}:name`], ['Описание', `edit:${id}:description`]],
    [['Цена', `edit:${id}:price`], ['Фото', `photo:${id}`]],
    [['Раздел', `move:${id}`], ['Удалить', `delete:${id}`]],
    [['Назад', `cat:${item.category}`]]
  ]);
}

async function uploadPhoto(sizes, side) {
  const size = sizes.find(({ width, height }) => Math.max(width, height) >= side) ?? sizes.at(-1);
  const file = await tg('getFile', { file_id: size.file_id });
  const image = await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`);
  if (!image.ok) throw new Error(`Telegram file ${image.status}`);
  const name = `${Date.now()}.jpg`;
  const response = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/photos/${name}`, {
    method: 'POST',
    headers: { ...supabaseHeaders(), 'Content-Type': 'image/jpeg' },
    body: await image.arrayBuffer()
  });
  if (!response.ok) throw new Error(`Storage ${response.status}: ${await response.text()}`);
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/photos/${name}`;
}

async function onButton(chat, data) {
  const [action, id, extra] = data.split(':');
  await setState(chat, null);
  switch (action) {
    case 'menu':
      return send(chat, 'Раздел меню:', [...Object.entries(categories).map(([key, label]) => [[label, `cat:${key}`]]), [['Назад', 'home']]]);
    case 'cat':
      return showCategory(chat, id);
    case 'item':
      return showItem(chat, id);
    case 'edit':
      await setState(chat, { action: 'edit', id, field: extra });
      return send(chat, `Отправьте ${fields[extra]}.`, cancel);
    case 'move':
      return send(chat, 'В какой раздел перенести?', [...Object.entries(categories).map(([key, label]) => [[label, `setcat:${id}:${key}`]]), [['Отмена', `item:${id}`]]]);
    case 'setcat':
      await updateItem(id, { category: extra });
      return showItem(chat, id);
    case 'delete':
      return send(chat, 'Удалить блюдо с сайта?', [[['Да, удалить', `remove:${id}`], ['Нет', `item:${id}`]]]);
    case 'remove': {
      const [item] = await db(`menu_items?id=eq.${id}&select=category`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
      await send(chat, 'Блюдо удалено.');
      return item ? showCategory(chat, item.category) : home(chat);
    }
    case 'add':
      await setState(chat, { action: 'add', category: id });
      return send(chat, 'Отправьте одним сообщением три строки: название, описание, цену. Например:\n\nКапучино\nЭспрессо и молочная пена. 150 мл.\n200', cancel);
    case 'photo':
      await setState(chat, { action: 'photo', target: id });
      return send(chat, `Отправьте фото (как фото, не файлом).${isItemId(id) ? '' : ' В подписи можно коротко описать, что на снимке, — это услышат незрячие посетители.'}`, cancel);
    case 'gallery':
      return send(chat, 'Какое фото заменить?', [...galleryNames.map((name, index) => [[name, `photo:gallery-${index}`]]), [['Назад', 'home']]]);
    case 'hours': {
      const hours = (await getSetting('hours')) ?? [];
      await setState(chat, { action: 'hours' });
      return send(chat, `Сейчас:\n${hours.map(({ days, time }) => `${days} | ${time}`).join('\n')}\n\nОтправьте новый график: каждая строка — «дни | время». Например:\nПонедельник — пятница | 10:00–22:00\nСуббота, воскресенье | 11:00–23:00`, cancel);
    }
    default:
      return home(chat);
  }
}

async function onMessage(chat, message) {
  const state = (await db(`bot_state?chat_id=eq.${chat}&select=state`))[0]?.state;
  if (!state || message.text?.startsWith('/')) {
    if (state) await setState(chat, null);
    return home(chat);
  }
  const itemId = state.id ?? (isItemId(state.target) ? state.target : null);

  if (state.action === 'photo') {
    if (!message.photo) return send(chat, 'Нужна фотография. Отправьте её как фото, не файлом, или нажмите «Отмена».', cancel);
    const url = await uploadPhoto(message.photo, itemId ? 800 : 1280);
    const photo = { url, alt: message.caption?.trim() || undefined };
    if (itemId) {
      await updateItem(itemId, { image: url, image_type: 'real', position: null });
    } else if (state.target === 'hero') {
      await setSetting('hero', photo);
    } else {
      const gallery = (await getSetting('gallery')) ?? [null, null, null];
      gallery[Number(state.target.slice(-1))] = photo;
      await setSetting('gallery', gallery);
    }
  } else if (!message.text) {
    return send(chat, 'Отправьте текст или нажмите «Отмена».', cancel);
  } else if (state.action === 'edit') {
    const value = state.field === 'price' ? parsePrice(message.text) : message.text.trim();
    if (!value) return send(chat, `Не получилось прочитать. Отправьте ${fields[state.field]}.`, cancel);
    await updateItem(itemId, { [state.field]: value });
  } else if (state.action === 'add') {
    const [name, description, price = ''] = message.text.split('\n').map(line => line.trim()).filter(Boolean);
    if (!description || !parsePrice(price)) return send(chat, 'Нужны три строки: название, описание, цена. Попробуйте ещё раз.', cancel);
    const [last] = await db('menu_items?select=sort&order=sort.desc&limit=1');
    const [item] = await db('menu_items', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ category: state.category, name, description, price: parsePrice(price), sort: (last?.sort ?? 0) + 1 })
    });
    await setState(chat, { action: 'photo', target: String(item.id) });
    return send(chat, `«${name}» добавлено. Теперь отправьте фото блюда.`, [[['Без фото', `item:${item.id}`]]]);
  } else if (state.action === 'hours') {
    const hours = message.text.split('\n').filter(line => line.trim()).map(line => line.split('|').map(part => part.trim()));
    if (!hours.length || hours.some(row => row.length !== 2 || !row[0] || !row[1])) {
      return send(chat, 'Каждая строка должна быть в виде «дни | время». Попробуйте ещё раз.', cancel);
    }
    await setSetting('hours', hours.map(([days, time]) => ({ days, time })));
  }

  await setState(chat, null);
  await send(chat, 'Сохранено. На сайте изменения появятся в течение минуты.');
  return itemId ? showItem(chat, itemId) : home(chat);
}

export default async function handler(request, response) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers['x-telegram-bot-api-secret-token'] !== secret) return response.status(401).end();

  const { message, callback_query: query } = request.body ?? {};
  const chat = (message ?? query?.message)?.chat.id;
  const user = (message ?? query)?.from?.id;
  const admins = (process.env.TELEGRAM_ADMIN_IDS ?? '').split(',').map(id => id.trim());

  if (chat) {
    try {
      if (!user || !admins.includes(String(user))) {
        await send(chat, `Нет доступа. Ваш Telegram ID: ${user}`);
      } else if (query) {
        await tg('answerCallbackQuery', { callback_query_id: query.id }).catch(() => {});
        await onButton(chat, query.data ?? '');
      } else {
        await onMessage(chat, message);
      }
    } catch (error) {
      console.error(error);
      await send(chat, 'Не получилось сохранить, попробуйте ещё раз.', [[['В начало', 'home']]]).catch(() => {});
    }
  }
  response.status(200).end();
}

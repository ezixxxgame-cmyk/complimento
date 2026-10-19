export function supabaseHeaders() {
  const key = process.env.SUPABASE_SECRET_KEY;
  // New sb_secret_ keys go only in apikey; legacy service_role JWTs also need Authorization.
  return { apikey: key, ...(key.startsWith('eyJ') && { Authorization: `Bearer ${key}` }) };
}

export async function db(path, options = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...supabaseHeaders(), 'Content-Type': 'application/json', ...options.headers }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

export default async function handler(request, response) {
  try {
    const [menu, settings] = await Promise.all([
      db('menu_items?select=id,category,name,description,price,image,imageType:image_type,position&order=sort,id'),
      db('settings?select=key,value')
    ]);
    response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=86400');
    response.json({ menu, ...Object.fromEntries(settings.map(({ key, value }) => [key, value])) });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Content unavailable' });
  }
}

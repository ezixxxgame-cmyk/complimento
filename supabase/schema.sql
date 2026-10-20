-- Run once in Supabase: SQL Editor -> New query -> Run.
-- Tables are closed by RLS; only the server functions with the secret key can read and write them.

create table menu_items (
  id bigint generated always as identity primary key,
  sort int not null default 0,
  category text not null check (category in ('breakfast', 'rolls', 'desserts', 'waffles', 'snacks', 'hot', 'drinks')),
  name text not null,
  description text not null default '',
  price int not null check (price > 0),
  image text,
  image_type text not null default 'real' check (image_type in ('real', 'illustration')),
  position text
);

create table settings (
  key text primary key,
  value jsonb not null
);

create table bot_state (
  chat_id bigint primary key,
  state jsonb
);

grant select, insert, update, delete on menu_items, settings, bot_state to service_role;

alter table menu_items enable row level security;
alter table settings enable row level security;
alter table bot_state enable row level security;

insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;

insert into settings (key, value) values
  ('hours', '[{"days": "Понедельник — четверг", "time": "11:00–23:00"}, {"days": "Пятница — суббота", "time": "11:00–00:00"}, {"days": "Воскресенье", "time": "11:00–23:00"}]');

insert into menu_items (sort, category, name, description, price, image, image_type, position) values
  (1, 'breakfast', 'Вафля с сёмгой и яйцом пашот', 'Бородинская вафля, сёмга, яйцо и свежие овощи.', 490, 'waffle-salmon', 'real', 'center 85%'),
  (2, 'breakfast', 'Сырники с карамельной сметаной', 'Творожные сырники, карамельная сметана и ягоды.', 350, 'syrniki', 'real', 'center 65%'),
  (3, 'breakfast', 'Вафля с жюльеном', 'Копчёная курица, грибы и сливочный соус.', 360, 'waffle-julienne', 'real', null),
  (4, 'breakfast', 'Сырники с сёмгой', 'Слабосолёная сёмга и сливочно-горчичный соус.', 460, 'syrniki-salmon', 'real', null),
  (5, 'breakfast', 'Вафля с беконом и яйцом пашот', 'Бекон, яйцо пашот и сливочно-чесночный соус.', 380, 'waffle-bacon', 'real', 'center 80%');

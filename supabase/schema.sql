-- Run once in Supabase: SQL Editor -> New query -> Run.
-- Tables are closed by RLS; only the server functions with the secret key can read and write them.

create table menu_items (
  id bigint generated always as identity primary key,
  sort int not null default 0,
  category text not null check (category in ('breakfast', 'main', 'desserts', 'drinks')),
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
  (5, 'breakfast', 'Вафля с беконом и яйцом пашот', 'Бекон, яйцо пашот и сливочно-чесночный соус.', 380, 'waffle-bacon', 'real', 'center 80%'),
  (6, 'main', 'Ризотто с грибами', 'Рис, грибы, пармезан и сливочный соус.', 550, 'risotto', 'illustration', null),
  (7, 'main', 'Карбонара', 'Бекон, желток, пармезан, руккола и сливочный соус.', 430, 'carbonara', 'real', 'center 75%'),
  (8, 'main', 'Салат с говядиной и вялеными томатами', 'Говядина, овощи, сыр и сливочно-горчичная заправка.', 490, 'beef-salad', 'illustration', null),
  (9, 'main', 'Брускетта с сёмгой', 'Сёмга, томаты, творожный сыр и кунжутная паста.', 480, 'bruschetta', 'illustration', null),
  (10, 'desserts', 'Венская вафля классическая', 'Карамельный топпинг, мороженое и ягоды.', 260, 'waffle-classic', 'real', null),
  (11, 'desserts', 'Венская вафля с яблоком', 'Яблоки, томлённые в красном вине, и мороженое.', 260, 'waffle-apple', 'real', null),
  (12, 'desserts', 'Штрудель с яблоком', 'Яблоки, грецкий орех, вишнёвый соус и мороженое.', 340, 'strudel', 'real', 'center 80%'),
  (13, 'desserts', 'Чизкейк', 'Творожный сыр, карамелизованная груша и маракуйя.', 240, 'cheesecake', 'illustration', null),
  (14, 'desserts', 'Шоколадный фондан', 'Тающий шоколадный десерт с шариком мороженого.', 340, 'fondant', 'illustration', null),
  (15, 'desserts', 'Шоколадный брауни', 'Кофейное мороженое и вишнёвый соус.', 380, 'brownie', 'illustration', null),
  (16, 'drinks', 'Капучино', 'Эспрессо и молочная пена. 150 мл.', 200, 'cappuccino', 'illustration', null),
  (17, 'drinks', 'Латте', 'Кофе с молоком. 200 мл.', 210, 'latte', 'real', null),
  (18, 'drinks', 'Эспрессо', 'Насыщенный чёрный кофе. 25 мл.', 120, 'espresso', 'illustration', null),
  (19, 'drinks', 'Облепиховый чай', 'Облепиха, апельсин, корица, гвоздика и мята.', 280, 'tea', 'illustration', null),
  (20, 'drinks', 'Десерт и ваш любимый кофе', 'Американо, капучино или латте; десерт уточняйте у бариста.', 375, 'coffee-dessert', 'real', 'center 65%');

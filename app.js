import { menu } from './menu.js';

const categories = { all: 'Всё меню', breakfast: 'Завтраки', main: 'Основное', desserts: 'Десерты', drinks: 'Напитки' };
const grid = document.querySelector('#menu-grid');
const categorySelect = document.querySelector('#category-select');
const categoryButtons = document.querySelectorAll('[data-category]');
const numberFormat = new Intl.NumberFormat('ru-RU');

const cards = menu.map(item => {
  const card = document.createElement('article');
  card.className = 'menu-item';
  card.dataset.category = item.category;
  card.id = item.id;
  const frame = document.createElement('div');
  frame.className = 'dish-photo';
  const photo = document.createElement('img');
  const sizes = item.image === 'wine' ? [480, 960] : [400, 800];
  photo.src = `assets/${item.image}-${sizes[0]}.webp`;
  photo.srcset = sizes.map(size => `assets/${item.image}-${size}.webp ${size}w`).join(', ');
  photo.sizes = '(min-width: 1100px) 290px, (min-width: 700px) 44vw, 90vw';
  photo.width = 800;
  photo.height = 650;
  photo.loading = 'lazy';
  photo.decoding = 'async';
  photo.alt = item.imageType === 'illustration' ? `${item.name} — иллюстративное изображение` : `${item.name} — фотография из материалов Complimento`;
  if (item.position) photo.style.objectPosition = item.position;
  frame.append(photo);
  if (item.imageType === 'illustration') {
    const badge = document.createElement('span');
    badge.className = 'image-label';
    badge.textContent = 'Иллюстрация';
    frame.append(badge);
  }
  const category = document.createElement('p');
  category.className = 'dish-category';
  category.textContent = categories[item.category];
  const heading = document.createElement('h3');
  heading.textContent = item.name;
  const description = document.createElement('p');
  description.className = 'dish-description';
  description.textContent = item.description;
  const price = document.createElement('p');
  price.className = 'dish-price';
  price.textContent = `${numberFormat.format(item.price)} ₽`;
  card.append(frame, category, heading, description, price);
  return card;
});
grid.replaceChildren(...cards);

function filterMenu(category) {
  let count = 0;
  for (const card of cards) {
    card.hidden = category !== 'all' && card.dataset.category !== category;
    if (!card.hidden) count++;
  }
  categorySelect.value = category;
  categoryButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
  document.querySelector('#menu-count').textContent = `Показано ${count} из ${menu.length}`;
  document.querySelector('.menu-controls').dataset.active = category;
}

categorySelect.addEventListener('change', event => filterMenu(event.target.value));
categoryButtons.forEach(button => button.addEventListener('click', () => filterMenu(button.dataset.category)));
document.querySelectorAll('a[href="#menu"]').forEach(link => link.addEventListener('click', () => filterMenu('all')));
filterMenu('all');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const revealTargets = document.querySelectorAll('.dish-photo, .gallery figure, .hero-photo');
const activeAnimations = new Set();

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      const reveal = () => {
        if (reducedMotion.matches || !entry.target.getClientRects().length) return;
        const animation = entry.target.animate(
          [{ opacity: .45, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 650, easing: 'cubic-bezier(.16, 1, .3, 1)' }
        );
        activeAnimations.add(animation);
        animation.finished.catch(() => {}).finally(() => activeAnimations.delete(animation));
      };
      const photo = entry.target.querySelector('img');
      if (photo && !photo.complete) photo.addEventListener('load', reveal, { once: true });
      else reveal();
    }
  }, { threshold: .12 });
  revealTargets.forEach(target => observer.observe(target));
  reducedMotion.addEventListener('change', event => {
    if (event.matches) activeAnimations.forEach(animation => animation.cancel());
  });
}

import { menu as defaultMenu } from './menu.js';

async function loadContent() {
  try {
    const response = await fetch('/api/content', { signal: AbortSignal.timeout(5000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

const content = await loadContent();
const menu = content?.menu ?? defaultMenu;
const categories = { all: 'Всё меню', breakfast: 'Завтраки', rolls: 'Роллы', desserts: 'Десерты', waffles: 'Вафли', snacks: 'Закуски и салаты', hot: 'Горячее', drinks: 'Напитки' };
const grid = document.querySelector('#menu-grid');
const categorySelect = document.querySelector('#category-select');
const categoryButtons = document.querySelectorAll('[data-category]');
const menuToggle = document.querySelector('.menu-toggle');
const desktopMenu = window.matchMedia('(min-width: 1100px)');
let activeCategory = 'all';
let menuExpanded = false;
const numberFormat = new Intl.NumberFormat('ru-RU');

const cards = menu.map(item => {
  const card = document.createElement('article');
  card.className = 'menu-item';
  card.dataset.category = item.category;
  card.id = item.id;
  const frame = document.createElement('div');
  frame.className = 'dish-photo';
  if (item.image) {
    const photo = document.createElement('img');
    if (/^https?:/.test(item.image)) {
      photo.src = item.image;
    } else {
      const sizes = item.image === 'wine' ? [480, 960] : [400, 800];
      photo.src = `assets/${item.image}-${sizes[0]}.webp`;
      photo.srcset = sizes.map(size => `assets/${item.image}-${size}.webp ${size}w`).join(', ');
      photo.sizes = '(min-width: 1100px) 290px, (min-width: 700px) 44vw, 30vw';
    }
    photo.width = 800;
    photo.height = 650;
    photo.loading = 'lazy';
    photo.decoding = 'async';
    photo.alt = item.imageType === 'illustration' ? `${item.name} — иллюстративное изображение` : `${item.name} — фотография из материалов Complimento`;
    if (item.position) photo.style.objectPosition = item.position;
    frame.append(photo);
  }
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
document.querySelector('[data-category="all"] span').textContent = menu.length;

function setPhoto(image, photo) {
  if (!photo) return;
  image.removeAttribute('srcset');
  image.src = photo.url;
  if (photo.alt) image.alt = photo.alt;
}
setPhoto(document.querySelector('.hero-photo img'), content?.hero);
document.querySelectorAll('.gallery img').forEach((image, index) => setPhoto(image, content?.gallery?.[index]));

if (content?.hours) {
  document.querySelector('.hours').replaceChildren(...content.hours.map(({ days, time }) => {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const value = document.createElement('dd');
    term.textContent = days;
    value.textContent = time;
    row.append(term, value);
    return row;
  }));
  const openingTimes = new Set(content.hours.map(({ time }) => time.match(/^\d{1,2}:\d{2}/)?.[0]));
  const [opening] = openingTimes;
  document.querySelector('.hero-location span').textContent = openingTimes.size === 1 && opening ? `Каждый день с ${opening}` : '';
}

function renderMenu() {
  const matchingCards = cards.filter(card => activeCategory === 'all' || card.dataset.category === activeCategory);
  const previewCount = desktopMenu.matches ? 8 : 6;
  const visibleCards = menuExpanded ? matchingCards : matchingCards.slice(0, previewCount);
  for (const card of cards) {
    card.hidden = !visibleCards.includes(card);
  }
  menuToggle.hidden = matchingCards.length <= previewCount;
  menuToggle.setAttribute('aria-expanded', String(menuExpanded));
  menuToggle.querySelector('span').textContent = menuExpanded ? 'Свернуть меню' : 'Развернуть меню';
  document.querySelector('#menu-count').textContent = `Показано ${visibleCards.length} из ${matchingCards.length}`;
}

function filterMenu(category) {
  activeCategory = category;
  menuExpanded = false;
  categorySelect.value = category;
  categoryButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
  renderMenu();
}

menuToggle.addEventListener('click', () => {
  menuExpanded = !menuExpanded;
  renderMenu();
  if (!menuExpanded) document.querySelector('#menu').scrollIntoView({ block: 'start' });
});
desktopMenu.addEventListener('change', renderMenu);
categorySelect.addEventListener('change', event => filterMenu(event.target.value));
categoryButtons.forEach(button => button.addEventListener('click', () => filterMenu(button.dataset.category)));
document.querySelectorAll('a[href="#menu"]').forEach(link => link.addEventListener('click', () => filterMenu('all')));
filterMenu('all');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector('.site-header');
let lastScrollY = Math.max(0, window.scrollY);

window.addEventListener('scroll', () => {
  const scrollY = Math.max(0, window.scrollY);
  if (scrollY <= 94) {
    document.body.classList.remove('header-hidden');
  } else if (Math.abs(scrollY - lastScrollY) < 8) {
    return;
  } else {
    document.body.classList.toggle('header-hidden', scrollY > lastScrollY);
  }
  lastScrollY = scrollY;
}, { passive: true });
header.addEventListener('focusin', () => document.body.classList.remove('header-hidden'));

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

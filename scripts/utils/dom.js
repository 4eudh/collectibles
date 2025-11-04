export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

export function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

export function render(target, content) {
  if (!target) return;
  if (typeof content === 'string') {
    target.innerHTML = content;
    return;
  }
  if (content instanceof Node) {
    target.replaceChildren(content);
    return;
  }
  if (Array.isArray(content)) {
    target.replaceChildren(...content);
  }
}

export function createElementFromHTML(htmlString) {
  const template = document.createElement('template');
  template.innerHTML = htmlString.trim();
  return template.content.firstElementChild;
}

export function formatNumber(value) {
  return new Intl.NumberFormat().format(value ?? 0);
}

export function formatRelativeDate(date) {
  if (!date) return '—';
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const diff = date.getTime() - Date.now();
  const units = [
    ['year', 1000 * 60 * 60 * 24 * 365],
    ['month', 1000 * 60 * 60 * 24 * 30],
    ['week', 1000 * 60 * 60 * 24 * 7],
    ['day', 1000 * 60 * 60 * 24],
    ['hour', 1000 * 60 * 60],
    ['minute', 1000 * 60]
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diff) > ms || unit === 'minute') {
      return formatter.format(Math.round(diff / ms), unit);
    }
  }
  return 'just now';
}

export function setLoading(element, isLoading) {
  if (!element) return;
  element.toggleAttribute('aria-busy', isLoading);
  element.classList.toggle('opacity-50', isLoading);
  element.classList.toggle('pointer-events-none', isLoading);
}

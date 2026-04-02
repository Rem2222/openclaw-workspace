export function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const dateStr = date.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const todayStr = now.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' });
    if (dateStr === todayStr) return timeStr;
    return dateStr;
  } catch {
    return '—';
  }
}

export function formatDuration(ms) {
  if (!ms) return '—';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}с`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}м`;
  const hr = Math.floor(min / 60);
  return `${hr}ч ${min % 60}м`;
}

export function getIssueType(title) {
  if (!title) return 'Разработка';
  const t = title.toLowerCase();
  if (t.includes('исследован') || t.includes('анализ') || t.includes('аналитик')) return 'Аналитика';
  if (t.includes('тз') || t.includes('спецификац') || t.includes('требовани') || t.includes('spec')) return 'ТЗ';
  if (t.includes('тест') || t.includes('проверить') || t.includes('проверка')) return 'Тесты';
  if (t.includes('починить') || t.includes('исправить') || t.includes('фикс') || t.includes('bug')) return 'Исправление';
  if (t.includes('доработать') || t.includes('улучшить') || t.includes('оптимизировать')) return 'Доработка';
  return 'Разработка';
}

export const TYPE_ORDER = ['Аналитика', 'ТЗ', 'Разработка', 'Тесты', 'Исправление', 'Доработка'];

export const TYPE_COLORS = {
  'Аналитика': '#9b59b6',
  'ТЗ': '#3498db',
  'Разработка': '#27ae60',
  'Тесты': '#f39c12',
  'Исправление': '#e74c3c',
  'Доработка': '#1abc9c',
};

export const STATUS_SYMBOLS = {
  open: '○',
  in_progress: '◐',
  blocked: '●',
  closed: '✓',
  deferred: '❄',
};

export const STATUS_LABELS = {
  open: 'Открыта',
  in_progress: 'В работе',
  blocked: 'Заблокирована',
  closed: 'Закрыта',
  deferred: 'Отложена',
};

export const SORT_ICONS = {
  asc: ' ▲',
  desc: ' ▼',
  none: '',
};

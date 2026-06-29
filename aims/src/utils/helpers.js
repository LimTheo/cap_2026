export const statusConfig = {
  draft: { label: '초안', color: 'bg-text-muted', textColor: 'text-white' },
  reviewing: { label: '검수중', color: 'bg-warning', textColor: 'text-black' },
  approved: { label: '승인됨', color: 'bg-success', textColor: 'text-white' },
  rejected: { label: '반려', color: 'bg-danger', textColor: 'text-white' },
};

export const workerStatusConfig = {
  normal: { label: '정상', color: 'bg-success' },
  warning: { label: '주의필요', color: 'bg-warning' },
  danger: { label: '미학습', color: 'bg-danger' },
};

export const comprehensionConfig = {
  pass: { label: '통과', color: 'text-success', icon: '✅' },
  fail: { label: '미통과', color: 'text-danger', icon: '❌' },
  pending: { label: '대기', color: 'text-warning', icon: '⏳' },
};

export const nationalityFlags = {
  vi: '🇻🇳',
  zh: '🇨🇳',
  th: '🇹🇭',
  km: '🇰🇭',
  my: '🇲🇲',
  ko: '🇰🇷',
};

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function getLocalizedName(item, lang) {
  if (lang === 'ko') return item.name;
  const key = `name_${lang}`;
  return item[key] || item.name;
}

export function getLocalizedField(item, field, lang) {
  if (lang === 'ko') return item[field];
  const key = `${field}_${lang}`;
  return item[key] || item[field];
}

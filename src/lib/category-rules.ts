import { CATEGORY_RULES } from '@/config/categories';

export function classifyVideo(title: string, description: string = ''): string {
  const text = `${title} ${description}`.toLowerCase();

  let bestMatch = '';
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += keyword.split(' ').length; // Multi-word keywords score higher
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = rule.name;
    }
  }

  return bestMatch || 'Other';
}

// helper function to convert a comma-separated pronouns string into an array of objects with summary and optional language
export function parsePronounsInput(pronouns: string): { summary: string; language?: string }[] {
  return pronouns
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [language, summary] = s.split(':');
      return { summary: summary.slice(0, 16), language: language || 'en' };
    });
}

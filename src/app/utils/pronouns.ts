// helper function to convert a comma-separated pronouns string into an array of objects with summary and optional language
export function parsePronounsInput(pronouns: string): { summary: string; language?: string }[] {
  return pronouns
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const parts = s.split(':');

      if (parts.length === 1) {
        return {
          summary: parts[0].slice(0, 16),
          language: 'en',
        };
      }

      const [language, summary] = parts;

      return {
        language: language || 'en',
        summary: summary.slice(0, 16),
      };
    });
}

// helper function to filter a list of pronouns based on the user's language settings
export function filterPronounsByLanguage(
  pronouns: { summary: string; language?: string }[],
  enabled: boolean,
  languages: string[]
): { summary: string; language?: string }[] {
  if (!enabled) {
    return pronouns.map((p) => ({ ...p, summary: p.summary.slice(0, 16) }));
  }

  const normalizedLanguages = languages.map((lang) => lang.trim().toLowerCase());

  const filteredPronouns = pronouns
    .filter((p) => normalizedLanguages.includes((p.language || 'en').trim().toLowerCase()))
    .map((p) => ({
      ...p,
      summary: p.summary.slice(0, 16),
    }));

  if (filteredPronouns.length === 0) {
    return pronouns.map((p) => ({ ...p, summary: p.summary.slice(0, 16) }));
  }

  return filteredPronouns;
}

import { useState, useEffect, ChangeEvent } from 'react';
import { Input } from 'folds';
import { SettingTile } from '$components/setting-tile';

type PronounSet = {
  summary: string;
  language?: string;
  grammatical_gender?: string;
};

type PronounEditorProps = {
  current: PronounSet[];
  onSave: (p: PronounSet[]) => void;
};

export function PronounEditor({ current, onSave }: PronounEditorProps) {
  const initialString = current
    .map((p) => `${p.language ? `${p.language}:` : ''}${p.summary}`)
    .join(', ');
  const [val, setVal] = useState(initialString);

  useEffect(() => setVal(initialString), [initialString]);

  const handleSave = () => {
    if (val === initialString) return;
    const safeVal = val.slice(0, 128);
    const next = safeVal
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [language, summary] = s.split(':');
        return { summary: summary.slice(0, 16), language: language || 'en' };
      });
    onSave(next);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setVal(e.currentTarget.value);
  };

  return (
    <SettingTile
      title="Pronouns"
      // let people specify multiple sets of pronouns for different languages
      // the input is a comma separated list of pronoun sets, each set can have an optional language tag (e.g. "en:they/them, de:sie/ihr")
      description="Separate sets with commas (e.g. 'en:they/them, en:it/its, de:sie/ihr')."
      after={
        <Input
          value={val}
          size="300"
          radii="300"
          variant="Secondary"
          placeholder="Add pronouns..."
          onChange={handleChange}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          style={{ width: '232px' }}
        />
      }
    />
  );
}

import React, { useState, useEffect, ChangeEvent } from 'react';
import { Input } from 'folds';
import { SettingTile } from '$components/setting-tile';

type PronounSet = {
  summary: string;
  language?: string;
};

type PronounEditorProps = {
  current: PronounSet[];
  onSave: (p: PronounSet[]) => void;
};

export function PronounEditor({ current, onSave }: PronounEditorProps) {
  const initialString = current.map((p) => p.summary).join('/');
  const [val, setVal] = useState(initialString);

  useEffect(() => setVal(initialString), [initialString]);

  const handleSave = () => {
    if (val === initialString) return;
    const safeVal = val.slice(0, 128);
    const next = safeVal
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ summary: s.slice(0, 16) }));
    onSave(next);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setVal(e.currentTarget.value);
  };

  return (
    <SettingTile
      title="Pronouns"
      description="Separate with slashes (e.g. they/them)."
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

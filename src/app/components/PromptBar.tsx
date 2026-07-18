import { useAppStore } from '../state/store';

const EXAMPLES = [
  'Napravi kutiju dimenzija 300x200x150 mm od lesonita debljine 4 mm sa poklopcem na šarke.',
  'Napravi kutiju za bocu vina.',
  'Napravi stalak za 12 epruveta.',
  'Napravi organizer za alat.',
  'Napravi policu sa tri nivoa.',
  'Napravi kućicu za ptice.',
  'Napravi držač za mobilni telefon.',
];

export function PromptBar() {
  const promptText = useAppStore((s) => s.promptText);
  const setPromptText = useAppStore((s) => s.setPromptText);
  const generateFromPrompt = useAppStore((s) => s.generateFromPrompt);
  const isGenerating = useAppStore((s) => s.isGenerating);

  return (
    <div className="flex flex-col gap-2 border-b border-neutral-800 bg-neutral-900/60 p-4">
      <div className="flex gap-2">
        <textarea
          className="flex-1 resize-none rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-fuchsia-500"
          rows={2}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder='Opišite šta želite napraviti, npr. "Napravi kutiju za bocu vina."'
        />
        <button
          onClick={generateFromPrompt}
          disabled={isGenerating}
          className="shrink-0 rounded-lg bg-fuchsia-600 px-5 font-medium text-white transition hover:bg-fuchsia-500 disabled:opacity-50"
        >
          {isGenerating ? 'Generišem…' : 'Generiši'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setPromptText(ex)}
            className="rounded-full border border-neutral-700 px-2.5 py-1 text-xs text-neutral-400 transition hover:border-fuchsia-500 hover:text-neutral-200"
          >
            {ex.replace('Napravi ', '')}
          </button>
        ))}
      </div>
    </div>
  );
}

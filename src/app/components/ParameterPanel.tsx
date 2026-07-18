import type { ShapeType } from '../../core/nlu/types';
import type { LidStyle } from '../../core/shapes/box';
import { useAppStore } from '../state/store';

const SHAPE_LABELS: Record<ShapeType, string> = {
  box: 'Kutija',
  'wine-box': 'Kutija za vino',
  'test-tube-rack': 'Stalak za epruvete',
  'tool-organizer': 'Organizer za alat',
  shelf: 'Polica',
  birdhouse: 'Kućica za ptice',
  'phone-stand': 'Držač za telefon',
};

const LID_LABELS: Record<LidStyle, string> = {
  closed: 'Zatvoreno (trajni prstasti spoj)',
  open: 'Otvoreno (bez poklopca)',
  friction: 'Friction-fit poklopac',
  hinged: 'Poklopac na šarke',
};

const COUNT_LABEL: Partial<Record<ShapeType, string>> = {
  box: 'Broj pregrada',
  'tool-organizer': 'Broj pregrada',
  shelf: 'Broj nivoa',
  'test-tube-rack': 'Broj epruveta',
};

const selectClass =
  'rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-fuchsia-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-400">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ParameterPanel() {
  const shapeType = useAppStore((s) => s.shapeType);
  const width = useAppStore((s) => s.width);
  const depth = useAppStore((s) => s.depth);
  const height = useAppStore((s) => s.height);
  const lidStyle = useAppStore((s) => s.lidStyle);
  const count = useAppStore((s) => s.count);
  const setField = useAppStore((s) => s.setField);
  const regenerateDesign = useAppStore((s) => s.regenerateDesign);

  const showLid = shapeType === 'box';
  const countLabel = COUNT_LABEL[shapeType];

  return (
    <section className="flex flex-col gap-3 border-b border-neutral-800 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Parametri oblika</h2>

      <Field label="Vrsta predmeta">
        <select className={selectClass} value={shapeType} onChange={(e) => setField('shapeType', e.target.value as ShapeType)}>
          {Object.entries(SHAPE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Širina (mm)">
          <input
            className={selectClass}
            type="number"
            value={width}
            onChange={(e) => setField('width', parseFloat(e.target.value) || 0)}
          />
        </Field>
        <Field label="Dubina (mm)">
          <input
            className={selectClass}
            type="number"
            value={depth}
            onChange={(e) => setField('depth', parseFloat(e.target.value) || 0)}
          />
        </Field>
        <Field label="Visina (mm)">
          <input
            className={selectClass}
            type="number"
            value={height}
            onChange={(e) => setField('height', parseFloat(e.target.value) || 0)}
          />
        </Field>
      </div>

      {showLid && (
        <Field label="Poklopac">
          <select className={selectClass} value={lidStyle} onChange={(e) => setField('lidStyle', e.target.value as LidStyle)}>
            {(Object.keys(LID_LABELS) as LidStyle[]).map((style) => (
              <option key={style} value={style}>
                {LID_LABELS[style]}
              </option>
            ))}
          </select>
        </Field>
      )}

      {countLabel && (
        <Field label={countLabel}>
          <input
            className={selectClass}
            type="number"
            min="0"
            value={count}
            onChange={(e) => setField('count', parseInt(e.target.value, 10) || 0)}
          />
        </Field>
      )}

      <button
        onClick={regenerateDesign}
        className="mt-1 rounded-md border border-fuchsia-600 py-1.5 text-sm font-medium text-fuchsia-400 transition hover:bg-fuchsia-600 hover:text-white"
      >
        Primijeni izmjene
      </button>
    </section>
  );
}

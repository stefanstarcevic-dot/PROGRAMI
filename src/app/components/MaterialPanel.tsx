import { listMaterialPresets } from '../../core/materials/material';
import { TOLERANCE_LABELS } from '../../core/materials/tolerance';
import type { ToleranceMode } from '../../core/materials/tolerance';
import type { MaterialId } from '../../core/materials/material';
import { useAppStore } from '../state/store';

const THICKNESS_PRESETS = [1, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 18];
const KERF_PRESETS = [0.05, 0.08, 0.1, 0.12, 0.15, 0.2];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-400">
      <span>{label}</span>
      {children}
    </label>
  );
}

const selectClass =
  'rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-fuchsia-500';

export function MaterialPanel() {
  const materialId = useAppStore((s) => s.materialId);
  const customMaterialLabel = useAppStore((s) => s.customMaterialLabel);
  const thickness = useAppStore((s) => s.thickness);
  const kerf = useAppStore((s) => s.kerf);
  const toleranceMode = useAppStore((s) => s.toleranceMode);
  const customToleranceValue = useAppStore((s) => s.customToleranceValue);
  const setField = useAppStore((s) => s.setField);
  const regenerateDesign = useAppStore((s) => s.regenerateDesign);

  const presets = listMaterialPresets();

  return (
    <section className="flex flex-col gap-3 border-b border-neutral-800 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Materijal</h2>

      <Field label="Vrsta materijala">
        <select
          className={selectClass}
          value={materialId}
          onChange={(e) => setField('materialId', e.target.value as MaterialId)}
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value="custom">Prilagođeno…</option>
        </select>
      </Field>

      {materialId === 'custom' && (
        <Field label="Naziv materijala">
          <input
            className={selectClass}
            value={customMaterialLabel}
            onChange={(e) => setField('customMaterialLabel', e.target.value)}
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Debljina (mm)">
          <input
            className={selectClass}
            type="number"
            step="0.1"
            min="0.1"
            list="thickness-presets"
            value={thickness}
            onChange={(e) => setField('thickness', parseFloat(e.target.value) || 0)}
          />
          <datalist id="thickness-presets">
            {THICKNESS_PRESETS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>

        <Field label="Kerf (mm)">
          <input
            className={selectClass}
            type="number"
            step="0.01"
            min="0"
            list="kerf-presets"
            value={kerf}
            onChange={(e) => setField('kerf', parseFloat(e.target.value) || 0)}
          />
          <datalist id="kerf-presets">
            {KERF_PRESETS.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field label="Tolerancija spoja">
        <select
          className={selectClass}
          value={toleranceMode}
          onChange={(e) => setField('toleranceMode', e.target.value as ToleranceMode)}
        >
          {(Object.keys(TOLERANCE_LABELS) as ToleranceMode[]).map((mode) => (
            <option key={mode} value={mode}>
              {TOLERANCE_LABELS[mode]}
            </option>
          ))}
        </select>
      </Field>

      {toleranceMode === 'custom' && (
        <Field label="Prilagođena tolerancija (mm, +labavo / -čvrsto)">
          <input
            className={selectClass}
            type="number"
            step="0.01"
            value={customToleranceValue}
            onChange={(e) => setField('customToleranceValue', parseFloat(e.target.value) || 0)}
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

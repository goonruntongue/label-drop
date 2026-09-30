import { useGame, type Tuning } from '../state/store';

const FIELDS: { key: Exclude<keyof Tuning, 'guide'>; label: string; min: number; max: number; step: number; unit?: string }[] = [
  { key: 'floatAmp', label: '浮遊の振れ幅', min: 0, max: 0.4, step: 0.01 },
  { key: 'floatSpeed', label: '浮遊の速さ', min: 0, max: 2, step: 0.05 },
  { key: 'throwSpeed', label: 'スロー判定の速度', min: 300, max: 2000, step: 50, unit: 'px/s' },
  { key: 'aimAngle', label: 'エイムアシスト角', min: 0, max: 45, step: 1, unit: '°' },
  { key: 'hitExpand', label: 'ドロップ判定の広さ', min: 1, max: 1.8, step: 0.05, unit: '×' },
  { key: 'parallax', label: 'カメラ視差', min: 0, max: 1, step: 0.05 },
  { key: 'bloom', label: 'ブルーム', min: 0, max: 2, step: 0.05 },
];

export function TuningPanel() {
  const open = useGame((s) => s.tuningOpen);
  const tuning = useGame((s) => s.tuning);
  const { setTuning, resetTuning, toggleTuning } = useGame.getState();
  if (!open) return null;
  return (
    <div className="tuning" role="dialog" aria-label="チューニング">
      <div className="tuning-head">
        <p className="kicker">TUNING</p>
        <button type="button" className="btn-mini" aria-label="閉じる" onClick={toggleTuning}>
          ×
        </button>
      </div>
      {FIELDS.map((f) => (
        <label key={f.key} className="tuning-row">
          <span>{f.label}</span>
          <input
            type="range"
            min={f.min}
            max={f.max}
            step={f.step}
            value={tuning[f.key]}
            onChange={(e) => setTuning({ [f.key]: Number(e.target.value) })}
          />
          <span className="num">
            {tuning[f.key]}
            {f.unit ?? ''}
          </span>
        </label>
      ))}
      <label className="tuning-check">
        <input type="checkbox" checked={tuning.guide} onChange={(e) => setTuning({ guide: e.target.checked })} />
        軌道ガイドを表示
      </label>
      <button type="button" className="btn" onClick={resetTuning}>
        初期値に戻す
      </button>
    </div>
  );
}

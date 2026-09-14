import { graduatedFocusCount, sealedFailures, weaponBuckets, winRateThenNow } from '../domain/growth'
import { statsFor } from '../domain/outcome'
import { useStore } from '../store/useStore'

// 成長実感（研究09）。武器コレクション・封じた崩れ方・Then vs Now・卒業した焦点。

export function GrowthPanel() {
  const { tactics, outcomes, focuses, navigate } = useStore()
  const b = weaponBuckets(tactics, outcomes)
  const sealed = sealedFailures(outcomes)
  const tn = winRateThenNow(outcomes)
  const grad = graduatedFocusCount(focuses)

  const hasAny = b.weapon.length + b.growing.length + sealed.length + grad > 0 || tn !== null

  if (!hasAny) {
    return (
      <div className="stats-box">
        <p className="hint small">実戦の結果と崩れ方を記録していくと、ここに「武器になった戦術」「封じた崩れ方」「勝率の変化」が見えてきます。過去の自分と比べて成長を実感できます。</p>
      </div>
    )
  }

  return (
    <>
      {tn && (
        <>
          <div className="section-head">
            <span>過去の自分との比較</span>
          </div>
          <div className="stats-box thennow">
            <div className="tn-row">
              <div className="tn-cell">
                <span className="tn-label">以前</span>
                <b>{tn.then}%</b>
              </div>
              <div className={`tn-arrow ${tn.delta > 0 ? 'up' : tn.delta < 0 ? 'down' : ''}`}>{tn.delta > 0 ? '↗' : tn.delta < 0 ? '↘' : '→'}</div>
              <div className="tn-cell">
                <span className="tn-label">今</span>
                <b>{tn.now}%</b>
              </div>
            </div>
            <p className="hint small" style={{ textAlign: 'center' }}>
              {tn.delta > 0 ? `勝率が ${tn.delta} ポイント上がりました。` : tn.delta < 0 ? '最近は少し苦戦。焦点を1つに絞り直しましょう。' : '横ばい。狙いを1つに絞ると変わります。'}
            </p>
          </div>
        </>
      )}

      <div className="section-head">
        <span>武器コレクション</span>
        <span className="hint small">決まる武器 {b.weapon.length} / 育成中 {b.growing.length}</span>
      </div>
      <div className="stats-box">
        {b.weapon.length === 0 && b.growing.length === 0 ? (
          <p className="hint small">実戦で試すと、戦術が「育成中 → 武器」に育っていきます。</p>
        ) : (
          <ul className="weapon-list">
            {b.weapon.map((t) => {
              const s = statsFor(t.id, outcomes)
              return (
                <li key={t.id} className="weapon" onClick={() => navigate({ name: 'detail', id: t.id })}>
                  <span className="wp-badge good">武器</span>
                  <span className="wp-title">{t.title}</span>
                  <span className="wp-rate">{s.winRate !== null ? `${Math.round(s.winRate * 100)}%` : ''}</span>
                </li>
              )
            })}
            {b.growing.map((t) => {
              const s = statsFor(t.id, outcomes)
              return (
                <li key={t.id} className="weapon" onClick={() => navigate({ name: 'detail', id: t.id })}>
                  <span className="wp-badge">育成中</span>
                  <span className="wp-title">{t.title}</span>
                  <span className="wp-rate">{s.winRate !== null ? `${Math.round(s.winRate * 100)}%` : `${s.tried}回`}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {sealed.length > 0 && (
        <>
          <div className="section-head">
            <span>封じた崩れ方</span>
            <span className="hint small">最近は出していない</span>
          </div>
          <div className="stats-box">
            <ul className="sealed-list">
              {sealed.map((s) => (
                <li key={s.tag}>
                  <span className="sealed-check">✓</span>
                  <span>{s.tag}</span>
                </li>
              ))}
            </ul>
            <p className="hint small">以前あった崩れ方を、最近の実戦では出していません。克服のあとです。</p>
          </div>
        </>
      )}

      {grad > 0 && (
        <div className="stats-box grad-box">
          これまでに <b>{grad}</b> 個の焦点を達成しました。
        </div>
      )}
    </>
  )
}

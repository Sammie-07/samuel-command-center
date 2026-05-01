import { useState, useEffect } from 'react';
import { INCOME, MONTHLY_EXPENSES, PURCHASES, PLAN_PERIODS } from './data/plan.js';

// ── Formatters ──────────────────────────────────────────────────────────────
const fmt = (n) => '₦' + Number(n).toLocaleString('en-NG');
const fmtK = (n) => {
  if (n >= 1_000_000) return '₦' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return '₦' + (n / 1_000).toFixed(0) + 'k';
  return '₦' + n;
};
const fmtDate = (dateStr, opts = {}) =>
  new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric', ...opts });

// ── LocalStorage ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'samuel_ledger_v1';
const load = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
};
const save = (s) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
};
const DEFAULT_STATE = {
  paidPeriods: {},
  purchasesDone: {},
  actualBalances: { savings: 0, land: 0, goal: 0 },
};

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('overview');
  const [state, setState] = useState(() => load() || DEFAULT_STATE);

  useEffect(() => save(state), [state]);

  const today = new Date();

  const pastPeriods = PLAN_PERIODS.filter((p) => new Date(p.date) <= today);
  const futurePeriods = PLAN_PERIODS.filter((p) => new Date(p.date) > today);
  const nextPeriod = futurePeriods[0] || null;
  const lastPastPeriod = pastPeriods[pastPeriods.length - 1] || null;

  const paidCount = pastPeriods.filter((p) => state.paidPeriods[p.id]).length;
  const overduePeriods = pastPeriods.filter((p) => !state.paidPeriods[p.id]);
  const onTrack = overduePeriods.length === 0;

  const plannedBalances = lastPastPeriod
    ? { savings: lastPastPeriod.savings, land: lastPastPeriod.land, goal: lastPastPeriod.goal }
    : { savings: 0, land: 0, goal: 0 };

  const daysToNext = nextPeriod
    ? Math.ceil((new Date(nextPeriod.date) - today) / 86_400_000)
    : null;

  const markPeriodPaid = (periodId, data) =>
    setState((s) => ({ ...s, paidPeriods: { ...s.paidPeriods, [periodId]: data } }));

  const unmarkPeriodPaid = (periodId) =>
    setState((s) => {
      const p = { ...s.paidPeriods };
      delete p[periodId];
      return { ...s, paidPeriods: p };
    });

  const markPurchaseDone = (purchaseId, data) =>
    setState((s) => ({ ...s, purchasesDone: { ...s.purchasesDone, [purchaseId]: data } }));

  const unmarkPurchaseDone = (purchaseId) =>
    setState((s) => {
      const p = { ...s.purchasesDone };
      delete p[purchaseId];
      return { ...s, purchasesDone: p };
    });

  const updateBalances = (balances) =>
    setState((s) => ({ ...s, actualBalances: balances }));

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'budget', label: 'Budget' },
    { key: 'purchases', label: 'Purchases' },
  ];

  const ctx = {
    state, today, pastPeriods, futurePeriods, nextPeriod, lastPastPeriod,
    paidCount, overduePeriods, onTrack, plannedBalances, daysToNext,
    markPeriodPaid, unmarkPeriodPaid, markPurchaseDone, unmarkPurchaseDone, updateBalances,
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-amber-400 leading-tight">Samuel's Ledger</h1>
            <p className="text-xs text-slate-400">
              {today.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            {nextPeriod && (
              <>
                <p className="text-xs text-slate-400">Next payment</p>
                <p className={`text-sm font-bold ${daysToNext <= 3 ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {daysToNext === 0 ? 'Today!' : `${daysToNext}d`}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 flex gap-0">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 pb-16">
        {tab === 'overview'  && <Overview  {...ctx} />}
        {tab === 'timeline'  && <Timeline  {...ctx} />}
        {tab === 'budget'    && <Budget />}
        {tab === 'purchases' && <Purchases {...ctx} />}
      </main>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────
function Overview({ state, today, nextPeriod, paidCount, pastPeriods,
  overduePeriods, onTrack, plannedBalances, markPeriodPaid, unmarkPeriodPaid, updateBalances }) {

  const [editBal, setEditBal] = useState(false);
  const [tempBal, setTempBal] = useState(state.actualBalances);

  const fundCards = [
    { key: 'savings', label: 'Savings (POF)',  color: 'emerald', max: 5_940_000 },
    { key: 'land',    label: 'Land & Stocks',  color: 'blue',    max: 2_960_000 },
    { key: 'goal',    label: 'Goal Fund',      color: 'amber',   max: 5_100_000 },
  ];

  const totalActual  = state.actualBalances.savings + state.actualBalances.land + state.actualBalances.goal;
  const totalPlanned = plannedBalances.savings + plannedBalances.land + plannedBalances.goal;

  const upcomingPurchases = PURCHASES.filter((p) => {
    const period = PLAN_PERIODS.find((pp) => pp.id === p.periodId);
    return period && new Date(period.date) > today;
  }).slice(0, 3);

  const colorBg   = { emerald: 'bg-emerald-500', blue: 'bg-blue-500', amber: 'bg-amber-500' };
  const colorText = { emerald: 'text-emerald-400', blue: 'text-blue-400', amber: 'text-amber-400' };

  return (
    <div className="space-y-5">
      <div className={`rounded-xl p-4 border ${
        onTrack ? 'bg-emerald-950/40 border-emerald-700/60' : 'bg-red-950/40 border-red-700/60'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-base font-bold ${onTrack ? 'text-emerald-400' : 'text-red-400'}`}>
              {onTrack ? '✓ On Track' : `⚠ ${overduePeriods.length} Overdue`}
            </p>
            <p className="text-sm text-slate-400 mt-0.5">
              {pastPeriods.length === 0
                ? 'Journey begins May 15 — get ready!'
                : `${paidCount} / ${pastPeriods.length} periods confirmed`}
            </p>
            {!onTrack && (
              <p className="text-xs text-red-400 mt-1">
                Missing: {overduePeriods.map((p) => fmtDate(p.date, { month: 'short', day: 'numeric' })).join(', ')}
              </p>
            )}
          </div>
          {nextPeriod && (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-400">Next</p>
              <p className="text-sm font-semibold text-slate-200">{fmtDate(nextPeriod.date)}</p>
              <p className="text-xs text-amber-400">{fmt(INCOME.gross)} incoming</p>
            </div>
          )}
        </div>
      </div>

      {nextPeriod && (
        <QuickPay period={nextPeriod} state={state} onMarkPaid={markPeriodPaid} onUnmark={unmarkPeriodPaid} />
      )}

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Biweekly Income Flow</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Gross',       value: INCOME.gross,  color: 'text-slate-100',   bg: 'bg-slate-700/50' },
            { label: 'Tithe (10%)', value: INCOME.tithe,  color: 'text-red-400',     bg: 'bg-red-950/30',    prefix: '-' },
            { label: 'Upkeep',      value: INCOME.upkeep, color: 'text-orange-400',  bg: 'bg-orange-950/30', prefix: '-' },
            { label: 'Net Save',    value: INCOME.net,    color: 'text-emerald-400', bg: 'bg-emerald-950/30' },
          ].map((item) => (
            <div key={item.label} className={`${item.bg} rounded-lg p-3`}>
              <p className="text-xs text-slate-400 mb-1">{item.label}</p>
              <p className={`text-base font-bold ${item.color}`}>
                {item.prefix}{fmtK(item.value)}
              </p>
            </div>
          ))}
        </div>
        {nextPeriod && nextPeriod.id >= 7 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: 'Savings',       value: 180000, color: 'text-emerald-400' },
              { label: 'Land & Stocks', value: 80000,  color: 'text-blue-400' },
              { label: 'Goal Fund',     value: 250000, color: 'text-amber-400' },
            ].map((item) => (
              <div key={item.label} className="bg-slate-700/30 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className={`text-sm font-semibold ${item.color}`}>{fmtK(item.value)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fund Balances</h2>
          <button
            onClick={() => { setEditBal(!editBal); setTempBal(state.actualBalances); }}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            {editBal ? 'Cancel' : 'Update actuals'}
          </button>
        </div>

        {editBal && (
          <div className="mb-4 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {fundCards.map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-slate-400 block mb-1">{f.label}</label>
                  <input
                    type="number"
                    value={tempBal[f.key]}
                    onChange={(e) => setTempBal((t) => ({ ...t, [f.key]: Number(e.target.value) }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => { updateBalances(tempBal); setEditBal(false); }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold py-2 rounded text-sm transition-colors"
            >
              Save Balances
            </button>
          </div>
        )}

        <div className="space-y-4">
          {fundCards.map((f) => {
            const actual  = state.actualBalances[f.key];
            const planned = plannedBalances[f.key];
            const pct     = Math.min((actual / f.max) * 100, 100);
            const planPct = Math.min((planned / f.max) * 100, 100);
            const diff    = actual - planned;

            return (
              <div key={f.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{f.label}</span>
                  <div className="text-right">
                    <span className={`font-semibold ${colorText[f.color]}`}>{fmtK(actual)}</span>
                    <span className="text-slate-500 text-xs"> / {fmtK(planned)} plan</span>
                  </div>
                </div>
                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden relative">
                  <div
                    className={`absolute top-0 h-full ${colorBg[f.color]} opacity-20 rounded-full`}
                    style={{ width: `${planPct}%` }}
                  />
                  <div
                    className={`absolute top-0 h-full ${colorBg[f.color]} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {planned > 0 && (
                  <p className={`text-xs mt-0.5 ${diff >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {diff >= 0 ? `+${fmtK(diff)} ahead` : `${fmtK(diff)} behind`}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-400">Total Portfolio</p>
            <p className="text-xl font-bold text-amber-400">{fmtK(totalActual)}</p>
          </div>
          {totalPlanned > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-400">Plan target</p>
              <p className="text-sm text-slate-300">{fmtK(totalPlanned)}</p>
            </div>
          )}
        </div>
      </div>

      {upcomingPurchases.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Next Purchases</h2>
          <div className="space-y-2">
            {upcomingPurchases.map((p) => {
              const period = PLAN_PERIODS.find((pp) => pp.id === p.periodId);
              return (
                <div key={p.id} className="flex items-center gap-3 p-2.5 bg-slate-700/40 rounded-lg">
                  <span className="text-xl">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      {period ? fmtDate(period.date) : ''}
                      {p.detail ? ` · ${p.detail}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-amber-400 flex-shrink-0">{fmtK(p.amount)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quick Pay CTA ─────────────────────────────────────────────────────────────
function QuickPay({ period, state, onMarkPaid, onUnmark }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(INCOME.gross);
  const [notes, setNotes] = useState('');
  const paid = state.paidPeriods[period.id];

  if (paid) {
    return (
      <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-emerald-400 font-semibold text-sm">
            ✓ {fmtDate(period.date)} confirmed
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {fmt(paid.actualAmount)} received · logged {fmtDate(paid.paidDate)}
            {paid.notes ? ` · ${paid.notes}` : ''}
          </p>
        </div>
        <button
          onClick={() => onUnmark(period.id)}
          className="text-xs text-slate-500 hover:text-red-400 transition-colors ml-3"
        >
          Undo
        </button>
      </div>
    );
  }

  const netSave = amount - Math.round(amount * 0.1) - INCOME.upkeep;

  return (
    <div className="bg-slate-800 rounded-xl border border-amber-500/40 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-amber-400">Mark Payment Received</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Period {period.id} · {fmtDate(period.date)}
          </p>
        </div>
        {period.note && (
          <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 ml-2">{period.note}</span>
        )}
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-lg transition-colors"
        >
          I Received My Payment
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Amount received (₦)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            {[
              { label: 'Tithe',    value: Math.round(amount * 0.1), color: 'text-red-400',    bg: 'bg-red-950/30' },
              { label: 'Upkeep',   value: INCOME.upkeep,            color: 'text-orange-400', bg: 'bg-orange-950/30' },
              { label: 'Net Save', value: netSave,                  color: 'text-emerald-400', bg: 'bg-emerald-950/30' },
            ].map((item) => (
              <div key={item.label} className={`${item.bg} rounded-lg p-2`}>
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className={`font-semibold ${item.color}`}>{fmtK(item.value)}</p>
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs text-slate-400">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. client bonus included"
              className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onMarkPaid(period.id, { actualAmount: amount, paidDate: new Date().toISOString(), notes });
                setOpen(false);
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              Confirm ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function Timeline({ state, today, markPeriodPaid, unmarkPeriodPaid }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-3">
        {[
          { color: 'bg-emerald-500', label: 'Paid' },
          { color: 'bg-amber-500',   label: 'Next up' },
          { color: 'bg-red-500',     label: 'Overdue' },
          { color: 'bg-slate-600',   label: 'Future' },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${l.color}`} />
            {l.label}
          </span>
        ))}
      </div>

      {PLAN_PERIODS.map((period, idx) => {
        const date       = new Date(period.date);
        const isPast     = date <= today;
        const isPaid     = !!state.paidPeriods[period.id];
        const isNext     = !isPast && (idx === 0 || new Date(PLAN_PERIODS[idx - 1].date) <= today);
        const isOverdue  = isPast && !isPaid;
        const periodPurchases = PURCHASES.filter((p) => p.periodId === period.id);

        let dot = 'bg-slate-600';
        if (isPaid)         dot = 'bg-emerald-500';
        else if (isOverdue) dot = 'bg-red-500';
        else if (isNext)    dot = 'bg-amber-500';

        return (
          <div key={period.id}>
            {period.id === 1 && (
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 px-1">
                Phase 1 — 2026 · Infrastructure &amp; Rebirth
              </p>
            )}
            {period.id === 18 && (
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-4 pb-1 px-1">
                Phase 2 — 2027 · The Car &amp; Rent Strategy
              </p>
            )}

            <div className={`bg-slate-800 rounded-xl border transition-all ${
              isNext    ? 'border-amber-500/50' :
              isOverdue ? 'border-red-500/30' :
              'border-slate-700'
            }`}>
              <button
                className="w-full p-3 text-left flex items-center gap-3"
                onClick={() => setExpanded(expanded === period.id ? null : period.id)}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {period.note && <span className="text-xs text-slate-400 truncate">{period.note}</span>}
                    {periodPurchases.map((p) => <span key={p.id} title={p.name}>{p.emoji}</span>)}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400 flex-shrink-0 space-y-0.5">
                  <div>Goal {fmtK(period.goal)}</div>
                  {period.savings > 0 && <div>Sav {fmtK(period.savings)}</div>}
                </div>
                <span className="text-slate-500 text-xs ml-1">{expanded === period.id ? '▲' : '▼'}</span>
              </button>

              {expanded === period.id && (
                <div className="px-3 pb-3 border-t border-slate-700 pt-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-sm text-center">
                    {[
                      { label: 'Savings (POF)', value: period.savings, color: 'text-emerald-400' },
                      { label: 'Land & Stocks', value: period.land,    color: 'text-blue-400' },
                      { label: 'Goal Fund',     value: period.goal,    color: 'text-amber-400' },
                    ].map((item) => (
                      <div key={item.label} className="bg-slate-700/40 rounded-lg p-2">
                        <p className="text-xs text-slate-400 mb-0.5">{item.label}</p>
                        <p className={`font-semibold ${item.color}`}>{fmtK(item.value)}</p>
                      </div>
                    ))}
                  </div>

                  {periodPurchases.length > 0 && (
                    <div className="space-y-1.5">
                      {periodPurchases.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 text-sm bg-amber-950/30 border border-amber-700/30 rounded-lg p-2">
                          <span>{p.emoji}</span>
                          <span className="flex-1">{p.name}</span>
                          <span className="text-amber-400 font-semibold">{fmtK(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isPaid ? (
                    <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-700/40 rounded-lg p-2">
                      <div>
                        <p className="text-xs text-emerald-400 font-medium">✓ Paid</p>
                        <p className="text-xs text-slate-400">
                          {fmt(state.paidPeriods[period.id].actualAmount)} received ·{' '}
                          {fmtDate(state.paidPeriods[period.id].paidDate)}
                          {state.paidPeriods[period.id].notes ? ` · ${state.paidPeriods[period.id].notes}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => unmarkPeriodPaid(period.id)}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <InlineMarkPaid period={period} onMarkPaid={markPeriodPaid} />
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InlineMarkPaid({ period, onMarkPaid }) {
  const [amount, setAmount] = useState(INCOME.gross);
  return (
    <div className="flex gap-2">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
        placeholder="Amount received"
      />
      <button
        onClick={() => onMarkPaid(period.id, { actualAmount: amount, paidDate: new Date().toISOString(), notes: '' })}
        className="bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 rounded text-sm font-semibold transition-colors"
      >
        Mark Paid
      </button>
    </div>
  );
}

// ── Budget ────────────────────────────────────────────────────────────────────
function Budget() {
  const monthlyUpkeep = INCOME.upkeep * 2;
  const totalSubs     = MONTHLY_EXPENSES.reduce((s, e) => s + e.amount, 0);
  const foodMisc      = monthlyUpkeep - totalSubs;
  const allItems      = [...MONTHLY_EXPENSES, { name: 'Food & Misc', amount: foodMisc, color: '#475569' }];
  const totalAll      = allItems.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-5">
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Monthly Expense Breakdown</h2>
        <div className="flex h-7 rounded-lg overflow-hidden gap-px mb-5">
          {allItems.map((e) => (
            <div
              key={e.name}
              style={{ width: `${(e.amount / totalAll) * 100}%`, backgroundColor: e.color }}
              title={`${e.name}: ${fmt(e.amount)}`}
            />
          ))}
        </div>
        <div className="space-y-2">
          {allItems.map((e) => (
            <div key={e.name} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: e.color }} />
              <span className="text-sm flex-1 text-slate-300">{e.name}</span>
              <span className="text-sm font-medium text-slate-100">{fmt(e.amount)}</span>
              <span className="text-xs text-slate-500 w-9 text-right">
                {((e.amount / totalAll) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-slate-700 space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Monthly Upkeep Budget (₦75k × 2)</span>
            <span>{fmt(monthlyUpkeep)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Total Fixed Subs</span>
            <span>{fmt(totalSubs)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span className="text-slate-200">Food &amp; Misc Buffer</span>
            <span className="text-emerald-400">{fmt(foodMisc)}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Biweekly Cash Flow</h2>
        <div className="space-y-1.5">
          {[
            { label: 'Gross Income',    value: INCOME.gross,  sign: '',  textColor: 'text-slate-100',   bg: '' },
            { label: 'Tithe (10%)',     value: INCOME.tithe,  sign: '−', textColor: 'text-red-400',     bg: '' },
            { label: 'Biweekly Upkeep', value: INCOME.upkeep, sign: '−', textColor: 'text-orange-400',  bg: '' },
            { label: 'Net to Allocate', value: INCOME.net,    sign: '=', textColor: 'text-emerald-400', bg: 'bg-emerald-950/30 border border-emerald-800' },
          ].map((item) => (
            <div key={item.label} className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm ${item.bg}`}>
              <span className="text-slate-300">{item.label}</span>
              <span className={`font-semibold ${item.textColor}`}>
                {item.sign} {fmt(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Allocation Split (from Aug 7, 2026)</h2>
        <p className="text-xs text-slate-500 mb-3">Before Aug 7 → 100% to Goal Fund</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Savings (POF)',  value: 180000, pct: '35%', color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-800' },
            { label: 'Land & Stocks', value: 80000,  pct: '16%', color: 'text-blue-400',    bg: 'bg-blue-950/30 border-blue-800' },
            { label: 'Goal Fund',     value: 250000, pct: '49%', color: 'text-amber-400',   bg: 'bg-amber-950/30 border-amber-800' },
          ].map((item) => (
            <div key={item.label} className={`border rounded-lg p-3 ${item.bg}`}>
              <p className="text-xs text-slate-400 mb-1">{item.label}</p>
              <p className={`text-base font-bold ${item.color}`}>{fmtK(item.value)}</p>
              <p className="text-xs text-slate-500">{item.pct}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Purchases ─────────────────────────────────────────────────────────────────
function Purchases({ state, today, markPurchaseDone, unmarkPurchaseDone }) {
  const done = PURCHASES.filter((p) => state.purchasesDone[p.id]).length;
  const totalSpent = PURCHASES
    .filter((p) => state.purchasesDone[p.id])
    .reduce((s, p) => s + (state.purchasesDone[p.id].actualCost || p.amount), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: PURCHASES.length,  color: 'text-slate-100' },
          { label: 'Done',  value: done,              color: 'text-emerald-400' },
          { label: 'Spent', value: fmtK(totalSpent),  color: 'text-amber-400' },
        ].map((item) => (
          <div key={item.label} className="bg-slate-800 rounded-xl p-3 border border-slate-700 text-center">
            <p className="text-xs text-slate-400">{item.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        {PURCHASES.map((p) => {
          const period   = PLAN_PERIODS.find((pp) => pp.id === p.periodId);
          const isDone   = !!state.purchasesDone[p.id];
          const doneData = state.purchasesDone[p.id];
          return (
            <PurchaseCard
              key={p.id}
              purchase={p} period={period}
              isDone={isDone} doneData={doneData}
              onMarkDone={markPurchaseDone} onUnmark={unmarkPurchaseDone}
            />
          );
        })}
      </div>
    </div>
  );
}

function PurchaseCard({ purchase: p, period, isDone, doneData, onMarkDone, onUnmark }) {
  const [open, setOpen] = useState(false);
  const [actualCost, setActualCost] = useState(p.amount);

  return (
    <div className={`bg-slate-800 rounded-xl border p-4 transition-all ${
      isDone ? 'border-emerald-700/40 opacity-75' : 'border-slate-700'
    }`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">{p.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-medium ${isDone ? 'line-through text-slate-400' : 'text-slate-100'}`}>{p.name}</p>
            {isDone && (
              <span className="text-xs bg-emerald-900 text-emerald-400 px-2 py-0.5 rounded-full">Purchased ✓</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {p.detail ? `${p.detail} · ` : ''}
            {period ? fmtDate(period.date, { month: 'short', year: 'numeric' }) : ''}
          </p>
          {isDone && doneData && (
            <p className="text-xs text-emerald-500 mt-0.5">
              Paid {fmt(doneData.actualCost || p.amount)} on {fmtDate(doneData.doneDate)}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-semibold text-amber-400">{fmtK(p.amount)}</p>
          {isDone && doneData?.actualCost !== p.amount && (
            <p className="text-xs text-slate-400">actual {fmtK(doneData.actualCost)}</p>
          )}
        </div>
      </div>

      {!isDone && !open && (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full text-xs bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-slate-300 transition-colors"
        >
          Mark as Purchased
        </button>
      )}

      {open && !isDone && (
        <div className="mt-3 space-y-2">
          <div>
            <label className="text-xs text-slate-400">Actual cost paid (₦)</label>
            <input
              type="number"
              value={actualCost}
              onChange={(e) => setActualCost(Number(e.target.value))}
              className="w-full mt-1 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-1.5 rounded text-xs transition-colors">Cancel</button>
            <button
              onClick={() => { onMarkDone(p.id, { doneDate: new Date().toISOString(), actualCost }); setOpen(false); }}
              className="flex-1 bg-emerald-700 hover:bg-emerald-600 py-1.5 rounded text-xs font-semibold transition-colors"
            >
              Confirm Purchase ✓
            </button>
          </div>
        </div>
      )}

      {isDone && (
        <button onClick={() => onUnmark(p.id)} className="mt-2 text-xs text-slate-600 hover:text-red-400 transition-colors">Undo</button>
      )}
    </div>
  );
}

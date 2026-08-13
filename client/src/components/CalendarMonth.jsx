import { useMemo, useState } from 'react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

const fmtLong = (key) =>
  parseYmd(key).toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// Iterate each calendar day from startYmd to endYmd inclusive.
function eachDay(startYmd, endYmd, cb) {
  const end = parseYmd(endYmd);
  for (let d = parseYmd(startYmd); d <= end; d.setDate(d.getDate() + 1)) cb(ymd(d));
}

// How many entries fit in a cell before it starts hiding things.
const VISIBLE_PER_DAY = 3;

// One visual language for both the grid chips and the day popup, so a cell and
// its expanded view never disagree about what something is.
const KIND = {
  taskStart:   { icon: '▶',  chip: 'bg-green-100 text-green-800',  label: 'Task starts' },
  taskEnd:     { icon: '⚑',  chip: 'bg-red-100 text-red-700',      label: 'Deadline' },
  taskMid:     { icon: '⋯',  chip: 'bg-green-50 text-green-700',   label: 'Task ongoing' },
  shift:       { icon: '🕘', chip: 'bg-blue-100 text-blue-700',    label: 'On shift' },
  unavailable: { icon: '🚫', chip: 'bg-amber-100 text-amber-700',  label: 'Unavailable / leave' },
};

/**
 * Hand-built month calendar.
 * Props:
 *   year, month (0-11)      — the visible month
 *   data                    — { shifts, tasks, unavailable } from /pm|worker/calendar
 *   onPrev, onNext, onToday — month navigation
 *   scope                   — 'manager' | 'worker' (controls whether names are shown)
 */
export default function CalendarMonth({ year, month, data, onPrev, onNext, onToday, scope = 'manager' }) {
  const [openDay, setOpenDay] = useState(null);
  const isManager = scope === 'manager';

  // Each day becomes one ordered list of typed entries. A single list is what
  // makes the "+ N more" count honest — the old version counted only shifts and
  // absences, so a day full of tasks claimed to have nothing hidden.
  const buckets = useMemo(() => {
    const b = {};
    const get = (k) => (b[k] ??= { entries: [], ongoing: 0 });

    const push = (key, kind, primary, secondary) =>
      get(key).entries.push({ kind, primary, secondary });

    for (const t of data?.tasks ?? []) {
      const detail = [t.status, t.department, (t.assignees ?? []).join(', ')].filter(Boolean).join(' · ');
      push(t.start, 'taskStart', t.title, detail);
      if (t.end !== t.start) {
        push(t.end, 'taskEnd', t.title, detail);
        eachDay(t.start, t.end, (k) => {
          if (k === t.start || k === t.end) return;
          push(k, 'taskMid', t.title, detail);
          get(k).ongoing += 1;
        });
      }
    }

    for (const s of data?.shifts ?? []) {
      push(
        s.date, 'shift',
        isManager ? (s.userName ?? s.shiftName) : s.shiftName,
        `${s.shiftName} · ${s.startTime}–${s.endTime}`,
      );
    }

    for (const u of data?.unavailable ?? []) {
      const status = String(u.status ?? '').replace('_', ' ').toLowerCase();
      const detail = u.leaveType ? `${u.leaveType.toLowerCase()} leave` : status;
      eachDay(u.start, u.end, (k) => push(k, 'unavailable', isManager ? (u.userName ?? status) : status, detail));
    }

    // Task milestones first: they are the things with a deadline attached.
    const order = { taskStart: 0, taskEnd: 1, shift: 2, unavailable: 3, taskMid: 4 };
    for (const day of Object.values(b)) day.entries.sort((x, y) => order[x.kind] - order[y.kind]);
    return b;
  }, [data, isManager]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startPad = first.getDay();               // leading blanks (Sun-based)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < startPad; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const todayYmd = ymd(new Date());
  const openEntries = openDay ? (buckets[openDay]?.entries ?? []) : [];

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{MONTHS[month]} {year}</h3>
          <div className="flex items-center gap-1">
            <button onClick={onToday} className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-50">Today</button>
            <button onClick={onPrev} aria-label="Previous month" className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center">‹</button>
            <button onClick={onNext} aria-label="Next month" className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center">›</button>
          </div>
        </div>

        {/* Legend */}
        <div className="px-5 py-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 border-b border-gray-50">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" />Task start</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" />Deadline</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />On shift</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />Unavailable / leave</span>
          <span className="ml-auto text-gray-400">Click any day for its full schedule</span>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-400 border-b border-gray-50">
          {WEEKDAYS.map((w) => <div key={w} className="py-2">{w}</div>)}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="min-h-[92px] border-b border-r border-gray-50 bg-gray-50/40" />;
            const key = ymd(date);
            const day = buckets[key];
            const entries = day?.entries ?? [];
            const isToday = key === todayYmd;
            const hidden = Math.max(0, entries.length - VISIBLE_PER_DAY);

            return (
              <button
                key={i}
                type="button"
                onClick={() => setOpenDay(key)}
                aria-label={`${fmtLong(key)} — ${entries.length} item(s)`}
                className={`min-h-[92px] border-b border-r border-gray-50 p-1.5 text-left align-top transition-colors hover:bg-primary-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-400 ${day?.ongoing ? 'bg-green-50/40' : ''}`}
              >
                <div className={`text-xs font-medium mb-1 ${isToday ? 'bg-primary-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-gray-500'}`}>
                  {date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {entries.slice(0, VISIBLE_PER_DAY).map((e, idx) => (
                    <div
                      key={idx}
                      title={`${KIND[e.kind].label}: ${e.primary}${e.secondary ? ` — ${e.secondary}` : ''}`}
                      className={`truncate text-[10px] leading-tight rounded px-1 py-0.5 ${KIND[e.kind].chip}`}
                    >
                      {/* Only a manager's chips carry a person's name, and only
                          those get trimmed to a first name to fit. A worker's
                          own chips are the shift or status itself — trimming
                          those turns "Morning Shift" into "Morning". */}
                      {KIND[e.kind].icon}{' '}
                      {isManager && (e.kind === 'shift' || e.kind === 'unavailable')
                        ? String(e.primary).split(' ')[0]
                        : e.primary}
                    </div>
                  ))}
                  {hidden > 0 && (
                    <div className="text-[10px] font-medium text-primary-600 px-1 hover:underline">
                      + {hidden} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail */}
      {openDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setOpenDay(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
              <div>
                <h2 className="font-semibold text-gray-800">{fmtLong(openDay)}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {openEntries.length === 0
                    ? 'Nothing scheduled'
                    : `${openEntries.length} item${openEntries.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <button onClick={() => setOpenDay(null)} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1">
              {openEntries.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No shifts, tasks or absences on this day.
                </p>
              ) : (
                <div className="space-y-2">
                  {openEntries.map((e, idx) => (
                    <div key={idx} className="flex items-start gap-3 border border-gray-100 rounded-lg px-3 py-2.5">
                      <span className={`text-xs rounded px-1.5 py-0.5 flex-shrink-0 ${KIND[e.kind].chip}`}>{KIND[e.kind].icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 break-words">{e.primary}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {KIND[e.kind].label}{e.secondary ? ` · ${e.secondary}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 flex justify-end flex-shrink-0">
              <button onClick={() => setOpenDay(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

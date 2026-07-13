import { useMemo } from 'react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

// Iterate each calendar day from startYmd to endYmd inclusive.
function eachDay(startYmd, endYmd, cb) {
  const end = parseYmd(endYmd);
  for (let d = parseYmd(startYmd); d <= end; d.setDate(d.getDate() + 1)) cb(ymd(d));
}

/**
 * Hand-built month calendar.
 * Props:
 *   year, month (0-11)      — the visible month
 *   data                    — { shifts, tasks, unavailable } from /pm|worker/calendar
 *   onPrev, onNext, onToday — month navigation
 *   scope                   — 'manager' | 'worker' (controls whether names are shown)
 */
export default function CalendarMonth({ year, month, data, onPrev, onNext, onToday, scope = 'manager' }) {
  const buckets = useMemo(() => {
    const b = {}; // ymd -> { shifts, unavailable, taskStart, taskEnd, taskMid }
    const get = (k) => (b[k] ??= { shifts: [], unavailable: [], taskStart: [], taskEnd: [], taskMid: [] });
    for (const s of data?.shifts ?? []) get(s.date).shifts.push(s);
    for (const u of data?.unavailable ?? []) eachDay(u.start, u.end, (k) => get(k).unavailable.push(u));
    for (const t of data?.tasks ?? []) {
      if (t.start === t.end) { get(t.start).taskStart.push(t); }
      else {
        get(t.start).taskStart.push(t);
        get(t.end).taskEnd.push(t);
        eachDay(t.start, t.end, (k) => { if (k !== t.start && k !== t.end) get(k).taskMid.push(t); });
      }
    }
    return b;
  }, [data]);

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

  return (
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
          const c = buckets[key];
          const isToday = key === todayYmd;
          const hasMid = c && c.taskMid.length > 0;
          return (
            <div key={i} className={`min-h-[92px] border-b border-r border-gray-50 p-1.5 ${hasMid ? 'bg-green-50/40' : ''}`}>
              <div className={`text-xs font-medium mb-1 ${isToday ? 'bg-primary-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-gray-500'}`}>{date.getDate()}</div>
              <div className="space-y-0.5">
                {c?.taskStart.map((t) => (
                  <div key={'s' + t.task_id} title={`${t.title} starts`} className="truncate text-[10px] leading-tight bg-green-100 text-green-800 rounded px-1 py-0.5">▶ {t.title}</div>
                ))}
                {c?.taskEnd.map((t) => (
                  <div key={'e' + t.task_id} title={`${t.title} due`} className="truncate text-[10px] leading-tight bg-red-100 text-red-700 rounded px-1 py-0.5">⚑ {t.title}</div>
                ))}
                {c?.shifts.slice(0, 2).map((s, idx) => (
                  <div key={'sh' + idx} title={scope === 'manager' ? `${s.userName} · ${s.shiftName} ${s.startTime}–${s.endTime}` : `${s.shiftName} ${s.startTime}–${s.endTime}`}
                    className="truncate text-[10px] leading-tight bg-blue-100 text-blue-700 rounded px-1 py-0.5">
                    🕘 {scope === 'manager' ? (s.userName?.split(' ')[0] ?? s.shiftName) : s.shiftName}
                  </div>
                ))}
                {c?.unavailable.slice(0, 2).map((u, idx) => (
                  <div key={'u' + idx} title={scope === 'manager' ? `${u.userName} — ${u.status}` : u.status}
                    className="truncate text-[10px] leading-tight bg-amber-100 text-amber-700 rounded px-1 py-0.5">
                    🚫 {scope === 'manager' ? (u.userName?.split(' ')[0] ?? u.status) : u.status.replace('_', ' ')}
                  </div>
                ))}
                {c && (c.shifts.length > 2 || c.unavailable.length > 2) && (
                  <div className="text-[10px] text-gray-400 px-1">+ more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

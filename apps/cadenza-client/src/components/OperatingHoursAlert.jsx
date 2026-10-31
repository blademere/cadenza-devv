import { useEffect, useState } from 'react';
import { AlertCircleIcon } from 'lucide-react';
import { getHoursForDate, getOperatingHours } from '@/services/operatingHoursService';

const manilaDateKey = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
}).format(date);

const formatClosedDate = (dateKey) => new Date(`${dateKey}T00:00:00+08:00`).toLocaleDateString('en-PH', {
  timeZone: 'Asia/Manila',
  dateStyle: 'long',
});

export function OperatingHoursAlert({ className = '' }) {
  const [hours, setHours] = useState(null);

  useEffect(() => {
    let active = true;
    const load = () => getOperatingHours().then((value) => {
      if (active) setHours(value);
    }).catch(() => {});

    load();
    const refreshTimer = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const todayKey = manilaDateKey();
  const todayHours = hours ? getHoursForDate(hours, new Date()) : null;
  const upcomingClosures = Object.entries(hours?.dateOverrides || {})
    .filter(([date, entry]) => date >= todayKey && entry?.isClosed)
    .sort(([first], [second]) => first.localeCompare(second));
  const nextClosure = upcomingClosures[0];
  if (!todayHours?.isClosed && !nextClosure) return null;
  const closedDate = todayHours?.isClosed ? todayKey : nextClosure[0];
  const closedEntry = todayHours?.isClosed ? todayHours : nextClosure[1];
  const isToday = closedDate === todayKey;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm ${className}`}
    >
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <div>
        <p className="font-semibold">
          {isToday ? 'The facility is closed today.' : `Scheduled closure: ${formatClosedDate(closedDate)}`}
        </p>
        <p className="mt-0.5">Reason: {closedEntry.reason || 'No reason was provided.'}</p>
      </div>
    </div>
  );
}

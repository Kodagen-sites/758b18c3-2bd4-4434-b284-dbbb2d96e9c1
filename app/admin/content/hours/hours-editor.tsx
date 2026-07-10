'use client';

import { useState } from 'react';
import { updateLocationHours } from '@/app/admin/_actions/update-hours';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Hour = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  notes: string | null;
};

export default function HoursEditor({
  locationId,
  displayName,
  tenantId,
  initialHours,
}: {
  locationId: string;
  displayName: string;
  tenantId: string;
  initialHours: Hour[];
}) {
  // Build complete 7-day array (fill any missing days)
  const fullHours: Hour[] = Array.from({ length: 7 }, (_, day) => {
    const existing = initialHours.find(h => h.day_of_week === day);
    return existing ?? { day_of_week: day, open_time: null, close_time: null, is_closed: true, notes: null };
  }).sort((a, b) => a.day_of_week - b.day_of_week);
  
  const [hours, setHours] = useState<Hour[]>(fullHours);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  
  function updateHour(day: number, field: keyof Hour, value: any) {
    setHours(hs => hs.map(h => h.day_of_week === day ? { ...h, [field]: value } : h));
  }
  
  function applyToWeekdays() {
    const monday = hours[1];
    setHours(hs => hs.map(h => 
      h.day_of_week >= 1 && h.day_of_week <= 5 
        ? { ...h, open_time: monday.open_time, close_time: monday.close_time, is_closed: monday.is_closed }
        : h
    ));
  }
  
  function closeWeekend() {
    setHours(hs => hs.map(h => 
      h.day_of_week === 0 || h.day_of_week === 6
        ? { ...h, is_closed: true, open_time: null, close_time: null }
        : h
    ));
  }
  
  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateLocationHours(tenantId, locationId, hours);
      if (result.success) {
        setSavedAt(new Date());
      }
    } finally {
      setSaving(false);
    }
  }
  
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6">
      <div className="flex items-start justify-between mb-6">
        <h2 className="font-display text-xl">{displayName}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={applyToWeekdays}
            className="text-xs px-3 py-1.5 border border-neutral-300 rounded-md hover:bg-neutral-50"
          >
            Apply Mon to all weekdays
          </button>
          <button
            type="button"
            onClick={closeWeekend}
            className="text-xs px-3 py-1.5 border border-neutral-300 rounded-md hover:bg-neutral-50"
          >
            Close weekend
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        {hours.map(h => (
          <div key={h.day_of_week} className="flex items-center gap-3 py-2">
            <div className="w-24 font-medium text-sm">{DAYS[h.day_of_week]}</div>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={h.is_closed}
                onChange={e => updateHour(h.day_of_week, 'is_closed', e.target.checked)}
                className="rounded"
              />
              Closed
            </label>
            
            {!h.is_closed && (
              <>
                <input
                  type="time"
                  value={h.open_time?.slice(0, 5) ?? ''}
                  onChange={e => updateHour(h.day_of_week, 'open_time', e.target.value ? `${e.target.value}:00` : null)}
                  className="input w-28"
                />
                <span className="text-neutral-400">to</span>
                <input
                  type="time"
                  value={h.close_time?.slice(0, 5) ?? ''}
                  onChange={e => updateHour(h.day_of_week, 'close_time', e.target.value ? `${e.target.value}:00` : null)}
                  className="input w-28"
                />
                <input
                  type="text"
                  value={h.notes ?? ''}
                  onChange={e => updateHour(h.day_of_week, 'notes', e.target.value || null)}
                  placeholder="Notes (optional)"
                  className="input flex-1 text-sm"
                />
              </>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-neutral-100">
        <div className="text-sm text-neutral-500">
          {savedAt && `Saved at ${savedAt.toLocaleTimeString()}`}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-brand-accent text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save hours'}
        </button>
      </div>
    </div>
  );
}

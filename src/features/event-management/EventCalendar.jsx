import { useMemo, useState } from "react";

const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const monthNames = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function EventCalendar({ value, onChange }) {
  const selected = value ? new Date(`${value}T12:00:00`) : new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  );

  const days = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const firstCell = new Date(year, month, 1 - firstWeekday);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstCell);
      date.setDate(firstCell.getDate() + index);
      return date;
    });
  }, [visibleMonth]);

  function moveMonth(offset) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <section className="event-calendar" aria-label="Etkinlik tarihi">
      <div className="event-calendar__heading">
        <strong>Tarih Seç</strong>
        <div>
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Önceki ay">‹</button>
          <span>{monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}</span>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Sonraki ay">›</button>
        </div>
      </div>

      <div className="event-calendar__grid event-calendar__weekdays">
        {dayNames.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="event-calendar__grid">
        {days.map((date) => {
          const dateKey = toDateKey(date);
          const outside = date.getMonth() !== visibleMonth.getMonth();
          return (
            <button
              type="button"
              key={dateKey}
              className={`${outside ? "is-outside" : ""} ${dateKey === value ? "is-selected" : ""}`}
              onClick={() => onChange(dateKey)}
              aria-pressed={dateKey === value}
              aria-label={date.toLocaleDateString("tr-TR")}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </section>
  );
}

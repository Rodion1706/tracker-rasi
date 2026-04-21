// 52-week year progress indicator.
// Shows past / current / future weeks with staggered animation.
import { getWeekId } from "../config";

const MONTH_LABELS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function getIsoWeek(dateStr) {
  // Extract week number from our getWeekId ("2026-W16" -> 16)
  const wid = getWeekId(dateStr);
  return parseInt(wid.split("-W")[1], 10);
}

function getQuarter(weekNum) {
  if (weekNum <= 13) return "Q1";
  if (weekNum <= 26) return "Q2";
  if (weekNum <= 39) return "Q3";
  return "Q4";
}

export default function YearStrip({ today }) {
  const currentWeek = getIsoWeek(today);
  const totalWeeks = 52;
  const pctOfYear = Math.round((currentWeek / totalWeeks) * 1000) / 10;
  const quarter = getQuarter(currentWeek);

  const ticks = [];
  for (let i = 1; i <= totalWeeks; i++) {
    const cls =
      i < currentWeek ? "ys-tick past" :
      i === currentWeek ? "ys-tick current" :
      "ys-tick";
    ticks.push(
      <div
        key={i}
        className={cls}
        title={`W${i}`}
        style={{ animationDelay: `${i * 0.012}s` }}
      />
    );
  }

  return (
    <div className="ys">
      <div className="ys-label">
        <div className="ys-w">
          W<span className="n">{currentWeek}</span>
          <span className="of">/ 52</span>
        </div>
        <div className="ys-sub">{pctOfYear}% · {quarter}</div>
      </div>
      <div className="ys-track">
        {ticks}
        {[25, 50, 75].map(pct => (
          <span key={pct} className="ys-q-divider" style={{ left: `${pct}%` }} />
        ))}
        <div className="ys-quarters">
          {["Q1", "Q2", "Q3", "Q4"].map((q, i) => (
            <span
              key={q}
              className={`ys-q ${quarter === q ? "active" : ""}`}
              style={{ left: `${i * 25 + 12.5}%` }}
            >{q}</span>
          ))}
        </div>
        <div className="ys-months">
          {MONTH_LABELS.map(m => <span key={m}>{m}</span>)}
        </div>
      </div>
    </div>
  );
}

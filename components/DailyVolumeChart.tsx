'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
} from 'recharts';
import type { DailyVolumePoint } from '@/lib/types';
import { THEME } from '@/lib/config';

interface Props {
  data: DailyVolumePoint[];
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as DailyVolumePoint;

  return (
    <div className="tooltip-card" style={{ maxHeight: 320, overflowY: 'auto' }}>
      <div className="tooltip-title">{label}</div>
      <div className="tooltip-row">
        <span className="label">Total requests</span>
        <span>{point.totalRequests}</span>
      </div>
      <div className="tooltip-row">
        <span className="label">Completed</span>
        <span>{point.completed}</span>
      </div>
      <div className="tooltip-row">
        <span className="label">Pending</span>
        <span>{point.pending}</span>
      </div>
      <div className="tooltip-row">
        <span className="label">Completion %</span>
        <span>{point.completionPct}%</span>
      </div>

      {point.employeeBreakdown.length > 0 && (
        <>
          <div className="tooltip-emp-block" style={{ borderTop: '1px solid #dfe4ec', marginTop: 8, paddingTop: 6 }}>
            <div className="tooltip-title" style={{ fontSize: 11.5, marginBottom: 4 }}>
              By employee
            </div>
          </div>
          {point.employeeBreakdown.map((e) => (
            <div key={e.employee} style={{ marginBottom: 4 }}>
              <div className="tooltip-emp-name" style={{ fontSize: 12 }}>
                {e.employee}
              </div>
              <div className="tooltip-row">
                <span className="label">Raised / Done / Pending</span>
                <span>
                  {e.raised} / {e.completed} / {e.pending}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function DailyVolumeChart({ data }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Daily Footage Request Volume vs Completion %</h3>
      </div>
      <p className="card-desc">
        Bars = us din total kitni requests aayi (isi se din ka volume km/zyada decide hota hai), line =
        us din ki completion %. Kisi bhi bar/point pe <strong>click</strong> karo — konse employee ne kitna
        raise/complete/pending kiya, sab fixed dikhega jab tak kahin aur click na karo.
      </p>
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#eef1f6" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: '#6b7a90' }}
            angle={-35}
            textAnchor="end"
            height={55}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="volume"
            tick={{ fontSize: 11, fill: '#6b7a90' }}
            allowDecimals={false}
            width={40}
            label={{ value: 'Requests', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6b7a90' }}
          />
          <YAxis
            yAxisId="pct"
            orientation="right"
            domain={[0, 100]}
            unit="%"
            tick={{ fontSize: 11, fill: '#6b7a90' }}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} trigger="click" />
          <Bar yAxisId="volume" dataKey="completed" name="Completed" stackId="vol" fill={THEME.blue} barSize={26} />
          <Bar
            yAxisId="volume"
            dataKey="pending"
            name="Pending"
            stackId="vol"
            fill={THEME.lowHighlight}
            radius={[4, 4, 0, 0]}
            barSize={26}
          />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="completionPct"
            name="Completion %"
            stroke={THEME.amber}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

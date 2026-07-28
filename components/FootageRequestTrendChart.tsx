'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
} from 'recharts';
import type { FootageTrendPoint } from '@/lib/types';
import EmployeeLegendPanel, { colorForEmployee } from './EmployeeLegendPanel';

interface Props {
  data: FootageTrendPoint[];
  employees: string[];
}

interface Row {
  dateLabel: string;
  _raw: FootageTrendPoint['employees'];
  [employeeName: string]: number | string | FootageTrendPoint['employees'];
}

function buildRows(data: FootageTrendPoint[]): Row[] {
  return data.map((point) => {
    const row: Row = { dateLabel: point.dateLabel, _raw: point.employees };
    for (const emp in point.employees) {
      row[emp] = point.employees[emp].completed;
    }
    return row;
  });
}

function CustomTooltip({ active, payload, label, employees }: TooltipProps<number, string> & { employees: string[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const raw = (payload[0].payload as Row)._raw;

  return (
    <div className="tooltip-card">
      <div className="tooltip-title">{label}</div>
      {payload.map((entry) => {
        const emp = entry.dataKey as string;
        const stats = raw[emp];
        if (!stats) return null;
        return (
          <div key={emp} className="tooltip-emp-block">
            <div className="tooltip-emp-name" style={{ color: colorForEmployee(employees, emp) }}>
              {emp}
            </div>
            <div className="tooltip-row">
              <span className="label">Requests raised</span>
              <span>{stats.raised}</span>
            </div>
            <div className="tooltip-row">
              <span className="label">Completed</span>
              <span>{stats.completed}</span>
            </div>
            <div className="tooltip-row">
              <span className="label">Pending</span>
              <span>{stats.pending}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FootageRequestTrendChart({ data, employees }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(employees.slice(0, 5)));

  const rows = useMemo(() => buildRows(data), [data]);

  const toggle = (emp: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(emp)) next.delete(emp);
      else next.add(emp);
      return next;
    });
  };

  const visibleEmployees = employees.filter((e) => selected.has(e));

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Footage Request Completion Trend — by Employee</h3>
      </div>
      <p className="card-desc">
        Har din har employee ne footage request kitni complete ki, usi se trend line upar/neeche hoti hai.
        Kisi bhi point pe <strong>click</strong> karo — raised / completed / pending fixed dikhega. Default me
        sirf 5 employees dikh rahe hain — right side checkbox se aur add/remove karo.
      </p>
      <div className="chart-body">
        <div className="chart-area">
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#eef1f6" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11, fill: '#6b7a90' }}
                angle={-35}
                textAnchor="end"
                height={55}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11, fill: '#6b7a90' }} allowDecimals={false} width={40} />
              <Tooltip content={<CustomTooltip employees={employees} />} trigger="click" />
              {visibleEmployees.map((emp) => (
                <Line
                  key={emp}
                  type="monotone"
                  dataKey={emp}
                  stroke={colorForEmployee(employees, emp)}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <EmployeeLegendPanel
          employees={employees}
          selected={selected}
          onToggle={toggle}
          onSelectAll={() => setSelected(new Set(employees))}
          onSelectNone={() => setSelected(new Set())}
        />
      </div>
    </div>
  );
}

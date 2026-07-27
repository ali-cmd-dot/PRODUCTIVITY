'use client';

import { LINE_COLORS } from '@/lib/config';

interface Props {
  employees: string[];
  selected: Set<string>;
  onToggle: (employee: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
}

export function colorForEmployee(employees: string[], employee: string): string {
  const idx = employees.indexOf(employee);
  return LINE_COLORS[idx % LINE_COLORS.length];
}

export default function EmployeeLegendPanel({
  employees,
  selected,
  onToggle,
  onSelectAll,
  onSelectNone,
}: Props) {
  return (
    <div className="legend-panel">
      <div className="legend-actions">
        <button onClick={onSelectAll}>All</button>
        <button onClick={onSelectNone}>None</button>
      </div>
      {employees.map((emp) => {
        const isOn = selected.has(emp);
        return (
          <label key={emp} className={`legend-item ${isOn ? '' : 'dim'}`}>
            <input type="checkbox" checked={isOn} onChange={() => onToggle(emp)} />
            <span className="legend-swatch" style={{ background: colorForEmployee(employees, emp) }} />
            {emp}
          </label>
        );
      })}
    </div>
  );
}

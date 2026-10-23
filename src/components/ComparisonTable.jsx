import React from 'react';
import { Table, Layers, Info } from 'lucide-react';

/**
 * Reusable, responsive Comparison Table component.
 * Supports horizontal scrolling, crisp column headers, clear row labels,
 * and high-contrast styling adhering to the design tokens.
 */
export default function ComparisonTable({ table, className = '' }) {
  if (!table || !table.rows || table.rows.length === 0) return null;

  const [headerRow, ...dataRows] = table.rows;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Table Title Bar */}
      <div className="flex items-center justify-between px-1">
        <h4 className="font-heading font-bold text-xs sm:text-sm text-[#1F2433] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#4F46E5] shrink-0" />
          <span>{table.title || 'Comparison Table'}</span>
        </h4>
        <span className="text-[10px] text-[#4A5168] hidden sm:inline-block">
          Scroll horizontally if needed →
        </span>
      </div>

      {/* Responsive Table Scroll Container */}
      <div className="overflow-x-auto rounded-2xl border border-[#ECE8E1] bg-white shadow-xs">
        <table className="min-w-full divide-y divide-[#ECE8E1] text-xs text-left border-collapse">
          <thead>
            <tr className="bg-[#FBFAF7]">
              {headerRow.map((colName, cIdx) => (
                <th
                  key={cIdx}
                  scope="col"
                  className={`py-3 px-4 text-xs font-bold text-[#1F2433] uppercase tracking-wider whitespace-nowrap ${
                    cIdx === 0 ? 'sticky left-0 bg-[#FBFAF7] z-10' : ''
                  }`}
                >
                  {colName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECE8E1]/60 bg-white">
            {dataRows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="hover:bg-[#FBFAF7]/80 transition-colors"
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className={`py-3 px-4 leading-relaxed ${
                      cellIdx === 0
                        ? 'font-semibold text-[#1F2433] whitespace-nowrap sticky left-0 bg-white group-hover:bg-[#FBFAF7]'
                        : 'text-[#4A5168] min-w-[180px]'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

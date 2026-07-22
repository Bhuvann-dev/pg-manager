"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import { getTenants } from "../../services/tenantService";
import { getPayments } from "../../services/paymentService";
import { rentPaidForMonth, MONTH_NAMES } from "../../lib/rent";
import { Loading, EmptyState } from "../../components/States";
import { useAuth } from "../../contexts/AuthContext";

export default function ReportsPage() {
  const { user } = useAuth();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [t, p] = await Promise.all([
        getTenants(user.uid),
        getPayments(user.uid)
      ]);
      setTenants(t.filter((x) => x.status !== "inactive"));
      setPayments(p);
      setLoading(false);
    })();
  }, [user]);

  // Build the report rows for the selected month.
  const { rows, totals } = useMemo(() => {
    const rows = tenants
      .slice()
      .sort((a, b) =>
        String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, {
          numeric: true
        })
      )
      .map((t) => {
        const rent = Number(t.rentAmount) || 0;
        const paid = rentPaidForMonth(payments, t.id, month, year);
        const balance = Math.max(rent - paid, 0);
        const status =
          rent > 0 && paid >= rent
            ? "Paid"
            : paid > 0
            ? "Partial"
            : "Unpaid";

        return {
          name: t.name,
          room: t.roomNumber,
          rent,
          paid,
          balance,
          status
        };
      });

    const totals = rows.reduce(
      (acc, r) => {
        acc.expected += r.rent;
        acc.collected += Math.min(r.paid, r.rent);
        acc.outstanding += r.balance;
        if (r.status === "Paid") acc.paid += 1;
        else if (r.status === "Partial") acc.partial += 1;
        else acc.unpaid += 1;
        return acc;
      },
      { expected: 0, collected: 0, outstanding: 0, paid: 0, partial: 0, unpaid: 0 }
    );

    totals.rate =
      totals.expected > 0
        ? Math.round((totals.collected / totals.expected) * 100)
        : 0;

    return { rows, totals };
  }, [tenants, payments, month, year]);

  const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const exportExcel = () => {
    const data = rows.map((r) => ({
      Name: r.name,
      Room: r.room,
      Rent: r.rent,
      Paid: r.paid,
      Balance: r.balance,
      Status: r.status
    }));

    data.push({});
    data.push({
      Name: "TOTAL",
      Room: "",
      Rent: totals.expected,
      Paid: totals.collected,
      Balance: totals.outstanding,
      Status: `${totals.rate}% collected`
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, periodLabel);
    XLSX.writeFile(wb, `rent-report-${year}-${String(month).padStart(2, "0")}.xlsx`);
  };

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) years.push(y);

  return (
    <div id="report">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Rent Report</h1>
          <p className="text-gray-400 text-sm print-only">{periodLabel}</p>
        </div>

        <div className="flex flex-wrap gap-2 no-print">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-slate-800 px-3 py-2 rounded-lg"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-slate-800 px-3 py-2 rounded-lg"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            onClick={exportExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 transition px-4 py-2 rounded-lg text-sm font-medium"
          >
            <FileSpreadsheet size={16} /> Excel
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 transition px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Printer size={16} /> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <Loading label="Building report…" />
      ) : tenants.length === 0 ? (
        <EmptyState
          title="Nothing to report yet"
          message="Add tenants and record payments to generate a monthly report."
        />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Summary title="Expected" value={`₹${totals.expected}`} />
            <Summary
              title="Collected"
              value={`₹${totals.collected}`}
              accent="text-green-400"
            />
            <Summary
              title="Outstanding"
              value={`₹${totals.outstanding}`}
              accent={totals.outstanding > 0 ? "text-red-400" : undefined}
            />
            <Summary title="Collection Rate" value={`${totals.rate}%`} />
          </div>

          {/* Table */}
          <div className="bg-slate-900 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Room</th>
                  <th className="p-3 text-right">Rent</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Balance</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-800">
                    <td className="p-3">{r.name}</td>
                    <td className="p-3">{r.room}</td>
                    <td className="p-3 text-right">₹{r.rent}</td>
                    <td className="p-3 text-right">₹{r.paid}</td>
                    <td className="p-3 text-right">₹{r.balance}</td>
                    <td
                      className={`p-3 font-medium ${
                        r.status === "Paid"
                          ? "text-green-400"
                          : r.status === "Partial"
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {r.status}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800 font-semibold">
                  <td className="p-3" colSpan={2}>
                    Total ({rows.length})
                  </td>
                  <td className="p-3 text-right">₹{totals.expected}</td>
                  <td className="p-3 text-right">₹{totals.collected}</td>
                  <td className="p-3 text-right">₹{totals.outstanding}</td>
                  <td className="p-3">{totals.rate}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Summary({ title, value, accent }) {
  return (
    <div className="bg-slate-900 p-5 rounded-xl">
      <div className="text-gray-400 text-sm">{title}</div>
      <div className={`text-2xl font-bold mt-1 ${accent || ""}`}>{value}</div>
    </div>
  );
}

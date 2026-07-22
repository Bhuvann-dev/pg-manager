"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, MessageCircle } from "lucide-react";
import { getTenants, openWhatsApp } from "../services/tenantService";
import { getPayments } from "../services/paymentService";
import { getRooms, computeOccupancy } from "../services/roomService";
import { rentStatus, summarizeMonth, MONTH_NAMES } from "../lib/rent";
import { Loading } from "../components/States";
import { useAuth } from "../contexts/AuthContext";

const STATUS_ORDER = { overdue: 0, partial: 1, pending: 2, paid: 3 };

const STATUS_LABEL = {
  paid: "Paid",
  partial: "Partial",
  overdue: "Overdue",
  pending: "Pending"
};

const STATUS_STYLES = {
  paid: "text-green-400",
  partial: "text-amber-400",
  overdue: "text-red-400",
  pending: "text-yellow-400"
};

export default function Dashboard() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData(user.uid);
  }, [user]);

  const loadData = async (ownerId) => {
    setLoading(true);

    const [tenantData, paymentData, roomData] = await Promise.all([
      getTenants(ownerId),
      getPayments(ownerId),
      getRooms(ownerId)
    ]);

    setTenants(tenantData.filter((t) => t.status !== "inactive"));
    setPayments(paymentData);
    setRooms(roomData);
    setLoading(false);
  };

  const today = new Date();

  if (loading) {
    return <Loading label="Loading your dashboard…" />;
  }

  const summary = summarizeMonth(tenants, payments, today);

  // Occupancy
  const totalBeds = rooms.reduce(
    (sum, r) => sum + (Number(r.capacity) || 0),
    0
  );
  const occupiedBeds = rooms.reduce(
    (sum, r) => sum + computeOccupancy(r, tenants),
    0
  );
  const vacantBeds = Math.max(totalBeds - occupiedBeds, 0);

  // Follow-up list: everyone not fully paid, most urgent first.
  const followUps = tenants
    .map((t) => ({ tenant: t, s: rentStatus(t, payments, today) }))
    .filter((x) => x.s.status !== "paid")
    .sort(
      (a, b) =>
        STATUS_ORDER[a.s.status] - STATUS_ORDER[b.s.status] ||
        b.s.balance - a.s.balance
    );

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="text-gray-400 text-sm">
          {MONTH_NAMES[today.getMonth()]} {today.getFullYear()}
        </span>
      </div>

      {/* Rent this month */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Tenants" value={summary.total} />

        <StatCard
          title="Collection Rate"
          value={`${summary.collectionRate}%`}
          accent={
            summary.collectionRate >= 80
              ? "text-green-400"
              : summary.collectionRate >= 50
              ? "text-amber-400"
              : "text-red-400"
          }
        />

        <StatCard
          title="Collected"
          value={`₹${summary.collected}`}
          sub={`of ₹${summary.expected}`}
        />

        <StatCard
          title="Overdue"
          value={`₹${summary.overdueAmount}`}
          accent={summary.overdueAmount > 0 ? "text-red-400" : undefined}
          sub={`${summary.overdue} tenant(s)`}
        />
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-3 mt-4 text-sm">
        <Chip label="Paid" value={summary.paid} className="text-green-400" />
        <Chip
          label="Partial"
          value={summary.partial}
          className="text-amber-400"
        />
        <Chip
          label="Pending"
          value={summary.pending}
          className="text-yellow-400"
        />
        <Chip
          label="Overdue"
          value={summary.overdue}
          className="text-red-400"
        />
      </div>

      {/* Occupancy */}
      <h2 className="text-lg font-semibold mt-8 mb-4">Occupancy</h2>
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Beds" value={totalBeds} />
        <StatCard title="Occupied" value={occupiedBeds} />
        <StatCard title="Vacant" value={vacantBeds} />
      </div>

      {/* Needs follow-up */}
      <h2 className="text-lg font-semibold mt-8 mb-4">
        Needs Follow-up
      </h2>

      {followUps.length === 0 ? (
        <div className="bg-slate-900 rounded-xl p-6 text-green-400">
          🎉 Everyone has paid this month.
        </div>
      ) : (
        <div className="bg-slate-900 rounded-xl divide-y divide-slate-800">
          {followUps.map(({ tenant, s }) => (
            <div
              key={tenant.id}
              className="flex items-center justify-between p-4 gap-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/tenants/${tenant.id}`}
                  className="font-medium text-blue-400 hover:underline"
                >
                  {tenant.name}
                </Link>
                <div className="text-xs text-gray-400">
                  Room {tenant.roomNumber} · due {tenant.dueDate}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div
                    className={`text-sm font-medium flex items-center gap-1 ${
                      STATUS_STYLES[s.status]
                    }`}
                  >
                    {s.status === "overdue" && <AlertTriangle size={14} />}
                    {STATUS_LABEL[s.status]}
                  </div>
                  <div className="text-xs text-gray-400">
                    ₹{s.balance} due
                  </div>
                </div>

                <button
                  onClick={() => openWhatsApp(tenant)}
                  className="bg-blue-600 hover:bg-blue-700 transition px-3 py-2 rounded-lg flex items-center gap-1 text-sm"
                >
                  <MessageCircle size={16} />
                  <span className="hidden sm:inline">Remind</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, sub, accent }) {
  return (
    <div className="bg-slate-900 p-6 rounded-xl shadow-md">
      <div className="text-gray-400 text-sm">{title}</div>
      <div className={`text-3xl font-bold mt-2 ${accent || ""}`}>{value}</div>
      {sub && <div className="text-gray-500 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function Chip({ label, value, className }) {
  return (
    <span className="bg-slate-900 rounded-full px-4 py-1.5">
      <span className={`font-semibold ${className}`}>{value}</span>{" "}
      <span className="text-gray-400">{label}</span>
    </span>
  );
}

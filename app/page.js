"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  MessageCircle,
  Users,
  TrendingUp,
  Wallet,
  BedDouble
} from "lucide-react";
import { getTenants, openWhatsApp } from "../services/tenantService";
import { getPayments } from "../services/paymentService";
import { getRooms, computeOccupancy } from "../services/roomService";
import { rentStatus, summarizeMonth, MONTH_NAMES } from "../lib/rent";
import { Loading } from "../components/States";
import { useAuth } from "../contexts/AuthContext";

const STATUS_ORDER = { overdue: 0, partial: 1, pending: 2, paid: 3 };

const STATUS_BADGE = {
  paid: "badge-success",
  partial: "badge-warning",
  overdue: "badge-danger",
  pending: "badge-pending"
};

const STATUS_LABEL = {
  paid: "Paid",
  partial: "Partial",
  overdue: "Overdue",
  pending: "Pending"
};

const AVATAR_COLORS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#0ea5e9,#22d3ee)",
  "linear-gradient(135deg,#f59e0b,#f97316)",
  "linear-gradient(135deg,#10b981,#34d399)",
  "linear-gradient(135deg,#ec4899,#f43f5e)"
];

const initials = (name) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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

  if (loading) return <Loading label="Loading your dashboard…" />;

  const summary = summarizeMonth(tenants, payments, today);

  const totalBeds = rooms.reduce((s, r) => s + (Number(r.capacity) || 0), 0);
  const occupiedBeds = rooms.reduce(
    (s, r) => s + computeOccupancy(r, tenants),
    0
  );
  const vacantBeds = Math.max(totalBeds - occupiedBeds, 0);

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
      {/* Header */}
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Rent overview for {MONTH_NAMES[today.getMonth()]}{" "}
            {today.getFullYear()}
          </p>
        </div>
      </div>

      {/* Rent stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          tint="99,102,241"
          title="Total Tenants"
          value={summary.total}
        />
        <StatCard
          icon={TrendingUp}
          tint="52,211,153"
          title="Collection Rate"
          value={`${summary.collectionRate}%`}
          sub={`₹${summary.collected} of ₹${summary.expected}`}
        />
        <StatCard
          icon={Wallet}
          tint="14,165,233"
          title="Collected"
          value={`₹${summary.collected}`}
          sub="this month"
        />
        <StatCard
          icon={AlertTriangle}
          tint="248,113,113"
          title="Overdue"
          value={`₹${summary.overdueAmount}`}
          sub={`${summary.overdue} tenant(s)`}
        />
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2 mt-4">
        <span className="badge badge-success">
          {summary.paid} Paid
        </span>
        <span className="badge badge-warning">
          {summary.partial} Partial
        </span>
        <span className="badge badge-pending">
          {summary.pending} Pending
        </span>
        <span className="badge badge-danger">
          {summary.overdue} Overdue
        </span>
      </div>

      {/* Two-column: follow-up + occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8">
        {/* Follow-up */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">Needs Follow-up</h2>

          {followUps.length === 0 ? (
            <div className="card p-8 text-center" style={{ color: "var(--success)" }}>
              🎉 Everyone has paid this month.
            </div>
          ) : (
            <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
              {followUps.map(({ tenant, s }, i) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between gap-3 p-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="grid place-items-center h-10 w-10 rounded-full text-sm font-bold text-white shrink-0"
                      style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {initials(tenant.name)}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/tenants/${tenant.id}`}
                        className="font-medium hover:underline truncate block"
                      >
                        {tenant.name}
                      </Link>
                      <div className="text-xs" style={{ color: "var(--text-faint)" }}>
                        Room {tenant.roomNumber} · due {tenant.dueDate} · ₹
                        {s.balance} due
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`badge ${STATUS_BADGE[s.status]} hidden sm:inline-flex`}>
                      {s.status === "overdue" && <AlertTriangle size={12} />}
                      {STATUS_LABEL[s.status]}
                    </span>
                    <button
                      onClick={() => openWhatsApp(tenant)}
                      className="btn btn-primary btn-sm"
                    >
                      <MessageCircle size={15} />
                      <span className="hidden sm:inline">Remind</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Occupancy */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Occupancy</h2>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <span
                className="grid place-items-center h-11 w-11 rounded-xl"
                style={{ background: "rgba(139,92,246,0.15)", color: "var(--accent-2)" }}
              >
                <BedDouble size={20} />
              </span>
              <div>
                <div className="text-2xl font-bold">
                  {occupiedBeds}
                  <span style={{ color: "var(--text-faint)" }}>/{totalBeds}</span>
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  beds occupied
                </div>
              </div>
            </div>

            {/* Occupancy bar */}
            <div
              className="h-2.5 rounded-full overflow-hidden"
              style={{ background: "var(--surface-3)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${totalBeds ? (occupiedBeds / totalBeds) * 100 : 0}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--accent-2))"
                }}
              />
            </div>

            <div className="flex justify-between mt-4 text-sm">
              <span style={{ color: "var(--text-muted)" }}>Vacant beds</span>
              <span className="font-semibold" style={{ color: "var(--success)" }}>
                {vacantBeds}
              </span>
            </div>

            <Link
              href="/rooms"
              className="btn btn-secondary btn-sm w-full mt-4"
            >
              Manage rooms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, sub, tint }) {
  return (
    <div className="card card-hover p-5">
      <span
        className="grid place-items-center h-10 w-10 rounded-xl mb-4"
        style={{ background: `rgba(${tint},0.15)`, color: `rgb(${tint})` }}
      >
        <Icon size={20} />
      </span>
      <div className="text-sm" style={{ color: "var(--text-muted)" }}>
        {title}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

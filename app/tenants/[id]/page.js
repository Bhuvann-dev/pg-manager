"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  FileText,
  LogOut,
  DoorOpen
} from "lucide-react";
import {
  getTenant,
  getTenants,
  openWhatsApp,
  deactivateTenant,
  updateTenant
} from "../../../services/tenantService";
import { getRooms, computeOccupancy } from "../../../services/roomService";
import {
  getPayments,
  recordPayment,
  deletePaymentById
} from "../../../services/paymentService";
import {
  getDocumentUrl,
  isStoragePath
} from "../../../services/storageService";
import {
  rentStatus,
  depositPaid,
  RENT,
  DEPOSIT,
  MONTH_NAMES,
  formatPaidDate
} from "../../../lib/rent";
import { Loading, EmptyState } from "../../../components/States";
import { useAuth } from "../../../contexts/AuthContext";

const STATUS_STYLES = {
  paid: "bg-green-900/40 text-green-300",
  partial: "bg-amber-900/40 text-amber-300",
  overdue: "bg-red-900/40 text-red-300",
  pending: "bg-yellow-900/40 text-yellow-300"
};

const STATUS_LABEL = {
  paid: "Paid",
  partial: "Partial",
  overdue: "Overdue",
  pending: "Pending"
};

export default function TenantDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id;

  const [tenant, setTenant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allTenants, setAllTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showMove, setShowMove] = useState(false);
  const [moveRoom, setMoveRoom] = useState("");

  const [showPay, setShowPay] = useState(false);
  const [payAmount, setPayAmount] = useState("");

  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");

  const today = new Date();

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tenantId]);

  const load = async () => {
    setLoading(true);

    const [t, allPayments, roomData, tenantData] = await Promise.all([
      getTenant(tenantId, user.uid),
      getPayments(user.uid),
      getRooms(user.uid),
      getTenants(user.uid)
    ]);

    setTenant(t);
    setPayments(allPayments.filter((p) => p.tenantId === tenantId));
    setRooms(roomData);
    setAllTenants(tenantData.filter((x) => x.status !== "inactive"));
    setLoading(false);
  };

  const handleMoveRoom = async () => {
    if (!moveRoom || moveRoom === tenant.roomNumber) {
      setShowMove(false);
      return;
    }

    const target = rooms.find(
      (r) => String(r.roomNumber) === String(moveRoom)
    );

    if (target) {
      const occupancy = computeOccupancy(target, allTenants);
      if (occupancy >= (Number(target.capacity) || 0)) {
        alert(`Room ${target.roomNumber} is full.`);
        return;
      }
    }

    const ok = await updateTenant(tenant.id, { roomNumber: moveRoom });
    if (ok) {
      setShowMove(false);
      await load();
    } else {
      alert("Could not move the tenant.");
    }
  };

  const openPay = () => {
    const { balance, rent } = rentStatus(tenant, payments, today);
    setPayAmount(String(balance > 0 ? balance : rent));
    setShowPay(true);
  };

  const handleRecordPayment = async () => {
    const amount = parseInt(payAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    const ok = await recordPayment(
      {
        tenantId: tenant.id,
        tenantName: tenant.name,
        type: RENT,
        amount,
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        status: "paid",
        paidDate: new Date()
      },
      user.uid
    );

    if (ok) {
      setShowPay(false);
      setPayAmount("");
      await load();
    } else {
      alert("Could not record the payment.");
    }
  };

  const openDeposit = () => {
    const expected = Number(tenant.deposit) || 0;
    const collected = depositPaid(payments, tenant.id);
    const balance = Math.max(expected - collected, 0);
    setDepositAmount(String(balance > 0 ? balance : expected));
    setShowDeposit(true);
  };

  const handleRecordDeposit = async () => {
    const amount = parseInt(depositAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    const ok = await recordPayment(
      {
        tenantId: tenant.id,
        tenantName: tenant.name,
        type: DEPOSIT,
        amount,
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        status: "paid",
        paidDate: new Date()
      },
      user.uid
    );

    if (ok) {
      setShowDeposit(false);
      setDepositAmount("");
      await load();
    } else {
      alert("Could not record the deposit.");
    }
  };

  const handleRefundDeposit = async () => {
    const collected = depositPaid(payments, tenant.id);
    if (collected <= 0) return;

    if (
      !window.confirm(
        `Refund the full deposit of ₹${collected}? This records a refund entry.`
      )
    ) {
      return;
    }

    const ok = await recordPayment(
      {
        tenantId: tenant.id,
        tenantName: tenant.name,
        type: DEPOSIT,
        amount: -collected,
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        status: "refunded",
        paidDate: new Date()
      },
      user.uid
    );

    if (ok) await load();
  };

  const handleRemovePayment = async (p) => {
    const label = `${MONTH_NAMES[p.month - 1]} ${p.year}`;
    if (
      !window.confirm(`Remove the ₹${p.amount} entry for ${label}?`)
    ) {
      return;
    }
    if (await deletePaymentById(p.id)) await load();
  };

  const handleViewDocument = async () => {
    const value = tenant.aadhaarPath || tenant.aadhaarFile;
    if (!value) return;

    if (!isStoragePath(value)) {
      window.open(value, "_blank");
      return;
    }
    const url = await getDocumentUrl(value);
    if (url) window.open(url, "_blank");
    else alert("Could not open the document.");
  };

  const handleLeft = async () => {
    if (!window.confirm("Mark this tenant as left?")) return;
    if (await deactivateTenant(tenant)) {
      router.push("/tenants");
    }
  };

  if (loading) return <Loading label="Loading tenant…" />;

  if (!tenant) {
    return (
      <EmptyState
        title="Tenant not found"
        message="This tenant may have been removed."
        action={
          <Link
            href="/tenants"
            className="bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded-lg font-medium"
          >
            Back to Tenants
          </Link>
        }
      />
    );
  }

  const s = rentStatus(tenant, payments, today);
  const hasDoc = Boolean(tenant.aadhaarPath || tenant.aadhaarFile);

  const depositExpected = Number(tenant.deposit) || 0;
  const depositCollected = depositPaid(payments, tenant.id);
  const depositBalance = Math.max(depositExpected - depositCollected, 0);

  const ledger = payments
    .slice()
    .sort((a, b) => (b.year - a.year) || (b.month - a.month));

  return (
    <div className="max-w-3xl">
      <Link
        href="/tenants"
        className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4"
      >
        <ArrowLeft size={16} /> Back to Tenants
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <p className="text-gray-400 text-sm">
            Room {tenant.roomNumber} · due day {tenant.dueDate}
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[s.status]}`}
        >
          {STATUS_LABEL[s.status]}
          {s.status === "partial" && ` ₹${s.paid}/₹${s.rent}`}
        </span>
      </div>

      {/* This month */}
      <div className="bg-slate-900 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">
            {MONTH_NAMES[today.getMonth()]} {today.getFullYear()} rent
          </h2>
          {s.status !== "paid" && (
            <button
              onClick={openPay}
              className="bg-green-600 hover:bg-green-700 transition px-4 py-2 rounded-lg text-sm font-medium"
            >
              Record Payment
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <Metric label="Rent" value={`₹${s.rent}`} />
          <Metric label="Paid" value={`₹${s.paid}`} accent="text-green-400" />
          <Metric
            label="Balance"
            value={`₹${s.balance}`}
            accent={s.balance > 0 ? "text-red-400" : "text-green-400"}
          />
        </div>
      </div>

      {/* Security deposit */}
      <div className="bg-slate-900 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Security Deposit</h2>

          <div className="flex gap-2">
            {depositBalance > 0 && (
              <button
                onClick={openDeposit}
                className="bg-green-600 hover:bg-green-700 transition px-3 py-2 rounded-lg text-sm font-medium"
              >
                Record Deposit
              </button>
            )}
            {depositCollected > 0 && (
              <button
                onClick={handleRefundDeposit}
                className="bg-slate-700 hover:bg-slate-600 transition px-3 py-2 rounded-lg text-sm"
              >
                Refund
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <Metric label="Expected" value={`₹${depositExpected}`} />
          <Metric
            label="Collected"
            value={`₹${depositCollected}`}
            accent="text-green-400"
          />
          <Metric
            label="Balance"
            value={`₹${depositBalance}`}
            accent={depositBalance > 0 ? "text-amber-400" : "text-green-400"}
          />
        </div>
      </div>

      {/* Profile + actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-900 rounded-xl p-5">
          <h2 className="font-semibold mb-4">Profile</h2>

          <Row label="Phone" value={tenant.phone} />
          <Row label="Room" value={tenant.roomNumber} />
          <Row label="Monthly rent" value={`₹${tenant.rentAmount}`} />
          <Row label="Due day" value={tenant.dueDate} />
        </div>

        <div className="bg-slate-900 rounded-xl p-5">
          <h2 className="font-semibold mb-4">Actions</h2>

          <div className="flex flex-col gap-2">
            <a
              href={`tel:${tenant.phone}`}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition px-4 py-2 rounded-lg text-sm"
            >
              <Phone size={16} /> Call
            </a>

            <button
              onClick={() => openWhatsApp(tenant)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded-lg text-sm"
            >
              <MessageCircle size={16} /> WhatsApp reminder
            </button>

            <button
              onClick={() => {
                setMoveRoom(tenant.roomNumber);
                setShowMove(true);
              }}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition px-4 py-2 rounded-lg text-sm"
            >
              <DoorOpen size={16} /> Move room
            </button>

            <button
              onClick={handleViewDocument}
              disabled={!hasDoc}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              <FileText size={16} />
              {hasDoc ? "View ID document" : "No ID document"}
            </button>

            <button
              onClick={handleLeft}
              className="flex items-center gap-2 bg-red-600/80 hover:bg-red-600 transition px-4 py-2 rounded-lg text-sm"
            >
              <LogOut size={16} /> Mark as left
            </button>
          </div>
        </div>
      </div>

      {/* Ledger */}
      <div className="bg-slate-900 rounded-xl p-5">
        <h2 className="font-semibold mb-4">Payment History</h2>

        {ledger.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">
            No payments recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-800">
            {ledger.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {MONTH_NAMES[p.month - 1]} {p.year}
                    {p.type === "deposit" && (
                      <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">
                        {(Number(p.amount) || 0) < 0 ? "refund" : "deposit"}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    Paid {formatPaidDate(p.paidDate)}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-semibold ${
                      (Number(p.amount) || 0) < 0
                        ? "text-amber-400"
                        : "text-green-400"
                    }`}
                  >
                    {(Number(p.amount) || 0) < 0
                      ? `-₹${Math.abs(Number(p.amount))}`
                      : `₹${Number(p.amount) || 0}`}
                  </span>
                  <button
                    onClick={() => handleRemovePayment(p)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record payment modal */}
      {showPay && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4">
          <div className="bg-slate-900 p-6 rounded-xl w-full max-w-sm">
            <h2 className="text-xl font-bold mb-1">Record Payment</h2>
            <p className="text-gray-400 text-sm mb-4">
              {tenant.name} · {MONTH_NAMES[today.getMonth()]}{" "}
              {today.getFullYear()}
            </p>

            <p className="text-sm text-gray-400 mb-2">
              Rent ₹{s.rent} · Paid ₹{s.paid} · Balance ₹{s.balance}
            </p>

            <label className="text-sm text-gray-400">Amount (₹)</label>
            <input
              type="number"
              min={1}
              autoFocus
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full p-3 mt-1 mb-5 rounded-lg bg-slate-800 border border-slate-700 text-white"
            />

            <div className="flex gap-3">
              <button
                onClick={handleRecordPayment}
                className="px-4 py-2 bg-green-600 rounded"
              >
                Save Payment
              </button>
              <button
                onClick={() => setShowPay(false)}
                className="px-4 py-2 bg-gray-600 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move room modal */}
      {showMove && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4">
          <div className="bg-slate-900 p-6 rounded-xl w-full max-w-sm">
            <h2 className="text-xl font-bold mb-1">Move Room</h2>
            <p className="text-gray-400 text-sm mb-4">
              {tenant.name} · currently Room {tenant.roomNumber}
            </p>

            {rooms.length === 0 ? (
              <p className="text-yellow-400 text-sm mb-4">
                No rooms defined yet.
              </p>
            ) : (
              <>
                <label className="text-sm text-gray-400">New room</label>
                <select
                  value={moveRoom}
                  onChange={(e) => setMoveRoom(e.target.value)}
                  className="w-full p-3 mt-1 mb-5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                >
                  {rooms
                    .slice()
                    .sort((a, b) =>
                      String(a.roomNumber).localeCompare(
                        String(b.roomNumber),
                        undefined,
                        { numeric: true }
                      )
                    )
                    .map((r) => {
                      const occ = computeOccupancy(r, allTenants);
                      const isCurrent =
                        String(r.roomNumber) === String(tenant.roomNumber);
                      const full =
                        !isCurrent && occ >= (Number(r.capacity) || 0);

                      return (
                        <option
                          key={r.id}
                          value={r.roomNumber}
                          disabled={full}
                        >
                          Room {r.roomNumber} — {occ}/{r.capacity}
                          {isCurrent ? " (current)" : full ? " (full)" : ""}
                        </option>
                      );
                    })}
                </select>
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleMoveRoom}
                disabled={rooms.length === 0}
                className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
              >
                Move
              </button>
              <button
                onClick={() => setShowMove(false)}
                className="px-4 py-2 bg-gray-600 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record deposit modal */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4">
          <div className="bg-slate-900 p-6 rounded-xl w-full max-w-sm">
            <h2 className="text-xl font-bold mb-1">Record Deposit</h2>
            <p className="text-gray-400 text-sm mb-4">{tenant.name}</p>

            <p className="text-sm text-gray-400 mb-2">
              Expected ₹{depositExpected} · Collected ₹{depositCollected} ·
              Balance ₹{depositBalance}
            </p>

            <label className="text-sm text-gray-400">Amount (₹)</label>
            <input
              type="number"
              min={1}
              autoFocus
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full p-3 mt-1 mb-5 rounded-lg bg-slate-800 border border-slate-700 text-white"
            />

            <div className="flex gap-3">
              <button
                onClick={handleRecordDeposit}
                className="px-4 py-2 bg-green-600 rounded"
              >
                Save Deposit
              </button>
              <button
                onClick={() => setShowDeposit(false)}
                className="px-4 py-2 bg-gray-600 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div>
      <div className={`text-2xl font-bold ${accent || ""}`}>{value}</div>
      <div className="text-gray-400 text-xs mt-1">{label}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-800 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getTenants,
  openWhatsApp,
  deactivateTenant,
  updateTenant
} from "../../services/tenantService";

import {
  recordPayment,
  getPayments,
  deletePaymentById
} from "../../services/paymentService";
import {
  uploadDocument,
  getDocumentUrl,
  isStoragePath
} from "../../services/storageService";
import { getRooms, computeOccupancy } from "../../services/roomService";
import {
  rentStatus,
  RENT,
  MONTH_NAMES,
  formatPaidDate,
  formatDate,
  toJsDate,
  joinDateOf,
  monthKey,
  tenureDays,
  monthsPaid
} from "../../lib/rent";
import { formatMoney } from "../../lib/format";

const PHONE_RE = /^[6-9]\d{9}$/;
const PAGE_SIZE = 12;
import { Loading, EmptyState, SkeletonRows } from "../../components/States";
import { Search, AlertTriangle, History, Users, Archive } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

const STATUS_STYLES = {
  paid: "t-success",
  partial: "t-warning",
  overdue: "t-danger",
  pending: "t-pending"
};

export default function TenantsPage() {
  const { user } = useAuth();
  const { toast, confirm } = useToast();

  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingTenant, setEditingTenant] = useState(null);
  const [ledgerTenant, setLedgerTenant] = useState(null);

  // Record-payment modal
  const [payingTenant, setPayingTenant] = useState(null);
  const [payAmount, setPayAmount] = useState("");

  const [view, setView] = useState("active"); // "active" | "past"
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Reset to the first page whenever the view or filters change.
  useEffect(() => {
    setPage(1);
  }, [view, search, fromDate, toDate, sortOrder]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [tenantData, paymentData, roomData] = await Promise.all([
      getTenants(user.uid),
      getPayments(user.uid),
      getRooms(user.uid)
    ]);

    setTenants(tenantData);
    setPayments(paymentData);
    setRooms(roomData);
    setLoading(false);
  };

  const today = new Date();

  /*
  RECORD PAYMENT (supports partial amounts)
  */

  const openPayModal = (tenant) => {
    const { balance, rent } = rentStatus(tenant, payments, today);
    setPayAmount(String(balance > 0 ? balance : rent));
    setPayingTenant(tenant);
  };

  const handleRecordPayment = async () => {
    const amount = parseInt(payAmount, 10);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast("Enter a valid amount.", "error");
      return;
    }

    const success = await recordPayment(
      {
        tenantId: payingTenant.id,
        tenantName: payingTenant.name,
        type: RENT,
        amount,
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        status: "paid",
        paidDate: new Date()
      },
      user.uid
    );

    if (success) {
      setPayingTenant(null);
      setPayAmount("");
      await loadData();
    } else {
      toast("Could not record the payment.", "error");
    }
  };

  /*
  VIEW ID DOCUMENT — fetch a short-lived authenticated URL on demand.
  Legacy records stored a public "/uploads/..." path; open those directly.
  */

  const handleViewDocument = async (value) => {
    if (!value) return;

    if (!isStoragePath(value)) {
      window.open(value, "_blank");
      return;
    }

    const url = await getDocumentUrl(value);
    if (url) {
      window.open(url, "_blank");
    } else {
      toast("Could not open the document.", "error");
    }
  };

  /*
  LEDGER — a tenant's payment history (newest first)
  */

  const tenantLedger = (tenantId) =>
    payments
      .filter((p) => p.tenantId === tenantId)
      .sort((a, b) => (b.year - a.year) || (b.month - a.month));

  const handleRemovePayment = async (payment) => {
    const label = `${MONTH_NAMES[payment.month - 1]} ${payment.year}`;

    if (
      !await confirm(
        `Remove the ${formatMoney(payment.amount)} entry for ${label}? This corrects a mistaken entry.`
      )
    ) {
      return;
    }

    if (await deletePaymentById(payment.id)) {
      await loadData();
    }
  };

  /*
  TENANT LEFT
  */

  const handleDeactivate = async (tenant) => {
    if (!await confirm("Are you sure this tenant left?")) return;

    if (await deactivateTenant(tenant)) {
      toast("Tenant marked as left", "success");
      loadData();
    }
  };

  /*
  EDIT SAVE
  */

  const validateEdit = (t) => {
    if (!t.name || !t.name.trim()) return "Name is required.";
    if (!PHONE_RE.test(String(t.phone || "")))
      return "Enter a valid 10-digit phone number.";
    if (tenants.some((x) => x.id !== t.id && x.phone === t.phone))
      return "Another tenant already has that phone number.";

    const rent = parseInt(t.rentAmount, 10);
    if (!Number.isFinite(rent) || rent <= 0) return "Enter a valid rent amount.";

    const due = parseInt(t.dueDate, 10);
    if (!Number.isFinite(due) || due < 1 || due > 31)
      return "Due date must be between 1 and 31.";

    // Only validate the room if the owner has defined rooms.
    if (rooms.length > 0) {
      const room = rooms.find(
        (r) => String(r.roomNumber) === String(t.roomNumber)
      );
      if (!room)
        return "Pick an existing room (add it on the Rooms page first).";

      const original = tenants.find((x) => x.id === t.id);
      const movingRoom =
        !original || String(original.roomNumber) !== String(t.roomNumber);
      if (movingRoom) {
        const occ = computeOccupancy(room, tenants); // excludes this tenant (state still holds old room)
        if (occ >= (Number(room.capacity) || 0))
          return `Room ${room.roomNumber} is full.`;
      }
    }

    return null;
  };

  const handleSaveEdit = async () => {
    try {
      const error = validateEdit(editingTenant);
      if (error) {
        toast(error, "error");
        return;
      }

      let aadhaarPath =
        editingTenant.aadhaarPath || editingTenant.aadhaarFile || null;

      if (editingTenant.newAadhaarFile) {
        const path = await uploadDocument(
          editingTenant.newAadhaarFile,
          user.uid,
          editingTenant.id
        );

        if (path) {
          aadhaarPath = path;
        } else {
          toast("Document upload failed. Other changes were not saved.", "error");
          return;
        }
      }

      // Rent-change history: when rent changes, record the old rate from the
      // join month and the new rate from this month, so past months are
      // computed at the rate that applied then.
      const original = tenants.find((x) => x.id === editingTenant.id);
      const oldRent = Number(original?.rentAmount) || 0;
      const newRent = parseInt(editingTenant.rentAmount, 10) || 0;
      let rentHistory = Array.isArray(original?.rentHistory)
        ? [...original.rentHistory]
        : [];

      if (newRent !== oldRent) {
        const nowKey = monthKey(today.getFullYear(), today.getMonth() + 1);
        if (rentHistory.length === 0 && oldRent > 0) {
          const jd = joinDateOf(original || editingTenant) || today;
          rentHistory.push({
            amount: oldRent,
            effectiveFrom: monthKey(jd.getFullYear(), jd.getMonth() + 1)
          });
        }
        rentHistory.push({ amount: newRent, effectiveFrom: nowKey });
      }

      const updatedTenant = {
        name: editingTenant.name,
        phone: editingTenant.phone,
        roomNumber: editingTenant.roomNumber,
        rentAmount: newRent,
        dueDate: editingTenant.dueDate
          ? parseInt(editingTenant.dueDate, 10)
          : null,
        deposit: parseInt(editingTenant.deposit, 10) || 0,
        aadhaarPath,
        ...(editingTenant.joinDateStr
          ? { joinDate: new Date(editingTenant.joinDateStr) }
          : {}),
        ...(newRent !== oldRent ? { rentHistory } : {})
      };

      const success = await updateTenant(editingTenant.id, updatedTenant);

      if (!success) {
        toast("Update failed", "error");
        return;
      }

      setEditingTenant(null);
      await loadData();
    } catch (error) {
      console.error(error);
      toast("Update failed", "error");
    }
  };

  /*
  ACTIVE / PAST split
  */

  const activeTenants = tenants.filter((t) => t.status !== "inactive");
  const pastTenants = tenants
    .filter((t) => t.status === "inactive")
    .sort((a, b) => {
      const la = toJsDate(a.leftDate)?.getTime() || 0;
      const lb = toJsDate(b.leftDate)?.getTime() || 0;
      return lb - la;
    });

  /*
  FILTER + SORT (active view)
  */

  let filteredTenants = activeTenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(search.toLowerCase()) ||
      tenant.roomNumber.toString().includes(search);

    const matchesFrom =
      !fromDate ||
      (Number.isFinite(tenant.dueDate) &&
        tenant.dueDate >= Number(fromDate));

    const matchesTo =
      !toDate ||
      (Number.isFinite(tenant.dueDate) && tenant.dueDate <= Number(toDate));

    return matchesSearch && matchesFrom && matchesTo;
  });

  filteredTenants.sort((a, b) => {
    const dueA = Number.isFinite(a.dueDate) ? a.dueDate : 0;
    const dueB = Number.isFinite(b.dueDate) ? b.dueDate : 0;
    return sortOrder === "asc" ? dueA - dueB : dueB - dueA;
  });

  const statusLabel = (s) => {
    if (s.status === "paid") return "Paid";
    if (s.status === "partial") return `Partial ${formatMoney(s.paid)} / ${formatMoney(s.rent)}`;
    if (s.status === "overdue") return "Overdue";
    return "Pending";
  };

  /*
  PAGINATION
  */

  const viewList = view === "past" ? pastTenants : filteredTenants;
  const totalPages = Math.max(1, Math.ceil(viewList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pagedActive = filteredTenants.slice(pageStart, pageStart + PAGE_SIZE);
  const pagedPast = pastTenants.slice(pageStart, pageStart + PAGE_SIZE);

  const Pagination = () =>
    viewList.length > PAGE_SIZE ? (
      <div className="flex items-center justify-between p-3 border-t border-[color:var(--border)] text-sm">
        <span style={{ color: "var(--text-muted)" }}>
          {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, viewList.length)} of{" "}
          {viewList.length}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="btn btn-secondary btn-sm"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="btn btn-secondary btn-sm"
          >
            Next
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div>
      <div className="card rounded-xl overflow-hidden shadow">
        <div className="p-4 border-b border-[color:var(--border)] flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">Tenants</h2>

            {/* Active / Past toggle */}
            <div
              className="inline-flex rounded-lg p-1"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              {[
                { key: "active", label: `Active (${activeTenants.length})` },
                { key: "past", label: `Past (${pastTenants.length})` }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setView(tab.key)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition"
                  style={
                    view === tab.key
                      ? { background: "var(--surface)", color: "var(--accent-ink)", border: "1px solid var(--accent)" }
                      : { color: "var(--text-muted)" }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
              view === "past" ? "hidden" : ""
            }`}
          >
            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search
                size={18}
                className="absolute left-3 top-3 t-muted"
              />

              <input
                type="text"
                placeholder="Search tenant or room"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="t-muted">Filter by Due Date:</span>

              <input
                type="number"
                placeholder="From"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input w-24"
              />

              <input
                type="number"
                placeholder="To"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="input w-24"
              />

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="input"
              >
                <option value="asc">Due Date ↑</option>
                <option value="desc">Due Date ↓</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <SkeletonRows rows={5} cols={7} />
        ) : view === "past" ? (
          pastTenants.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="No past tenants"
              message="Tenants you mark as left will appear here with their full history."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: "var(--surface-2)" }}>
                  <tr>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Room</th>
                    <th className="p-3 text-left">Joined</th>
                    <th className="p-3 text-left">Left</th>
                    <th className="p-3 text-right">Days stayed</th>
                    <th className="p-3 text-right">Months paid</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPast.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="border-b border-[color:var(--border)] hover:bg-[color:var(--surface-2)]"
                    >
                      <td className="p-3">
                        <Link
                          href={`/tenants/${tenant.id}`}
                          className="t-accent hover:underline font-medium"
                        >
                          {tenant.name}
                        </Link>
                      </td>
                      <td className="p-3">{tenant.roomNumber}</td>
                      <td className="p-3 num">{formatDate(tenant.joinDate || tenant.createdAt)}</td>
                      <td className="p-3 num">{formatDate(tenant.leftDate)}</td>
                      <td className="p-3 text-right num">
                        {tenureDays(tenant) ?? "—"}
                      </td>
                      <td className="p-3 text-right num">
                        {monthsPaid(tenant, payments)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination />
            </div>
          )
        ) : filteredTenants.length === 0 ? (
          <EmptyState
            icon={Users}
            title={activeTenants.length === 0 ? "No tenants yet" : "No matches"}
            message={
              activeTenants.length === 0
                ? "Add your first tenant to start tracking rent."
                : "Try clearing the search or due-date filters."
            }
            action={
              activeTenants.length === 0 ? (
                <Link href="/add-tenant" className="btn btn-primary">
                  Add Tenant
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: "var(--surface-2)" }}>
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Room</th>
                  <th className="p-3 text-left">Rent</th>
                  <th className="p-3 text-left">Due</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Aadhaar</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {pagedActive.map((tenant) => {
                  const s = rentStatus(tenant, payments, today);
                  const settled = s.status === "paid";

                  return (
                    <tr
                      key={tenant.id}
                      className={`border-b border-[color:var(--border)] transition ${
                        s.status === "overdue"
                          ? "row-overdue"
                          : "hover:bg-[color:var(--surface-2)]"
                      }`}
                    >
                      <td className="p-3">
                        <Link
                          href={`/tenants/${tenant.id}`}
                          className="t-accent hover:underline font-medium"
                        >
                          {tenant.name}
                        </Link>
                      </td>

                      <td className="p-3">{tenant.roomNumber}</td>

                      <td className="p-3">
                        {formatMoney(Math.max(tenant.rentAmount, 0))}
                      </td>

                      <td className="p-3">
                        {Number.isFinite(tenant.dueDate)
                          ? tenant.dueDate
                          : "-"}
                      </td>

                      <td className="p-3">
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            STATUS_STYLES[s.status]
                          }`}
                        >
                          {s.status === "overdue" && (
                            <AlertTriangle size={16} />
                          )}
                          {statusLabel(s)}
                        </span>
                      </td>

                      <td className="p-3">
                        {tenant.aadhaarPath || tenant.aadhaarFile ? (
                          <button
                            onClick={() =>
                              handleViewDocument(
                                tenant.aadhaarPath || tenant.aadhaarFile
                              )
                            }
                            className="t-accent underline"
                          >
                            View
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="p-3 flex gap-2 flex-wrap">
                        {!settled && (
                          <button
                            onClick={() => openPayModal(tenant)}
                            className="btn btn-success btn-sm"
                          >
                            Record
                          </button>
                        )}

                        {!settled && (
                          <button
                            onClick={() => openWhatsApp(tenant, s.balance)}
                            className="btn btn-primary btn-sm"
                          >
                            Reminder
                          </button>
                        )}

                        <button
                          onClick={() => setLedgerTenant(tenant)}
                          className="btn btn-secondary btn-sm"
                        >
                          <History size={14} />
                          History
                        </button>

                        <button
                          onClick={() => setEditingTenant(tenant)}
                          className="btn btn-secondary btn-sm"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeactivate(tenant)}
                          className="btn btn-danger btn-sm"
                        >
                          Left
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination />
          </div>
        )}
      </div>

      {/* RECORD PAYMENT MODAL */}
      {payingTenant && (
        <div className="modal-backdrop">
          <div className="card p-6 rounded-xl w-full max-w-sm">
            <h2 className="text-xl font-bold mb-1">Record Payment</h2>
            <p className="t-muted text-sm mb-4">
              {payingTenant.name} ·{" "}
              {MONTH_NAMES[today.getMonth()]} {today.getFullYear()}
            </p>

            {(() => {
              const s = rentStatus(payingTenant, payments, today);
              return (
                <p className="text-sm t-muted mb-2">
                  Rent {formatMoney(s.rent)} · Paid {formatMoney(s.paid)} · Balance {formatMoney(s.balance)}
                </p>
              );
            })()}

            <label className="text-sm t-muted">Amount (₹)</label>
            <input
              type="number"
              min={1}
              autoFocus
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="input mt-1 mb-5"
            />

            <div className="flex gap-3">
              <button
                onClick={handleRecordPayment}
                className="btn btn-success"
              >
                Save Payment
              </button>

              <button
                onClick={() => setPayingTenant(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEDGER MODAL */}
      {ledgerTenant && (
        <div className="modal-backdrop">
          <div className="card p-6 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold">Payment History</h2>

              <button
                onClick={() => setLedgerTenant(null)}
                className="t-muted hover:text-[color:var(--text)] text-sm"
              >
                Close
              </button>
            </div>

            <p className="t-muted text-sm mb-4">
              {ledgerTenant.name} · Room {ledgerTenant.roomNumber}
            </p>

            {tenantLedger(ledgerTenant.id).length === 0 ? (
              <p className="t-muted text-center py-8">
                No payments recorded yet.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-[color:var(--border)]">
                {tenantLedger(ledgerTenant.id).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {MONTH_NAMES[p.month - 1]} {p.year}
                        {p.type === "deposit" && (
                          <span className="text-xs badge-neutral">
                            deposit
                          </span>
                        )}
                      </div>

                      <div className="text-xs t-muted">
                        Paid {formatPaidDate(p.paidDate)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="t-success font-semibold">
                        {formatMoney(Number(p.amount) || 0)}
                      </span>

                      <button
                        onClick={() => handleRemovePayment(p)}
                        className="t-danger hover:text-red-300 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingTenant && (
        <div className="modal-backdrop">
          <div className="card p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-5">Edit Tenant</h2>

            <label className="text-sm t-muted">Name</label>
            <input
              className="input mb-3 mt-1"
              value={editingTenant.name}
              onChange={(e) =>
                setEditingTenant({ ...editingTenant, name: e.target.value })
              }
            />

            <label className="text-sm t-muted">Phone</label>
            <input
              className="input mb-3 mt-1"
              value={editingTenant.phone}
              onChange={(e) =>
                setEditingTenant({ ...editingTenant, phone: e.target.value })
              }
            />

            <label className="text-sm t-muted">Room Number</label>
            <input
              className="input mb-3 mt-1"
              value={editingTenant.roomNumber}
              onChange={(e) =>
                setEditingTenant({
                  ...editingTenant,
                  roomNumber: e.target.value
                })
              }
            />

            <label className="text-sm t-muted">Monthly Rent (₹)</label>
            <input
              type="number"
              className="input mb-3 mt-1"
              value={editingTenant.rentAmount}
              onChange={(e) =>
                setEditingTenant({
                  ...editingTenant,
                  rentAmount: Number(e.target.value)
                })
              }
            />

            <label className="text-sm t-muted">Due Date (1–31)</label>
            <input
              type="number"
              className="input mb-3 mt-1"
              value={editingTenant.dueDate}
              onChange={(e) =>
                setEditingTenant({
                  ...editingTenant,
                  dueDate: Number(e.target.value)
                })
              }
            />

            <label className="text-sm t-muted">
              Security Deposit (₹)
            </label>
            <input
              type="number"
              className="input mb-4 mt-1"
              value={editingTenant.deposit ?? ""}
              onChange={(e) =>
                setEditingTenant({
                  ...editingTenant,
                  deposit: Number(e.target.value)
                })
              }
            />

            <label className="text-sm t-muted">Join Date</label>
            <input
              type="date"
              className="input mb-4 mt-1"
              value={
                editingTenant.joinDateStr ??
                (toJsDate(editingTenant.joinDate)
                  ? toJsDate(editingTenant.joinDate)
                      .toISOString()
                      .slice(0, 10)
                  : "")
              }
              onChange={(e) =>
                setEditingTenant({
                  ...editingTenant,
                  joinDateStr: e.target.value
                })
              }
            />

            <label className="text-sm t-muted">Aadhaar Document</label>
            <div className="mb-3 mt-1">
              {editingTenant.aadhaarPath || editingTenant.aadhaarFile ? (
                <button
                  onClick={() =>
                    handleViewDocument(
                      editingTenant.aadhaarPath || editingTenant.aadhaarFile
                    )
                  }
                  className="t-accent underline"
                >
                  View Current Document
                </button>
              ) : (
                <span className="t-muted">No document uploaded</span>
              )}
            </div>

            <label className="text-sm t-muted">
              Replace Aadhaar (optional)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                setEditingTenant({
                  ...editingTenant,
                  newAadhaarFile: e.target.files[0]
                })
              }
              className="mb-5 mt-1 text-white"
            />

            <div className="flex gap-3">
              <button
                onClick={handleSaveEdit}
                className="btn btn-success"
              >
                Save
              </button>

              <button
                onClick={() => setEditingTenant(null)}
                className="btn btn-secondary"
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

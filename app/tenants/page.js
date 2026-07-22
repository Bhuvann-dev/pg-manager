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
import {
  rentStatus,
  RENT,
  MONTH_NAMES,
  formatPaidDate
} from "../../lib/rent";
import { Loading, EmptyState, SkeletonRows } from "../../components/States";
import { Search, AlertTriangle, History, Users } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const STATUS_STYLES = {
  paid: "text-green-400",
  partial: "text-amber-400",
  overdue: "text-red-400",
  pending: "text-yellow-400"
};

export default function TenantsPage() {
  const { user } = useAuth();

  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingTenant, setEditingTenant] = useState(null);
  const [ledgerTenant, setLedgerTenant] = useState(null);

  // Record-payment modal
  const [payingTenant, setPayingTenant] = useState(null);
  const [payAmount, setPayAmount] = useState("");

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    if (!user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [tenantData, paymentData] = await Promise.all([
      getTenants(user.uid),
      getPayments(user.uid)
    ]);

    setTenants(tenantData.filter((t) => t.status !== "inactive"));
    setPayments(paymentData);
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
      alert("Enter a valid amount.");
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
      alert("Could not record the payment.");
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
      alert("Could not open the document.");
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
      !window.confirm(
        `Remove the ₹${payment.amount} entry for ${label}? This corrects a mistaken entry.`
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
    if (!window.confirm("Are you sure this tenant left?")) return;

    if (await deactivateTenant(tenant)) {
      alert("Tenant marked as left");
      loadData();
    }
  };

  /*
  EDIT SAVE
  */

  const handleSaveEdit = async () => {
    try {
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
          alert("Document upload failed. Other changes were not saved.");
          return;
        }
      }

      const updatedTenant = {
        name: editingTenant.name,
        phone: editingTenant.phone,
        roomNumber: editingTenant.roomNumber,
        rentAmount: parseInt(editingTenant.rentAmount, 10),
        dueDate: editingTenant.dueDate
          ? parseInt(editingTenant.dueDate, 10)
          : null,
        deposit: parseInt(editingTenant.deposit, 10) || 0,
        aadhaarPath
      };

      const success = await updateTenant(editingTenant.id, updatedTenant);

      if (!success) {
        alert("Update failed");
        return;
      }

      setEditingTenant(null);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Update failed");
    }
  };

  /*
  FILTER + SORT
  */

  let filteredTenants = tenants.filter((tenant) => {
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
    if (s.status === "partial") return `Partial ₹${s.paid}/₹${s.rent}`;
    if (s.status === "overdue") return "Overdue";
    return "Pending";
  };

  return (
    <div>
      <div className="card rounded-xl overflow-hidden shadow">
        <div className="p-4 border-b border-[color:var(--border)] flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Tenants</h2>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search
                size={18}
                className="absolute left-3 top-3 text-[color:var(--text-muted)]"
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
              <span className="text-[color:var(--text-muted)]">Filter by Due Date:</span>

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
        ) : filteredTenants.length === 0 ? (
          <EmptyState
            icon={Users}
            title={tenants.length === 0 ? "No tenants yet" : "No matches"}
            message={
              tenants.length === 0
                ? "Add your first tenant to start tracking rent."
                : "Try clearing the search or due-date filters."
            }
            action={
              tenants.length === 0 ? (
                <Link
                  href="/add-tenant"
                  className="bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded-lg font-medium"
                >
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
                {filteredTenants.map((tenant) => {
                  const s = rentStatus(tenant, payments, today);
                  const settled = s.status === "paid";

                  return (
                    <tr
                      key={tenant.id}
                      className={`border-b border-[color:var(--border)] transition ${
                        s.status === "overdue"
                          ? "bg-red-900/30 hover:bg-red-900/40"
                          : "hover:bg-slate-800"
                      }`}
                    >
                      <td className="p-3">
                        <Link
                          href={`/tenants/${tenant.id}`}
                          className="text-blue-400 hover:underline font-medium"
                        >
                          {tenant.name}
                        </Link>
                      </td>

                      <td className="p-3">{tenant.roomNumber}</td>

                      <td className="p-3">
                        ₹{Math.max(tenant.rentAmount, 0)}
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
                            className="text-blue-400 underline"
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
                            onClick={() => openWhatsApp(tenant)}
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
          </div>
        )}
      </div>

      {/* RECORD PAYMENT MODAL */}
      {payingTenant && (
        <div className="modal-backdrop">
          <div className="card p-6 rounded-xl w-full max-w-sm">
            <h2 className="text-xl font-bold mb-1">Record Payment</h2>
            <p className="text-[color:var(--text-muted)] text-sm mb-4">
              {payingTenant.name} ·{" "}
              {MONTH_NAMES[today.getMonth()]} {today.getFullYear()}
            </p>

            {(() => {
              const s = rentStatus(payingTenant, payments, today);
              return (
                <p className="text-sm text-[color:var(--text-muted)] mb-2">
                  Rent ₹{s.rent} · Paid ₹{s.paid} · Balance ₹{s.balance}
                </p>
              );
            })()}

            <label className="text-sm text-[color:var(--text-muted)]">Amount (₹)</label>
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
                className="text-[color:var(--text-muted)] hover:text-white text-sm"
              >
                Close
              </button>
            </div>

            <p className="text-[color:var(--text-muted)] text-sm mb-4">
              {ledgerTenant.name} · Room {ledgerTenant.roomNumber}
            </p>

            {tenantLedger(ledgerTenant.id).length === 0 ? (
              <p className="text-[color:var(--text-muted)] text-center py-8">
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
                          <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">
                            deposit
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[color:var(--text-muted)]">
                        Paid {formatPaidDate(p.paidDate)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-green-400 font-semibold">
                        ₹{Math.max(Number(p.amount) || 0, 0)}
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
        </div>
      )}

      {/* EDIT MODAL */}
      {editingTenant && (
        <div className="modal-backdrop">
          <div className="card p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-5">Edit Tenant</h2>

            <label className="text-sm text-[color:var(--text-muted)]">Name</label>
            <input
              className="input mb-3 mt-1"
              value={editingTenant.name}
              onChange={(e) =>
                setEditingTenant({ ...editingTenant, name: e.target.value })
              }
            />

            <label className="text-sm text-[color:var(--text-muted)]">Phone</label>
            <input
              className="input mb-3 mt-1"
              value={editingTenant.phone}
              onChange={(e) =>
                setEditingTenant({ ...editingTenant, phone: e.target.value })
              }
            />

            <label className="text-sm text-[color:var(--text-muted)]">Room Number</label>
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

            <label className="text-sm text-[color:var(--text-muted)]">Monthly Rent (₹)</label>
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

            <label className="text-sm text-[color:var(--text-muted)]">Due Date (1–31)</label>
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

            <label className="text-sm text-[color:var(--text-muted)]">
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

            <label className="text-sm text-[color:var(--text-muted)]">Aadhaar Document</label>
            <div className="mb-3 mt-1">
              {editingTenant.aadhaarPath || editingTenant.aadhaarFile ? (
                <button
                  onClick={() =>
                    handleViewDocument(
                      editingTenant.aadhaarPath || editingTenant.aadhaarFile
                    )
                  }
                  className="text-blue-400 underline"
                >
                  View Current Document
                </button>
              ) : (
                <span className="text-[color:var(--text-muted)]">No document uploaded</span>
              )}
            </div>

            <label className="text-sm text-[color:var(--text-muted)]">
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

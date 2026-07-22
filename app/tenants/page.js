"use client";

import { useEffect, useState } from "react";

import {
  getTenants,
  openWhatsApp,
  deactivateTenant,
  updateTenant
} from "../../services/tenantService";

import {
  recordPayment,
  getPayments,
  deletePayment
} from "../../services/paymentService";
import { Search, AlertTriangle, History } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const formatPaidDate = (paidDate) => {
  if (!paidDate) return "";
  // Firestore Timestamp has toDate(); a JS Date does not.
  const d =
    typeof paidDate.toDate === "function"
      ? paidDate.toDate()
      : new Date(paidDate);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-IN");
};

export default function TenantsPage() {

  const { user } = useAuth();

  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);

  const [editingTenant, setEditingTenant] = useState(null);
  const [ledgerTenant, setLedgerTenant] = useState(null);

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {

    if (!user) return;

    const tenantData =
      await getTenants(user.uid);

    const paymentData =
      await getPayments(user.uid);

    setTenants(
      tenantData.filter(
        (t) =>
          t.status !== "inactive"
      )
    );

    setPayments(paymentData);

  };

  const today = new Date();

  const currentDay =
    today.getDate();

  const currentMonth =
    today.getMonth() + 1;

  const currentYear =
    today.getFullYear();

  const isPaid = (tenantId) => {
    return payments.some(
      (p) =>
        p.tenantId === tenantId &&
        p.month === currentMonth &&
        p.year === currentYear
    );
  };

  const isOverdue = (tenant) => {

    const paid =
      isPaid(tenant.id);

    if (paid) return false;

    return (
      Number.isFinite(
        tenant.dueDate
      ) &&
      tenant.dueDate <
      currentDay
    );

  };

  /*
  MARK PAID
  */

  const handlePayment =
    async (tenant) => {

      const confirmPay =
        window.confirm(
          "Mark this tenant as paid?"
        );

      if (!confirmPay)
        return;

      const payment = {

        tenantId: tenant.id,
        tenantName: tenant.name,
        amount: tenant.rentAmount,

        month: currentMonth,
        year: currentYear,

        status: "paid",

        paidDate:
          new Date()

      };

      const success =
        await recordPayment(payment, user.uid);

      if (success) {

        alert(
          "Payment recorded"
        );

        loadData();

      }

    };

  /*
  LEDGER — a tenant's payment history (newest first)
  */

  const tenantLedger = (tenantId) =>
    payments
      .filter((p) => p.tenantId === tenantId)
      .sort(
        (a, b) =>
          (b.year - a.year) || (b.month - a.month)
      );

  const handleRemovePayment = async (payment) => {

    const label =
      `${MONTH_NAMES[payment.month - 1]} ${payment.year}`;

    const confirmRemove =
      window.confirm(
        `Remove the payment for ${label}? This corrects a mistaken entry.`
      );

    if (!confirmRemove) return;

    const success =
      await deletePayment(
        user.uid,
        payment.tenantId,
        payment.month,
        payment.year
      );

    if (success) {
      await loadData();
    }

  };

  /*
  TENANT LEFT
  */

  const handleDeactivate =
    async (tenant) => {

      const confirmLeave =
        window.confirm(
          "Are you sure this tenant left?"
        );

      if (!confirmLeave)
        return;

      const success =
        await deactivateTenant(
          tenant
        );

      if (success) {

        alert(
          "Tenant marked as left"
        );

        loadData();

      }

    };

  /*
  EDIT SAVE
  */

  const handleSaveEdit = async () => {

    try {

      /*
      Upload new Aadhaar if needed
      */

      let aadhaarPath =
        editingTenant.aadhaarFile || null;

      if (editingTenant.newAadhaarFile) {

        const formData =
          new FormData();

        formData.append(
          "file",
          editingTenant.newAadhaarFile
        );

        const res =
          await fetch(
            "/api/upload",
            {
              method: "POST",
              body: formData
            }
          );

        if (res.ok) {

          const data =
            await res.json();

          aadhaarPath =
            data.filePath;

        }

      }

      /*
      Update tenant info
      */

      const updatedTenant = {

        name:
          editingTenant.name,

        phone:
          editingTenant.phone,

        roomNumber:
          editingTenant.roomNumber,

        rentAmount:
          parseInt(
            editingTenant.rentAmount,
            10
          ),

        dueDate:
          editingTenant.dueDate
            ? parseInt(
              editingTenant.dueDate,
              10
            )
            : null,

        aadhaarFile:
          aadhaarPath

      };

      const success =
        await updateTenant(
          editingTenant.id,
          updatedTenant
        );

      if (!success) {

        alert(
          "Update failed"
        );

        return;

      }

      /*
      PAYMENT STATUS FIX
      */

      await deletePayment(
        user.uid,
        editingTenant.id,
        currentMonth,
        currentYear
      );

      if (
        editingTenant.paymentStatus ===
        "paid"
      ) {

        await recordPayment({

          tenantId:
            editingTenant.id,

          tenantName:
            editingTenant.name,

          amount:
            editingTenant.rentAmount,

          month:
            currentMonth,

          year:
            currentYear,

          status:
            "paid",

          paidDate:
            new Date()

        }, user.uid);

      }

      alert(
        "Tenant updated"
      );

      setEditingTenant(null);

      /*
      IMPORTANT — reload fresh data
      */

      await loadData();

    } catch (error) {

      console.error(error);

      alert(
        "Update failed"
      );

    }

  };

  let filteredTenants =
    tenants.filter((tenant) => {

      const matchesSearch =
        tenant.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        tenant.roomNumber
          .toString()
          .includes(search);

      const matchesFrom =
        !fromDate ||
        (
          Number.isFinite(
            tenant.dueDate
          ) &&
          tenant.dueDate >=
          Number(fromDate)
        );

      const matchesTo =
        !toDate ||
        (
          Number.isFinite(
            tenant.dueDate
          ) &&
          tenant.dueDate <=
          Number(toDate)
        );

      return (
        matchesSearch &&
        matchesFrom &&
        matchesTo
      );

    });

  /*
  Sort
  */

  filteredTenants.sort((a, b) => {

    const dueA =
      Number.isFinite(
        a.dueDate
      )
        ? a.dueDate
        : 0;

    const dueB =
      Number.isFinite(
        b.dueDate
      )
        ? b.dueDate
        : 0;

    return sortOrder === "asc"
      ? dueA - dueB
      : dueB - dueA;

  });

  return (

    <div>

      <div className="bg-slate-900 rounded-xl overflow-hidden shadow">

        <div className="p-4 border-b border-slate-800 flex flex-col gap-4">

          <h2 className="text-xl font-semibold">
            Tenants
          </h2>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            {/* Search */}

            <div className="relative w-full md:w-72">

              <Search
                size={18}
                className="absolute left-3 top-3 text-gray-400"
              />

              <input
                type="text"
                placeholder="Search tenant or room"

                value={search}

                onChange={(e) =>
                  setSearch(e.target.value)
                }

                className="
                  w-full
                  pl-10
                  pr-3
                  py-2
                  rounded-lg
                  bg-slate-800
                  border
                  border-slate-700
                  text-white
                "
              />

            </div>

            {/* Filters */}

            <div className="flex flex-wrap items-center gap-3 text-sm">

              <span className="text-gray-400">
                Filter by Due Date:
              </span>

              <input
                type="number"
                placeholder="From"
                value={fromDate}
                onChange={(e) =>
                  setFromDate(e.target.value)
                }
                className="bg-slate-800 px-3 py-2 rounded-lg w-24"
              />

              <input
                type="number"
                placeholder="To"
                value={toDate}
                onChange={(e) =>
                  setToDate(e.target.value)
                }
                className="bg-slate-800 px-3 py-2 rounded-lg w-24"
              />

              <select
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value)
                }
                className="bg-slate-800 px-3 py-2 rounded-lg"
              >
                <option value="asc">
                  Due Date ↑
                </option>

                <option value="desc">
                  Due Date ↓
                </option>
              </select>

            </div>

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-slate-800">

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

              {filteredTenants.map(
                (tenant) => {

                  const paid =
                    isPaid(tenant.id);

                  return (

                    <tr
                      key={tenant.id}
                      className={`border-b border-slate-800 transition

                        ${isOverdue(tenant)
                          ? "bg-red-900/30 hover:bg-red-900/40"
                          : "hover:bg-slate-800"
                        }

                      `}
                    >

                      <td className="p-3">
                        {tenant.name}
                      </td>

                      <td className="p-3">
                        {
                          tenant.roomNumber
                        }
                      </td>

                      <td className="p-3">
                        ₹
                        {
                          Math.max(
                            tenant.rentAmount,
                            0
                          )
                        }
                      </td>

                      <td className="p-3">
                        {Number.isFinite(tenant.dueDate)
                          ? tenant.dueDate
                          : "-"}
                      </td>

                      <td className="p-3">

                        {isPaid(tenant.id) ? (

                          <span className="text-green-400 font-medium">
                            Paid
                          </span>

                        ) : isOverdue(tenant) ? (

                          <span className="flex items-center gap-2 text-red-400 font-medium">

                            <AlertTriangle size={16} />

                            Overdue

                          </span>

                        ) : (

                          <span className="text-yellow-400 font-medium">
                            Pending
                          </span>

                        )}

                      </td>

                      <td className="p-3">

                        {tenant.aadhaarFile ? (

                          <a
                            href={
                              tenant.aadhaarFile.startsWith("/")
                                ? tenant.aadhaarFile
                                : `/uploads/aadhaar/${tenant.aadhaarFile}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline"
                          >
                            View
                          </a>

                        ) : "-"

                        }

                      </td>

                      <td className="p-3 flex gap-2 flex-wrap">

                        <button
                          onClick={() =>
                            setEditingTenant(
                              tenant
                            )
                          }
                          className="bg-indigo-600 px-3 py-1 rounded"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            setLedgerTenant(
                              tenant
                            )
                          }
                          className="bg-slate-600 px-3 py-1 rounded flex items-center gap-1"
                        >
                          <History size={14} />
                          History
                        </button>

                        {!paid && (

                          <button
                            onClick={() =>
                              handlePayment(
                                tenant
                              )
                            }
                            className="bg-green-600 px-3 py-1 rounded"
                          >
                            Paid
                          </button>

                        )}

                        {!paid && (

                          <button
                            onClick={() =>
                              openWhatsApp(
                                tenant
                              )
                            }
                            className="bg-blue-600 px-3 py-1 rounded"
                          >
                            Reminder
                          </button>

                        )}

                        <button
                          onClick={() =>
                            handleDeactivate(
                              tenant
                            )
                          }
                          className="bg-red-600 px-3 py-1 rounded"
                        >
                          Left
                        </button>

                      </td>

                    </tr>

                  );

                }

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* LEDGER MODAL */}

      {ledgerTenant && (

        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center px-4">

          <div className="bg-slate-900 p-6 rounded-xl w-full max-w-md">

            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold">
                Payment History
              </h2>

              <button
                onClick={() => setLedgerTenant(null)}
                className="text-gray-400 hover:text-white text-sm"
              >
                Close
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              {ledgerTenant.name} · Room {ledgerTenant.roomNumber}
            </p>

            {tenantLedger(ledgerTenant.id).length === 0 ? (

              <p className="text-gray-400 text-center py-8">
                No payments recorded yet.
              </p>

            ) : (

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">

                {tenantLedger(ledgerTenant.id).map((p) => (

                  <div
                    key={p.id}
                    className="flex items-center justify-between py-3"
                  >

                    <div>
                      <div className="font-medium">
                        {MONTH_NAMES[p.month - 1]} {p.year}
                      </div>

                      <div className="text-xs text-gray-400">
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

        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center">

          <div className="bg-slate-900 p-6 rounded-xl w-[420px]">

            <h2 className="text-xl font-bold mb-5">
              Edit Tenant
            </h2>

            {/* NAME */}

            <label className="text-sm text-gray-400">
              Name
            </label>

            <input
              className="w-full p-2 mb-3 bg-slate-800 rounded"
              value={editingTenant.name}
              onChange={(e) =>
                setEditingTenant({
                  ...editingTenant,
                  name: e.target.value
                })
              }
            />

            {/* PHONE */}

            <label className="text-sm text-gray-400">
              Phone
            </label>

            <input
              className="w-full p-2 mb-3 bg-slate-800 rounded"
              value={editingTenant.phone}
              onChange={(e) =>
                setEditingTenant({
                  ...editingTenant,
                  phone: e.target.value
                })
              }
            />

            {/* ROOM */}

            <label className="text-sm text-gray-400">
              Room Number
            </label>

            <input
              className="w-full p-2 mb-3 bg-slate-800 rounded"
              value={editingTenant.roomNumber}
              onChange={(e) =>
                setEditingTenant({
                  ...editingTenant,
                  roomNumber: e.target.value
                })
              }
            />

            {/* RENT */}

            <label className="text-sm text-gray-400">
              Monthly Rent (₹)
            </label>

            <input
              type="number"
              className="w-full p-2 mb-3 bg-slate-800 rounded"
              value={editingTenant.rentAmount}
              onChange={(e) =>
                setEditingTenant({
                  ...editingTenant,
                  rentAmount: Number(e.target.value)
                })
              }
            />

            {/* DUE DATE */}

            <label className="text-sm text-gray-400">
              Due Date (1–31)
            </label>

            <input
              type="number"
              className="w-full p-2 mb-4 bg-slate-800 rounded"
              value={editingTenant.dueDate}
              onChange={(e) =>
                setEditingTenant({
                  ...editingTenant,
                  dueDate: Number(e.target.value)
                })
              }
            />

            {/* PAYMENT STATUS */}

            <label className="text-sm text-gray-400">
              Payment Status (Current Month)
            </label>

            <select
              className="w-full p-2 mb-4 bg-slate-800 rounded"
              value={editingTenant.paymentStatus || "pending"}
              onChange={(e) =>
                setEditingTenant({
                  ...editingTenant,
                  paymentStatus:
                    e.target.value
                })
              }
            >
              <option value="paid">
                Paid
              </option>

              <option value="pending">
                Not Paid
              </option>
            </select>

            {/* CURRENT AADHAAR */}

            <label className="text-sm text-gray-400">
              Aadhaar Document
            </label>

            <div className="mb-3">

              {editingTenant.aadhaarFile ? (

                <a
                  href={editingTenant.aadhaarFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline"
                >
                  View Current Document
                </a>

              ) : (

                <span className="text-gray-400">
                  No document uploaded
                </span>

              )}

            </div>

            {/* REPLACE FILE */}

            <label className="text-sm text-gray-400">
              Replace Aadhaar (optional)
            </label>

            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                setEditingTenant({
                  ...editingTenant,
                  newAadhaarFile:
                    e.target.files[0]
                })
              }
              className="mb-5 text-white"
            />

            {/* BUTTONS */}

            <div className="flex gap-3">

              <button
                onClick={handleSaveEdit}
                className="px-3 py-2 text-sm md:text-base bg-green-600 rounded"
              >
                Save
              </button>

              <button
                onClick={() =>
                  setEditingTenant(null)
                }
                className="px-3 py-2 text-sm md:text-base bg-gray-600 rounded"
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
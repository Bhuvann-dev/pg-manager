/*
Pure rent/payment helpers, shared by the dashboard, tenants list, and
tenant detail page so status is computed one way everywhere.

Payments are an append-only ledger (docs/decisions.md ADR-003). A month
can have several rent payments that sum toward the rent (partial
payments). Deposits are tracked as payments with type "deposit".
Legacy payments have no `type` and are treated as rent.
*/

export const RENT = "rent";
export const DEPOSIT = "deposit";

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const isRent = (p) => (p.type || RENT) === RENT;
const isDeposit = (p) => p.type === DEPOSIT;

const amountOf = (p) => Number(p.amount) || 0;

/*
Total rent paid by a tenant for a given month/year.
*/
export function rentPaidForMonth(payments, tenantId, month, year) {
  return payments
    .filter(
      (p) =>
        p.tenantId === tenantId &&
        isRent(p) &&
        p.month === month &&
        p.year === year
    )
    .reduce((sum, p) => sum + amountOf(p), 0);
}

/*
Total deposit collected for a tenant (across all deposit payments).
*/
export function depositPaid(payments, tenantId) {
  return payments
    .filter((p) => p.tenantId === tenantId && isDeposit(p))
    .reduce((sum, p) => sum + amountOf(p), 0);
}

/*
Rent status for a tenant in the current month.
Returns { status, paid, rent, balance, month, year }.
status ∈ "paid" | "partial" | "overdue" | "pending".
*/
export function rentStatus(tenant, payments, now = new Date()) {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const day = now.getDate();

  const rent = Number(tenant.rentAmount) || 0;
  const paid = rentPaidForMonth(payments, tenant.id, month, year);
  const balance = Math.max(rent - paid, 0);

  let status;
  if (rent > 0 && paid >= rent) {
    status = "paid";
  } else if (paid > 0) {
    status = "partial";
  } else if (Number.isFinite(tenant.dueDate) && tenant.dueDate < day) {
    status = "overdue";
  } else {
    status = "pending";
  }

  return { status, paid, rent, balance, month, year };
}

/*
Roll up rent status across a list of active tenants for the current month.
Returns counts plus expected / collected / outstanding / overdue amounts.
*/
export function summarizeMonth(tenants, payments, now = new Date()) {
  const summary = {
    total: tenants.length,
    paid: 0,
    partial: 0,
    pending: 0,
    overdue: 0,
    expected: 0,
    collected: 0,
    outstanding: 0,
    overdueAmount: 0
  };

  for (const tenant of tenants) {
    const s = rentStatus(tenant, payments, now);

    summary[s.status] += 1;
    summary.expected += s.rent;
    summary.collected += Math.min(s.paid, s.rent);
    summary.outstanding += s.balance;

    if (s.status === "overdue") {
      summary.overdueAmount += s.balance;
    }
  }

  summary.collectionRate =
    summary.expected > 0
      ? Math.round((summary.collected / summary.expected) * 100)
      : 0;

  return summary;
}

/*
Format a paidDate that may be a Firestore Timestamp or a JS Date.
*/
export function formatPaidDate(paidDate) {
  if (!paidDate) return "";

  const d =
    typeof paidDate.toDate === "function"
      ? paidDate.toDate()
      : new Date(paidDate);

  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN");
}

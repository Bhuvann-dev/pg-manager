"use client";

import { useEffect, useState } from "react";
import { getTenants } from "../services/tenantService";
import { getPayments } from "../services/paymentService";

export default function Dashboard() {
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const tenantData = await getTenants();
    const paymentData = await getPayments();

    setTenants(
      tenantData.filter((t) => t.status !== "inactive")
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

  /*
  Paid tenants
  */

  const paidCount =
    tenants.filter((tenant) =>
      payments.some(
        (p) =>
          p.tenantId === tenant.id &&
          p.month === currentMonth &&
          p.year === currentYear
      )
    ).length;

  /*
  Pending tenants
  */

  const pendingCount =
    tenants.filter((tenant) => {

      const paid =
        payments.some(
          (p) =>
            p.tenantId === tenant.id &&
            p.month === currentMonth &&
            p.year === currentYear
        );

      if (paid) return false;

      return (
        tenant.dueDate >=
        currentDay
      );

    }).length;

  /*
  Overdue tenants
  */

  const overdueCount =
    tenants.filter((tenant) => {

      const paid =
        payments.some(
          (p) =>
            p.tenantId === tenant.id &&
            p.month === currentMonth &&
            p.year === currentYear
        );

      if (paid) return false;

      return (
        tenant.dueDate <
        currentDay
      );

    }).length;

  const Card = ({ title, value }) => (
    <div className="bg-slate-900 p-6 rounded-xl shadow-md">
      <div className="text-gray-400 text-sm">
        {title}
      </div>

      <div className="text-3xl font-bold mt-2">
        {value}
      </div>
    </div>
  );

  return (
    <div>

      <h1 className="text-2xl font-bold mb-6">
        Dashboard
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <Card
          title="Total Tenants"
          value={tenants.length}
        />

        <Card
          title="Paid This Month"
          value={paidCount}
        />

        <Card
          title="Pending"
          value={pendingCount}
        />

        <Card
          title="Overdue"
          value={overdueCount}
        />

      </div>

    </div>
  );
}
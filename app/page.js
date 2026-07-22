"use client";

import { useEffect, useState } from "react";
import { getTenants } from "../services/tenantService";
import { getPayments } from "../services/paymentService";
import { getRooms, computeOccupancy } from "../services/roomService";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    if (!user) return;
    loadData(user.uid);
  }, [user]);

  const loadData = async (ownerId) => {
    const tenantData = await getTenants(ownerId);
    const paymentData = await getPayments(ownerId);
    const roomData = await getRooms(ownerId);

    setTenants(
      tenantData.filter((t) => t.status !== "inactive")
    );

    setPayments(paymentData);
    setRooms(roomData);
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

  /*
  Occupancy
  */

  const totalBeds =
    rooms.reduce(
      (sum, r) => sum + (Number(r.capacity) || 0),
      0
    );

  const occupiedBeds =
    rooms.reduce(
      (sum, r) => sum + computeOccupancy(r, tenants),
      0
    );

  const vacantBeds =
    Math.max(totalBeds - occupiedBeds, 0);

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

      <h2 className="text-lg font-semibold mt-8 mb-4">
        Occupancy
      </h2>

      <div className="grid grid-cols-3 gap-4">

        <Card
          title="Total Beds"
          value={totalBeds}
        />

        <Card
          title="Occupied"
          value={occupiedBeds}
        />

        <Card
          title="Vacant"
          value={vacantBeds}
        />

      </div>

    </div>
  );
}
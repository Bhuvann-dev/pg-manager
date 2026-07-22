"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <div
      style={{
        padding: "14px 20px",
        backgroundColor: "#1e293b",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
      }}
    >
      {/* PG Name */}
      <div
        style={{
          fontSize: 20,
          fontWeight: "bold",
          letterSpacing: 0.5
        }}
      >
        PG Manager
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 20 }}>
        <Link
          href="/"
          style={{
            color: "white",
            textDecoration: "none",
            fontWeight: 500
          }}
        >
          Dashboard
        </Link>

        <Link
          href="/tenants"
          style={{
            color: "white",
            textDecoration: "none",
            fontWeight: 500
          }}
        >
          Tenants
        </Link>

        <Link
          href="/add-tenant"
          style={{
            color: "white",
            textDecoration: "none",
            fontWeight: 500
          }}
        >
          Add Tenant
        </Link>
      </div>
    </div>
  );
}
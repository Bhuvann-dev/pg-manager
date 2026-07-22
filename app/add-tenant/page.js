"use client";

import {
  useState,
  useEffect,
  useRef
} from "react";

import {
  addTenant,
  getTenants
} from "../../services/tenantService";
import { useAuth } from "../../contexts/AuthContext";
import * as XLSX from "xlsx";

/*
VALIDATION RULES
*/

const phoneRegex =
  /^[6-9]\d{9}$/;

const formatPhone =
  (value) =>
    value
      .replace(/\D/g, "")
      .slice(0, 10);

export default function AddTenantPage() {

  const { user } = useAuth();

  /*
  FORM STATE
  */

  const [name, setName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [room, setRoom] =
    useState("");

  const [rent, setRent] =
    useState("");

  const [dueDate, setDueDate] =
    useState("");

  const [tenants, setTenants] =
    useState([]);

  const [errors, setErrors] =
    useState({});

  const [loading, setLoading] =
    useState(false);

  const [aadhaarFile, setAadhaarFile] =
    useState(null);

  /*
  INPUT REFS (AUTO FOCUS)
  */

  const nameRef =
    useRef();

  const phoneRef =
    useRef();

  const roomRef =
    useRef();

  const rentRef =
    useRef();

  const dueRef =
    useRef();

  /*
  LOAD EXISTING TENANTS
  */

  useEffect(() => {

    if (!user) return;

    const load =
      async () => {

        const data =
          await getTenants(user.uid);

        setTenants(data);

      };

    load();

  }, [user]);

  /*
  VALIDATION
  */

  const validate =
    () => {

      const newErrors = {};

      /*
      Name
      */

      if (!name.trim()) {

        newErrors.name =
          "Name is required";

      }

      /*
      Phone
      */

      if (
        !phoneRegex.test(phone)
      ) {

        newErrors.phone =
          "Enter valid 10-digit phone";

      }

      /*
      Duplicate phone
      */

      const duplicatePhone =
        tenants.some(
          (t) =>
            t.phone === phone
        );

      if (duplicatePhone) {

        newErrors.phone =
          "Phone already exists";

      }

      /*
      Room number
      */

      if (!room) {

        newErrors.room =
          "Room required";

      }

      /*
      Max 4 members per room
      */

      const roomMembers =
        tenants.filter(
          (t) =>
            t.roomNumber === room
        ).length;

      if (roomMembers >= 4) {

        newErrors.room =
          "Max 4 members allowed in a room";

      }

      /*
      Rent
      */

      if (
        !rent ||
        Number(rent) <= 0
      ) {

        newErrors.rent =
          "Enter valid rent";

      }

      /*
      Due date
      */

      const due =
        parseInt(
          dueDate,
          10
        );

      if (
        !Number.isFinite(due) ||
        due < 1 ||
        due > 31
      ) {

        newErrors.dueDate =
          "Due date must be 1–31";

      }

      setErrors(newErrors);

      return (
        Object.keys(
          newErrors
        ).length === 0
      );

    };

  /*
  BULK UPLOAD
  */

  const handleBulkUpload = async (e) => {

    const file =
      e.target.files[0];

    if (!file) return;

    try {

      const data =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(data);

      const sheet =
        workbook.Sheets[
        workbook.SheetNames[0]
        ];

      const rows =
        XLSX.utils.sheet_to_json(
          sheet
        );

      let successCount = 0;

      for (const row of rows) {

        /*
        Expected columns:
        Name
        Phone
        Room
        Rent
        DueDate
        */

        if (
          !row.Name ||
          !row.Phone ||
          !row.Room ||
          !row.Rent ||
          !row.DueDate
        )
          continue;

        const tenant = {

          name:
            String(row.Name),

          phone:
            String(row.Phone),

          roomNumber:
            String(row.Room),

          rentAmount:
            parseInt(
              row.Rent,
              10
            ),

          dueDate:
            parseInt(
              row.DueDate,
              10
            ),

          status:
            "active",

          createdAt:
            new Date()

        };

        const success =
          await addTenant(
            tenant,
            user.uid
          );

        if (success)
          successCount++;

      }

      alert(
        `${successCount} tenants added successfully`
      );

      const updatedTenants = await getTenants(user.uid);
      setTenants(updatedTenants);

    } catch (error) {

      console.error(error);

      alert(
        "Upload failed"
      );

    }

  };

  /*
  SUBMIT
  */

  const handleSubmit =
    async () => {

      if (!validate())
        return;

      setLoading(true);

      let aadhaarPath = null;

      /*
      Upload Aadhaar file if present
      */

      if (aadhaarFile) {

        const formData = new FormData();

        formData.append("file", aadhaarFile);

        const res = await fetch(
          "/api/upload",
          {
            method: "POST",
            body: formData
          }
        );

        if (!res.ok) {

          setErrors((prev) => ({
            ...prev,
            aadhaarFile:
              "Upload failed"
          }));

          setLoading(false);

          return;

        }

        const data =
          await res.json();

        aadhaarPath =
          data.filePath;

      }

      const tenant = {

        name: name.trim(),

        phone,

        roomNumber: room,

        rentAmount:
          parseInt(rent, 10),

        dueDate:
          parseInt(dueDate, 10),

        aadhaarFile:
          aadhaarPath || null,

        status: "active",

        createdAt:
          new Date()

      };

      const success =
        await addTenant(
          tenant,
          user.uid
        );

      if (success) {

        /*
        Reset form
        */

        setName("");
        setPhone("");
        setRoom("");
        setRent("");
        setDueDate("");

        setAadhaarFile(null);

        setErrors({});

        /*
        Reload tenants
        */

        const data =
          await getTenants(user.uid);

        setTenants(data);

        nameRef.current.focus();

      }

      setLoading(false);

    };

  /*
  INPUT STYLE
  */

  const inputStyle =
    "w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white";

  const errorStyle =
    "text-red-400 text-sm mt-1";

  return (

    <div className="flex justify-center mt-8 px-3">

      <div className="bg-slate-900 p-8 rounded-2xl shadow-xl w-full max-w-xl">

        <h2 className="text-2xl font-bold mb-6">

          Add Tenant

        </h2>

        <div className="mb-6">

          <label className="block mb-2 font-semibold">
            Bulk Upload Tenants (Excel / CSV)
          </label>

          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={handleBulkUpload}
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
          />

        </div>

        {/* NAME */}

        <label>
          Tenant Name
        </label>

        <input
          ref={nameRef}
          value={name}
          onChange={(e) =>
            setName(
              e.target.value
            )
          }
          onKeyDown={(e) => {

            if (
              e.key === "Enter"
            )
              phoneRef.current.focus();

          }}
          className={inputStyle}
        />

        {errors.name && (

          <p className={errorStyle}>
            {errors.name}
          </p>

        )}

        {/* PHONE */}

        <label className="mt-4 block">

          Phone Number

        </label>

        <input
          ref={phoneRef}
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) =>
            setPhone(
              formatPhone(
                e.target.value
              )
            )
          }
          onKeyDown={(e) => {

            if (
              e.key === "Enter"
            )
              roomRef.current.focus();

          }}
          className={inputStyle}
        />

        {errors.phone && (

          <p className={errorStyle}>
            {errors.phone}
          </p>

        )}

        {/* ROOM */}

        <label className="mt-4 block">

          Room Number

        </label>

        <input
          ref={roomRef}
          inputMode="numeric"
          value={room}
          onChange={(e) =>
            setRoom(
              e.target.value.replace(
                /\D/g,
                ""
              )
            )
          }
          onKeyDown={(e) => {

            if (
              e.key === "Enter"
            )
              rentRef.current.focus();

          }}
          className={inputStyle}
        />

        {errors.room && (

          <p className={errorStyle}>
            {errors.room}
          </p>

        )}

        {/* RENT */}

        <label className="mt-4 block">

          Monthly Rent (₹)

        </label>

        <input
          ref={rentRef}
          inputMode="numeric"
          value={rent}
          onChange={(e) =>
            setRent(
              e.target.value.replace(
                /\D/g,
                ""
              )
            )
          }
          onKeyDown={(e) => {

            if (
              e.key === "Enter"
            )
              dueRef.current.focus();

          }}
          className={inputStyle}
        />

        {errors.rent && (

          <p className={errorStyle}>
            {errors.rent}
          </p>

        )}

        {/* DUE DATE */}

        <label className="mt-4 block">

          Due Date (1–31)

        </label>

        <input
          ref={dueRef}
          inputMode="numeric"
          maxLength={2}
          value={dueDate}
          onChange={(e) => {

            let value =
              e.target.value.replace(
                /\D/g,
                ""
              );

            if (
              value &&
              parseInt(value) > 31
            )
              return;

            setDueDate(value);

          }}
          onKeyDown={(e) => {

            if (
              e.key === "Enter"
            )
              handleSubmit();

          }}
          className={inputStyle}
        />

        {errors.dueDate && (

          <p className={errorStyle}>
            {errors.dueDate}
          </p>

        )}

        {/* AADHAAR UPLOAD */}

        <label className="mt-4 block">
          Upload Aadhaar
        </label>

        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => {

            const file = e.target.files[0];

            if (!file) return;

            /*
            File size limit: 5MB
            */

            if (file.size > 5 * 1024 * 1024) {

              setErrors((prev) => ({
                ...prev,
                aadhaarFile:
                  "File must be under 5MB"
              }));

              return;

            }

            setErrors((prev) => ({
              ...prev,
              aadhaarFile: ""
            }));

            setAadhaarFile(file);

          }}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
        />

        {aadhaarFile && (

          <p className="text-green-400 text-sm mt-1">
            Selected: {aadhaarFile.name}
          </p>

        )}

        {errors.aadhaarFile && (

          <p className="text-red-400 text-sm mt-1">
            {errors.aadhaarFile}
          </p>

        )}

        {/* BUTTON */}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 transition p-3 rounded-lg font-semibold"
        >

          {loading
            ? "Saving..."
            : "Add Tenant"}

        </button>

      </div>

    </div>

  );

}
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc
} from "firebase/firestore";


/*
ADD TENANT
*/

export const addTenant = async (tenant) => {
  try {
    await addDoc(collection(db, "tenants"), tenant);
    console.log("Tenant added successfully");
    return true;
  } catch (error) {
    console.error("Error adding tenant:", error);
    return false;
  }
};

/*
GET ALL TENANTS
*/

export const getTenants = async () => {
  try {
    const snapshot = await getDocs(collection(db, "tenants"));

    const tenants = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return tenants;
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return [];
  }
};

/*
SEND WHATSAPP REMINDER
*/

export const openWhatsApp = (tenant) => {
  let phone = tenant.phone;

  // Clean phone number
  phone = phone.replace(/\D/g, "");

  // Handle Indian numbers safely
  if (phone.startsWith("91")) {
    // already correct
  } else if (phone.startsWith("0")) {
    phone = "91" + phone.substring(1);
  } else {
    phone = "91" + phone;
  }

  // Get current month name
  const today = new Date();

  const monthName = today.toLocaleString("default", {
    month: "long"
  });

  const message =
    `Hi ${tenant.name}, just a friendly reminder regarding your rent for ${monthName}. Thank you.`;

  const url =
    "https://wa.me/" +
    phone +
    "?text=" +
    encodeURIComponent(message);

  window.open(url, "_blank");
};

/*
TENANT LEFT / DEACTIVATE
*/

export const deactivateTenant = async (tenant) => {

  try {

    if (!tenant || !tenant.id) {

      console.error(
        "Invalid tenant data"
      );

      return false;

    }

    const tenantRef =
      doc(
        db,
        "tenants",
        tenant.id
      );

    await updateDoc(
      tenantRef,
      {
        status: "inactive",
        leftDate:
          new Date()
      }
    );

    return true;

  } catch (error) {

    console.error(
      "Deactivate error:",
      error
    );

    return false;

  }

};

export const updateTenant = async (
  tenantId,
  data
) => {

  try {

    const cleanData =
      Object.fromEntries(
        Object.entries(data)
          .filter(
            ([_, v]) =>
              v !== undefined
          )
      );

    const tenantRef =
      doc(
        db,
        "tenants",
        tenantId
      );

    await updateDoc(
      tenantRef,
      cleanData
    );

    return true;

  } catch (error) {

    console.error(
      "Update error:",
      error
    );

    return false;

  }

};
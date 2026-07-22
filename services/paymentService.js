import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc
} from "firebase/firestore";

/*
Payments are an append-only rent ledger, scoped to the signed-in owner.
A tenant's status for a month is derived by checking whether a matching
payment exists — there is no boolean "paid" flag. See docs/decisions.md
ADR-003.
*/

/*
RECORD A PAYMENT
*/

export const recordPayment = async (payment, ownerId) => {
  try {
    await addDoc(collection(db, "payments"), {
      ...payment,
      ownerId
    });
    return true;
  } catch (error) {
    console.error("Error recording payment:", error);
    return false;
  }
};

/*
GET ALL PAYMENTS FOR THIS OWNER
*/

export const getPayments = async (ownerId) => {
  try {
    if (!ownerId) return [];

    const q = query(
      collection(db, "payments"),
      where("ownerId", "==", ownerId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error("Error fetching payments:", error);
    return [];
  }
};

/*
DELETE A SINGLE PAYMENT BY ID (correct one ledger entry)
*/

export const deletePaymentById = async (paymentId) => {
  try {
    await deleteDoc(doc(db, "payments", paymentId));
    return true;
  } catch (error) {
    console.error("Delete payment error:", error);
    return false;
  }
};

/*
DELETE A PAYMENT (correct a mistake) for a tenant + month + year
*/

export const deletePayment = async (ownerId, tenantId, month, year) => {
  try {
    if (!ownerId) return false;

    const q = query(
      collection(db, "payments"),
      where("ownerId", "==", ownerId),
      where("tenantId", "==", tenantId),
      where("month", "==", month),
      where("year", "==", year)
    );

    const snapshot = await getDocs(q);

    for (const paymentDoc of snapshot.docs) {
      await deleteDoc(doc(db, "payments", paymentDoc.id));
    }

    return true;
  } catch (error) {
    console.error("Delete payment error:", error);
    return false;
  }
};

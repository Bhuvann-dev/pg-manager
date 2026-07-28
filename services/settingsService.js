import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

/*
Per-owner app settings, stored at settings/{ownerId}. Holds the PG name
(branding), the owner's name, and their UPI ID (used later for payment
links). Owner-scoped like everything else. See docs/data-model.md.
*/

export const getSettings = async (ownerId) => {
  try {
    if (!ownerId) return {};
    const snap = await getDoc(doc(db, "settings", ownerId));
    return snap.exists() ? snap.data() : {};
  } catch (error) {
    console.error("Error fetching settings:", error);
    return {};
  }
};

export const saveSettings = async (ownerId, data) => {
  try {
    if (!ownerId) return false;
    await setDoc(
      doc(db, "settings", ownerId),
      { ...data, ownerId },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    return false;
  }
};

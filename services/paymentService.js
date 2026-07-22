import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

export const recordPayment = async (payment) => {
  try {
    await addDoc(collection(db, "payments"), payment);
    console.log("Payment recorded successfully");
    return true;
  } catch (error) {
    console.error("Error recording payment:", error);
    return false;
  }
};

export const getPayments = async () => {
  try {
    const snapshot = await getDocs(collection(db, "payments"));

    const payments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return payments;
  } catch (error) {
    console.error("Error fetching payments:", error);
    return [];
  }
};

export const deletePayment = async (
  tenantId,
  month,
  year
) => {

  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "payments"
        )
      );

    for (
      const paymentDoc
      of snapshot.docs
    ) {

      const data =
        paymentDoc.data();

      if (
        data.tenantId === tenantId &&
        data.month === month &&
        data.year === year
      ) {

        await deleteDoc(
          doc(
            db,
            "payments",
            paymentDoc.id
          )
        );

      }

    }

    return true;

  } catch (error) {

    console.error(
      "Delete payment error:",
      error
    );

    return false;

  }

};
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

/*
Rooms are first-class, owner-scoped documents with a bed `capacity`.
Occupancy is never stored — it is derived by counting active tenants
whose roomNumber matches the room (see computeOccupancy below), so it
can't drift out of sync. See docs/decisions.md ADR-004.
*/

/*
ADD ROOM
*/

export const addRoom = async (room, ownerId) => {
  try {
    await addDoc(collection(db, "rooms"), {
      ...room,
      ownerId,
      createdAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error adding room:", error);
    return false;
  }
};

/*
GET ALL ROOMS FOR THIS OWNER
*/

export const getRooms = async (ownerId) => {
  try {
    if (!ownerId) return [];

    const q = query(
      collection(db, "rooms"),
      where("ownerId", "==", ownerId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return [];
  }
};

/*
UPDATE ROOM
*/

export const updateRoom = async (roomId, data) => {
  try {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    await updateDoc(doc(db, "rooms", roomId), cleanData);
    return true;
  } catch (error) {
    console.error("Update room error:", error);
    return false;
  }
};

/*
DELETE ROOM
*/

export const deleteRoom = async (roomId) => {
  try {
    await deleteDoc(doc(db, "rooms", roomId));
    return true;
  } catch (error) {
    console.error("Delete room error:", error);
    return false;
  }
};

/*
DERIVE OCCUPANCY

Count active tenants whose roomNumber matches this room. Returns the
number of beds filled; vacancy is capacity - occupancy.
*/

export const computeOccupancy = (room, tenants) => {
  return tenants.filter(
    (t) =>
      t.status !== "inactive" &&
      String(t.roomNumber) === String(room.roomNumber)
  ).length;
};

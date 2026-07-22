"use client";

import { useEffect, useState } from "react";
import { DoorOpen, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  addRoom,
  getRooms,
  updateRoom,
  deleteRoom,
  computeOccupancy
} from "../../services/roomService";
import { getTenants } from "../../services/tenantService";
import { Loading } from "../../components/States";

export default function RoomsPage() {
  const { user } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const [roomNumber, setRoomNumber] = useState("");
  const [capacity, setCapacity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const [editingRoom, setEditingRoom] = useState(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [roomData, tenantData] = await Promise.all([
      getRooms(user.uid),
      getTenants(user.uid)
    ]);
    setRooms(roomData);
    setTenants(tenantData);
    setLoading(false);
  };

  /*
  ADD ROOM
  */

  const handleAddRoom = async () => {
    setError("");

    if (!roomNumber.trim()) {
      setError("Room number is required.");
      return;
    }

    const cap = parseInt(capacity, 10);

    if (!Number.isFinite(cap) || cap < 1) {
      setError("Capacity must be at least 1 bed.");
      return;
    }

    const duplicate = rooms.some(
      (r) => String(r.roomNumber) === String(roomNumber.trim())
    );

    if (duplicate) {
      setError("A room with that number already exists.");
      return;
    }

    const success = await addRoom(
      {
        roomNumber: roomNumber.trim(),
        capacity: cap,
        notes: notes.trim()
      },
      user.uid
    );

    if (success) {
      setRoomNumber("");
      setCapacity("");
      setNotes("");
      loadData();
    } else {
      setError("Could not add the room. Please try again.");
    }
  };

  /*
  SAVE EDIT
  */

  const handleSaveEdit = async () => {
    const cap = parseInt(editingRoom.capacity, 10);

    if (!Number.isFinite(cap) || cap < 1) {
      alert("Capacity must be at least 1 bed.");
      return;
    }

    const occupancy = computeOccupancy(editingRoom, tenants);

    if (cap < occupancy) {
      alert(
        `This room already has ${occupancy} tenant(s). ` +
          `Capacity can't be lower than that.`
      );
      return;
    }

    const success = await updateRoom(editingRoom.id, {
      roomNumber: String(editingRoom.roomNumber).trim(),
      capacity: cap,
      notes: (editingRoom.notes || "").trim()
    });

    if (success) {
      setEditingRoom(null);
      loadData();
    } else {
      alert("Update failed.");
    }
  };

  /*
  DELETE ROOM
  */

  const handleDelete = async (room) => {
    const occupancy = computeOccupancy(room, tenants);

    if (occupancy > 0) {
      alert(
        `Room ${room.roomNumber} has ${occupancy} tenant(s). ` +
          `Move or remove them before deleting the room.`
      );
      return;
    }

    if (!window.confirm(`Delete room ${room.roomNumber}?`)) return;

    const success = await deleteRoom(room.id);
    if (success) loadData();
  };

  /*
  SUMMARY
  */

  const totalBeds = rooms.reduce(
    (sum, r) => sum + (Number(r.capacity) || 0),
    0
  );

  const occupiedBeds = rooms.reduce(
    (sum, r) => sum + computeOccupancy(r, tenants),
    0
  );

  const vacantBeds = Math.max(totalBeds - occupiedBeds, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Rooms</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard title="Total Beds" value={totalBeds} />
        <SummaryCard title="Occupied" value={occupiedBeds} />
        <SummaryCard title="Vacant" value={vacantBeds} />
      </div>

      {/* Add room */}
      <div className="card p-5 rounded-xl">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Plus size={18} /> Add a Room
        </h2>

        {error && (
          <p className="badge-danger block text-sm p-3 rounded-lg mb-4">
            {error}
          </p>
        )}

        <div className="flex flex-col md:flex-row gap-3">
          <input
            placeholder="Room number"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            className="input flex-1"
          />

          <input
            type="number"
            min={1}
            placeholder="Beds"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="input w-full md:w-28"
          />

          <input
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input flex-1"
          />

          <button
            onClick={handleAddRoom}
            className="btn btn-primary"
          >
            Add
          </button>
        </div>
      </div>

      {/* Room list */}
      {loading ? (
        <Loading label="Loading rooms…" />
      ) : rooms.length === 0 ? (
        <div className="text-[color:var(--text-muted)] text-center py-10">
          No rooms yet. Add your first room above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms
            .slice()
            .sort((a, b) =>
              String(a.roomNumber).localeCompare(
                String(b.roomNumber),
                undefined,
                { numeric: true }
              )
            )
            .map((room) => {
              const occupancy = computeOccupancy(room, tenants);
              const vacancy = Math.max(
                (Number(room.capacity) || 0) - occupancy,
                0
              );
              const full = vacancy === 0;

              return (
                <div
                  key={room.id}
                  className="card p-5 rounded-xl shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <DoorOpen size={20} className="text-blue-400" />
                      <span className="text-lg font-semibold">
                        Room {room.roomNumber}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingRoom(room)}
                        className="text-[color:var(--text-muted)] hover:text-white"
                        aria-label="Edit room"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(room)}
                        className="text-[color:var(--text-muted)] hover:text-red-400"
                        aria-label="Delete room"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {occupancy}
                    </span>
                    <span className="text-[color:var(--text-muted)]">
                      / {room.capacity} beds
                    </span>
                  </div>

                  <div
                    className={`mt-1 text-sm font-medium ${
                      full ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {full ? "Full" : `${vacancy} bed(s) free`}
                  </div>

                  {room.notes && (
                    <p className="mt-3 text-sm text-[color:var(--text-muted)]">
                      {room.notes}
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Edit modal */}
      {editingRoom && (
        <div className="modal-backdrop">
          <div className="card p-6 rounded-xl w-full max-w-sm">
            <h2 className="text-xl font-bold mb-5">
              Edit Room {editingRoom.roomNumber}
            </h2>

            <label className="text-sm text-[color:var(--text-muted)]">Room Number</label>
            <input
              className="input mb-3 mt-1"
              value={editingRoom.roomNumber}
              onChange={(e) =>
                setEditingRoom({
                  ...editingRoom,
                  roomNumber: e.target.value
                })
              }
            />

            <label className="text-sm text-[color:var(--text-muted)]">Beds (capacity)</label>
            <input
              type="number"
              min={1}
              className="input mb-3 mt-1"
              value={editingRoom.capacity}
              onChange={(e) =>
                setEditingRoom({
                  ...editingRoom,
                  capacity: e.target.value
                })
              }
            />

            <label className="text-sm text-[color:var(--text-muted)]">Notes</label>
            <input
              className="input mb-5 mt-1"
              value={editingRoom.notes || ""}
              onChange={(e) =>
                setEditingRoom({
                  ...editingRoom,
                  notes: e.target.value
                })
              }
            />

            <div className="flex gap-3">
              <button
                onClick={handleSaveEdit}
                className="btn btn-success"
              >
                Save
              </button>

              <button
                onClick={() => setEditingRoom(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="card p-5 rounded-xl shadow-md">
      <div className="text-[color:var(--text-muted)] text-sm">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

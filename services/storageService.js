import { storage } from "../lib/firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";

/*
Tenant ID documents (Aadhaar) are private PII. They live in Firebase
Storage under an owner-scoped path and are readable only by the owning
account (enforced by storage.rules). We persist only the storage PATH on
the tenant document — never a public URL. A download URL is fetched on
demand while the owner is authenticated. See docs/decisions.md ADR-005.
*/

const buildPath = (ownerId, tenantId, fileName) => {
  const safeName = fileName.replace(/[^\w.\-]/g, "_");
  return `owners/${ownerId}/tenants/${tenantId}/${Date.now()}_${safeName}`;
};

/*
UPLOAD — returns the storage path to store on the tenant, or null on error.
*/

export const uploadDocument = async (file, ownerId, tenantId) => {
  try {
    if (!file || !ownerId || !tenantId) return null;

    const path = buildPath(ownerId, tenantId, file.name);
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file);

    return path;
  } catch (error) {
    console.error("Document upload error:", error);
    return null;
  }
};

/*
GET DOWNLOAD URL — authenticated, on-demand. Not persisted anywhere.
*/

export const getDocumentUrl = async (path) => {
  try {
    if (!path) return null;
    return await getDownloadURL(ref(storage, path));
  } catch (error) {
    console.error("Document URL error:", error);
    return null;
  }
};

/*
DELETE — best-effort; ignores an already-missing object.
*/

export const deleteDocument = async (path) => {
  try {
    if (!path) return true;
    await deleteObject(ref(storage, path));
    return true;
  } catch (error) {
    if (error?.code === "storage/object-not-found") return true;
    console.error("Document delete error:", error);
    return false;
  }
};

/*
Legacy public paths (old /uploads/aadhaar/... values) start with "/".
New values are Storage paths. This helps the UI decide how to open them.
*/

export const isStoragePath = (value) =>
  typeof value === "string" && value.length > 0 && !value.startsWith("/");

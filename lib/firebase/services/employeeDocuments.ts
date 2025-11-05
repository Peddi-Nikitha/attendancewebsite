import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../config";

export interface EmployeeDocument {
  id: string; // firestore doc id
  employeeId: string; // employees collection doc id
  name: string; // document name or file name
  filePath: string; // storage path
  fileUrl: string; // public URL
  uploadedAt: Timestamp;
}

const COL = "employeeDocuments";

export async function listEmployeeDocuments(employeeId: string, limitCount: number = 50): Promise<EmployeeDocument[]> {
  const col = collection(db, COL);
  try {
    const qy = query(col, where("employeeId", "==", employeeId), orderBy("uploadedAt", "desc"), limit(limitCount));
    const snaps = await getDocs(qy);
    return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as EmployeeDocument[];
  } catch (e: any) {
    // Fallback if composite index is missing: query without orderBy and sort client-side
    const qy = query(col, where("employeeId", "==", employeeId));
    const snaps = await getDocs(qy);
    const docs = snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as EmployeeDocument[];
    docs.sort((a: any, b: any) => (b.uploadedAt?.toMillis?.() ?? 0) - (a.uploadedAt?.toMillis?.() ?? 0));
    return docs.slice(0, limitCount);
  }
}

export async function uploadEmployeeDocument(employeeId: string, name: string, file: File): Promise<EmployeeDocument> {
  const safeName = name?.trim() || file.name;
  const ts = Date.now();
  const path = `employee-docs/${employeeId}/${ts}_${file.name}`;
  const sref = storageRef(storage, path);
  await uploadBytes(sref, file);
  const url = await getDownloadURL(sref);

  const ref = doc(collection(db, COL));
  const payload = {
    employeeId,
    name: safeName,
    filePath: path,
    fileUrl: url,
    uploadedAt: serverTimestamp() as Timestamp,
  } as any;
  await setDoc(ref, payload);
  return { id: ref.id, ...(payload as any) } as EmployeeDocument;
}

export async function deleteEmployeeDocument(docId: string, filePath?: string) {
  const ref = doc(db, COL, docId);
  await deleteDoc(ref);
  if (filePath) {
    try { await deleteObject(storageRef(storage, filePath)); } catch {}
  }
}



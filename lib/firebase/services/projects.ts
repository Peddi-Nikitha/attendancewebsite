import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../config";

export type ProjectStatus = "planned" | "active" | "on-hold" | "completed" | "cancelled";

export interface ProjectDoc {
  id: string; // doc id
  name: string;
  description?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  status: ProjectStatus;
  // Use employees collection doc IDs (equals userId in this app)
  employeeIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const COL = "projects";

export async function createProject(data: Omit<ProjectDoc, "id" | "createdAt" | "updatedAt">) {
  const ref = doc(collection(db, COL));
  const payload = {
    ...data,
    employeeIds: Array.from(new Set(data.employeeIds || [])),
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  } as any;
  await setDoc(ref, payload);
  const snap = await getDoc(ref);
  return { id: ref.id, ...(snap.data() as any) } as ProjectDoc;
}

export async function updateProject(projectId: string, updates: Partial<ProjectDoc>) {
  const ref = doc(db, COL, projectId);
  const payload: any = { ...updates, updatedAt: serverTimestamp() };
  if (updates.employeeIds) payload.employeeIds = Array.from(new Set(updates.employeeIds));
  await updateDoc(ref, payload);
  const snap = await getDoc(ref);
  return { id: ref.id, ...(snap.data() as any) } as ProjectDoc;
}

export async function deleteProject(projectId: string) {
  const ref = doc(db, COL, projectId);
  await deleteDoc(ref);
}

export async function getProject(projectId: string) {
  const ref = doc(db, COL, projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: ref.id, ...(snap.data() as any) } as ProjectDoc;
}

export async function getProjects(limitCount: number = 50) {
  const col = collection(db, COL);
  const q = query(col, orderBy("createdAt", "desc"), limit(limitCount));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ProjectDoc[];
}

export function listenProjects(
  cb: (projects: ProjectDoc[]) => void,
  limitCount: number = 50,
  employeeIdFilter?: string,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COL);
  const qWithOrder = employeeIdFilter
    ? query(colRef, where("employeeIds", "array-contains", employeeIdFilter), orderBy("createdAt", "desc"), limit(limitCount))
    : query(colRef, orderBy("createdAt", "desc"), limit(limitCount));

  let fallbackUnsub: Unsubscribe | null = null;
  let usingFallback = false;

  const unsub = onSnapshot(
    qWithOrder,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ProjectDoc[]);
    },
    (error: any) => {
      if (error?.code === "failed-precondition" && error?.message?.includes("index")) {
        // Composite index missing; fallback to query without orderBy
        if (!usingFallback) {
          usingFallback = true;
          const qFallback = employeeIdFilter
            ? query(colRef, where("employeeIds", "array-contains", employeeIdFilter))
            : query(colRef);
          fallbackUnsub = onSnapshot(
            qFallback,
            (snap2) => {
              const docs = snap2.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ProjectDoc[];
              // Sort by createdAt desc in memory
              docs.sort((a, b) => {
                const av = (a as any).createdAt?.toMillis?.() ?? 0;
                const bv = (b as any).createdAt?.toMillis?.() ?? 0;
                return bv - av;
              });
              cb(docs.slice(0, limitCount));
            },
            (fallbackErr) => {
              const err = fallbackErr instanceof Error ? fallbackErr : new Error("Failed to load projects");
              if (errorCallback) errorCallback(err); else cb([]);
            }
          );
        }
        if (errorCallback) errorCallback(error);
      } else {
        const err = error instanceof Error ? error : new Error("Failed to load projects");
        if (errorCallback) errorCallback(err); else cb([]);
      }
    }
  );

  return () => {
    unsub();
    if (fallbackUnsub) fallbackUnsub();
  };
}



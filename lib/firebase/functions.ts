import app from './config';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';

const functions = getFunctions(app);

// Optional: connect to emulator in dev if env flag is set
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_FN_EMULATOR === 'true') {
  try { connectFunctionsEmulator(functions, 'localhost', 5001); } catch {}
}

export async function createEmployeeUser(payload: {
  name: string;
  email: string;
  password: string;
  department: string;
  role: 'employee' | 'admin';
}) {
  try {
    const fn = httpsCallable(functions, 'createEmployeeUser');
    const res = await fn(payload);
    return res.data as { uid: string };
  } catch (e: any) {
    const code: string | undefined = e?.code;
    const msg: string | undefined = e?.message;
    if (code === 'functions/not-found') {
      throw new Error("Employee creation service not found. Deploy Cloud Function 'createEmployeeUser'.");
    }
    if (code === 'functions/permission-denied') {
      throw new Error('You do not have permission to create users.');
    }
    if (code === 'functions/invalid-argument') {
      throw new Error('Invalid employee data. Please check the form fields.');
    }
    // Surface readable message when available
    if (typeof msg === 'string' && msg.toLowerCase() !== 'internal') {
      throw new Error(msg);
    }
    throw new Error('Internal error creating employee. Please deploy the Cloud Function or try again.');
  }
}



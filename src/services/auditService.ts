import { db, collection, addDoc, serverTimestamp } from '../firebase';

export const logAction = async (userId: string, action: string, details: string) => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      userId,
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error logging action:', error);
  }
};

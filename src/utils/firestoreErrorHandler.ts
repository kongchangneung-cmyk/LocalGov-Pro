import { FirebaseError } from "firebase/app";

/**
 * แปลงรหัสข้อผิดพลาดของ Firestore (FirebaseError.code) เป็นข้อความที่มนุษย์อ่านเข้าใจง่าย
 * เหมาะสำหรับแสดงผลให้ผู้ใช้เห็น หรือใช้ในการดีบัก
 * 
 * @param error - ออบเจ็กต์ข้อผิดพลาดที่ได้รับจาก try-catch block ซึ่งควรเป็น FirebaseError
 * @returns ข้อความอธิบายข้อผิดพลาดที่เข้าใจง่าย หากไม่พบรหัสข้อผิดพลาดที่ตรงกัน จะคืนค่าข้อความทั่วไป
 */
export const getFirestoreErrorMessage = (error: unknown): string => {
  // ตรวจสอบก่อนว่า error เป็น instance ของ FirebaseError หรือไม่
  if (error instanceof FirebaseError) {
    const errorCode = error.code;
    console.error("Firestore Error Code:", errorCode); // สำหรับดีบัก
    console.error("Full Error:", error);

    switch (errorCode) {
      // --- ข้อผิดพลาดด้านการยืนยันตัวตนและการอนุญาต (Authentication & Permissions) ---
      case "permission-denied":
        return "คุณไม่มีสิทธิ์ในการเข้าถึงหรือแก้ไขข้อมูลนี้ กรุณาตรวจสอบสิทธิ์การใช้งานของคุณ (Permission Denied)";
      case "unauthenticated":
        return "จำเป็นต้องเข้าสู่ระบบก่อนทำการร้องขอนี้ (Unauthenticated)";
      
      // --- ข้อผิดพลาดเกี่ยวกับการร้องขอ (Request Errors) ---
      case "not-found":
        return "ไม่พบเอกสารหรือข้อมูลที่คุณร้องขอ (Not Found)";
      case "already-exists":
        return "ข้อมูลหรือเอกสารนี้มีอยู่แล้วในระบบ (Already Exists)";
      case "invalid-argument":
        return "ข้อมูลที่ส่งไปไม่ถูกต้องหรือไม่สมบูรณ์ (Invalid Argument)";
      case "failed-precondition":
        return "การดำเนินการไม่สำเร็จเนื่องจากเงื่อนไขไม่ตรงตามที่กำหนด (Failed Precondition)";
      
      // --- ข้อผิดพลาดด้านทรัพยากร (Resource Errors) ---
      case "resource-exhausted":
        return "ใช้งานโควต้าเกินกำหนด กรุณาลองใหม่อีกครั้งในภายหลัง (Resource Exhausted)";
      case "unavailable":
        return "บริการไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง (Service Unavailable)";
      case "cancelled":
        return "การดำเนินการถูกยกเลิกโดยผู้ใช้ (Operation Cancelled)";
      
      // --- ข้อผิดพลาดอื่นๆ ---
      case "unknown":
        return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาติดต่อผู้ดูแลระบบ (Unknown Error)";
      
      // --- รหัสข้อผิดพลาดอื่นๆ ที่อาจเจอ ---
      case "deadline-exceeded":
        return "หมดเวลาในการเชื่อมต่อ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณแล้วลองใหม่ (Deadline Exceeded)";
      case "internal":
        return "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง (Internal Server Error)";
      
      // หากไม่ตรงกับ case ไหนเลย
      default:
        return `เกิดข้อผิดพลาดที่ไม่คาดคิด: ${errorCode}`;
    }
  }

  // กรณีที่ error ไม่ใช่ FirebaseError
  if (error instanceof Error) {
    return error.message;
  }

  return "เกิดข้อผิดพลาดที่ไม่รู้จัก กรุณาลองใหม่อีกครั้ง";
};

/**
 * ตัวอย่างฟังก์ชันสำหรับจัดการข้อผิดพลาดและแสดงผลผ่าน Alert
 * หรือสามารถปรับเปลี่ยนไปใช้กับ UI component อื่นๆ เช่น Toast, Snackbar
 * 
 * @param error - ออบเจ็กต์ข้อผิดพลาดที่ได้รับ
 * @param customPrefix - ข้อความนำหน้าเพื่อบอก context ของข้อผิดพลาด (optional)
 */
export const handleFirestoreError = (error: unknown, customPrefix: string = "เกิดข้อผิดพลาด"): void => {
  const errorMessage = getFirestoreErrorMessage(error);
  // ในโปรเจกต์จริง อาจจะใช้ไลบรารี Toast Notification แทน alert
  // เช่น: toast.error(`${customPrefix}: ${errorMessage}`);
  alert(`${customPrefix}: ${errorMessage}`);
};

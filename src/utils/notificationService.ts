import { db, collection, addDoc, getDocs, query, where, serverTimestamp } from '../firebase';

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  link?: string;
  projectId?: string;
}

export const createNotification = async (data: Omit<NotificationData, 'createdAt' | 'read'>) => {
  try {
    const notification: NotificationData = {
      ...data,
      read: false,
      createdAt: new Date().toISOString(),
    };
    
    await addDoc(collection(db, 'notifications'), notification);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const sendToRole = async (role: string, data: Omit<NotificationData, 'userId' | 'createdAt' | 'read'>) => {
  try {
    const usersQuery = query(collection(db, 'users'), where('role', '==', role));
    const usersSnapshot = await getDocs(usersQuery);
    
    const promises = usersSnapshot.docs.map(doc => 
      createNotification({
        ...data,
        userId: doc.id
      })
    );
    
    await Promise.all(promises);
  } catch (error) {
    console.error('Error sending notification to role:', error);
  }
};

export const sendToAll = async (data: Omit<NotificationData, 'userId' | 'createdAt' | 'read'>) => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    const promises = usersSnapshot.docs.map(doc => 
      createNotification({
        ...data,
        userId: doc.id
      })
    );
    
    await Promise.all(promises);
  } catch (error) {
    console.error('Error sending notification to all:', error);
  }
};

export const notifyProjectDelay = (userId: string, projectName: string, projectId: string) => {
  return createNotification({
    userId,
    title: 'โครงการล่าช้า',
    message: `โครงการ "${projectName}" มีสถานะเป็นล่าช้า กรุณาตรวจสอบ`,
    type: 'warning',
    projectId,
    link: `/admin?tab=progress&projectId=${projectId}`
  });
};

export const notifyInspectionFailure = (userId: string, projectName: string, projectId: string) => {
  return createNotification({
    userId,
    title: 'การตรวจงานไม่ผ่าน',
    message: `โครงการ "${projectName}" ตรวจงานไม่ผ่าน กรุณาตรวจสอบรายละเอียด`,
    type: 'error',
    projectId,
    link: `/admin?tab=inspections&projectId=${projectId}`
  });
};

export const notifyProjectUpdate = async (projectName: string, projectId: string, updateType: 'status' | 'progress', newValue: string | number) => {
  const rolesToNotify = ['director', 'engineer'];
  const title = updateType === 'status' ? 'อัปเดตสถานะโครงการ' : 'อัปเดตความก้าวหน้าโครงการ';
  const message = updateType === 'status' 
    ? `โครงการ "${projectName}" เปลี่ยนสถานะเป็น: ${newValue}`
    : `โครงการ "${projectName}" อัปเดตความก้าวหน้าเป็น: ${newValue}%`;

  const promises = rolesToNotify.map(role => 
    sendToRole(role, {
      title,
      message,
      type: updateType === 'status' && newValue === 'Delayed' ? 'warning' : 'info',
      projectId,
      link: `/admin?tab=projects&projectId=${projectId}`
    })
  );
  
  await Promise.all(promises);
};

/**
 * ฟังก์ชันดักจับข้อมูลโครงการ พร้อมการทำ Geographic Data Normalization
 */
export function constructionDataInterceptor(rawData: any[]) {
    const data = Array.isArray(rawData) ? rawData : Object.values(rawData);

    return {
        projectId: data[0]?.toString().trim().toUpperCase() || "N/A",
        projectName: data[1]?.toString().trim() || "ไม่ระบุชื่อโครงการ",
        category: data[2]?.toString().split('/').map((s: string) => s.trim()).join(' / ') || "",
        fundingSource: data[3]?.toString().trim() || "ไม่ระบุแหล่งทุน",
        
        // ข้อมูลพื้นที่
        village: data[4]?.toString().trim() || "",
        subDistrict: data[5]?.toString().trim() || "",
        
        // งบประมาณและปี
        budget: Number(data[6]?.toString().replace(/,/g, '')) || 0,
        fiscalYear: parseInt(data[7]) || 2569,

        // --- เพิ่มส่วนพิกัด (Geolocation) ---
        location: (() => {
            // สมมติว่าพิกัดถูกส่งมาใน index ที่ 8 (ถ้ามี) 
            const rawCoords = data[8] || "0,0"; 
            
            // แยก Latitude และ Longitude ออกจากกัน
            const parts = rawCoords.toString().split(',').map((p: string) => p.trim());
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);

            return {
                lat: isNaN(lat) ? null : lat,
                lng: isNaN(lng) ? null : lng,
                googleMapsLink: (!isNaN(lat) && !isNaN(lng)) 
                    ? `https://www.google.com/maps?q=${lat},${lng}` 
                    : null
            };
        })()
    };
}

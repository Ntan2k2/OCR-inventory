
export interface InventoryItem {
  STT: number | null;
  'Tầng-Ngăn (Vị trí)': string | null;
  'Mã SP': string | null;
  'Hãng': string | null;
  'Loại': string | null;
  'Số lượng': number | null;
  'Ghi chú': string | null;
}

export interface InventoryData {
  Kho: string | null;
  Tầng: string | null;
  'Vị trí/kệ': string | null;
  'Ngày kiểm kho': string | null;
  'Người kiểm': string | null;
  'Người duyệt': string | null;
  table: InventoryItem[];
}

export type UserRole = 'USER' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'LOCKED';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';
export type PublishStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
export type TestCaseType = 'SAMPLE' | 'HIDDEN';
export type SessionStatus = 'READY' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type DialogueRole = 'AI_INTERVIEWER' | 'CANDIDATE' | 'SYSTEM';
export type DialogueType = 'QUESTION' | 'ANSWER' | 'HINT' | 'FEEDBACK' | 'SUMMARY';
export type ReportStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
export type FeedbackStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
export type CodeLanguage = 'javascript' | 'typescript' | 'python';

export interface TaiKhoan {
  id: string;
  email: string;
  mat_khau_hash: string;
  vai_tro: UserRole;
  trang_thai: AccountStatus;
  ngay_tao: string;
  lan_dang_nhap_cuoi?: string;
}

export interface HoSoNguoiDung {
  id: string;
  tai_khoan_id: string;
  ho_ten: string;
  tieu_de_nghe_nghiep: string;
  kinh_nghiem_nam: number;
  muc_tieu_vi_tri: string;
  ky_nang: string[];
  gioi_thieu: string;
  ngon_ngu_mac_dinh: CodeLanguage;
}

export interface ViTri {
  id: string;
  ten_vi_tri: string;
  mo_ta: string;
  trang_thai: 'ACTIVE' | 'HIDDEN';
}

export interface ChuDe {
  id: string;
  ten_chu_de: string;
  mo_ta: string;
  vi_tri_id: string;
  trang_thai: 'ACTIVE' | 'HIDDEN';
}

export interface BaiToan {
  id: string;
  tieu_de: string;
  slug: string;
  vi_tri_id: string;
  chu_de_id: string;
  do_kho: DifficultyLevel;
  mo_ta_chi_tiet: string;
  yeu_cau_dau_vao: string;
  yeu_cau_dau_ra: string;
  rang_buoc: string[];
  ham_muc_tieu: string;
  code_mau: Record<CodeLanguage, string>;
  goi_y_huong_dan: string[];
  thoi_luong_phut_mac_dinh: number;
  trang_thai: PublishStatus;
  ngay_tao: string;
  ngay_cap_nhat: string;
}

export interface TestCase {
  id: string;
  bai_toan_id: string;
  ten_test: string;
  loai: TestCaseType;
  dau_vao: string; // JSON array of arguments
  dau_ra_mong_doi: string; // JSON value
  giai_thich?: string;
  thu_tu: number;
  trang_thai: 'ACTIVE' | 'HIDDEN';
}

export interface YeuThich {
  id: string;
  tai_khoan_id: string;
  bai_toan_id: string;
  ngay_tao: string;
}

export interface GoiDichVu {
  id: string;
  ten_goi: string;
  doi_tuong: string;
  mo_ta: string;
  gia_hien_thi: string;
  chu_ky: string;
  so_luot_phong_van_thang: number;
  gioi_han_goi_y_phien: number;
  gioi_han_cv_mb: number;
  quyen_loi: string[];
  noi_bat: boolean;
  trang_thai: PublishStatus;
}

export interface QuyenSuDungGoi {
  id: string;
  tai_khoan_id: string;
  goi_dich_vu_id: string;
  luot_da_dung_thang: number;
  thang_chu_ky: string; // YYYY-MM
}

export interface PhienBanPrompt {
  id: string;
  prompt_id: string;
  so_phien_ban: number;
  noi_dung_system: string;
  noi_dung_user_template: string;
  mo_ta_thay_doi: string;
  trang_thai: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  ngay_tao: string;
}

export interface PromptTemplate {
  id: string;
  ma_prompt: string;
  ten_prompt: string;
  loai_tac_vu: 'INTERVIEWER' | 'HINT' | 'EVALUATION' | 'REFACTOR' | 'CV_PARSE' | 'CONTENT_GEN';
  phien_ban_hien_hanh_id: string;
}

export interface TieuChiRubric {
  id: string;
  ten_tieu_chi: string;
  mo_ta: string;
  trong_so: number; // percentage 1..100, sum must be 100 on publish
  diem_toi_da: number;
}

export interface PhienBanRubric {
  id: string;
  rubric_id: string;
  so_phien_ban: number;
  tieu_chi: TieuChiRubric[];
  trang_thai: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  ngay_tao: string;
}

export interface Rubric {
  id: string;
  ten_rubric: string;
  mo_ta: string;
  phien_ban_hien_hanh_id: string;
}

export interface TepCV {
  id: string;
  tai_khoan_id: string;
  ten_tep: string;
  dinh_dang: 'PDF' | 'DOCX' | 'TXT';
  kich_thuoc_bytes: number;
  noi_dung_tho: string;
  trang_thai: 'EXTRACTED' | 'CONFIRMED';
  ngay_tai: string;
}

export interface CVXacNhan {
  id: string;
  tep_cv_id: string;
  tai_khoan_id: string;
  vi_tri_ung_tuyen: string;
  so_nam_kinh_nghiem: number;
  ky_nang_chinh: string[];
  du_an_noi_bat: string[];
  tom_tat_nang_luc: string;
  da_xac_nhan: boolean;
  ngay_xac_nhan?: string;
}

export interface BanGhiHoiThoai {
  id: string;
  phien_id: string;
  vai_tro: DialogueRole;
  loai: DialogueType;
  noi_dung: string;
  thoi_gian: string;
}

export interface KetQuaTestChiTiet {
  test_case_id: string;
  ten_test: string;
  loai: TestCaseType;
  dat: boolean;
  dau_vao?: string;
  dau_ra_mong_doi?: string;
  dau_ra_thuc_te?: string;
  thong_bao_loi?: string;
  thoi_gian_ms: number;
}

export interface KetQuaChayCode {
  id: string;
  phien_id: string;
  loai_chay: 'SAMPLE' | 'SUBMIT';
  ngon_ngu: CodeLanguage;
  so_test_dat: number;
  tong_test: number;
  so_hidden_dat?: number;
  tong_hidden?: number;
  stdout: string;
  loi_bien_dich?: string;
  chi_tiet_sample: KetQuaTestChiTiet[];
  thoi_gian_chay: string;
}

export interface PhienPhongVan {
  id: string;
  tai_khoan_id: string;
  bai_toan_id: string;
  vi_tri_id: string;
  chu_de_id: string;
  cv_xac_nhan_id?: string;
  phien_ban_rubric_id: string;
  phien_ban_prompt_id: string;
  ngon_ngu: CodeLanguage;
  thoi_luong_phut: number;
  gioi_han_goi_y_snapshot: number;
  goi_y_da_dung: number;
  da_tru_luot: boolean;
  trang_thai: SessionStatus;
  ma_nguon_hien_tai: string;
  ma_nguon_da_nop?: string;
  ngay_tao: string;
  bat_dau_at?: string;
  het_han_at?: string;
  ket_thuc_at?: string;
  ly_do_ket_thuc?: 'SUBMIT' | 'TIMEOUT' | 'CANCELLED';
}

export interface DiemTieuChi {
  tieu_chi_id: string;
  ten_tieu_chi: string;
  trong_so: number;
  diem: number;
  diem_toi_da: number;
  nhan_xet: string;
}

export interface DeXuatToiUu {
  id: string;
  bao_cao_id: string;
  ngon_ngu: CodeLanguage;
  ma_nguon_goc: string;
  ma_nguon_toi_uu: string;
  giai_thich_cai_tien: string[];
  do_phuc_tap_truoc: string;
  do_phuc_tap_sau: string;
  ngay_tao: string;
}

export interface BaoCaoDanhGia {
  id: string;
  phien_id: string;
  tai_khoan_id: string;
  phien_ban_rubric_id: string;
  trang_thai: ReportStatus;
  diem_tong_ket?: number; // 0..100 rounded to 3 decimals
  xep_loai?: string;
  nhan_xet_tong_quan?: string;
  diem_manh?: string[];
  diem_yeu?: string[];
  buoc_tiep_theo?: string[];
  chi_tiet_tieu_chi?: DiemTieuChi[];
  ly_do_loi?: string;
  ngay_tao: string;
  ngay_hoan_thanh?: string;
}

export interface BanNhapAI {
  id: string;
  admin_id: string;
  vi_tri_id: string;
  chu_de_id: string;
  do_kho: DifficultyLevel;
  yeu_cau_prompt: string;
  trang_thai: 'PENDING' | 'READY' | 'APPROVED' | 'FAILED';
  du_lieu_nhap?: {
    tieu_de: string;
    mo_ta_chi_tiet: string;
    yeu_cau_dau_vao: string;
    yeu_cau_dau_ra: string;
    rang_buoc: string[];
    ham_muc_tieu: string;
    code_mau: Record<CodeLanguage, string>;
    goi_y_huong_dan: string[];
    test_cases: Array<{
      ten_test: string;
      loai: TestCaseType;
      dau_vao: string;
      dau_ra_mong_doi: string;
      giai_thich?: string;
    }>;
  };
  bai_toan_da_luu_id?: string;
  ly_do_loi?: string;
  ngay_tao: string;
}

export interface PhanHoi {
  id: string;
  tai_khoan_id: string;
  phien_id?: string;
  bai_toan_id?: string;
  loai_phan_hoi: 'BUG_SANDBOX' | 'AI_FEEDBACK' | 'CONTENT_ISSUE' | 'FEATURE_REQUEST';
  tieu_de: string;
  noi_dung: string;
  trang_thai: FeedbackStatus;
  ghi_chu_xu_ly?: string;
  ngay_tao: string;
  ngay_cap_nhat: string;
}

export interface AuthSession {
  token: string;
  tai_khoan_id: string;
  ngay_tao: string;
  het_han: string;
}

export interface AppDatabase {
  tai_khoan: TaiKhoan[];
  ho_so: HoSoNguoiDung[];
  vi_tri: ViTri[];
  chu_de: ChuDe[];
  bai_toan: BaiToan[];
  test_case: TestCase[];
  yeu_thich: YeuThich[];
  goi_dich_vu: GoiDichVu[];
  quyen_su_dung_goi: QuyenSuDungGoi[];
  prompt_template: PromptTemplate[];
  phien_ban_prompt: PhienBanPrompt[];
  rubric: Rubric[];
  phien_ban_rubric: PhienBanRubric[];
  tep_cv: TepCV[];
  cv_xac_nhan: CVXacNhan[];
  phien_phong_van: PhienPhongVan[];
  ban_ghi_hoi_thoai: BanGhiHoiThoai[];
  ket_qua_chay_code: KetQuaChayCode[];
  bao_cao_danh_gia: BaoCaoDanhGia[];
  de_xuat_toi_uu: DeXuatToiUu[];
  ban_nhap_ai: BanNhapAI[];
  phan_hoi: PhanHoi[];
  auth_sessions: AuthSession[];
}

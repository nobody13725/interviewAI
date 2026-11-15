export type UserRole = 'USER' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'LOCKED';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';
export type PublishStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
export type CodeLanguage = 'javascript' | 'typescript' | 'python';
export type SessionStatus = 'READY' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type ReportStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
export type FeedbackStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';

export type ScreenId =
  | 'M01' | 'M02' | 'M03' | 'M04' | 'M05'
  | 'M06' | 'M07' | 'M08' | 'M09' | 'M10' | 'M11' | 'M12' | 'M13' | 'M14'
  | 'M15' | 'M16' | 'M17' | 'M18' | 'M19' | 'M20' | 'M21' | 'M22' | 'M23' | 'M24';

export interface AuthUser {
  id: string;
  email: string;
  vai_tro: UserRole;
  trang_thai: AccountStatus;
  ngay_tao: string;
}

export interface UserProfile {
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

export interface ServiceTier {
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

export interface QuotaInfo {
  tier: ServiceTier;
  luot_da_dung: number;
  luot_toi_da: number;
  luot_con_lai: number;
}

export interface PositionItem {
  id: string;
  ten_vi_tri: string;
  mo_ta: string;
  trang_thai: 'ACTIVE' | 'HIDDEN';
}

export interface TopicItem {
  id: string;
  ten_chu_de: string;
  mo_ta: string;
  vi_tri_id: string;
  trang_thai: 'ACTIVE' | 'HIDDEN';
}

export interface SampleTest {
  id: string;
  bai_toan_id: string;
  ten_test: string;
  loai: 'SAMPLE' | 'HIDDEN';
  dau_vao: string;
  dau_ra_mong_doi: string;
  giai_thich?: string;
  thu_tu: number;
  trang_thai: 'ACTIVE' | 'HIDDEN';
}

export interface ProblemItem {
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
  sample_tests?: SampleTest[];
  is_favorite?: boolean;
  sample_count?: number;
  hidden_count?: number;
  session_count?: number;
}

export interface CVConfirmed {
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

export interface DialogueTurn {
  id: string;
  phien_id: string;
  vai_tro: 'AI_INTERVIEWER' | 'CANDIDATE' | 'SYSTEM';
  loai: 'QUESTION' | 'ANSWER' | 'HINT' | 'FEEDBACK' | 'SUMMARY';
  noi_dung: string;
  thoi_gian: string;
}

export interface TestCaseDetail {
  test_case_id: string;
  ten_test: string;
  loai: 'SAMPLE' | 'HIDDEN';
  dat: boolean;
  dau_vao?: string;
  dau_ra_mong_doi?: string;
  dau_ra_thuc_te?: string;
  thong_bao_loi?: string;
  thoi_gian_ms: number;
}

export interface CodeRunResult {
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
  chi_tiet_sample: TestCaseDetail[];
  thoi_gian_chay: string;
}

export interface InterviewSession {
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
  ly_do_ket_thuc?: string;
  problem_title?: string;
  problem_difficulty?: DifficultyLevel;
  position_name?: string;
  topic_name?: string;
  report_status?: ReportStatus | null;
  report_score?: number | null;
  report_id?: string | null;
}

export interface CriterionScore {
  tieu_chi_id: string;
  ten_tieu_chi: string;
  trong_so: number;
  diem: number;
  diem_toi_da: number;
  nhan_xet: string;
}

export interface EvaluationReport {
  id: string;
  phien_id: string;
  tai_khoan_id: string;
  phien_ban_rubric_id: string;
  trang_thai: ReportStatus;
  diem_tong_ket?: number;
  xep_loai?: string;
  nhan_xet_tong_quan?: string;
  diem_manh?: string[];
  diem_yeu?: string[];
  buoc_tiep_theo?: string[];
  chi_tiet_tieu_chi?: CriterionScore[];
  ly_do_loi?: string;
  ngay_tao: string;
  ngay_hoan_thanh?: string;
}

export interface RefactorSuggestion {
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

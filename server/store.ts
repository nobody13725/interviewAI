import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { AppDatabase, DiemTieuChi, TieuChiRubric } from './types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

export function hashPassword(password: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return `${actualSalt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
}

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function computeOverallScore(
  criteria: TieuChiRubric[],
  scored: Array<{ tieu_chi_id: string; diem: number; nhan_xet: string }>
): { overall: number; breakdown: DiemTieuChi[]; grade: string } {
  let weightedSum = 0;
  const breakdown: DiemTieuChi[] = criteria.map((c) => {
    const found = scored.find((s) => s.tieu_chi_id === c.id);
    const rawScore = found ? Math.max(0, Math.min(c.diem_toi_da, Number(found.diem) || 0)) : 0;
    const ratio = c.diem_toi_da > 0 ? rawScore / c.diem_toi_da : 0;
    weightedSum += ratio * (c.trong_so / 100);
    return {
      tieu_chi_id: c.id,
      ten_tieu_chi: c.ten_tieu_chi,
      trong_so: c.trong_so,
      diem: Math.round(rawScore * 100) / 100,
      diem_toi_da: c.diem_toi_da,
      nhan_xet: found?.nhan_xet || 'Chưa có nhận xét chi tiết.',
    };
  });

  const overall = Math.round(weightedSum * 100 * 1000) / 1000;
  let grade = 'Cần cải thiện';
  if (overall >= 85) grade = 'Xuất sắc (Senior Ready)';
  else if (overall >= 70) grade = 'Đạt chuẩn (Strong Fit)';
  else if (overall >= 55) grade = 'Khá (Tiềm năng)';

  return { overall, breakdown, grade };
}

function createSeedDatabase(): AppDatabase {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000).toISOString();
  const monthKey = currentMonthKey();

  return {
    tai_khoan: [
      {
        id: 'acc_user_demo',
        email: 'user@aced.io.vn',
        mat_khau_hash: hashPassword('User@12345'),
        vai_tro: 'USER',
        trang_thai: 'ACTIVE',
        ngay_tao: daysAgo(25),
        lan_dang_nhap_cuoi: daysAgo(1),
      },
      {
        id: 'acc_user_2',
        email: 'linh.nguyen@aced.io.vn',
        mat_khau_hash: hashPassword('User@12345'),
        vai_tro: 'USER',
        trang_thai: 'ACTIVE',
        ngay_tao: daysAgo(18),
        lan_dang_nhap_cuoi: daysAgo(2),
      },
      {
        id: 'acc_admin_demo',
        email: 'admin@aced.io.vn',
        mat_khau_hash: hashPassword('Admin@12345'),
        vai_tro: 'ADMIN',
        trang_thai: 'ACTIVE',
        ngay_tao: daysAgo(60),
        lan_dang_nhap_cuoi: daysAgo(0),
      },
    ],
    ho_so: [
      {
        id: 'prof_user_demo',
        tai_khoan_id: 'acc_user_demo',
        ho_ten: 'Trần Minh Quân',
        tieu_de_nghe_nghiep: 'Backend & Distributed Systems Engineer',
        kinh_nghiem_nam: 3,
        muc_tieu_vi_tri: 'Senior Backend Engineer',
        ky_nang: ['TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'System Design'],
        gioi_thieu: 'Kỹ sư phần mềm tập trung vào API hiệu năng cao, xử lý đồng thời và tối ưu hóa truy vấn cơ sở dữ liệu.',
        ngon_ngu_mac_dinh: 'javascript',
      },
      {
        id: 'prof_user_2',
        tai_khoan_id: 'acc_user_2',
        ho_ten: 'Nguyễn Khánh Linh',
        tieu_de_nghe_nghiep: 'Frontend Product Engineer',
        kinh_nghiem_nam: 2,
        muc_tieu_vi_tri: 'Frontend Engineer',
        ky_nang: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Web Performance'],
        gioi_thieu: 'Yêu thích tối ưu trải nghiệm người dùng và kiến trúc giao diện phức tạp.',
        ngon_ngu_mac_dinh: 'typescript',
      },
      {
        id: 'prof_admin_demo',
        tai_khoan_id: 'acc_admin_demo',
        ho_ten: 'Lê Hoàng Nam',
        tieu_de_nghe_nghiep: 'Head of Engineering Assessment',
        kinh_nghiem_nam: 8,
        muc_tieu_vi_tri: 'Quản trị hệ thống phỏng vấn',
        ky_nang: ['Architecture', 'Rubric Design', 'AI Evaluation'],
        gioi_thieu: 'Quản trị ngân hàng bài toán, Prompt AI và bộ tiêu chuẩn đánh giá Rubric.',
        ngon_ngu_mac_dinh: 'typescript',
      },
    ],
    vi_tri: [
      {
        id: 'pos_backend',
        ten_vi_tri: 'Backend Engineer',
        mo_ta: 'Thiết kế API, cấu trúc dữ liệu, xử lý đồng thời, tối ưu hiệu năng và độ tin cậy dịch vụ.',
        trang_thai: 'ACTIVE',
      },
      {
        id: 'pos_frontend',
        ten_vi_tri: 'Frontend Engineer',
        mo_ta: 'Thuật toán xử lý DOM/State, bất đồng bộ, tối ưu render và cấu trúc dữ liệu phía trình duyệt.',
        trang_thai: 'ACTIVE',
      },
      {
        id: 'pos_fullstack',
        ten_vi_tri: 'Full-stack Engineer',
        mo_ta: 'Kết hợp giải thuật cốt lõi, thiết kế luồng dữ liệu đầu-cuối và tư duy kiến trúc sản phẩm.',
        trang_thai: 'ACTIVE',
      },
      {
        id: 'pos_data',
        ten_vi_tri: 'Data & AI Engineer',
        mo_ta: 'Xử lý chuỗi dữ liệu lớn, thuật toán đồ thị, tối ưu pipeline và cấu trúc thống kê.',
        trang_thai: 'ACTIVE',
      },
    ],
    chu_de: [
      {
        id: 'top_algo',
        ten_chu_de: 'Cấu trúc dữ liệu & Thuật toán',
        mo_ta: 'Mảng, Bảng băm, Hai con trỏ, Cửa sổ trượt và Quy hoạch động ứng dụng.',
        vi_tri_id: 'pos_backend',
        trang_thai: 'ACTIVE',
      },
      {
        id: 'top_sys',
        ten_chu_de: 'Thiết kế Hệ thống & Concurrency',
        mo_ta: 'Rate Limiter, LRU Cache, hàng đợi thông điệp và cân bằng tải.',
        vi_tri_id: 'pos_backend',
        trang_thai: 'ACTIVE',
      },
      {
        id: 'top_fe_async',
        ten_chu_de: 'JavaScript Nâng cao & Bất đồng bộ',
        mo_ta: 'Debounce/Throttle, Event Loop, Promise pool và quản lý bộ nhớ trình duyệt.',
        vi_tri_id: 'pos_frontend',
        trang_thai: 'ACTIVE',
      },
      {
        id: 'top_tree_graph',
        ten_chu_de: 'Cây, Đồ thị & Tìm kiếm',
        mo_ta: 'BFS, DFS, Topological Sort và cây nhị phân trong hệ thống thực tế.',
        vi_tri_id: 'pos_fullstack',
        trang_thai: 'ACTIVE',
      },
      {
        id: 'top_stream',
        ten_chu_de: 'Xử lý Luồng Dữ liệu & Chuỗi',
        mo_ta: 'Tổng hợp cửa sổ thời gian, phân tích log và tối ưu bộ nhớ O(n).',
        vi_tri_id: 'pos_data',
        trang_thai: 'ACTIVE',
      },
    ],
    bai_toan: [
      {
        id: 'prob_two_sum',
        tieu_de: 'Tìm cặp chỉ số có tổng mục tiêu (Two Sum)',
        slug: 'two-sum',
        vi_tri_id: 'pos_backend',
        chu_de_id: 'top_algo',
        do_kho: 'EASY',
        mo_ta_chi_tiet:
          'Cho một mảng số nguyên `nums` và một số nguyên `target`. Hãy trả về mảng gồm hai chỉ số `[i, j]` (với `i < j`) sao cho `nums[i] + nums[j] === target`. Giả sử mỗi đầu vào có đúng một cặp nghiệm duy nhất và bạn không được sử dụng cùng một phần tử hai lần.',
        yeu_cau_dau_vao: 'Tham số 1: nums (mảng số nguyên), Tham số 2: target (số nguyên).',
        yeu_cau_dau_ra: 'Mảng gồm 2 chỉ số [i, j] sắp xếp tăng dần.',
        rang_buoc: [
          '2 <= nums.length <= 10^4',
          '-10^9 <= nums[i], target <= 10^9',
          'Độ phức tạp mục tiêu: O(n) thời gian.',
        ],
        ham_muc_tieu: 'twoSum',
        code_mau: {
          javascript: `function twoSum(nums, target) {\n  // Viết giải pháp tối ưu O(n) của bạn tại đây\n  \n}`,
          typescript: `function twoSum(nums: number[], target: number): number[] {\n  // Viết giải pháp tối ưu O(n) của bạn tại đây\n  return [];\n}`,
          python: `def twoSum(nums, target):\n    # Viết giải pháp tối ưu O(n) của bạn tại đây\n    pass`,
        },
        goi_y_huong_dan: [
          'Thay vì dùng 2 vòng lặp lồng nhau O(n²), hãy nghĩ cách lưu những giá trị đã đi qua.',
          'Với mỗi phần tử x tại chỉ số i, giá trị cần tìm là complement = target - x.',
          'Sử dụng Hash Map để tra cứu complement trong thời gian trung bình O(1).',
        ],
        thoi_luong_phut_mac_dinh: 25,
        trang_thai: 'PUBLISHED',
        ngay_tao: daysAgo(20),
        ngay_cap_nhat: daysAgo(10),
      },
      {
        id: 'prob_merge_intervals',
        tieu_de: 'Gộp các khoảng thời gian chồng lấn (Merge Intervals)',
        slug: 'merge-intervals',
        vi_tri_id: 'pos_backend',
        chu_de_id: 'top_sys',
        do_kho: 'MEDIUM',
        mo_ta_chi_tiet:
          'Trong hệ thống đặt lịch hoặc tổng hợp log downtime máy chủ, bạn nhận được danh sách các khoảng thời gian `intervals`, trong đó `intervals[i] = [start_i, end_i]`. Hãy gộp tất cả các khoảng chồng lấn hoặc chạm biên với nhau và trả về mảng các khoảng không chồng lấn được sắp xếp tăng dần theo thời điểm bắt đầu.',
        yeu_cau_dau_vao: 'intervals: Mảng các cặp số nguyên [start, end].',
        yeu_cau_dau_ra: 'Mảng 2 chiều các khoảng đã gộp và sắp xếp tăng dần.',
        rang_buoc: [
          '1 <= intervals.length <= 10^4',
          '0 <= start_i <= end_i <= 10^5',
          'Nếu intervals rỗng trả về [].',
        ],
        ham_muc_tieu: 'mergeIntervals',
        code_mau: {
          javascript: `function mergeIntervals(intervals) {\n  // Gộp các khoảng thời gian chồng lấn\n  \n}`,
          typescript: `function mergeIntervals(intervals: number[][]): number[][] {\n  // Gộp các khoảng thời gian chồng lấn\n  return [];\n}`,
          python: `def mergeIntervals(intervals):\n    # Gộp các khoảng thời gian chồng lấn\n    pass`,
        },
        goi_y_huong_dan: [
          'Nếu mảng chưa được sắp xếp, việc kiểm tra chồng lấn trực tiếp sẽ tốn O(n²).',
          'Hãy sắp xếp các khoảng theo thời điểm bắt đầu (start) tăng dần trước.',
          'Duyệt tuần tự và so sánh start hiện tại với end của khoảng cuối cùng trong danh sách kết quả.',
        ],
        thoi_luong_phut_mac_dinh: 35,
        trang_thai: 'PUBLISHED',
        ngay_tao: daysAgo(18),
        ngay_cap_nhat: daysAgo(8),
      },
      {
        id: 'prob_valid_parentheses',
        tieu_de: 'Kiểm tra biểu thức ngoặc hợp lệ (Valid Parentheses)',
        slug: 'valid-parentheses',
        vi_tri_id: 'pos_frontend',
        chu_de_id: 'top_fe_async',
        do_kho: 'EASY',
        mo_ta_chi_tiet:
          'Khi xây dựng trình phân tích cú pháp (parser) cho code editor, bạn cần kiểm tra chuỗi `s` chỉ chứa các ký tự `(`, `)`, `{`, `}`, `[`, `]` có hợp lệ hay không. Chuỗi hợp lệ khi mọi ngoặc mở phải được đóng bởi đúng loại ngoặc tương ứng và đúng thứ tự lồng nhau.',
        yeu_cau_dau_vao: 's: Chuỗi ký tự ngoặc.',
        yeu_cau_dau_ra: 'Boolean (true nếu hợp lệ, false nếu không hợp lệ).',
        rang_buoc: [
          '1 <= s.length <= 10^4',
          'Chuỗi s chỉ chứa ()[]{}',
        ],
        ham_muc_tieu: 'isValidBrackets',
        code_mau: {
          javascript: `function isValidBrackets(s) {\n  // Kiểm tra tính hợp lệ của dấu ngoặc\n  \n}`,
          typescript: `function isValidBrackets(s: string): boolean {\n  // Kiểm tra tính hợp lệ của dấu ngoặc\n  return false;\n}`,
          python: `def isValidBrackets(s):\n    # Kiểm tra tính hợp lệ của dấu ngoặc\n    pass`,
        },
        goi_y_huong_dan: [
          'Cấu trúc dữ liệu vào sau ra trước (LIFO) phù hợp nhất cho bài toán lồng ngoặc.',
          'Khi gặp ngoặc đóng, hãy kiểm tra phần tử trên đỉnh Stack có khớp cặp không.',
          'Đừng quên kiểm tra Stack phải rỗng hoàn toàn khi kết thúc chuỗi.',
        ],
        thoi_luong_phut_mac_dinh: 20,
        trang_thai: 'PUBLISHED',
        ngay_tao: daysAgo(16),
        ngay_cap_nhat: daysAgo(5),
      },
      {
        id: 'prob_longest_unique',
        tieu_de: 'Chuỗi con dài nhất không có ký tự lặp lại',
        slug: 'longest-substring-unique',
        vi_tri_id: 'pos_fullstack',
        chu_de_id: 'top_tree_graph',
        do_kho: 'MEDIUM',
        mo_ta_chi_tiet:
          'Cho một chuỗi ký tự `s`, hãy tìm độ dài của chuỗi con liên tiếp dài nhất không chứa bất kỳ ký tự nào bị lặp lại. Bài toán thường dùng để kiểm tra tư duy tối ưu Sliding Window trong phỏng vấn Full-stack.',
        yeu_cau_dau_vao: 's: Chuỗi ký tự bất kỳ.',
        yeu_cau_dau_ra: 'Số nguyên là độ dài lớn nhất tìm được.',
        rang_buoc: [
          '0 <= s.length <= 5 * 10^4',
          's có thể rỗng, chứa chữ cái, số hoặc khoảng trắng.',
        ],
        ham_muc_tieu: 'lengthOfLongestSubstring',
        code_mau: {
          javascript: `function lengthOfLongestSubstring(s) {\n  // Áp dụng Sliding Window O(n)\n  \n}`,
          typescript: `function lengthOfLongestSubstring(s: string): number {\n  // Áp dụng Sliding Window O(n)\n  return 0;\n}`,
          python: `def lengthOfLongestSubstring(s):\n    # Áp dụng Sliding Window O(n)\n    pass`,
        },
        goi_y_huong_dan: [
          'Duy trì hai con trỏ left và right đại diện cho cửa sổ hợp lệ hiện tại.',
          'Lưu vị trí xuất hiện gần nhất của từng ký tự vào Map để nhảy con trỏ left ngay lập tức.',
        ],
        thoi_luong_phut_mac_dinh: 30,
        trang_thai: 'PUBLISHED',
        ngay_tao: daysAgo(14),
        ngay_cap_nhat: daysAgo(4),
      },
      {
        id: 'prob_max_subarray',
        tieu_de: 'Tổng dãy con liên tiếp lớn nhất (Kadane)',
        slug: 'max-subarray-sum',
        vi_tri_id: 'pos_data',
        chu_de_id: 'top_stream',
        do_kho: 'MEDIUM',
        mo_ta_chi_tiet:
          'Trong bài toán phân tích biến động lưu lượng truy cập hoặc lợi nhuận theo ngày, cho mảng số nguyên `nums` (có thể chứa cả số âm). Hãy tìm một dãy con liên tiếp (chứa ít nhất 1 phần tử) có tổng lớn nhất và trả về tổng đó.',
        yeu_cau_dau_vao: 'nums: Mảng số nguyên không rỗng.',
        yeu_cau_dau_ra: 'Số nguyên là tổng lớn nhất.',
        rang_buoc: [
          '1 <= nums.length <= 10^5',
          '-10^4 <= nums[i] <= 10^4',
          'Lưu ý trường hợp tất cả phần tử đều âm.',
        ],
        ham_muc_tieu: 'maxSubArray',
        code_mau: {
          javascript: `function maxSubArray(nums) {\n  // Cài đặt thuật toán Kadane O(n)\n  \n}`,
          typescript: `function maxSubArray(nums: number[]): number {\n  // Cài đặt thuật toán Kadane O(n)\n  return 0;\n}`,
          python: `def maxSubArray(nums):\n    # Cài đặt thuật toán Kadane O(n)\n    pass`,
        },
        goi_y_huong_dan: [
          'Tại mỗi vị trí i, tổng lớn nhất kết thúc tại i bằng max(nums[i], currentSum + nums[i]).',
          'Khởi tạo bestSum = nums[0] thay vì 0 để xử lý đúng mảng toàn số âm.',
        ],
        thoi_luong_phut_mac_dinh: 30,
        trang_thai: 'PUBLISHED',
        ngay_tao: daysAgo(12),
        ngay_cap_nhat: daysAgo(3),
      },
      {
        id: 'prob_rate_limit_hits',
        tieu_de: 'Bộ đếm cửa sổ trượt chống quá tải (Hit Counter)',
        slug: 'sliding-window-hits',
        vi_tri_id: 'pos_backend',
        chu_de_id: 'top_sys',
        do_kho: 'HARD',
        mo_ta_chi_tiet:
          'Cho mảng `timestamps` đã được sắp xếp tăng dần biểu thị thời điểm (tính bằng giây) các request gửi đến API Gateway, và một khoảng cửa sổ `windowSeconds`. Với mỗi request tại `timestamps[i]`, hãy tính số lượng request nằm trong đoạn `[timestamps[i] - windowSeconds + 1, timestamps[i]]`. Trả về mảng kết quả tương ứng từng thời điểm.',
        yeu_cau_dau_vao: 'timestamps: Mảng số nguyên tăng dần; windowSeconds: Số nguyên dương.',
        yeu_cau_dau_ra: 'Mảng số nguyên có cùng độ dài với timestamps.',
        rang_buoc: [
          '1 <= timestamps.length <= 10^5',
          '1 <= windowSeconds <= 10^6',
          'Độ phức tạp O(n) bằng hàng đợi / hai con trỏ.',
        ],
        ham_muc_tieu: 'countWindowHits',
        code_mau: {
          javascript: `function countWindowHits(timestamps, windowSeconds) {\n  // Mô phỏng cửa sổ trượt Rate Limiter\n  \n}`,
          typescript: `function countWindowHits(timestamps: number[], windowSeconds: number): number[] {\n  // Mô phỏng cửa sổ trượt Rate Limiter\n  return [];\n}`,
          python: `def countWindowHits(timestamps, windowSeconds):\n    # Mô phỏng cửa sổ trượt Rate Limiter\n    pass`,
        },
        goi_y_huong_dan: [
          'Vì timestamps đã tăng dần, con trỏ đầu cửa sổ chỉ tiến lên chứ không bao giờ lùi lại.',
          'Đẩy con trỏ left lên khi timestamps[right] - timestamps[left] >= windowSeconds.',
        ],
        thoi_luong_phut_mac_dinh: 40,
        trang_thai: 'PUBLISHED',
        ngay_tao: daysAgo(9),
        ngay_cap_nhat: daysAgo(2),
      },
    ],
    test_case: [
      // Two Sum
      {
        id: 'tc_ts_1',
        bai_toan_id: 'prob_two_sum',
        ten_test: 'Cơ bản: Mảng tăng dần',
        loai: 'SAMPLE',
        dau_vao: '[[2, 7, 11, 15], 9]',
        dau_ra_mong_doi: '[0, 1]',
        giai_thich: 'nums[0] + nums[1] = 2 + 7 = 9',
        thu_tu: 1,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_ts_2',
        bai_toan_id: 'prob_two_sum',
        ten_test: 'Phần tử không liền kề',
        loai: 'SAMPLE',
        dau_vao: '[[3, 2, 4], 6]',
        dau_ra_mong_doi: '[1, 2]',
        giai_thich: 'nums[1] + nums[2] = 2 + 4 = 6',
        thu_tu: 2,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_ts_h1',
        bai_toan_id: 'prob_two_sum',
        ten_test: 'Hidden: Giá trị trùng lặp',
        loai: 'HIDDEN',
        dau_vao: '[[3, 3], 6]',
        dau_ra_mong_doi: '[0, 1]',
        thu_tu: 3,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_ts_h2',
        bai_toan_id: 'prob_two_sum',
        ten_test: 'Hidden: Số âm và số 0',
        loai: 'HIDDEN',
        dau_vao: '[[-3, 4, 3, 90], 0]',
        dau_ra_mong_doi: '[0, 2]',
        thu_tu: 4,
        trang_thai: 'ACTIVE',
      },
      // Merge Intervals
      {
        id: 'tc_mi_1',
        bai_toan_id: 'prob_merge_intervals',
        ten_test: 'Gộp nhiều khoảng chồng lấn',
        loai: 'SAMPLE',
        dau_vao: '[[[1,3],[2,6],[8,10],[15,18]]]',
        dau_ra_mong_doi: '[[1,6],[8,10],[15,18]]',
        giai_thich: '[1,3] và [2,6] chồng lấn nên gộp thành [1,6].',
        thu_tu: 1,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_mi_2',
        bai_toan_id: 'prob_merge_intervals',
        ten_test: 'Chạm biên liên tiếp',
        loai: 'SAMPLE',
        dau_vao: '[[[1,4],[4,5]]]',
        dau_ra_mong_doi: '[[1,5]]',
        giai_thich: 'Đầu mút 4 chạm nhau được coi là chồng lấn.',
        thu_tu: 2,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_mi_h1',
        bai_toan_id: 'prob_merge_intervals',
        ten_test: 'Hidden: Đầu vào chưa sắp xếp',
        loai: 'HIDDEN',
        dau_vao: '[[[6,8],[1,9],[2,4],[4,7]]]',
        dau_ra_mong_doi: '[[1,9]]',
        thu_tu: 3,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_mi_h2',
        bai_toan_id: 'prob_merge_intervals',
        ten_test: 'Hidden: Danh sách rỗng',
        loai: 'HIDDEN',
        dau_vao: '[[]]',
        dau_ra_mong_doi: '[]',
        thu_tu: 4,
        trang_thai: 'ACTIVE',
      },
      // Valid Brackets
      {
        id: 'tc_vb_1',
        bai_toan_id: 'prob_valid_parentheses',
        ten_test: 'Cặp ngoặc lồng hợp lệ',
        loai: 'SAMPLE',
        dau_vao: '["({[]})"]',
        dau_ra_mong_doi: 'true',
        giai_thich: 'Các ngoặc đóng mở đúng thứ tự đối xứng.',
        thu_tu: 1,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_vb_2',
        bai_toan_id: 'prob_valid_parentheses',
        ten_test: 'Ngoặc đan chéo sai thứ tự',
        loai: 'SAMPLE',
        dau_vao: '["([)]"]',
        dau_ra_mong_doi: 'false',
        giai_thich: 'Ngoặc tròn đóng trước ngoặc vuông.',
        thu_tu: 2,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_vb_h1',
        bai_toan_id: 'prob_valid_parentheses',
        ten_test: 'Hidden: Chỉ có ngoặc đóng',
        loai: 'HIDDEN',
        dau_vao: '["))"]',
        dau_ra_mong_doi: 'false',
        thu_tu: 3,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_vb_h2',
        bai_toan_id: 'prob_valid_parentheses',
        ten_test: 'Hidden: Còn dư ngoặc mở',
        loai: 'HIDDEN',
        dau_vao: '["(()"]',
        dau_ra_mong_doi: 'false',
        thu_tu: 4,
        trang_thai: 'ACTIVE',
      },
      // Longest Unique Substring
      {
        id: 'tc_lu_1',
        bai_toan_id: 'prob_longest_unique',
        ten_test: 'Chuỗi hỗn hợp lặp lại',
        loai: 'SAMPLE',
        dau_vao: '["abcabcbb"]',
        dau_ra_mong_doi: '3',
        giai_thich: 'Chuỗi con dài nhất là "abc" với độ dài 3.',
        thu_tu: 1,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_lu_2',
        bai_toan_id: 'prob_longest_unique',
        ten_test: 'Toàn bộ ký tự giống nhau',
        loai: 'SAMPLE',
        dau_vao: '["bbbbb"]',
        dau_ra_mong_doi: '1',
        thu_tu: 2,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_lu_h1',
        bai_toan_id: 'prob_longest_unique',
        ten_test: 'Hidden: Chuỗi rỗng',
        loai: 'HIDDEN',
        dau_vao: '[""]',
        dau_ra_mong_doi: '0',
        thu_tu: 3,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_lu_h2',
        bai_toan_id: 'prob_longest_unique',
        ten_test: 'Hidden: Con trỏ trái không được lùi',
        loai: 'HIDDEN',
        dau_vao: '["abba"]',
        dau_ra_mong_doi: '2',
        thu_tu: 4,
        trang_thai: 'ACTIVE',
      },
      // Max Subarray
      {
        id: 'tc_ms_1',
        bai_toan_id: 'prob_max_subarray',
        ten_test: 'Mảng hỗn hợp âm dương',
        loai: 'SAMPLE',
        dau_vao: '[[-2,1,-3,4,-1,2,1,-5,4]]',
        dau_ra_mong_doi: '6',
        giai_thich: 'Dãy [4,-1,2,1] có tổng lớn nhất bằng 6.',
        thu_tu: 1,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_ms_2',
        bai_toan_id: 'prob_max_subarray',
        ten_test: 'Mảng chỉ có 1 phần tử',
        loai: 'SAMPLE',
        dau_vao: '[[5]]',
        dau_ra_mong_doi: '5',
        thu_tu: 2,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_ms_h1',
        bai_toan_id: 'prob_max_subarray',
        ten_test: 'Hidden: Mảng toàn số âm',
        loai: 'HIDDEN',
        dau_vao: '[[-8,-3,-6,-2,-5,-4]]',
        dau_ra_mong_doi: '-2',
        thu_tu: 3,
        trang_thai: 'ACTIVE',
      },
      // Rate limit hits
      {
        id: 'tc_rl_1',
        bai_toan_id: 'prob_rate_limit_hits',
        ten_test: 'Cửa sổ 5 giây tiêu chuẩn',
        loai: 'SAMPLE',
        dau_vao: '[[1, 2, 4, 6, 10], 5]',
        dau_ra_mong_doi: '[1, 2, 3, 3, 2]',
        giai_thich: 'Tại t=6 cửa sổ [2..6] có {2,4,6} = 3 hits.',
        thu_tu: 1,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_rl_2',
        bai_toan_id: 'prob_rate_limit_hits',
        ten_test: 'Nhiều request cùng giây',
        loai: 'SAMPLE',
        dau_vao: '[[10, 10, 10, 15], 5]',
        dau_ra_mong_doi: '[1, 2, 3, 1]',
        thu_tu: 2,
        trang_thai: 'ACTIVE',
      },
      {
        id: 'tc_rl_h1',
        bai_toan_id: 'prob_rate_limit_hits',
        ten_test: 'Hidden: Cửa sổ 1 giây',
        loai: 'HIDDEN',
        dau_vao: '[[1, 1, 2, 3], 1]',
        dau_ra_mong_doi: '[1, 2, 1, 1]',
        thu_tu: 3,
        trang_thai: 'ACTIVE',
      },
    ],
    yeu_thich: [
      {
        id: 'fav_1',
        tai_khoan_id: 'acc_user_demo',
        bai_toan_id: 'prob_merge_intervals',
        ngay_tao: daysAgo(5),
      },
      {
        id: 'fav_2',
        tai_khoan_id: 'acc_user_demo',
        bai_toan_id: 'prob_rate_limit_hits',
        ngay_tao: daysAgo(2),
      },
    ],
    goi_dich_vu: [
      {
        id: 'tier_free',
        ten_goi: 'Khởi đầu (Starter)',
        doi_tuong: 'Dành cho sinh viên & người mới chuẩn bị phỏng vấn',
        mo_ta: 'Làm quen quy trình phỏng vấn AI, sandbox chạy test mẫu và báo cáo Rubric chuẩn hóa.',
        gia_hien_thi: '0 đ',
        chu_ky: 'Mỗi tháng',
        so_luot_phong_van_thang: 5,
        gioi_han_goi_y_phien: 2,
        gioi_han_cv_mb: 5,
        quyen_loi: [
          '5 phiên phỏng vấn AI mỗi tháng',
          'Tối đa 2 lượt gợi ý định hướng mỗi phiên',
          'Chạy thử Sandbox JavaScript / TypeScript / Python',
          'Báo cáo điểm Rubric chi tiết theo từng tiêu chí',
        ],
        noi_bat: false,
        trang_thai: 'PUBLISHED',
      },
      {
        id: 'tier_pro',
        ten_goi: 'Chuyên sâu (Pro)',
        doi_tuong: 'Dành cho kỹ sư luyện thi vị trí Middle / Senior',
        mo_ta: 'Tăng cường tần suất luyện tập, phân tích CV cá nhân hóa và đề xuất tối ưu mã nguồn.',
        gia_hien_thi: '299.000 đ',
        chu_ky: 'Mỗi tháng',
        so_luot_phong_van_thang: 30,
        gioi_han_goi_y_phien: 5,
        gioi_han_cv_mb: 15,
        quyen_loi: [
          '30 phiên phỏng vấn AI mỗi tháng',
          'Tối đa 5 lượt gợi ý định hướng mỗi phiên',
          'Tải CV và đặt câu hỏi bám sát dự án thực tế',
          'Đề xuất Refactoring & so sánh độ phức tạp Big-O',
          'Biểu đồ xu hướng năng lực qua các phiên',
        ],
        noi_bat: true,
        trang_thai: 'PUBLISHED',
      },
      {
        id: 'tier_team',
        ten_goi: 'Đào tạo & Nhóm (Campus)',
        doi_tuong: 'Dành cho nhóm học tập, câu lạc bộ kỹ thuật và doanh nghiệp',
        mo_ta: 'Hạn mức mở rộng phục vụ huấn luyện tập trung và chuẩn hóa Rubric đánh giá.',
        gia_hien_thi: '1.290.000 đ',
        chu_ky: 'Mỗi tháng',
        so_luot_phong_van_thang: 120,
        gioi_han_goi_y_phien: 8,
        gioi_han_cv_mb: 25,
        quyen_loi: [
          '120 phiên phỏng vấn AI mỗi tháng',
          '8 lượt gợi ý định hướng mỗi phiên',
          'Toàn bộ ngân hàng đề thuật toán & thiết kế hệ thống',
          'Lưu trữ lịch sử hội thoại và bảng đối chiếu Rubric dài hạn',
        ],
        noi_bat: false,
        trang_thai: 'PUBLISHED',
      },
    ],
    quyen_su_dung_goi: [
      {
        id: 'ent_demo_1',
        tai_khoan_id: 'acc_user_demo',
        goi_dich_vu_id: 'tier_pro',
        luot_da_dung_thang: 3,
        thang_chu_ky: monthKey,
      },
      {
        id: 'ent_demo_2',
        tai_khoan_id: 'acc_user_2',
        goi_dich_vu_id: 'tier_free',
        luot_da_dung_thang: 1,
        thang_chu_ky: monthKey,
      },
    ],
    prompt_template: [
      {
        id: 'pmt_interviewer',
        ma_prompt: 'AI_INTERVIEWER_CORE',
        ten_prompt: 'Giám khảo phỏng vấn AI đối thoại',
        loai_tac_vu: 'INTERVIEWER',
        phien_ban_hien_hanh_id: 'pmtv_int_1',
      },
      {
        id: 'pmt_hint',
        ma_prompt: 'AI_HINT_DIRECTIONAL',
        ten_prompt: 'Gợi ý định hướng (không lộ đáp án)',
        loai_tac_vu: 'HINT',
        phien_ban_hien_hanh_id: 'pmtv_hint_1',
      },
      {
        id: 'pmt_eval',
        ma_prompt: 'AI_RUBRIC_EVALUATOR',
        ten_prompt: 'Chấm điểm báo cáo theo Rubric (FR33)',
        loai_tac_vu: 'EVALUATION',
        phien_ban_hien_hanh_id: 'pmtv_eval_1',
      },
      {
        id: 'pmt_refactor',
        ma_prompt: 'AI_CODE_REFACTOR',
        ten_prompt: 'Đề xuất tối ưu mã nguồn & Big-O',
        loai_tac_vu: 'REFACTOR',
        phien_ban_hien_hanh_id: 'pmtv_ref_1',
      },
      {
        id: 'pmt_cv',
        ma_prompt: 'AI_CV_ANALYZER',
        ten_prompt: 'Trích xuất & chuẩn hóa hồ sơ CV',
        loai_tac_vu: 'CV_PARSE',
        phien_ban_hien_hanh_id: 'pmtv_cv_1',
      },
    ],
    phien_ban_prompt: [
      {
        id: 'pmtv_int_1',
        prompt_id: 'pmt_interviewer',
        so_phien_ban: 1,
        noi_dung_system:
          'Bạn là kỹ sư trưởng phỏng vấn kỹ thuật bằng tiếng Việt. Đặt câu hỏi sắc bén về thuật toán, edge case, độ phức tạp thời gian/không gian. Tuyệt đối không đưa ra lời giải hoàn chỉnh.',
        noi_dung_user_template: 'Đánh giá lập luận ứng viên dựa trên bài toán {{tieu_de}} và code hiện tại.',
        mo_ta_thay_doi: 'Phiên bản chuẩn hóa ban đầu cho mô phỏng phỏng vấn 2 chiều.',
        trang_thai: 'PUBLISHED',
        ngay_tao: daysAgo(30),
      },
      {
        id: 'pmtv_hint_1',
        prompt_id: 'pmt_hint',
        so_phien_ban: 1,
        noi_dung_system:
          'Bạn là mentor kỹ thuật. Chỉ cung cấp gợi ý định hướng cấu trúc dữ liệu hoặc trường hợp biên. Nghiêm cấm viết code lời giải.',
        noi_dung_user_template: 'Sinh gợi ý mức {{hint_index}}/{{max_hints}} cho mã nguồn hiện tại.',
        mo_ta_thay_doi: 'Khóa an toàn chống lộ lời giải.',
        trang_thai: 'PUBLISHED',
        ngay_tao: daysAgo(30),
      },
      {
        id: 'pmtv_eval_1',
        prompt_id: 'pmt_eval',
        so_phien_ban: 1,
        noi_dung_system:
          'Bạn là hội đồng chấm điểm kỹ thuật. Chấm điểm công bằng từng tiêu chí trong Rubric dựa trên kết quả chạy test (Sample + Hidden), chất lượng code và lịch sử hội thoại.',
        noi_dung_user_template: 'Chấm điểm theo {{rubric_criteria}} và giải thích ưu nhược điểm.',
        mo_ta_thay_doi: 'Chuẩn FR33 tính điểm tổng kết 0-100.',
        trang_thai: 'PUBLISHED',
        ngay_tao: daysAgo(30),
      },
      {
        id: 'pmtv_ref_1',
        prompt_id: 'pmt_refactor',
        so_phien_ban: 1,
        noi_dung_system:
          'Bạn là chuyên gia Code Review. Đề xuất mã nguồn tối ưu hơn mà không làm sai lệch chữ ký hàm.',
        noi_dung_user_template: 'So sánh độ phức tạp trước/sau và giải thích các cải tiến.',
        mo_ta_thay_doi: 'Phiên bản đầu tiên cho module Refactoring.',
        trang_thai: 'PUBLISHED',
        ngay_tao: daysAgo(30),
      },
      {
        id: 'pmtv_cv_1',
        prompt_id: 'pmt_cv',
        so_phien_ban: 1,
        noi_dung_system:
          'Trích xuất trung thực thông tin vị trí, số năm kinh nghiệm, kỹ năng và dự án từ CV tải lên.',
        noi_dung_user_template: 'Chuẩn hóa sang JSON tiếng Việt để người dùng xác nhận.',
        mo_ta_thay_doi: 'Phiên bản chuẩn hóa phân tích CV.',
        trang_thai: 'PUBLISHED',
        ngay_tao: daysAgo(30),
      },
    ],
    rubric: [
      {
        id: 'rub_main',
        ten_rubric: 'Rubric Chuẩn Đánh Giá Kỹ Sư Phần Mềm (v1)',
        mo_ta: 'Bộ tiêu chuẩn 4 trụ cột áp dụng cho phỏng vấn thuật toán và lập trình giải quyết vấn đề.',
        phien_ban_hien_hanh_id: 'rubv_1',
      },
    ],
    phien_ban_rubric: [
      {
        id: 'rubv_1',
        rubric_id: 'rub_main',
        so_phien_ban: 1,
        tieu_chi: [
          {
            id: 'crit_correctness',
            ten_tieu_chi: 'Độ chính xác & Bao phủ Edge Cases',
            mo_ta: 'Giải pháp xử lý đúng các test tiêu chuẩn, dữ liệu biên, mảng rỗng hoặc giá trị âm.',
            trong_so: 35,
            diem_toi_da: 10,
          },
          {
            id: 'crit_complexity',
            ten_tieu_chi: 'Hiệu năng & Độ phức tạp Thuật toán',
            mo_ta: 'Tối ưu hóa Big-O thời gian và bộ nhớ phù hợp với ràng buộc đầu vào.',
            trong_so: 25,
            diem_toi_da: 10,
          },
          {
            id: 'crit_code_quality',
            ten_tieu_chi: 'Chất lượng Mã nguồn & Cấu trúc',
            mo_ta: 'Đặt tên biến rõ ràng, cấu trúc hàm sạch sẽ, dễ bảo trì và ít nhánh dư thừa.',
            trong_so: 20,
            diem_toi_da: 10,
          },
          {
            id: 'crit_comm',
            ten_tieu_chi: 'Giao tiếp Kỹ thuật & Tư duy Phản biện',
            mo_ta: 'Trình bày rõ hướng tiếp cận trước khi code và giải thích mạch lạc các đánh đổi.',
            trong_so: 20,
            diem_toi_da: 10,
          },
        ],
        trang_thai: 'PUBLISHED',
        ngay_tao: daysAgo(30),
      },
    ],
    tep_cv: [
      {
        id: 'cvf_demo_1',
        tai_khoan_id: 'acc_user_demo',
        ten_tep: 'TranMinhQuan_Backend_CV.txt',
        dinh_dang: 'TXT',
        kich_thuoc_bytes: 2450,
        noi_dung_tho:
          'Trần Minh Quân - Backend Engineer (3 năm kinh nghiệm). Kỹ năng: TypeScript, Node.js, PostgreSQL, Redis, Kafka. Dự án: Hệ thống xử lý thanh toán realtime 5000 RPS; Dịch vụ Rate Limiter phân tán bằng Redis Lua.',
        trang_thai: 'CONFIRMED',
        ngay_tai: daysAgo(10),
      },
    ],
    cv_xac_nhan: [
      {
        id: 'cvc_demo_1',
        tep_cv_id: 'cvf_demo_1',
        tai_khoan_id: 'acc_user_demo',
        vi_tri_ung_tuyen: 'Backend Engineer',
        so_nam_kinh_nghiem: 3,
        ky_nang_chinh: ['TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'Kafka'],
        du_an_noi_bat: [
          'Hệ thống xử lý giao dịch thời gian thực 5.000 RPS',
          'Dịch vụ Rate Limiter phân tán bằng Redis Lua script',
        ],
        tom_tat_nang_luc: 'Kỹ sư Backend 3 năm kinh nghiệm tập trung vào hệ thống phân tán, caching và tối ưu truy vấn.',
        da_xac_nhan: true,
        ngay_xac_nhan: daysAgo(10),
      },
    ],
    phien_phong_van: [
      {
        id: 'sess_seed_1',
        tai_khoan_id: 'acc_user_demo',
        bai_toan_id: 'prob_two_sum',
        vi_tri_id: 'pos_backend',
        chu_de_id: 'top_algo',
        cv_xac_nhan_id: 'cvc_demo_1',
        phien_ban_rubric_id: 'rubv_1',
        phien_ban_prompt_id: 'pmtv_int_1',
        ngon_ngu: 'javascript',
        thoi_luong_phut: 25,
        gioi_han_goi_y_snapshot: 5,
        goi_y_da_dung: 0,
        da_tru_luot: true,
        trang_thai: 'COMPLETED',
        ma_nguon_hien_tai: `function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}`,
        ma_nguon_da_nop: `function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}`,
        ngay_tao: daysAgo(9),
        bat_dau_at: daysAgo(9),
        het_han_at: daysAgo(9),
        ket_thuc_at: daysAgo(9),
        ly_do_ket_thuc: 'SUBMIT',
      },
      {
        id: 'sess_seed_2',
        tai_khoan_id: 'acc_user_demo',
        bai_toan_id: 'prob_merge_intervals',
        vi_tri_id: 'pos_backend',
        chu_de_id: 'top_sys',
        cv_xac_nhan_id: 'cvc_demo_1',
        phien_ban_rubric_id: 'rubv_1',
        phien_ban_prompt_id: 'pmtv_int_1',
        ngon_ngu: 'javascript',
        thoi_luong_phut: 35,
        gioi_han_goi_y_snapshot: 5,
        goi_y_da_dung: 1,
        da_tru_luot: true,
        trang_thai: 'COMPLETED',
        ma_nguon_hien_tai: `function mergeIntervals(intervals) {\n  if (!intervals.length) return [];\n  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);\n  const res = [sorted[0]];\n  for (let i = 1; i < sorted.length; i++) {\n    const last = res[res.length - 1];\n    if (sorted[i][0] <= last[1]) {\n      last[1] = Math.max(last[1], sorted[i][1]);\n    } else {\n      res.push(sorted[i]);\n    }\n  }\n  return res;\n}`,
        ma_nguon_da_nop: `function mergeIntervals(intervals) {\n  if (!intervals.length) return [];\n  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);\n  const res = [sorted[0]];\n  for (let i = 1; i < sorted.length; i++) {\n    const last = res[res.length - 1];\n    if (sorted[i][0] <= last[1]) {\n      last[1] = Math.max(last[1], sorted[i][1]);\n    } else {\n      res.push(sorted[i]);\n    }\n  }\n  return res;\n}`,
        ngay_tao: daysAgo(4),
        bat_dau_at: daysAgo(4),
        het_han_at: daysAgo(4),
        ket_thuc_at: daysAgo(4),
        ly_do_ket_thuc: 'SUBMIT',
      },
    ],
    ban_ghi_hoi_thoai: [
      {
        id: 'dlg_1',
        phien_id: 'sess_seed_1',
        vai_tro: 'AI_INTERVIEWER',
        loai: 'QUESTION',
        noi_dung:
          'Chào Quân, rất vui được phỏng vấn bạn cho vị trí Backend Engineer. Với bài toán Two Sum, bạn dự định tiếp cận với cấu trúc dữ liệu nào để tránh độ phức tạp O(n²)?',
        thoi_gian: daysAgo(9),
      },
      {
        id: 'dlg_2',
        phien_id: 'sess_seed_1',
        vai_tro: 'CANDIDATE',
        loai: 'ANSWER',
        noi_dung:
          'Em sẽ sử dụng Hash Map (Map trong JS) để lưu giá trị đã duyệt làm khóa và chỉ số làm giá trị. Tại mỗi phần tử, em kiểm tra phần bù target - nums[i] đã có trong Map chưa, giúp đạt O(n) thời gian và O(n) bộ nhớ.',
        thoi_gian: daysAgo(9),
      },
      {
        id: 'dlg_3',
        phien_id: 'sess_seed_1',
        vai_tro: 'AI_INTERVIEWER',
        loai: 'FEEDBACK',
        noi_dung:
          'Hướng tiếp cận chính xác. Hãy cài đặt giải pháp và lưu ý trường hợp hai phần tử có giá trị bằng nhau như [3, 3] với target = 6.',
        thoi_gian: daysAgo(9),
      },
      {
        id: 'dlg_4',
        phien_id: 'sess_seed_2',
        vai_tro: 'AI_INTERVIEWER',
        loai: 'QUESTION',
        noi_dung:
          'Chào Quân, trong bài Merge Intervals gắn với hệ thống tổng hợp log downtime, bước tiên quyết trước khi duyệt gộp các khoảng thời gian chưa sắp xếp là gì?',
        thoi_gian: daysAgo(4),
      },
      {
        id: 'dlg_5',
        phien_id: 'sess_seed_2',
        vai_tro: 'CANDIDATE',
        loai: 'ANSWER',
        noi_dung:
          'Em sẽ sao chép và sắp xếp mảng theo thời điểm bắt đầu tăng dần O(n log n), sau đó duyệt một lượt để gộp các khoảng giao hoặc chạm biên.',
        thoi_gian: daysAgo(4),
      },
      {
        id: 'dlg_6',
        phien_id: 'sess_seed_2',
        vai_tro: 'AI_INTERVIEWER',
        loai: 'HINT',
        noi_dung:
          'Lưu ý không làm biến đổi trực tiếp mảng đầu vào của caller nếu không cần thiết — việc dùng bản sao [start, end] sẽ an toàn hơn khi giữ bất biến dữ liệu.',
        thoi_gian: daysAgo(4),
      },
    ],
    ket_qua_chay_code: [
      {
        id: 'run_seed_1',
        phien_id: 'sess_seed_1',
        loai_chay: 'SUBMIT',
        ngon_ngu: 'javascript',
        so_test_dat: 4,
        tong_test: 4,
        so_hidden_dat: 2,
        tong_hidden: 2,
        stdout: '',
        chi_tiet_sample: [
          {
            test_case_id: 'tc_ts_1',
            ten_test: 'Cơ bản: Mảng tăng dần',
            loai: 'SAMPLE',
            dat: true,
            dau_vao: '[[2, 7, 11, 15], 9]',
            dau_ra_mong_doi: '[0, 1]',
            dau_ra_thuc_te: '[0,1]',
            thoi_gian_ms: 2,
          },
          {
            test_case_id: 'tc_ts_2',
            ten_test: 'Phần tử không liền kề',
            loai: 'SAMPLE',
            dat: true,
            dau_vao: '[[3, 2, 4], 6]',
            dau_ra_mong_doi: '[1, 2]',
            dau_ra_thuc_te: '[1,2]',
            thoi_gian_ms: 1,
          },
        ],
        thoi_gian_chay: daysAgo(9),
      },
      {
        id: 'run_seed_2',
        phien_id: 'sess_seed_2',
        loai_chay: 'SUBMIT',
        ngon_ngu: 'javascript',
        so_test_dat: 4,
        tong_test: 4,
        so_hidden_dat: 2,
        tong_hidden: 2,
        stdout: '',
        chi_tiet_sample: [
          {
            test_case_id: 'tc_mi_1',
            ten_test: 'Gộp nhiều khoảng chồng lấn',
            loai: 'SAMPLE',
            dat: true,
            dau_vao: '[[[1,3],[2,6],[8,10],[15,18]]]',
            dau_ra_mong_doi: '[[1,6],[8,10],[15,18]]',
            dau_ra_thuc_te: '[[1,6],[8,10],[15,18]]',
            thoi_gian_ms: 2,
          },
          {
            test_case_id: 'tc_mi_2',
            ten_test: 'Chạm biên liên tiếp',
            loai: 'SAMPLE',
            dat: true,
            dau_vao: '[[[1,4],[4,5]]]',
            dau_ra_mong_doi: '[[1,5]]',
            dau_ra_thuc_te: '[[1,5]]',
            thoi_gian_ms: 1,
          },
        ],
        thoi_gian_chay: daysAgo(4),
      },
    ],
    bao_cao_danh_gia: [
      {
        id: 'rep_seed_1',
        phien_id: 'sess_seed_1',
        tai_khoan_id: 'acc_user_demo',
        phien_ban_rubric_id: 'rubv_1',
        trang_thai: 'READY',
        diem_tong_ket: 84.5,
        xep_loai: 'Đạt chuẩn (Strong Fit)',
        nhan_xet_tong_quan:
          'Ứng viên nắm chắc cấu trúc Hash Map, xử lý đúng 4/4 test case (gồm cả test trùng lặp và số âm) và giao tiếp rõ ràng về đánh đổi bộ nhớ O(n).',
        diem_manh: [
          'Chọn ngay cấu trúc Map để đạt O(n) thay vì duyệt lồng nhau.',
          'Kiểm tra phần bù trước khi thêm phần tử hiện tại vào Map, tránh trùng chỉ số.',
        ],
        diem_yeu: [
          'Chưa đề cập đến trường hợp mảng không có nghiệm hoặc ràng buộc tràn số nguyên lớn.',
        ],
        buoc_tiep_theo: [
          'Luyện tập biến thể Three Sum và Two Pointer trên mảng đã sắp xếp.',
          'Bổ sung comment ngắn cho điều kiện biên đầu hàm.',
        ],
        chi_tiet_tieu_chi: [
          {
            tieu_chi_id: 'crit_correctness',
            ten_tieu_chi: 'Độ chính xác & Bao phủ Edge Cases',
            trong_so: 35,
            diem: 9,
            diem_toi_da: 10,
            nhan_xet: 'Đạt 4/4 test case bao gồm trường hợp số âm và phần tử trùng.',
          },
          {
            tieu_chi_id: 'crit_complexity',
            ten_tieu_chi: 'Hiệu năng & Độ phức tạp Thuật toán',
            trong_so: 25,
            diem: 8.5,
            diem_toi_da: 10,
            nhan_xet: 'Đạt chuẩn O(n) thời gian và O(n) không gian.',
          },
          {
            tieu_chi_id: 'crit_code_quality',
            ten_tieu_chi: 'Chất lượng Mã nguồn & Cấu trúc',
            trong_so: 20,
            diem: 8,
            diem_toi_da: 10,
            nhan_xet: 'Code ngắn gọn, đặt tên biến need/seen dễ hiểu.',
          },
          {
            tieu_chi_id: 'crit_comm',
            ten_tieu_chi: 'Giao tiếp Kỹ thuật & Tư duy Phản biện',
            trong_so: 20,
            diem: 8,
            diem_toi_da: 10,
            nhan_xet: 'Trình bày mạch lạc chiến lược trước khi code.',
          },
        ],
        ngay_tao: daysAgo(9),
        ngay_hoan_thanh: daysAgo(9),
      },
      {
        id: 'rep_seed_2',
        phien_id: 'sess_seed_2',
        tai_khoan_id: 'acc_user_demo',
        phien_ban_rubric_id: 'rubv_1',
        trang_thai: 'READY',
        diem_tong_ket: 90.0,
        xep_loai: 'Xuất sắc (Senior Ready)',
        nhan_xet_tong_quan:
          'Giải pháp chính xác và sạch sẽ cho bài toán Merge Intervals. Ứng viên biết sao chép mảng trước khi sort và xử lý tốt trường hợp mảng rỗng.',
        diem_manh: [
          'Không mutate mảng gốc intervals bên ngoài khi sắp xếp.',
          'Xử lý chuẩn xác trường hợp chạm biên start === lastEnd.',
        ],
        diem_yeu: [
          'Vẫn mutate phần tử con sorted[i] khi cập nhật last[1]; nên clone từng tuple [start, end] để an toàn tuyệt đối.',
        ],
        buoc_tiep_theo: [
          'Thử sức với bài Insert Interval và Meeting Rooms II (Sweep Line).',
        ],
        chi_tiet_tieu_chi: [
          {
            tieu_chi_id: 'crit_correctness',
            ten_tieu_chi: 'Độ chính xác & Bao phủ Edge Cases',
            trong_so: 35,
            diem: 9.5,
            diem_toi_da: 10,
            nhan_xet: 'Đạt 4/4 test case gồm dữ liệu chưa sort và mảng rỗng.',
          },
          {
            tieu_chi_id: 'crit_complexity',
            ten_tieu_chi: 'Hiệu năng & Độ phức tạp Thuật toán',
            trong_so: 25,
            diem: 9,
            diem_toi_da: 10,
            nhan_xet: 'Đạt tối ưu lý thuyết O(n log n).',
          },
          {
            tieu_chi_id: 'crit_code_quality',
            ten_tieu_chi: 'Chất lượng Mã nguồn & Cấu trúc',
            trong_so: 20,
            diem: 8.5,
            diem_toi_da: 10,
            nhan_xet: 'Nên clone tuple [s, e] trước khi đẩy vào mảng kết quả.',
          },
          {
            tieu_chi_id: 'crit_comm',
            ten_tieu_chi: 'Giao tiếp Kỹ thuật & Tư duy Phản biện',
            trong_so: 20,
            diem: 8.75,
            diem_toi_da: 10,
            nhan_xet: 'Giải thích rõ lý do cần sắp xếp trước và cách xử lý edge case.',
          },
        ],
        ngay_tao: daysAgo(4),
        ngay_hoan_thanh: daysAgo(4),
      },
    ],
    de_xuat_toi_uu: [
      {
        id: 'ref_seed_2',
        bao_cao_id: 'rep_seed_2',
        ngon_ngu: 'javascript',
        ma_nguon_goc: `function mergeIntervals(intervals) {\n  if (!intervals.length) return [];\n  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);\n  const res = [sorted[0]];\n  for (let i = 1; i < sorted.length; i++) {\n    const last = res[res.length - 1];\n    if (sorted[i][0] <= last[1]) {\n      last[1] = Math.max(last[1], sorted[i][1]);\n    } else {\n      res.push(sorted[i]);\n    }\n  }\n  return res;\n}`,
        ma_nguon_toi_uu: `function mergeIntervals(intervals) {\n  if (!Array.isArray(intervals) || intervals.length === 0) return [];\n  const sorted = intervals\n    .map(([start, end]) => [start, end])\n    .sort((a, b) => a[0] - b[0]);\n\n  const merged = [sorted[0]];\n  for (let i = 1; i < sorted.length; i++) {\n    const [currStart, currEnd] = sorted[i];\n    const prev = merged[merged.length - 1];\n    if (currStart <= prev[1]) {\n      prev[1] = Math.max(prev[1], currEnd);\n    } else {\n      merged.push([currStart, currEnd]);\n    }\n  }\n  return merged;\n}`,
        giai_thich_cai_tien: [
          'Tạo bản sao sâu cho từng cặp [start, end] nhằm đảm bảo hàm hoàn toàn thuần khiết (pure function), không làm biến đổi mảng gốc của hệ thống gọi.',
          'Sử dụng destructuring [currStart, currEnd] giúp mã nguồn tường minh và dễ đọc hơn khi review.',
          'Kiểm tra Array.isArray(intervals) ở đầu hàm để tăng độ bền vững với đầu vào bất thường.',
        ],
        do_phuc_tap_truoc: 'O(n log n) thời gian, O(n) bộ nhớ (có side-effect lên tuple con)',
        do_phuc_tap_sau: 'O(n log n) thời gian, O(n) bộ nhớ (an toàn bất biến dữ liệu)',
        ngay_tao: daysAgo(4),
      },
    ],
    ban_nhap_ai: [],
    phan_hoi: [
      {
        id: 'fb_seed_1',
        tai_khoan_id: 'acc_user_demo',
        phien_id: 'sess_seed_2',
        bai_toan_id: 'prob_merge_intervals',
        loai_phan_hoi: 'CONTENT_ISSUE',
        tieu_de: 'Đề xuất bổ sung ví dụ khoảng thời gian có độ dài bằng 0',
        noi_dung:
          'Trong mô tả bài Merge Intervals, nên thêm 1 ví dụ trường hợp [4, 4] nằm giữa [1, 5] để ứng viên hình dung rõ hơn.',
        trang_thai: 'IN_REVIEW',
        ghi_chu_xu_ly: 'Đội ngũ biên tập đang xem xét bổ sung vào mục Giải thích Test Sample.',
        ngay_tao: daysAgo(3),
        ngay_cap_nhat: daysAgo(2),
      },
    ],
    auth_sessions: [],
  };
}

let cachedDb: AppDatabase | null = null;

export function loadDb(): AppDatabase {
  if (cachedDb) return cachedDb;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    cachedDb = createSeedDatabase();
    saveDb(cachedDb);
    return cachedDb;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    cachedDb = JSON.parse(raw) as AppDatabase;
    return cachedDb;
  } catch {
    cachedDb = createSeedDatabase();
    saveDb(cachedDb);
    return cachedDb;
  }
}

export function saveDb(db: AppDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
  cachedDb = db;
}

export function updateDb<T>(mutator: (db: AppDatabase) => T): T {
  const db = loadDb();
  const result = mutator(db);
  saveDb(db);
  return result;
}

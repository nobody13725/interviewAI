import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer } from 'vite';
import {
  analyzeCvWithAI,
  evaluateInterviewWithRubric,
  extractGeminiErrorMessage,
  generateDirectionalHint,
  generateInterviewOpening,
  generateInterviewReply,
  generateProblemDraftWithAI,
  generateRefactoringSuggestion,
} from './server/gemini.ts';
import { executeSandboxTests } from './server/sandbox.ts';
import {
  computeOverallScore,
  currentMonthKey,
  generateId,
  hashPassword,
  loadDb,
  updateDb,
  verifyPassword,
} from './server/store.ts';
import type {
  BaiToan,
  BanGhiHoiThoai,
  BaoCaoDanhGia,
  CodeLanguage,
  DifficultyLevel,
  FeedbackStatus,
  PhienPhongVan,
  PublishStatus,
  TaiKhoan,
  TestCase,
  TieuChiRubric,
} from './server/types.ts';

interface AuthedRequest extends Request {
  authUser?: TaiKhoan;
  authToken?: string;
}

function getRemainingQuota(accountId: string) {
  const db = loadDb();
  const monthKey = currentMonthKey();
  let ent = db.quyen_su_dung_goi.find((q) => q.tai_khoan_id === accountId);
  if (!ent) {
    const freeTier = db.goi_dich_vu.find((g) => g.id === 'tier_free') || db.goi_dich_vu[0];
    ent = updateDb((draft) => {
      const created = {
        id: generateId('ent'),
        tai_khoan_id: accountId,
        goi_dich_vu_id: freeTier?.id || 'tier_free',
        luot_da_dung_thang: 0,
        thang_chu_ky: monthKey,
      };
      draft.quyen_su_dung_goi.push(created);
      return created;
    });
  } else if (ent.thang_chu_ky !== monthKey) {
    ent = updateDb((draft) => {
      const target = draft.quyen_su_dung_goi.find((q) => q.id === ent!.id);
      if (target) {
        target.luot_da_dung_thang = 0;
        target.thang_chu_ky = monthKey;
        return target;
      }
      return ent!;
    });
  }

  const tier =
    db.goi_dich_vu.find((g) => g.id === ent!.goi_dich_vu_id) ||
    db.goi_dich_vu.find((g) => g.id === 'tier_free') ||
    db.goi_dich_vu[0];

  const used = ent.luot_da_dung_thang;
  const limit = tier ? tier.so_luot_phong_van_thang : 5;
  return {
    entitlement: ent,
    tier,
    luot_da_dung: used,
    luot_toi_da: limit,
    luot_con_lai: Math.max(0, limit - used),
  };
}

function getPromptSystem(loai: 'INTERVIEWER' | 'HINT' | 'EVALUATION' | 'REFACTOR' | 'CV_PARSE'): string | undefined {
  const db = loadDb();
  const tpl = db.prompt_template.find((p) => p.loai_tac_vu === loai);
  if (!tpl) return undefined;
  const ver = db.phien_ban_prompt.find((v) => v.id === tpl.phien_ban_hien_hanh_id);
  return ver?.noi_dung_system;
}

function sanitizeProblemForUser(problem: BaiToan, testCases: TestCase[]) {
  const sampleTests = testCases
    .filter((tc) => tc.bai_toan_id === problem.id && tc.trang_thai === 'ACTIVE' && tc.loai === 'SAMPLE')
    .sort((a, b) => a.thu_tu - b.thu_tu);
  return {
    ...problem,
    sample_tests: sampleTests,
  };
}

function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
    return;
  }

  const db = loadDb();
  const session = db.auth_sessions.find((s) => s.token === token);
  if (!session || new Date(session.het_han).getTime() < Date.now()) {
    res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    return;
  }

  const user = db.tai_khoan.find((u) => u.id === session.tai_khoan_id);
  if (!user) {
    res.status(401).json({ error: 'Tài khoản không tồn tại.' });
    return;
  }
  if (user.trang_thai === 'LOCKED') {
    res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa bởi quản trị viên.' });
    return;
  }

  req.authUser = user;
  req.authToken = token;
  next();
}

function adminOnly(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.authUser || req.authUser.vai_tro !== 'ADMIN') {
    res.status(403).json({ error: 'Chức năng này chỉ dành cho Quản trị viên (ADMIN).' });
    return;
  }
  next();
}

function checkSessionTimeoutIfNeeded(sessionId: string): PhienPhongVan | undefined {
  const db = loadDb();
  const session = db.phien_phong_van.find((s) => s.id === sessionId);
  if (!session) return undefined;
  if (session.trang_thai === 'ACTIVE' && session.het_han_at) {
    if (Date.now() >= new Date(session.het_han_at).getTime()) {
      return updateDb((draft) => {
        const target = draft.phien_phong_van.find((s) => s.id === sessionId);
        if (target && target.trang_thai === 'ACTIVE') {
          target.trang_thai = 'COMPLETED';
          target.ket_thuc_at = new Date().toISOString();
          target.ly_do_ket_thuc = 'TIMEOUT';
          target.ma_nguon_da_nop = target.ma_nguon_hien_tai;
        }
        return target;
      });
    }
  }
  return session;
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Ensure DB initialized
  loadDb();

  // ==================== PUBLIC ENDPOINTS ====================
  app.get('/api/public/overview', (_req, res) => {
    const db = loadDb();
    const tiers = db.goi_dich_vu.filter((g) => g.trang_thai === 'PUBLISHED');
    const positions = db.vi_tri.filter((v) => v.trang_thai === 'ACTIVE');
    const topics = db.chu_de.filter((c) => c.trang_thai === 'ACTIVE');
    const sampleProblems = db.bai_toan
      .filter((b) => b.trang_thai === 'PUBLISHED')
      .slice(0, 6)
      .map((p) => sanitizeProblemForUser(p, db.test_case));

    res.json({
      tiers,
      positions,
      topics,
      sampleProblems,
      stats: {
        totalProblems: db.bai_toan.filter((b) => b.trang_thai === 'PUBLISHED').length,
        totalTopics: topics.length,
        totalPositions: positions.length,
      },
    });
  });

  // ==================== AUTH ENDPOINTS ====================
  app.post('/api/auth/register', (req, res) => {
    const { email, password, ho_ten } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(ho_ten || '').trim();
    const rawPass = String(password || '');

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Địa chỉ email không hợp lệ.' });
      return;
    }
    if (rawPass.length < 8) {
      res.status(400).json({ error: 'Mật khẩu phải có ít nhất 8 ký tự.' });
      return;
    }
    if (cleanName.length < 2) {
      res.status(400).json({ error: 'Vui lòng nhập họ và tên tối thiểu 2 ký tự.' });
      return;
    }

    const db = loadDb();
    if (db.tai_khoan.some((u) => u.email.toLowerCase() === cleanEmail)) {
      res.status(409).json({ error: 'Email này đã được đăng ký trong hệ thống.' });
      return;
    }

    const createdAccountId = updateDb((draft) => {
      const accountId = generateId('acc');
      const now = new Date().toISOString();
      draft.tai_khoan.push({
        id: accountId,
        email: cleanEmail,
        mat_khau_hash: hashPassword(rawPass),
        vai_tro: 'USER',
        trang_thai: 'ACTIVE',
        ngay_tao: now,
      });
      draft.ho_so.push({
        id: generateId('prof'),
        tai_khoan_id: accountId,
        ho_ten: cleanName,
        tieu_de_nghe_nghiep: 'Software Engineer Candidate',
        kinh_nghiem_nam: 1,
        muc_tieu_vi_tri: 'Backend Engineer',
        ky_nang: ['JavaScript', 'Algorithms'],
        gioi_thieu: '',
        ngon_ngu_mac_dinh: 'javascript',
      });
      draft.quyen_su_dung_goi.push({
        id: generateId('ent'),
        tai_khoan_id: accountId,
        goi_dich_vu_id: 'tier_free',
        luot_da_dung_thang: 0,
        thang_chu_ky: currentMonthKey(),
      });
      return accountId;
    });

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công. Vui lòng đăng nhập để bắt đầu.',
      accountId: createdAccountId,
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const rawPass = String(password || '');

    const db = loadDb();
    const user = db.tai_khoan.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user || !verifyPassword(rawPass, user.mat_khau_hash)) {
      res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
      return;
    }
    if (user.trang_thai === 'LOCKED') {
      res.status(403).json({ error: 'Tài khoản này đang bị khóa. Vui lòng liên hệ quản trị viên.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 86400_000).toISOString();

    updateDb((draft) => {
      const target = draft.tai_khoan.find((u) => u.id === user.id);
      if (target) target.lan_dang_nhap_cuoi = now.toISOString();
      draft.auth_sessions.push({
        token,
        tai_khoan_id: user.id,
        ngay_tao: now.toISOString(),
        het_han: expires,
      });
    });

    const profile = db.ho_so.find((h) => h.tai_khoan_id === user.id);
    const quota = getRemainingQuota(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        vai_tro: user.vai_tro,
        trang_thai: user.trang_thai,
        ngay_tao: user.ngay_tao,
      },
      profile,
      quota,
    });
  });

  app.post('/api/auth/logout', authMiddleware, (req: AuthedRequest, res) => {
    const token = req.authToken;
    updateDb((draft) => {
      draft.auth_sessions = draft.auth_sessions.filter((s) => s.token !== token);
    });
    res.json({ ok: true });
  });

  app.get('/api/auth/me', authMiddleware, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = loadDb();
    const profile = db.ho_so.find((h) => h.tai_khoan_id === user.id);
    const quota = getRemainingQuota(user.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        vai_tro: user.vai_tro,
        trang_thai: user.trang_thai,
        ngay_tao: user.ngay_tao,
      },
      profile,
      quota,
    });
  });

  // ==================== USER PROFILE (UC04 / M06) ====================
  app.put('/api/user/profile', authMiddleware, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const {
      ho_ten,
      tieu_de_nghe_nghiep,
      kinh_nghiem_nam,
      muc_tieu_vi_tri,
      ky_nang,
      gioi_thieu,
      ngon_ngu_mac_dinh,
    } = req.body || {};

    if (!String(ho_ten || '').trim()) {
      res.status(400).json({ error: 'Họ và tên không được để trống.' });
      return;
    }

    const updated = updateDb((draft) => {
      let prof = draft.ho_so.find((h) => h.tai_khoan_id === user.id);
      if (!prof) {
        prof = {
          id: generateId('prof'),
          tai_khoan_id: user.id,
          ho_ten: String(ho_ten).trim(),
          tieu_de_nghe_nghiep: '',
          kinh_nghiem_nam: 0,
          muc_tieu_vi_tri: '',
          ky_nang: [],
          gioi_thieu: '',
          ngon_ngu_mac_dinh: 'javascript',
        };
        draft.ho_so.push(prof);
      }
      prof.ho_ten = String(ho_ten).trim();
      prof.tieu_de_nghe_nghiep = String(tieu_de_nghe_nghiep || '').trim();
      prof.kinh_nghiem_nam = Math.max(0, Math.min(50, Number(kinh_nghiem_nam) || 0));
      prof.muc_tieu_vi_tri = String(muc_tieu_vi_tri || '').trim();
      prof.ky_nang = Array.isArray(ky_nang)
        ? ky_nang.map((k) => String(k).trim()).filter(Boolean)
        : String(ky_nang || '')
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean);
      prof.gioi_thieu = String(gioi_thieu || '').trim();
      if (['javascript', 'typescript', 'python'].includes(ngon_ngu_mac_dinh)) {
        prof.ngon_ngu_mac_dinh = ngon_ngu_mac_dinh;
      }
      return prof;
    });

    res.json({ profile: updated });
  });

  // ==================== USER PROBLEM BANK & FAVORITES (UC05, UC06 / M07) ====================
  app.get('/api/user/problems', authMiddleware, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = loadDb();
    const favSet = new Set(
      db.yeu_thich.filter((y) => y.tai_khoan_id === user.id).map((y) => y.bai_toan_id)
    );
    const positions = db.vi_tri.filter((v) => v.trang_thai === 'ACTIVE');
    const topics = db.chu_de.filter((c) => c.trang_thai === 'ACTIVE');

    const problems = db.bai_toan
      .filter((p) => p.trang_thai === 'PUBLISHED')
      .map((p) => ({
        ...sanitizeProblemForUser(p, db.test_case),
        is_favorite: favSet.has(p.id),
      }));

    res.json({ problems, positions, topics });
  });

  app.post('/api/user/favorites/:problemId', authMiddleware, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const problemId = req.params.problemId;
    const db = loadDb();
    const prob = db.bai_toan.find((p) => p.id === problemId && p.trang_thai === 'PUBLISHED');
    if (!prob) {
      res.status(404).json({ error: 'Không tìm thấy bài toán đã phát hành.' });
      return;
    }

    const isFavorite = updateDb((draft) => {
      const idx = draft.yeu_thich.findIndex(
        (y) => y.tai_khoan_id === user.id && y.bai_toan_id === problemId
      );
      if (idx >= 0) {
        draft.yeu_thich.splice(idx, 1);
        return false;
      }
      draft.yeu_thich.push({
        id: generateId('fav'),
        tai_khoan_id: user.id,
        bai_toan_id: problemId,
        ngay_tao: new Date().toISOString(),
      });
      return true;
    });

    res.json({ is_favorite: isFavorite });
  });

  // ==================== USER CV UPLOAD & CONFIRMATION (UC08 / M09) ====================
  app.get('/api/user/cv', authMiddleware, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = loadDb();
    const files = db.tep_cv
      .filter((f) => f.tai_khoan_id === user.id)
      .sort((a, b) => b.ngay_tai.localeCompare(a.ngay_tai));
    const confirmed = db.cv_xac_nhan
      .filter((c) => c.tai_khoan_id === user.id)
      .sort((a, b) => (b.ngay_xac_nhan || '').localeCompare(a.ngay_xac_nhan || ''));
    res.json({ files, confirmed });
  });

  app.post('/api/user/cv/upload', authMiddleware, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { ten_tep, dinh_dang, kich_thuoc_bytes, noi_dung_tho, da_dong_y } = req.body || {};

    if (da_dong_y !== true) {
      res.status(400).json({ error: 'Bạn cần đồng ý điều khoản xử lý dữ liệu CV trước khi tải lên.' });
      return;
    }

    const format = String(dinh_dang || '').toUpperCase() as 'PDF' | 'DOCX' | 'TXT';
    if (!['PDF', 'DOCX', 'TXT'].includes(format)) {
      res.status(400).json({ error: 'Định dạng tệp không hợp lệ. Chỉ hỗ trợ PDF, DOCX hoặc TXT.' });
      return;
    }

    const quota = getRemainingQuota(user.id);
    const maxBytes = (quota.tier?.gioi_han_cv_mb || 5) * 1024 * 1024;
    const size = Number(kich_thuoc_bytes) || 0;
    if (size <= 0 || size > maxBytes) {
      res.status(400).json({
        error: `Kích thước tệp vượt quá giới hạn ${quota.tier?.gioi_han_cv_mb || 5} MB của gói hiện tại.`,
      });
      return;
    }

    const rawText = String(noi_dung_tho || '').trim();
    if (rawText.length < 20) {
      res.status(400).json({
        error: 'Không trích xuất được nội dung văn bản đủ rõ từ tệp CV. Vui lòng kiểm tra hoặc dán nội dung CV.',
      });
      return;
    }

    try {
      const extracted = await analyzeCvWithAI(rawText, String(ten_tep || 'cv'), getPromptSystem('CV_PARSE'));

      const result = updateDb((draft) => {
        const now = new Date().toISOString();
        const fileId = generateId('cvf');
        const confirmId = generateId('cvc');

        const fileRec = {
          id: fileId,
          tai_khoan_id: user.id,
          ten_tep: String(ten_tep || 'CV_Ung_Vien'),
          dinh_dang: format,
          kich_thuoc_bytes: size,
          noi_dung_tho: rawText,
          trang_thai: 'EXTRACTED' as const,
          ngay_tai: now,
        };
        const cvRec = {
          id: confirmId,
          tep_cv_id: fileId,
          tai_khoan_id: user.id,
          vi_tri_ung_tuyen: extracted.vi_tri_ung_tuyen || 'Software Engineer',
          so_nam_kinh_nghiem: Number(extracted.so_nam_kinh_nghiem) || 0,
          ky_nang_chinh: Array.isArray(extracted.ky_nang_chinh) ? extracted.ky_nang_chinh : [],
          du_an_noi_bat: Array.isArray(extracted.du_an_noi_bat) ? extracted.du_an_noi_bat : [],
          tom_tat_nang_luc: extracted.tom_tat_nang_luc || '',
          da_xac_nhan: false,
        };

        draft.tep_cv.push(fileRec);
        draft.cv_xac_nhan.push(cvRec);
        return { file: fileRec, cv: cvRec };
      });

      res.status(201).json(result);
    } catch (err) {
      res.status(502).json({
        error: `Phân tích CV bằng AI thất bại: ${extractGeminiErrorMessage(err)}`,
      });
    }
  });

  app.put('/api/user/cv/:id/confirm', authMiddleware, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const id = req.params.id;
    const { vi_tri_ung_tuyen, so_nam_kinh_nghiem, ky_nang_chinh, du_an_noi_bat, tom_tat_nang_luc } = req.body || {};

    const db = loadDb();
    const existing = db.cv_xac_nhan.find((c) => c.id === id && c.tai_khoan_id === user.id);
    if (!existing) {
      res.status(404).json({ error: 'Không tìm thấy bản trích xuất CV.' });
      return;
    }

    const confirmed = updateDb((draft) => {
      const target = draft.cv_xac_nhan.find((c) => c.id === id)!;
      target.vi_tri_ung_tuyen = String(vi_tri_ung_tuyen || target.vi_tri_ung_tuyen).trim();
      target.so_nam_kinh_nghiem = Math.max(0, Number(so_nam_kinh_nghiem) || 0);
      target.ky_nang_chinh = Array.isArray(ky_nang_chinh)
        ? ky_nang_chinh.map((k) => String(k).trim()).filter(Boolean)
        : target.ky_nang_chinh;
      target.du_an_noi_bat = Array.isArray(du_an_noi_bat)
        ? du_an_noi_bat.map((d) => String(d).trim()).filter(Boolean)
        : target.du_an_noi_bat;
      target.tom_tat_nang_luc = String(tom_tat_nang_luc || target.tom_tat_nang_luc).trim();
      target.da_xac_nhan = true;
      target.ngay_xac_nhan = new Date().toISOString();

      const fileRec = draft.tep_cv.find((f) => f.id === target.tep_cv_id);
      if (fileRec) fileRec.trang_thai = 'CONFIRMED';

      return target;
    });

    res.json({ cv: confirmed });
  });

  // ==================== INTERVIEW SESSIONS (M08, M10, M11, M12) ====================
  app.get('/api/user/sessions', authMiddleware, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = loadDb();
    const sessions = db.phien_phong_van
      .filter((s) => s.tai_khoan_id === user.id)
      .sort((a, b) => b.ngay_tao.localeCompare(a.ngay_tao))
      .map((s) => {
        const checked = checkSessionTimeoutIfNeeded(s.id) || s;
        const problem = db.bai_toan.find((b) => b.id === checked.bai_toan_id);
        const position = db.vi_tri.find((v) => v.id === checked.vi_tri_id);
        const topic = db.chu_de.find((c) => c.id === checked.chu_de_id);
        const report = db.bao_cao_danh_gia.find((r) => r.phien_id === checked.id);
        return {
          ...checked,
          problem_title: problem?.tieu_de || 'Bài toán',
          problem_difficulty: problem?.do_kho || 'MEDIUM',
          position_name: position?.ten_vi_tri || '',
          topic_name: topic?.ten_chu_de || '',
          report_status: report?.trang_thai || null,
          report_score: report?.trang_thai === 'READY' ? report.diem_tong_ket : null,
          report_id: report?.id || null,
        };
      });

    res.json({ sessions });
  });

  app.post('/api/user/sessions', authMiddleware, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { bai_toan_id, ngon_ngu, thoi_luong_phut, cv_xac_nhan_id } = req.body || {};

    const quota = getRemainingQuota(user.id);
    if (quota.luot_con_lai <= 0) {
      res.status(403).json({
        error: `Bạn đã dùng hết ${quota.luot_toi_da} lượt phỏng vấn trong tháng của gói ${quota.tier?.ten_goi}.`,
      });
      return;
    }

    const db = loadDb();
    const problem = db.bai_toan.find((b) => b.id === bai_toan_id && b.trang_thai === 'PUBLISHED');
    if (!problem) {
      res.status(404).json({ error: 'Vui lòng chọn một bài toán đã phát hành.' });
      return;
    }

    if (cv_xac_nhan_id) {
      const cv = db.cv_xac_nhan.find(
        (c) => c.id === cv_xac_nhan_id && c.tai_khoan_id === user.id && c.da_xac_nhan
      );
      if (!cv) {
        res.status(400).json({ error: 'CV đính kèm chưa được xác nhận hoặc không hợp lệ.' });
        return;
      }
    }

    const lang: CodeLanguage = ['javascript', 'typescript', 'python'].includes(ngon_ngu)
      ? ngon_ngu
      : 'javascript';
    const duration = Math.max(10, Math.min(90, Number(thoi_luong_phut) || problem.thoi_luong_phut_mac_dinh));

    const rubric = db.rubric[0];
    const promptTpl = db.prompt_template.find((p) => p.loai_tac_vu === 'INTERVIEWER');

    // M08 creates READY session WITHOUT deducting quota turn and WITHOUT starting clock!
    const created = updateDb((draft) => {
      const session: PhienPhongVan = {
        id: generateId('sess'),
        tai_khoan_id: user.id,
        bai_toan_id: problem.id,
        vi_tri_id: problem.vi_tri_id,
        chu_de_id: problem.chu_de_id,
        cv_xac_nhan_id: cv_xac_nhan_id || undefined,
        phien_ban_rubric_id: rubric?.phien_ban_hien_hanh_id || 'rubv_1',
        phien_ban_prompt_id: promptTpl?.phien_ban_hien_hanh_id || 'pmtv_int_1',
        ngon_ngu: lang,
        thoi_luong_phut: duration,
        gioi_han_goi_y_snapshot: quota.tier?.gioi_han_goi_y_phien ?? 3,
        goi_y_da_dung: 0,
        da_tru_luot: false,
        trang_thai: 'READY',
        ma_nguon_hien_tai: problem.code_mau[lang] || problem.code_mau.javascript,
        ngay_tao: new Date().toISOString(),
      };
      draft.phien_phong_van.push(session);
      return session;
    });

    res.status(201).json({ session: created });
  });

  app.get('/api/user/sessions/:id', authMiddleware, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const checked = checkSessionTimeoutIfNeeded(req.params.id);
    if (!checked || checked.tai_khoan_id !== user.id) {
      res.status(404).json({ error: 'Không tìm thấy phiên phỏng vấn.' });
      return;
    }

    const db = loadDb();
    const problem = db.bai_toan.find((b) => b.id === checked.bai_toan_id);
    const position = db.vi_tri.find((v) => v.id === checked.vi_tri_id);
    const topic = db.chu_de.find((c) => c.id === checked.chu_de_id);
    const cv = checked.cv_xac_nhan_id
      ? db.cv_xac_nhan.find((c) => c.id === checked.cv_xac_nhan_id)
      : undefined;
    const dialogue = db.ban_ghi_hoi_thoai.filter((d) => d.phien_id === checked.id);
    const runs = db.ket_qua_chay_code
      .filter((r) => r.phien_id === checked.id)
      .sort((a, b) => b.thoi_gian_chay.localeCompare(a.thoi_gian_chay));
    const report = db.bao_cao_danh_gia.find((r) => r.phien_id === checked.id);
    const refactor = report
      ? db.de_xuat_toi_uu.find((d) => d.bao_cao_id === report.id)
      : undefined;

    res.json({
      session: checked,
      problem: problem ? sanitizeProblemForUser(problem, db.test_case) : null,
      position,
      topic,
      cv,
      dialogue,
      runs,
      report,
      refactor,
    });
  });

  app.post('/api/user/sessions/:id/start', authMiddleware, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = loadDb();
    const session = db.phien_phong_van.find((s) => s.id === req.params.id && s.tai_khoan_id === user.id);
    if (!session) {
      res.status(404).json({ error: 'Không tìm thấy phiên phỏng vấn.' });
      return;
    }

    if (session.trang_thai === 'ACTIVE') {
      // Idempotent resume: do NOT deduct turn or reset timer
      res.json({ session, dialogue: db.ban_ghi_hoi_thoai.filter((d) => d.phien_id === session.id) });
      return;
    }
    if (session.trang_thai !== 'READY') {
      res.status(400).json({ error: 'Phiên phỏng vấn đã kết thúc hoặc bị hủy.' });
      return;
    }

    const quota = getRemainingQuota(user.id);
    if (quota.luot_con_lai <= 0 && !session.da_tru_luot) {
      res.status(403).json({ error: 'Hết lượt phỏng vấn khả dụng trong tháng.' });
      return;
    }

    const problem = db.bai_toan.find((b) => b.id === session.bai_toan_id)!;
    const position = db.vi_tri.find((v) => v.id === session.vi_tri_id);
    const topic = db.chu_de.find((c) => c.id === session.chu_de_id);
    const cv = session.cv_xac_nhan_id
      ? db.cv_xac_nhan.find((c) => c.id === session.cv_xac_nhan_id)
      : undefined;

    let openingText = '';
    try {
      openingText = await generateInterviewOpening({
        problem,
        positionName: position?.ten_vi_tri || 'Software Engineer',
        topicName: topic?.ten_chu_de || 'Thuật toán',
        cv,
        systemPrompt: getPromptSystem('INTERVIEWER'),
      });
    } catch (err) {
      res.status(502).json({
        error: `Không thể khởi tạo AI Interviewer: ${extractGeminiErrorMessage(err)}`,
      });
      return;
    }

    const result = updateDb((draft) => {
      const target = draft.phien_phong_van.find((s) => s.id === session.id)!;
      const now = new Date();
      if (target.trang_thai === 'READY') {
        target.trang_thai = 'ACTIVE';
        target.bat_dau_at = now.toISOString();
        target.het_han_at = new Date(now.getTime() + target.thoi_luong_phut * 60_000).toISOString();
        if (!target.da_tru_luot) {
          target.da_tru_luot = true;
          const ent = draft.quyen_su_dung_goi.find((q) => q.tai_khoan_id === user.id);
          if (ent) ent.luot_da_dung_thang += 1;
        }
      }

      const firstTurn: BanGhiHoiThoai = {
        id: generateId('dlg'),
        phien_id: target.id,
        vai_tro: 'AI_INTERVIEWER',
        loai: 'QUESTION',
        noi_dung: openingText,
        thoi_gian: now.toISOString(),
      };
      draft.ban_ghi_hoi_thoai.push(firstTurn);
      return {
        session: target,
        dialogue: draft.ban_ghi_hoi_thoai.filter((d) => d.phien_id === target.id),
      };
    });

    res.json({ ...result, quota: getRemainingQuota(user.id) });
  });

  app.patch('/api/user/sessions/:id/draft', authMiddleware, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const checked = checkSessionTimeoutIfNeeded(req.params.id);
    if (!checked || checked.tai_khoan_id !== user.id) {
      res.status(404).json({ error: 'Không tìm thấy phiên phỏng vấn.' });
      return;
    }
    if (checked.trang_thai !== 'ACTIVE') {
      res.status(400).json({ error: 'Phiên đã kết thúc, không thể lưu bản nháp.' });
      return;
    }

    const { ma_nguon_hien_tai, ngon_ngu } = req.body || {};
    const updated = updateDb((draft) => {
      const target = draft.phien_phong_van.find((s) => s.id === checked.id)!;
      if (typeof ma_nguon_hien_tai === 'string') {
        target.ma_nguon_hien_tai = ma_nguon_hien_tai;
      }
      if (['javascript', 'typescript', 'python'].includes(ngon_ngu)) {
        target.ngon_ngu = ngon_ngu;
      }
      return target;
    });

    res.json({ session: updated });
  });

  app.post('/api/user/sessions/:id/chat', authMiddleware, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const checked = checkSessionTimeoutIfNeeded(req.params.id);
    if (!checked || checked.tai_khoan_id !== user.id) {
      res.status(404).json({ error: 'Không tìm thấy phiên phỏng vấn.' });
      return;
    }
    if (checked.trang_thai !== 'ACTIVE') {
      res.status(400).json({ error: 'Phiên phỏng vấn không ở trạng thái hoạt động.' });
      return;
    }

    const message = String(req.body?.message || '').trim();
    const currentCode = typeof req.body?.code === 'string' ? req.body.code : checked.ma_nguon_hien_tai;
    if (!message) {
      res.status(400).json({ error: 'Vui lòng nhập nội dung câu trả lời.' });
      return;
    }

    const db = loadDb();
    const problem = db.bai_toan.find((b) => b.id === checked.bai_toan_id)!;
    const cv = checked.cv_xac_nhan_id
      ? db.cv_xac_nhan.find((c) => c.id === checked.cv_xac_nhan_id)
      : undefined;
    const history = db.ban_ghi_hoi_thoai.filter((d) => d.phien_id === checked.id);

    const candidateTurn: BanGhiHoiThoai = {
      id: generateId('dlg'),
      phien_id: checked.id,
      vai_tro: 'CANDIDATE',
      loai: 'ANSWER',
      noi_dung: message,
      thoi_gian: new Date().toISOString(),
    };

    try {
      const reply = await generateInterviewReply({
        problem,
        history: [...history, candidateTurn],
        candidateMessage: message,
        currentCode,
        language: checked.ngon_ngu,
        cv,
        systemPrompt: getPromptSystem('INTERVIEWER'),
      });

      const updatedDialogue = updateDb((draft) => {
        const target = draft.phien_phong_van.find((s) => s.id === checked.id)!;
        target.ma_nguon_hien_tai = currentCode;
        draft.ban_ghi_hoi_thoai.push(candidateTurn);
        if (reply.feedback) {
          draft.ban_ghi_hoi_thoai.push({
            id: generateId('dlg'),
            phien_id: checked.id,
            vai_tro: 'AI_INTERVIEWER',
            loai: 'FEEDBACK',
            noi_dung: reply.feedback,
            thoi_gian: new Date().toISOString(),
          });
        }
        if (reply.followUpQuestion) {
          draft.ban_ghi_hoi_thoai.push({
            id: generateId('dlg'),
            phien_id: checked.id,
            vai_tro: 'AI_INTERVIEWER',
            loai: 'QUESTION',
            noi_dung: reply.followUpQuestion,
            thoi_gian: new Date().toISOString(),
          });
        }
        return draft.ban_ghi_hoi_thoai.filter((d) => d.phien_id === checked.id);
      });

      res.json({ dialogue: updatedDialogue });
    } catch (err) {
      res.status(502).json({
        error: `AI Interviewer gặp sự cố phản hồi: ${extractGeminiErrorMessage(err)}`,
      });
    }
  });

  app.post('/api/user/sessions/:id/hint', authMiddleware, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const checked = checkSessionTimeoutIfNeeded(req.params.id);
    if (!checked || checked.tai_khoan_id !== user.id) {
      res.status(404).json({ error: 'Không tìm thấy phiên phỏng vấn.' });
      return;
    }
    if (checked.trang_thai !== 'ACTIVE') {
      res.status(400).json({ error: 'Phiên phỏng vấn không ở trạng thái hoạt động.' });
      return;
    }
    if (checked.goi_y_da_dung >= checked.gioi_han_goi_y_snapshot) {
      res.status(403).json({
        error: `Bạn đã dùng hết ${checked.gioi_han_goi_y_snapshot} lượt gợi ý trong phiên này.`,
      });
      return;
    }

    const currentCode = typeof req.body?.code === 'string' ? req.body.code : checked.ma_nguon_hien_tai;
    const db = loadDb();
    const problem = db.bai_toan.find((b) => b.id === checked.bai_toan_id)!;

    try {
      const hintText = await generateDirectionalHint({
        problem,
        currentCode,
        language: checked.ngon_ngu,
        hintIndex: checked.goi_y_da_dung + 1,
        maxHints: checked.gioi_han_goi_y_snapshot,
        systemPrompt: getPromptSystem('HINT'),
      });

      const result = updateDb((draft) => {
        const target = draft.phien_phong_van.find((s) => s.id === checked.id)!;
        target.goi_y_da_dung += 1;
        target.ma_nguon_hien_tai = currentCode;
        draft.ban_ghi_hoi_thoai.push({
          id: generateId('dlg'),
          phien_id: checked.id,
          vai_tro: 'AI_INTERVIEWER',
          loai: 'HINT',
          noi_dung: hintText,
          thoi_gian: new Date().toISOString(),
        });
        return {
          session: target,
          dialogue: draft.ban_ghi_hoi_thoai.filter((d) => d.phien_id === checked.id),
        };
      });

      res.json(result);
    } catch (err) {
      // Do NOT deduct hint count when AI call fails
      res.status(502).json({
        error: `Không thể tạo gợi ý (chưa trừ lượt gợi ý): ${extractGeminiErrorMessage(err)}`,
      });
    }
  });

  app.post('/api/user/sessions/:id/run-sample', authMiddleware, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const checked = checkSessionTimeoutIfNeeded(req.params.id);
    if (!checked || checked.tai_khoan_id !== user.id) {
      res.status(404).json({ error: 'Không tìm thấy phiên phỏng vấn.' });
      return;
    }
    if (checked.trang_thai !== 'ACTIVE') {
      res.status(400).json({ error: 'Phiên phỏng vấn đã kết thúc, không thể chạy thử.' });
      return;
    }

    const code = typeof req.body?.code === 'string' ? req.body.code : checked.ma_nguon_hien_tai;
    const lang: CodeLanguage = ['javascript', 'typescript', 'python'].includes(req.body?.language)
      ? req.body.language
      : checked.ngon_ngu;

    const db = loadDb();
    const problem = db.bai_toan.find((b) => b.id === checked.bai_toan_id)!;
    const problemTests = db.test_case.filter((t) => t.bai_toan_id === problem.id);

    const execRes = executeSandboxTests(code, lang, problem.ham_muc_tieu, problemTests, 'SAMPLE_ONLY');

    const savedRun = updateDb((draft) => {
      const target = draft.phien_phong_van.find((s) => s.id === checked.id)!;
      target.ma_nguon_hien_tai = code;
      target.ngon_ngu = lang;
      const runRecord = {
        id: generateId('run'),
        phien_id: checked.id,
        loai_chay: 'SAMPLE' as const,
        ngon_ngu: lang,
        so_test_dat: execRes.so_test_dat,
        tong_test: execRes.tong_test,
        stdout: execRes.stdout,
        loi_bien_dich: execRes.loi_bien_dich,
        chi_tiet_sample: execRes.chi_tiet_sample,
        thoi_gian_chay: new Date().toISOString(),
      };
      draft.ket_qua_chay_code.push(runRecord);
      return runRecord;
    });

    res.json({ run: savedRun });
  });

  async function runReportEvaluation(reportId: string): Promise<BaoCaoDanhGia> {
    const db = loadDb();
    const report = db.bao_cao_danh_gia.find((r) => r.id === reportId)!;
    const session = db.phien_phong_van.find((s) => s.id === report.phien_id)!;
    const problem = db.bai_toan.find((b) => b.id === session.bai_toan_id)!;
    const rubricVer =
      db.phien_ban_rubric.find((rv) => rv.id === report.phien_ban_rubric_id) || db.phien_ban_rubric[0];
    const criteria = rubricVer.tieu_chi;
    const history = db.ban_ghi_hoi_thoai.filter((d) => d.phien_id === session.id);
    const submitRun = db.ket_qua_chay_code
      .filter((r) => r.phien_id === session.id && r.loai_chay === 'SUBMIT')
      .sort((a, b) => b.thoi_gian_chay.localeCompare(a.thoi_gian_chay))[0];
    const cv = session.cv_xac_nhan_id
      ? db.cv_xac_nhan.find((c) => c.id === session.cv_xac_nhan_id)
      : undefined;

    try {
      const aiEval = await evaluateInterviewWithRubric({
        problem,
        criteria,
        submittedCode: session.ma_nguon_da_nop || session.ma_nguon_hien_tai,
        language: session.ngon_ngu,
        history,
        submitRun,
        cv,
        systemPrompt: getPromptSystem('EVALUATION'),
      });

      const { overall, breakdown, grade } = computeOverallScore(criteria, aiEval.chi_tiet_tieu_chi || []);

      return updateDb((draft) => {
        const target = draft.bao_cao_danh_gia.find((r) => r.id === reportId)!;
        target.trang_thai = 'READY';
        target.diem_tong_ket = overall;
        target.xep_loai = grade;
        target.nhan_xet_tong_quan = aiEval.nhan_xet_tong_quan;
        target.diem_manh = aiEval.diem_manh;
        target.diem_yeu = aiEval.diem_yeu;
        target.buoc_tiep_theo = aiEval.buoc_tiep_theo;
        target.chi_tiet_tieu_chi = breakdown;
        target.ly_do_loi = undefined;
        target.ngay_hoan_thanh = new Date().toISOString();
        return target;
      });
    } catch (err) {
      return updateDb((draft) => {
        const target = draft.bao_cao_danh_gia.find((r) => r.id === reportId)!;
        target.trang_thai = 'FAILED';
        target.ly_do_loi = extractGeminiErrorMessage(err);
        return target;
      });
    }
  }

  app.post('/api/user/sessions/:id/submit', authMiddleware, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = loadDb();
    const session = db.phien_phong_van.find((s) => s.id === req.params.id && s.tai_khoan_id === user.id);
    if (!session) {
      res.status(404).json({ error: 'Không tìm thấy phiên phỏng vấn.' });
      return;
    }

    if (session.trang_thai === 'COMPLETED') {
      const existingReport = db.bao_cao_danh_gia.find((r) => r.phien_id === session.id);
      res.json({ session, report: existingReport });
      return;
    }
    if (session.trang_thai !== 'ACTIVE') {
      res.status(400).json({ error: 'Phiên phỏng vấn chưa bắt đầu hoặc đã bị hủy.' });
      return;
    }

    const finalCode = typeof req.body?.code === 'string' ? req.body.code : session.ma_nguon_hien_tai;
    const lang: CodeLanguage = ['javascript', 'typescript', 'python'].includes(req.body?.language)
      ? req.body.language
      : session.ngon_ngu;
    const reason = req.body?.reason === 'TIMEOUT' ? 'TIMEOUT' : 'SUBMIT';

    const problem = db.bai_toan.find((b) => b.id === session.bai_toan_id)!;
    const problemTests = db.test_case.filter((t) => t.bai_toan_id === problem.id);

    // Run ALL (SAMPLE + HIDDEN) tests internally; detail only exposes SAMPLE
    const execRes = executeSandboxTests(finalCode, lang, problem.ham_muc_tieu, problemTests, 'ALL_FOR_SUBMIT');

    const { lockedSession, reportId, submitRun } = updateDb((draft) => {
      const now = new Date().toISOString();
      const target = draft.phien_phong_van.find((s) => s.id === session.id)!;
      target.trang_thai = 'COMPLETED';
      target.ket_thuc_at = now;
      target.ly_do_ket_thuc = reason;
      target.ngon_ngu = lang;
      target.ma_nguon_hien_tai = finalCode;
      target.ma_nguon_da_nop = finalCode;

      const runRec = {
        id: generateId('run'),
        phien_id: session.id,
        loai_chay: 'SUBMIT' as const,
        ngon_ngu: lang,
        so_test_dat: execRes.so_test_dat,
        tong_test: execRes.tong_test,
        so_hidden_dat: execRes.so_hidden_dat,
        tong_hidden: execRes.tong_hidden,
        stdout: execRes.stdout,
        loi_bien_dich: execRes.loi_bien_dich,
        chi_tiet_sample: execRes.chi_tiet_sample,
        thoi_gian_chay: now,
      };
      draft.ket_qua_chay_code.push(runRec);

      const newReportId = generateId('rep');
      draft.bao_cao_danh_gia.push({
        id: newReportId,
        phien_id: session.id,
        tai_khoan_id: user.id,
        phien_ban_rubric_id: target.phien_ban_rubric_id,
        trang_thai: 'PROCESSING',
        ngay_tao: now,
      });

      return { lockedSession: target, reportId: newReportId, submitRun: runRec };
    });

    const finalReport = await runReportEvaluation(reportId);
    res.json({ session: lockedSession, run: submitRun, report: finalReport });
  });

  app.post('/api/user/reports/:reportId/retry', authMiddleware, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = loadDb();
    const report = db.bao_cao_danh_gia.find(
      (r) => r.id === req.params.reportId && r.tai_khoan_id === user.id
    );
    if (!report) {
      res.status(404).json({ error: 'Không tìm thấy báo cáo đánh giá.' });
      return;
    }

    updateDb((draft) => {
      const target = draft.bao_cao_danh_gia.find((r) => r.id === report.id)!;
      target.trang_thai = 'PROCESSING';
      target.ly_do_loi = undefined;
    });

    const finalReport = await runReportEvaluation(report.id);
    res.json({ report: finalReport });
  });

  app.post('/api/user/reports/:reportId/refactor', authMiddleware, async (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = loadDb();
    const report = db.bao_cao_danh_gia.find(
      (r) => r.id === req.params.reportId && r.tai_khoan_id === user.id
    );
    if (!report) {
      res.status(404).json({ error: 'Không tìm thấy báo cáo đánh giá.' });
      return;
    }

    const existing = db.de_xuat_toi_uu.find((d) => d.bao_cao_id === report.id);
    if (existing) {
      res.json({ refactor: existing });
      return;
    }

    const session = db.phien_phong_van.find((s) => s.id === report.phien_id)!;
    const problem = db.bai_toan.find((b) => b.id === session.bai_toan_id)!;
    const submittedCode = session.ma_nguon_da_nop || session.ma_nguon_hien_tai;

    try {
      const suggestion = await generateRefactoringSuggestion({
        problem,
        submittedCode,
        language: session.ngon_ngu,
        systemPrompt: getPromptSystem('REFACTOR'),
      });

      const created = updateDb((draft) => {
        const rec = {
          id: generateId('ref'),
          bao_cao_id: report.id,
          ngon_ngu: session.ngon_ngu,
          ma_nguon_goc: submittedCode,
          ma_nguon_toi_uu: suggestion.ma_nguon_toi_uu,
          giai_thich_cai_tien: suggestion.giai_thich_cai_tien,
          do_phuc_tap_truoc: suggestion.do_phuc_tap_truoc,
          do_phuc_tap_sau: suggestion.do_phuc_tap_sau,
          ngay_tao: new Date().toISOString(),
        };
        draft.de_xuat_toi_uu.push(rec);
        return rec;
      });

      res.json({ refactor: created });
    } catch (err) {
      res.status(502).json({
        error: `Không thể tạo gợi ý tối ưu mã nguồn: ${extractGeminiErrorMessage(err)}`,
      });
    }
  });

  // ==================== USER ANALYTICS (UC18 / M13) & FEEDBACK (UC19 / M14) ====================
  app.get('/api/user/analytics', authMiddleware, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = loadDb();

    const readyReports = db.bao_cao_danh_gia
      .filter((r) => r.tai_khoan_id === user.id && r.trang_thai === 'READY')
      .sort((a, b) => (a.ngay_hoan_thanh || a.ngay_tao).localeCompare(b.ngay_hoan_thanh || b.ngay_tao));

    const timeline = readyReports.map((r) => {
      const sess = db.phien_phong_van.find((s) => s.id === r.phien_id);
      const prob = sess ? db.bai_toan.find((b) => b.id === sess.bai_toan_id) : undefined;
      const rubVer = db.phien_ban_rubric.find((rv) => rv.id === r.phien_ban_rubric_id);
      return {
        report_id: r.id,
        session_id: r.phien_id,
        date: r.ngay_hoan_thanh || r.ngay_tao,
        problem_title: prob?.tieu_de || 'Bài toán',
        difficulty: prob?.do_kho || 'MEDIUM',
        score: r.diem_tong_ket ?? 0,
        grade: r.xep_loai || '',
        rubric_version: rubVer?.so_phien_ban ?? 1,
        criteria: r.chi_tiet_tieu_chi || [],
      };
    });

    const rubricVersionsUsed = Array.from(new Set(timeline.map((t) => t.rubric_version)));
    const criteriaAgg = new Map<string, { name: string; totalRatio: number; count: number }>();
    for (const item of timeline) {
      for (const c of item.criteria) {
        const ratio = c.diem_toi_da > 0 ? (c.diem / c.diem_toi_da) * 100 : 0;
        const curr = criteriaAgg.get(c.ten_tieu_chi) || { name: c.ten_tieu_chi, totalRatio: 0, count: 0 };
        curr.totalRatio += ratio;
        curr.count += 1;
        criteriaAgg.set(c.ten_tieu_chi, curr);
      }
    }

    const criteriaAverages = Array.from(criteriaAgg.values()).map((x) => ({
      name: x.name,
      avgPercent: Math.round((x.totalRatio / x.count) * 10) / 10,
      count: x.count,
    }));

    const avgScore =
      timeline.length > 0
        ? Math.round((timeline.reduce((sum, t) => sum + t.score, 0) / timeline.length) * 10) / 10
        : 0;

    res.json({
      timeline,
      criteriaAverages,
      summary: {
        completedReports: timeline.length,
        avgScore,
        highestScore: timeline.length ? Math.max(...timeline.map((t) => t.score)) : 0,
        rubricVersionsUsed,
      },
    });
  });

  app.get('/api/user/feedback', authMiddleware, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = loadDb();
    const list = db.phan_hoi
      .filter((f) => f.tai_khoan_id === user.id)
      .sort((a, b) => b.ngay_tao.localeCompare(a.ngay_tao));
    res.json({ feedback: list });
  });

  app.post('/api/user/feedback', authMiddleware, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { phien_id, bai_toan_id, loai_phan_hoi, tieu_de, noi_dung } = req.body || {};

    if (!String(tieu_de || '').trim() || !String(noi_dung || '').trim()) {
      res.status(400).json({ error: 'Vui lòng nhập đầy đủ tiêu đề và nội dung mô tả.' });
      return;
    }

    const validType = ['BUG_SANDBOX', 'AI_FEEDBACK', 'CONTENT_ISSUE', 'FEATURE_REQUEST'].includes(loai_phan_hoi)
      ? loai_phan_hoi
      : 'BUG_SANDBOX';

    const created = updateDb((draft) => {
      const now = new Date().toISOString();
      const item = {
        id: generateId('fb'),
        tai_khoan_id: user.id,
        phien_id: phien_id || undefined,
        bai_toan_id: bai_toan_id || undefined,
        loai_phan_hoi: validType,
        tieu_de: String(tieu_de).trim(),
        noi_dung: String(noi_dung).trim(),
        trang_thai: 'OPEN' as const,
        ngay_tao: now,
        ngay_cap_nhat: now,
      };
      draft.phan_hoi.push(item);
      return item;
    });

    res.status(201).json({ feedback: created });
  });

  // ==================== ADMIN ENDPOINTS (M15 - M24) ====================
  app.get('/api/admin/dashboard', authMiddleware, adminOnly, (_req, res) => {
    const db = loadDb();
    const totalUsers = db.tai_khoan.filter((u) => u.vai_tro === 'USER').length;
    const activeUsers = db.tai_khoan.filter((u) => u.vai_tro === 'USER' && u.trang_thai === 'ACTIVE').length;
    const totalProblems = db.bai_toan.length;
    const publishedProblems = db.bai_toan.filter((b) => b.trang_thai === 'PUBLISHED').length;
    const totalSessions = db.phien_phong_van.length;
    const completedSessions = db.phien_phong_van.filter((s) => s.trang_thai === 'COMPLETED').length;
    const readyReports = db.bao_cao_danh_gia.filter((r) => r.trang_thai === 'READY');
    const avgPlatformScore = readyReports.length
      ? Math.round((readyReports.reduce((a, b) => a + (b.diem_tong_ket || 0), 0) / readyReports.length) * 10) / 10
      : 0;
    const openFeedback = db.phan_hoi.filter((f) => f.trang_thai === 'OPEN' || f.trang_thai === 'IN_REVIEW').length;

    const problemsByTopic = db.chu_de.map((topic) => ({
      topic_id: topic.id,
      topic_name: topic.ten_chu_de,
      count: db.bai_toan.filter((p) => p.chu_de_id === topic.id).length,
      published: db.bai_toan.filter((p) => p.chu_de_id === topic.id && p.trang_thai === 'PUBLISHED').length,
    }));

    const recentSessions = db.phien_phong_van
      .slice()
      .sort((a, b) => b.ngay_tao.localeCompare(a.ngay_tao))
      .slice(0, 6)
      .map((s) => {
        const prof = db.ho_so.find((h) => h.tai_khoan_id === s.tai_khoan_id);
        const prob = db.bai_toan.find((b) => b.id === s.bai_toan_id);
        const rep = db.bao_cao_danh_gia.find((r) => r.phien_id === s.id);
        return {
          id: s.id,
          user_name: prof?.ho_ten || s.tai_khoan_id,
          problem_title: prob?.tieu_de || s.bai_toan_id,
          trang_thai: s.trang_thai,
          score: rep?.diem_tong_ket ?? null,
          ngay_tao: s.ngay_tao,
        };
      });

    res.json({
      kpis: {
        totalUsers,
        activeUsers,
        totalProblems,
        publishedProblems,
        totalSessions,
        completedSessions,
        avgPlatformScore,
        openFeedback,
      },
      problemsByTopic,
      recentSessions,
    });
  });

  // M16: Admin Users (UC20, UC21)
  app.get('/api/admin/users', authMiddleware, adminOnly, (_req, res) => {
    const db = loadDb();
    const users = db.tai_khoan.map((u) => {
      const profile = db.ho_so.find((h) => h.tai_khoan_id === u.id);
      const ent = db.quyen_su_dung_goi.find((q) => q.tai_khoan_id === u.id);
      const tier = ent ? db.goi_dich_vu.find((g) => g.id === ent.goi_dich_vu_id) : undefined;
      const sessionCount = db.phien_phong_van.filter((s) => s.tai_khoan_id === u.id).length;
      return {
        id: u.id,
        email: u.email,
        vai_tro: u.vai_tro,
        trang_thai: u.trang_thai,
        ngay_tao: u.ngay_tao,
        lan_dang_nhap_cuoi: u.lan_dang_nhap_cuoi,
        ho_ten: profile?.ho_ten || 'Chưa cập nhật',
        tier_name: tier?.ten_goi || 'Khởi đầu',
        tier_id: tier?.id || 'tier_free',
        luot_da_dung_thang: ent?.luot_da_dung_thang || 0,
        session_count: sessionCount,
      };
    });
    res.json({ users, tiers: db.goi_dich_vu });
  });

  app.patch('/api/admin/users/:id/status', authMiddleware, adminOnly, (req: AuthedRequest, res) => {
    const targetId = req.params.id;
    const { trang_thai } = req.body || {};
    if (!['ACTIVE', 'LOCKED'].includes(trang_thai)) {
      res.status(400).json({ error: 'Trạng thái tài khoản không hợp lệ.' });
      return;
    }

    const db = loadDb();
    const target = db.tai_khoan.find((u) => u.id === targetId);
    if (!target) {
      res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
      return;
    }
    if (target.vai_tro === 'ADMIN') {
      res.status(403).json({ error: 'Không thể khóa tài khoản Quản trị viên (ADMIN).' });
      return;
    }

    updateDb((draft) => {
      const acc = draft.tai_khoan.find((u) => u.id === targetId)!;
      acc.trang_thai = trang_thai;
      if (trang_thai === 'LOCKED') {
        // Immediately revoke active tokens
        draft.auth_sessions = draft.auth_sessions.filter((s) => s.tai_khoan_id !== targetId);
      }
    });

    res.json({ ok: true, trang_thai });
  });

  app.patch('/api/admin/users/:id/tier', authMiddleware, adminOnly, (req, res) => {
    const targetId = req.params.id;
    const { goi_dich_vu_id } = req.body || {};
    const db = loadDb();
    if (!db.goi_dich_vu.some((g) => g.id === goi_dich_vu_id)) {
      res.status(404).json({ error: 'Không tìm thấy gói dịch vụ.' });
      return;
    }
    updateDb((draft) => {
      const ent = draft.quyen_su_dung_goi.find((q) => q.tai_khoan_id === targetId);
      if (ent) {
        ent.goi_dich_vu_id = goi_dich_vu_id;
      } else {
        draft.quyen_su_dung_goi.push({
          id: generateId('ent'),
          tai_khoan_id: targetId,
          goi_dich_vu_id,
          luot_da_dung_thang: 0,
          thang_chu_ky: currentMonthKey(),
        });
      }
    });
    res.json({ ok: true });
  });

  // M17: Admin Catalog (Positions & Topics - UC22)
  app.get('/api/admin/catalog', authMiddleware, adminOnly, (_req, res) => {
    const db = loadDb();
    res.json({
      positions: db.vi_tri,
      topics: db.chu_de,
    });
  });

  app.post('/api/admin/positions', authMiddleware, adminOnly, (req, res) => {
    const { ten_vi_tri, mo_ta } = req.body || {};
    if (!String(ten_vi_tri || '').trim()) {
      res.status(400).json({ error: 'Tên vị trí không được để trống.' });
      return;
    }
    const created = updateDb((draft) => {
      const item = {
        id: generateId('pos'),
        ten_vi_tri: String(ten_vi_tri).trim(),
        mo_ta: String(mo_ta || '').trim(),
        trang_thai: 'ACTIVE' as const,
      };
      draft.vi_tri.push(item);
      return item;
    });
    res.status(201).json({ position: created });
  });

  app.put('/api/admin/positions/:id', authMiddleware, adminOnly, (req, res) => {
    const { ten_vi_tri, mo_ta, trang_thai } = req.body || {};
    const db = loadDb();
    if (!db.vi_tri.some((v) => v.id === req.params.id)) {
      res.status(404).json({ error: 'Không tìm thấy vị trí.' });
      return;
    }
    const updated = updateDb((draft) => {
      const target = draft.vi_tri.find((v) => v.id === req.params.id)!;
      if (ten_vi_tri) target.ten_vi_tri = String(ten_vi_tri).trim();
      if (typeof mo_ta === 'string') target.mo_ta = mo_ta.trim();
      if (trang_thai === 'ACTIVE' || trang_thai === 'HIDDEN') target.trang_thai = trang_thai;
      return target;
    });
    res.json({ position: updated });
  });

  app.post('/api/admin/topics', authMiddleware, adminOnly, (req, res) => {
    const { ten_chu_de, mo_ta, vi_tri_id } = req.body || {};
    if (!String(ten_chu_de || '').trim() || !vi_tri_id) {
      res.status(400).json({ error: 'Vui lòng nhập tên chủ đề và chọn vị trí tương ứng.' });
      return;
    }
    const created = updateDb((draft) => {
      const item = {
        id: generateId('top'),
        ten_chu_de: String(ten_chu_de).trim(),
        mo_ta: String(mo_ta || '').trim(),
        vi_tri_id: String(vi_tri_id),
        trang_thai: 'ACTIVE' as const,
      };
      draft.chu_de.push(item);
      return item;
    });
    res.status(201).json({ topic: created });
  });

  app.put('/api/admin/topics/:id', authMiddleware, adminOnly, (req, res) => {
    const { ten_chu_de, mo_ta, vi_tri_id, trang_thai } = req.body || {};
    const db = loadDb();
    if (!db.chu_de.some((c) => c.id === req.params.id)) {
      res.status(404).json({ error: 'Không tìm thấy chủ đề.' });
      return;
    }
    const updated = updateDb((draft) => {
      const target = draft.chu_de.find((c) => c.id === req.params.id)!;
      if (ten_chu_de) target.ten_chu_de = String(ten_chu_de).trim();
      if (typeof mo_ta === 'string') target.mo_ta = mo_ta.trim();
      if (vi_tri_id) target.vi_tri_id = String(vi_tri_id);
      if (trang_thai === 'ACTIVE' || trang_thai === 'HIDDEN') target.trang_thai = trang_thai;
      return target;
    });
    res.json({ topic: updated });
  });

  // M18: Admin Problems (UC23, UC24)
  app.get('/api/admin/problems', authMiddleware, adminOnly, (_req, res) => {
    const db = loadDb();
    const problems = db.bai_toan.map((p) => {
      const tests = db.test_case.filter((t) => t.bai_toan_id === p.id && t.trang_thai === 'ACTIVE');
      return {
        ...p,
        sample_count: tests.filter((t) => t.loai === 'SAMPLE').length,
        hidden_count: tests.filter((t) => t.loai === 'HIDDEN').length,
        session_count: db.phien_phong_van.filter((s) => s.bai_toan_id === p.id).length,
      };
    });
    res.json({ problems, positions: db.vi_tri, topics: db.chu_de });
  });

  app.post('/api/admin/problems', authMiddleware, adminOnly, (req, res) => {
    const body = req.body || {};
    if (!String(body.tieu_de || '').trim() || !body.vi_tri_id || !body.chu_de_id) {
      res.status(400).json({ error: 'Tiêu đề, vị trí và chủ đề là bắt buộc.' });
      return;
    }
    const now = new Date().toISOString();
    const fnName = String(body.ham_muc_tieu || 'solve').trim() || 'solve';
    const created = updateDb((draft) => {
      const item: BaiToan = {
        id: generateId('prob'),
        tieu_de: String(body.tieu_de).trim(),
        slug: String(body.tieu_de)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
        vi_tri_id: String(body.vi_tri_id),
        chu_de_id: String(body.chu_de_id),
        do_kho: (['EASY', 'MEDIUM', 'HARD'].includes(body.do_kho) ? body.do_kho : 'MEDIUM') as DifficultyLevel,
        mo_ta_chi_tiet: String(body.mo_ta_chi_tiet || '').trim(),
        yeu_cau_dau_vao: String(body.yeu_cau_dau_vao || '').trim(),
        yeu_cau_dau_ra: String(body.yeu_cau_dau_ra || '').trim(),
        rang_buoc: Array.isArray(body.rang_buoc) ? body.rang_buoc : [],
        ham_muc_tieu: fnName,
        code_mau: body.code_mau || {
          javascript: `function ${fnName}(input) {\n  \n}`,
          typescript: `function ${fnName}(input: unknown): unknown {\n  return null;\n}`,
          python: `def ${fnName}(input):\n    pass`,
        },
        goi_y_huong_dan: Array.isArray(body.goi_y_huong_dan) ? body.goi_y_huong_dan : [],
        thoi_luong_phut_mac_dinh: Math.max(10, Number(body.thoi_luong_phut_mac_dinh) || 30),
        trang_thai: 'DRAFT',
        ngay_tao: now,
        ngay_cap_nhat: now,
      };
      draft.bai_toan.push(item);
      return item;
    });
    res.status(201).json({ problem: created });
  });

  app.put('/api/admin/problems/:id', authMiddleware, adminOnly, (req, res) => {
    const body = req.body || {};
    const db = loadDb();
    if (!db.bai_toan.some((p) => p.id === req.params.id)) {
      res.status(404).json({ error: 'Không tìm thấy bài toán.' });
      return;
    }
    const updated = updateDb((draft) => {
      const target = draft.bai_toan.find((p) => p.id === req.params.id)!;
      if (body.tieu_de) target.tieu_de = String(body.tieu_de).trim();
      if (body.vi_tri_id) target.vi_tri_id = String(body.vi_tri_id);
      if (body.chu_de_id) target.chu_de_id = String(body.chu_de_id);
      if (['EASY', 'MEDIUM', 'HARD'].includes(body.do_kho)) target.do_kho = body.do_kho;
      if (typeof body.mo_ta_chi_tiet === 'string') target.mo_ta_chi_tiet = body.mo_ta_chi_tiet;
      if (typeof body.yeu_cau_dau_vao === 'string') target.yeu_cau_dau_vao = body.yeu_cau_dau_vao;
      if (typeof body.yeu_cau_dau_ra === 'string') target.yeu_cau_dau_ra = body.yeu_cau_dau_ra;
      if (Array.isArray(body.rang_buoc)) target.rang_buoc = body.rang_buoc;
      if (body.ham_muc_tieu) target.ham_muc_tieu = String(body.ham_muc_tieu).trim();
      if (body.code_mau) target.code_mau = body.code_mau;
      if (Array.isArray(body.goi_y_huong_dan)) target.goi_y_huong_dan = body.goi_y_huong_dan;
      if (body.thoi_luong_phut_mac_dinh) {
        target.thoi_luong_phut_mac_dinh = Math.max(10, Number(body.thoi_luong_phut_mac_dinh));
      }
      target.ngay_cap_nhat = new Date().toISOString();
      return target;
    });
    res.json({ problem: updated });
  });

  app.patch('/api/admin/problems/:id/status', authMiddleware, adminOnly, (req, res) => {
    const nextStatus = req.body?.trang_thai as PublishStatus;
    if (!['DRAFT', 'PUBLISHED', 'HIDDEN'].includes(nextStatus)) {
      res.status(400).json({ error: 'Trạng thái phát hành không hợp lệ.' });
      return;
    }

    const db = loadDb();
    const prob = db.bai_toan.find((p) => p.id === req.params.id);
    if (!prob) {
      res.status(404).json({ error: 'Không tìm thấy bài toán.' });
      return;
    }

    if (nextStatus === 'PUBLISHED') {
      const sampleCount = db.test_case.filter(
        (t) => t.bai_toan_id === prob.id && t.loai === 'SAMPLE' && t.trang_thai === 'ACTIVE'
      ).length;
      if (sampleCount < 1) {
        res.status(400).json({
          error: 'Bài toán cần có ít nhất 1 Test Case SAMPLE đang hoạt động trước khi phát hành (PUBLISHED).',
        });
        return;
      }
    }

    const updated = updateDb((draft) => {
      const target = draft.bai_toan.find((p) => p.id === req.params.id)!;
      target.trang_thai = nextStatus;
      target.ngay_cap_nhat = new Date().toISOString();
      return target;
    });
    res.json({ problem: updated });
  });

  // M19: Admin Test Cases (UC25)
  app.get('/api/admin/problems/:id/test-cases', authMiddleware, adminOnly, (req, res) => {
    const db = loadDb();
    const problem = db.bai_toan.find((p) => p.id === req.params.id);
    if (!problem) {
      res.status(404).json({ error: 'Không tìm thấy bài toán.' });
      return;
    }
    const testCases = db.test_case
      .filter((t) => t.bai_toan_id === problem.id)
      .sort((a, b) => a.thu_tu - b.thu_tu);
    res.json({ problem, testCases });
  });

  app.post('/api/admin/problems/:id/test-cases', authMiddleware, adminOnly, (req, res) => {
    const { ten_test, loai, dau_vao, dau_ra_mong_doi, giai_thich } = req.body || {};
    try {
      JSON.parse(String(dau_vao));
      JSON.parse(String(dau_ra_mong_doi));
    } catch {
      res.status(400).json({
        error: 'Đầu vào và đầu ra mong đợi phải là chuỗi JSON hợp lệ (ví dụ dau_vao: "[[2,7], 9]").',
      });
      return;
    }

    const created = updateDb((draft) => {
      const existingCount = draft.test_case.filter((t) => t.bai_toan_id === req.params.id).length;
      const tc: TestCase = {
        id: generateId('tc'),
        bai_toan_id: req.params.id,
        ten_test: String(ten_test || `Test #${existingCount + 1}`).trim(),
        loai: loai === 'HIDDEN' ? 'HIDDEN' : 'SAMPLE',
        dau_vao: String(dau_vao).trim(),
        dau_ra_mong_doi: String(dau_ra_mong_doi).trim(),
        giai_thich: giai_thich ? String(giai_thich).trim() : undefined,
        thu_tu: existingCount + 1,
        trang_thai: 'ACTIVE',
      };
      draft.test_case.push(tc);
      return tc;
    });

    res.status(201).json({ testCase: created });
  });

  app.put('/api/admin/test-cases/:id', authMiddleware, adminOnly, (req, res) => {
    const { ten_test, loai, dau_vao, dau_ra_mong_doi, giai_thich, trang_thai } = req.body || {};
    const db = loadDb();
    const existing = db.test_case.find((t) => t.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Không tìm thấy Test Case.' });
      return;
    }

    const prob = db.bai_toan.find((p) => p.id === existing.bai_toan_id);
    const nextLoai = loai === 'HIDDEN' || loai === 'SAMPLE' ? loai : existing.loai;
    const nextStatus = trang_thai === 'HIDDEN' || trang_thai === 'ACTIVE' ? trang_thai : existing.trang_thai;

    if (prob?.trang_thai === 'PUBLISHED' && existing.loai === 'SAMPLE' && (nextLoai === 'HIDDEN' || nextStatus === 'HIDDEN')) {
      const remainingSamples = db.test_case.filter(
        (t) =>
          t.bai_toan_id === prob.id &&
          t.id !== existing.id &&
          t.loai === 'SAMPLE' &&
          t.trang_thai === 'ACTIVE'
      ).length;
      if (remainingSamples < 1) {
        res.status(400).json({
          error: 'Không thể ẩn hoặc chuyển Test SAMPLE cuối cùng của bài toán đang PUBLISHED.',
        });
        return;
      }
    }

    try {
      if (dau_vao !== undefined) JSON.parse(String(dau_vao));
      if (dau_ra_mong_doi !== undefined) JSON.parse(String(dau_ra_mong_doi));
    } catch {
      res.status(400).json({ error: 'Đầu vào và đầu ra mong đợi phải là JSON hợp lệ.' });
      return;
    }

    const updated = updateDb((draft) => {
      const target = draft.test_case.find((t) => t.id === req.params.id)!;
      if (ten_test) target.ten_test = String(ten_test).trim();
      target.loai = nextLoai;
      target.trang_thai = nextStatus;
      if (dau_vao !== undefined) target.dau_vao = String(dau_vao).trim();
      if (dau_ra_mong_doi !== undefined) target.dau_ra_mong_doi = String(dau_ra_mong_doi).trim();
      if (typeof giai_thich === 'string') target.giai_thich = giai_thich.trim();
      return target;
    });

    res.json({ testCase: updated });
  });

  app.delete('/api/admin/test-cases/:id', authMiddleware, adminOnly, (req, res) => {
    const db = loadDb();
    const existing = db.test_case.find((t) => t.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Không tìm thấy Test Case.' });
      return;
    }
    const prob = db.bai_toan.find((p) => p.id === existing.bai_toan_id);
    if (prob?.trang_thai === 'PUBLISHED' && existing.loai === 'SAMPLE') {
      const remainingSamples = db.test_case.filter(
        (t) =>
          t.bai_toan_id === prob.id &&
          t.id !== existing.id &&
          t.loai === 'SAMPLE' &&
          t.trang_thai === 'ACTIVE'
      ).length;
      if (remainingSamples < 1) {
        res.status(400).json({
          error: 'Không thể xóa Test SAMPLE cuối cùng khi bài toán đang PUBLISHED.',
        });
        return;
      }
    }

    updateDb((draft) => {
      draft.test_case = draft.test_case.filter((t) => t.id !== req.params.id);
    });
    res.json({ ok: true });
  });

  // M20: Admin AI Content Generation & Draft Approval (UC26)
  app.get('/api/admin/ai-drafts', authMiddleware, adminOnly, (_req, res) => {
    const db = loadDb();
    res.json({
      drafts: db.ban_nhap_ai.slice().sort((a, b) => b.ngay_tao.localeCompare(a.ngay_tao)),
      positions: db.vi_tri,
      topics: db.chu_de,
    });
  });

  app.post('/api/admin/ai-drafts/generate', authMiddleware, adminOnly, async (req: AuthedRequest, res) => {
    const admin = req.authUser!;
    const { vi_tri_id, chu_de_id, do_kho, yeu_cau_prompt } = req.body || {};
    const db = loadDb();
    const pos = db.vi_tri.find((v) => v.id === vi_tri_id);
    const top = db.chu_de.find((c) => c.id === chu_de_id);
    if (!pos || !top) {
      res.status(400).json({ error: 'Vui lòng chọn vị trí và chủ đề hợp lệ.' });
      return;
    }

    const diff: DifficultyLevel = ['EASY', 'MEDIUM', 'HARD'].includes(do_kho) ? do_kho : 'MEDIUM';

    try {
      const generated = await generateProblemDraftWithAI({
        positionName: pos.ten_vi_tri,
        topicName: top.ten_chu_de,
        difficulty: diff,
        customPrompt: String(yeu_cau_prompt || ''),
      });

      const draftRecord = updateDb((draft) => {
        const rec = {
          id: generateId('aid'),
          admin_id: admin.id,
          vi_tri_id: pos.id,
          chu_de_id: top.id,
          do_kho: diff,
          yeu_cau_prompt: String(yeu_cau_prompt || ''),
          trang_thai: 'READY' as const,
          du_lieu_nhap: generated,
          ngay_tao: new Date().toISOString(),
        };
        draft.ban_nhap_ai.push(rec);
        return rec;
      });

      res.status(201).json({ draft: draftRecord });
    } catch (err) {
      res.status(502).json({
        error: `Sinh nháp bài toán bằng AI thất bại: ${extractGeminiErrorMessage(err)}`,
      });
    }
  });

  app.put('/api/admin/ai-drafts/:id/approve', authMiddleware, adminOnly, (req, res) => {
    const db = loadDb();
    const aiDraft = db.ban_nhap_ai.find((d) => d.id === req.params.id);
    if (!aiDraft || !aiDraft.du_lieu_nhap) {
      res.status(404).json({ error: 'Không tìm thấy bản nháp AI hợp lệ.' });
      return;
    }
    if (aiDraft.trang_thai === 'APPROVED') {
      res.status(400).json({ error: 'Bản nháp này đã được duyệt và lưu vào ngân hàng bài toán.' });
      return;
    }

    const payload = req.body?.du_lieu_nhap || aiDraft.du_lieu_nhap;
    const now = new Date().toISOString();

    const saved = updateDb((draft) => {
      const probId = generateId('prob');
      const newProblem: BaiToan = {
        id: probId,
        tieu_de: String(payload.tieu_de).trim(),
        slug: String(payload.tieu_de)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
        vi_tri_id: aiDraft.vi_tri_id,
        chu_de_id: aiDraft.chu_de_id,
        do_kho: aiDraft.do_kho,
        mo_ta_chi_tiet: String(payload.mo_ta_chi_tiet || ''),
        yeu_cau_dau_vao: String(payload.yeu_cau_dau_vao || ''),
        yeu_cau_dau_ra: String(payload.yeu_cau_dau_ra || ''),
        rang_buoc: Array.isArray(payload.rang_buoc) ? payload.rang_buoc : [],
        ham_muc_tieu: String(payload.ham_muc_tieu || 'solve').trim(),
        code_mau: payload.code_mau,
        goi_y_huong_dan: Array.isArray(payload.goi_y_huong_dan) ? payload.goi_y_huong_dan : [],
        thoi_luong_phut_mac_dinh: 30,
        trang_thai: 'DRAFT', // Must still be reviewed & published separately in M18
        ngay_tao: now,
        ngay_cap_nhat: now,
      };
      draft.bai_toan.push(newProblem);

      const tests = Array.isArray(payload.test_cases) ? payload.test_cases : [];
      tests.forEach((tc: any, idx: number) => {
        draft.test_case.push({
          id: generateId('tc'),
          bai_toan_id: probId,
          ten_test: String(tc.ten_test || `Test #${idx + 1}`),
          loai: tc.loai === 'HIDDEN' ? 'HIDDEN' : 'SAMPLE',
          dau_vao: String(tc.dau_vao),
          dau_ra_mong_doi: String(tc.dau_ra_mong_doi),
          giai_thich: tc.giai_thich ? String(tc.giai_thich) : undefined,
          thu_tu: idx + 1,
          trang_thai: 'ACTIVE',
        });
      });

      const targetDraft = draft.ban_nhap_ai.find((d) => d.id === aiDraft.id)!;
      targetDraft.du_lieu_nhap = payload;
      targetDraft.trang_thai = 'APPROVED';
      targetDraft.bai_toan_da_luu_id = probId;

      return { draft: targetDraft, problem: newProblem };
    });

    res.json(saved);
  });

  // M21: Admin Prompt Templates (UC27)
  app.get('/api/admin/prompts', authMiddleware, adminOnly, (_req, res) => {
    const db = loadDb();
    res.json({
      prompts: db.prompt_template,
      versions: db.phien_ban_prompt,
    });
  });

  app.post('/api/admin/prompts/:id/versions', authMiddleware, adminOnly, (req, res) => {
    const { noi_dung_system, noi_dung_user_template, mo_ta_thay_doi } = req.body || {};
    if (!String(noi_dung_system || '').trim()) {
      res.status(400).json({ error: 'Nội dung System Prompt không được để trống.' });
      return;
    }

    const db = loadDb();
    const tpl = db.prompt_template.find((p) => p.id === req.params.id);
    if (!tpl) {
      res.status(404).json({ error: 'Không tìm thấy mẫu Prompt.' });
      return;
    }

    const created = updateDb((draft) => {
      const targetTpl = draft.prompt_template.find((p) => p.id === req.params.id)!;
      const existingVersions = draft.phien_ban_prompt.filter((v) => v.prompt_id === targetTpl.id);
      const maxVer = existingVersions.reduce((m, v) => Math.max(m, v.so_phien_ban), 0);

      // Published versions remain immutable; archive old published version
      existingVersions.forEach((v) => {
        if (v.trang_thai === 'PUBLISHED') v.trang_thai = 'ARCHIVED';
      });

      const newVerId = generateId('pmtv');
      const newVer = {
        id: newVerId,
        prompt_id: targetTpl.id,
        so_phien_ban: maxVer + 1,
        noi_dung_system: String(noi_dung_system).trim(),
        noi_dung_user_template: String(noi_dung_user_template || '').trim(),
        mo_ta_thay_doi: String(mo_ta_thay_doi || 'Cập nhật phiên bản mới').trim(),
        trang_thai: 'PUBLISHED' as const,
        ngay_tao: new Date().toISOString(),
      };
      draft.phien_ban_prompt.push(newVer);
      targetTpl.phien_ban_hien_hanh_id = newVerId;
      return newVer;
    });

    res.status(201).json({ version: created });
  });

  // M22: Admin Rubrics (UC28)
  app.get('/api/admin/rubrics', authMiddleware, adminOnly, (_req, res) => {
    const db = loadDb();
    res.json({
      rubrics: db.rubric,
      versions: db.phien_ban_rubric,
    });
  });

  app.post('/api/admin/rubrics/:id/versions', authMiddleware, adminOnly, (req, res) => {
    const { tieu_chi, publish_now } = req.body || {};
    const criteriaList: TieuChiRubric[] = Array.isArray(tieu_chi) ? tieu_chi : [];

    if (criteriaList.length < 1) {
      res.status(400).json({ error: 'Rubric phải có ít nhất 1 tiêu chí đánh giá.' });
      return;
    }

    const totalWeight = criteriaList.reduce((sum, c) => sum + Number(c.trong_so || 0), 0);
    if (publish_now && Math.abs(totalWeight - 100) > 0.001) {
      res.status(400).json({
        error: `Tổng trọng số của các tiêu chí khi phát hành phải bằng đúng 100% (hiện tại: ${totalWeight}%).`,
      });
      return;
    }

    const db = loadDb();
    if (!db.rubric.some((r) => r.id === req.params.id)) {
      res.status(404).json({ error: 'Không tìm thấy Rubric.' });
      return;
    }

    const created = updateDb((draft) => {
      const targetRubric = draft.rubric.find((r) => r.id === req.params.id)!;
      const existingVersions = draft.phien_ban_rubric.filter((v) => v.rubric_id === targetRubric.id);
      const maxVer = existingVersions.reduce((m, v) => Math.max(m, v.so_phien_ban), 0);

      if (publish_now) {
        existingVersions.forEach((v) => {
          if (v.trang_thai === 'PUBLISHED') v.trang_thai = 'ARCHIVED';
        });
      }

      const newVerId = generateId('rubv');
      const newVer = {
        id: newVerId,
        rubric_id: targetRubric.id,
        so_phien_ban: maxVer + 1,
        tieu_chi: criteriaList.map((c) => ({
          id: c.id || generateId('crit'),
          ten_tieu_chi: String(c.ten_tieu_chi).trim(),
          mo_ta: String(c.mo_ta || '').trim(),
          trong_so: Number(c.trong_so),
          diem_toi_da: Math.max(1, Number(c.diem_toi_da) || 10),
        })),
        trang_thai: (publish_now ? 'PUBLISHED' : 'DRAFT') as 'PUBLISHED' | 'DRAFT',
        ngay_tao: new Date().toISOString(),
      };
      draft.phien_ban_rubric.push(newVer);
      if (publish_now) targetRubric.phien_ban_hien_hanh_id = newVerId;
      return newVer;
    });

    res.status(201).json({ version: created });
  });

  app.post('/api/admin/rubric-versions/:versionId/publish', authMiddleware, adminOnly, (req, res) => {
    const db = loadDb();
    const ver = db.phien_ban_rubric.find((v) => v.id === req.params.versionId);
    if (!ver) {
      res.status(404).json({ error: 'Không tìm thấy phiên bản Rubric.' });
      return;
    }
    if (ver.tieu_chi.length < 1) {
      res.status(400).json({ error: 'Rubric phải có ít nhất 1 tiêu chí.' });
      return;
    }
    const totalWeight = ver.tieu_chi.reduce((s, c) => s + Number(c.trong_so || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.001) {
      res.status(400).json({ error: `Tổng trọng số phải bằng 100% (hiện tại: ${totalWeight}%).` });
      return;
    }

    const updated = updateDb((draft) => {
      const target = draft.phien_ban_rubric.find((v) => v.id === ver.id)!;
      draft.phien_ban_rubric.forEach((v) => {
        if (v.rubric_id === target.rubric_id && v.trang_thai === 'PUBLISHED') {
          v.trang_thai = 'ARCHIVED';
        }
      });
      target.trang_thai = 'PUBLISHED';
      const parent = draft.rubric.find((r) => r.id === target.rubric_id);
      if (parent) parent.phien_ban_hien_hanh_id = target.id;
      return target;
    });

    res.json({ version: updated });
  });

  // M23: Admin Service Tiers & Quotas (UC29 - strictly no billing/checkout)
  app.get('/api/admin/tiers', authMiddleware, adminOnly, (_req, res) => {
    const db = loadDb();
    res.json({ tiers: db.goi_dich_vu });
  });

  app.post('/api/admin/tiers', authMiddleware, adminOnly, (req, res) => {
    const b = req.body || {};
    if (!String(b.ten_goi || '').trim()) {
      res.status(400).json({ error: 'Tên gói dịch vụ không được để trống.' });
      return;
    }
    const created = updateDb((draft) => {
      const tier = {
        id: generateId('tier'),
        ten_goi: String(b.ten_goi).trim(),
        doi_tuong: String(b.doi_tuong || '').trim(),
        mo_ta: String(b.mo_ta || '').trim(),
        gia_hien_thi: String(b.gia_hien_thi || '0 đ').trim(),
        chu_ky: String(b.chu_ky || 'Mỗi tháng').trim(),
        so_luot_phong_van_thang: Math.max(1, Number(b.so_luot_phong_van_thang) || 5),
        gioi_han_goi_y_phien: Math.max(0, Number(b.gioi_han_goi_y_phien) || 2),
        gioi_han_cv_mb: Math.max(1, Number(b.gioi_han_cv_mb) || 5),
        quyen_loi: Array.isArray(b.quyen_loi) ? b.quyen_loi : [],
        noi_bat: Boolean(b.noi_bat),
        trang_thai: (['DRAFT', 'PUBLISHED', 'HIDDEN'].includes(b.trang_thai) ? b.trang_thai : 'DRAFT') as PublishStatus,
      };
      draft.goi_dich_vu.push(tier);
      return tier;
    });
    res.status(201).json({ tier: created });
  });

  app.put('/api/admin/tiers/:id', authMiddleware, adminOnly, (req, res) => {
    const b = req.body || {};
    const db = loadDb();
    if (!db.goi_dich_vu.some((g) => g.id === req.params.id)) {
      res.status(404).json({ error: 'Không tìm thấy gói dịch vụ.' });
      return;
    }
    const updated = updateDb((draft) => {
      const target = draft.goi_dich_vu.find((g) => g.id === req.params.id)!;
      if (b.ten_goi) target.ten_goi = String(b.ten_goi).trim();
      if (typeof b.doi_tuong === 'string') target.doi_tuong = b.doi_tuong.trim();
      if (typeof b.mo_ta === 'string') target.mo_ta = b.mo_ta.trim();
      if (typeof b.gia_hien_thi === 'string') target.gia_hien_thi = b.gia_hien_thi.trim();
      if (typeof b.chu_ky === 'string') target.chu_ky = b.chu_ky.trim();
      if (b.so_luot_phong_van_thang !== undefined) {
        target.so_luot_phong_van_thang = Math.max(1, Number(b.so_luot_phong_van_thang));
      }
      if (b.gioi_han_goi_y_phien !== undefined) {
        target.gioi_han_goi_y_phien = Math.max(0, Number(b.gioi_han_goi_y_phien));
      }
      if (b.gioi_han_cv_mb !== undefined) {
        target.gioi_han_cv_mb = Math.max(1, Number(b.gioi_han_cv_mb));
      }
      if (Array.isArray(b.quyen_loi)) target.quyen_loi = b.quyen_loi;
      if (typeof b.noi_bat === 'boolean') target.noi_bat = b.noi_bat;
      if (['DRAFT', 'PUBLISHED', 'HIDDEN'].includes(b.trang_thai)) target.trang_thai = b.trang_thai;
      return target;
    });
    res.json({ tier: updated });
  });

  // M24: Admin Feedback Triage (UC30)
  app.get('/api/admin/feedback', authMiddleware, adminOnly, (_req, res) => {
    const db = loadDb();
    const list = db.phan_hoi
      .slice()
      .sort((a, b) => b.ngay_tao.localeCompare(a.ngay_tao))
      .map((f) => {
        const prof = db.ho_so.find((h) => h.tai_khoan_id === f.tai_khoan_id);
        const acc = db.tai_khoan.find((u) => u.id === f.tai_khoan_id);
        const prob = f.bai_toan_id ? db.bai_toan.find((p) => p.id === f.bai_toan_id) : undefined;
        return {
          ...f,
          user_name: prof?.ho_ten || 'Ứng viên',
          user_email: acc?.email || '',
          problem_title: prob?.tieu_de || null,
        };
      });
    res.json({ feedback: list });
  });

  app.patch('/api/admin/feedback/:id', authMiddleware, adminOnly, (req, res) => {
    const { trang_thai, ghi_chu_xu_ly } = req.body || {};
    if (!['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'].includes(trang_thai)) {
      res.status(400).json({ error: 'Trạng thái xử lý phản hồi không hợp lệ.' });
      return;
    }

    const db = loadDb();
    if (!db.phan_hoi.some((f) => f.id === req.params.id)) {
      res.status(404).json({ error: 'Không tìm thấy phản hồi.' });
      return;
    }

    const updated = updateDb((draft) => {
      const target = draft.phan_hoi.find((f) => f.id === req.params.id)!;
      target.trang_thai = trang_thai as FeedbackStatus;
      if (typeof ghi_chu_xu_ly === 'string') target.ghi_chu_xu_ly = ghi_chu_xu_ly.trim();
      target.ngay_cap_nhat = new Date().toISOString();
      return target;
    });

    res.json({ feedback: updated });
  });

  // ==================== VITE / STATIC SERVING ====================
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist'));
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aced.io VN server running on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

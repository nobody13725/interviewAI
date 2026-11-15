import { GoogleGenAI, Type } from '@google/genai';
import type {
  BaiToan,
  BanGhiHoiThoai,
  CVXacNhan,
  CodeLanguage,
  DifficultyLevel,
  KetQuaChayCode,
  TieuChiRubric,
} from './types.ts';

const GEMINI_MODEL = 'gemini-4-hydrogen';

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình trên máy chủ. Vui lòng thiết lập trong Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function extractGeminiErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return 'Lỗi không xác định khi gọi dịch vụ AI.';
}

export async function analyzeCvWithAI(rawText: string, fileName: string, systemPrompt?: string) {
  const ai = getClient();
  const prompt = `Phân tích nội dung CV sau đây (tệp: ${fileName}) và trích xuất thông tin cấu trúc bằng tiếng Việt để ứng viên kiểm tra lại trước khi phỏng vấn.\n\nNội dung CV:\n${rawText.slice(0, 14000)}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction:
        systemPrompt ||
        'Bạn là chuyên gia tuyển dụng kỹ thuật. Hãy trích xuất chính xác thông tin từ CV sang JSON thuần túy bằng tiếng Việt, không bịa đặt thông tin không có trong CV.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vi_tri_ung_tuyen: { type: Type.STRING, description: 'Vị trí kỹ thuật phù hợp nhất từ CV' },
          so_nam_kinh_nghiem: { type: Type.NUMBER, description: 'Số năm kinh nghiệm ước tính' },
          ky_nang_chinh: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Danh sách 5-10 kỹ năng kỹ thuật nổi bật',
          },
          du_an_noi_bat: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2-4 dự án hoặc kinh nghiệm làm việc nổi bật',
          },
          tom_tat_nang_luc: {
            type: Type.STRING,
            description: 'Tóm tắt 2-3 câu về nền tảng ứng viên bằng tiếng Việt',
          },
        },
        required: [
          'vi_tri_ung_tuyen',
          'so_nam_kinh_nghiem',
          'ky_nang_chinh',
          'du_an_noi_bat',
          'tom_tat_nang_luc',
        ],
      },
    },
  });

  const raw = (response.text ?? '{}').trim();
  return JSON.parse(raw) as {
    vi_tri_ung_tuyen: string;
    so_nam_kinh_nghiem: number;
    ky_nang_chinh: string[];
    du_an_noi_bat: string[];
    tom_tat_nang_luc: string;
  };
}

export async function generateInterviewOpening(params: {
  problem: BaiToan;
  positionName: string;
  topicName: string;
  cv?: CVXacNhan;
  systemPrompt?: string;
}): Promise<string> {
  const ai = getClient();
  const cvContext = params.cv
    ? `Thông tin CV đã xác nhận của ứng viên: Vị trí mục tiêu ${params.cv.vi_tri_ung_tuyen}, ${params.cv.so_nam_kinh_nghiem} năm kinh nghiệm, kỹ năng: ${params.cv.ky_nang_chinh.join(', ')}. Tóm tắt: ${params.cv.tom_tat_nang_luc}.`
    : 'Ứng viên chưa đính kèm CV.';

  const prompt = `Hãy đóng vai Giám khảo phỏng vấn kỹ thuật (AI Interviewer) chuyên nghiệp.
Bối cảnh phiên phỏng vấn:
- Vị trí: ${params.positionName}
- Chủ đề: ${params.topicName}
- Bài toán: ${params.problem.tieu_de} (Độ khó: ${params.problem.do_kho})
- Mô tả ngắn: ${params.problem.mo_ta_chi_tiet}
- ${cvContext}

Hãy viết lời chào ngắn gọn, chuyên nghiệp bằng tiếng Việt (3-4 câu), xác nhận bối cảnh và đặt 1 câu hỏi mở đầu yêu cầu ứng viên trình bày cách tiếp cận thuật toán/giải pháp trước khi code.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction:
        params.systemPrompt ||
        'Bạn là kỹ sư trưởng phỏng vấn ứng viên bằng tiếng Việt. Giao tiếp rõ ràng, khích lệ nhưng sắc bén về kỹ thuật. Tuyệt đối không tiết lộ lời giải hoàn chỉnh.',
    },
  });

  return (response.text ?? '').trim();
}

export async function generateInterviewReply(params: {
  problem: BaiToan;
  history: BanGhiHoiThoai[];
  candidateMessage: string;
  currentCode: string;
  language: CodeLanguage;
  cv?: CVXacNhan;
  systemPrompt?: string;
}): Promise<{ feedback: string; followUpQuestion: string }> {
  const ai = getClient();
  const transcript = params.history
    .slice(-10)
    .map((m) => `[${m.vai_tro} - ${m.loai}]: ${m.noi_dung}`)
    .join('\n');

  const prompt = `Bài toán: ${params.problem.tieu_de}
Ngôn ngữ đang viết: ${params.language}
Mã nguồn hiện tại của ứng viên:
\`\`\`${params.language}
${params.currentCode.slice(0, 4000)}
\`\`\`

Lịch sử hội thoại gần nhất:
${transcript}

Câu trả lời mới nhất của ứng viên:
"${params.candidateMessage}"

Hãy phản hồi ngắn gọn về lập luận của ứng viên và đặt 1 câu hỏi đào sâu (follow-up) về độ phức tạp thời gian/bộ nhớ, edge case hoặc thiết kế. Trả về JSON.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction:
        params.systemPrompt ||
        'Bạn là giám khảo phỏng vấn kỹ thuật tiếng Việt. Không đưa đáp án code hoàn chỉnh. Trả về phản hồi súc tích và 1 câu hỏi tiếp theo.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          feedback: {
            type: Type.STRING,
            description: 'Nhận xét ngắn gọn (1-2 câu) về câu trả lời/code hiện tại',
          },
          followUpQuestion: {
            type: Type.STRING,
            description: '1 câu hỏi đào sâu kỹ thuật tiếp theo bằng tiếng Việt',
          },
        },
        required: ['feedback', 'followUpQuestion'],
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim()) as {
    feedback: string;
    followUpQuestion: string;
  };
}

export async function generateDirectionalHint(params: {
  problem: BaiToan;
  currentCode: string;
  language: CodeLanguage;
  hintIndex: number;
  maxHints: number;
  systemPrompt?: string;
}): Promise<string> {
  const ai = getClient();
  const prompt = `Ứng viên đang xin gợi ý lần thứ ${params.hintIndex}/${params.maxHints} cho bài toán "${params.problem.tieu_de}".
Mô tả bài toán: ${params.problem.mo_ta_chi_tiet}
Mã nguồn hiện tại (${params.language}):
\`\`\`${params.language}
${params.currentCode.slice(0, 3500)}
\`\`\`

Hãy đưa ra MỘT gợi ý định hướng tư duy bằng tiếng Việt (tối đa 3 câu), giúp ứng viên nhận ra hướng tiếp cận hoặc lỗi logic/edge case mà KHÔNG viết ra lời giải code hoàn chỉnh.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction:
        params.systemPrompt ||
        'Bạn là mentor phỏng vấn kỹ thuật. Chỉ gợi ý định hướng thuật toán hoặc trường hợp biên; TUYỆT ĐỐI KHÔNG cung cấp full solution hoặc đoạn code hoàn chỉnh.',
    },
  });

  const hintText = (response.text ?? '').trim();
  if (!hintText) {
    throw new Error('Không nhận được nội dung gợi ý hợp lệ từ AI.');
  }
  return hintText;
}

export async function evaluateInterviewWithRubric(params: {
  problem: BaiToan;
  criteria: TieuChiRubric[];
  submittedCode: string;
  language: CodeLanguage;
  history: BanGhiHoiThoai[];
  submitRun?: KetQuaChayCode;
  cv?: CVXacNhan;
  systemPrompt?: string;
}) {
  const ai = getClient();
  const transcript = params.history
    .map((m) => `[${m.vai_tro} / ${m.loai}]: ${m.noi_dung}`)
    .join('\n');

  const testSummary = params.submitRun
    ? `Kết quả chạy test (gồm Sample + Hidden): ${params.submitRun.so_test_dat}/${params.submitRun.tong_test} test đạt.${
        params.submitRun.loi_bien_dich ? ` Lỗi biên dịch/thực thi: ${params.submitRun.loi_bien_dich}` : ''
      }`
    : 'Chưa có kết quả chạy test.';

  const criteriaSpec = params.criteria
    .map(
      (c) =>
        `- ID "${c.id}": ${c.ten_tieu_chi} (Trọng số: ${c.trong_so}%, Thang điểm tối đa: ${c.diem_toi_da}) — ${c.mo_ta}`
    )
    .join('\n');

  const prompt = `Hãy đánh giá toàn diện phiên phỏng vấn kỹ thuật sau theo đúng danh sách tiêu chí Rubric (FR33).

Bài toán: ${params.problem.tieu_de} (Độ khó: ${params.problem.do_kho})
Mô tả: ${params.problem.mo_ta_chi_tiet}
Ngôn ngữ: ${params.language}
${testSummary}

Mã nguồn ứng viên đã nộp:
\`\`\`${params.language}
${params.submittedCode.slice(0, 5000)}
\`\`\`

Lịch sử trao đổi trong phiên:
${transcript.slice(0, 6000)}

Danh sách tiêu chí Rubric bắt buộc chấm:
${criteriaSpec}

Yêu cầu trả về JSON tiếng Việt chính xác với điểm số từng tiêu chí từ 0 đến diem_toi_da tương ứng, kèm nhận xét cụ thể.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction:
        params.systemPrompt ||
        'Bạn là hội đồng đánh giá kỹ sư phần mềm. Hãy chấm điểm khách quan dựa trên độ đúng test case, chất lượng code và tư duy giao tiếp trong phiên.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nhan_xet_tong_quan: { type: Type.STRING },
          diem_manh: { type: Type.ARRAY, items: { type: Type.STRING } },
          diem_yeu: { type: Type.ARRAY, items: { type: Type.STRING } },
          buoc_tiep_theo: { type: Type.ARRAY, items: { type: Type.STRING } },
          chi_tiet_tieu_chi: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                tieu_chi_id: { type: Type.STRING },
                diem: { type: Type.NUMBER },
                nhan_xet: { type: Type.STRING },
              },
              required: ['tieu_chi_id', 'diem', 'nhan_xet'],
            },
          },
        },
        required: [
          'nhan_xet_tong_quan',
          'diem_manh',
          'diem_yeu',
          'buoc_tiep_theo',
          'chi_tiet_tieu_chi',
        ],
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim()) as {
    nhan_xet_tong_quan: string;
    diem_manh: string[];
    diem_yeu: string[];
    buoc_tiep_theo: string[];
    chi_tiet_tieu_chi: Array<{ tieu_chi_id: string; diem: number; nhan_xet: string }>;
  };
}

export async function generateRefactoringSuggestion(params: {
  problem: BaiToan;
  submittedCode: string;
  language: CodeLanguage;
  systemPrompt?: string;
}) {
  const ai = getClient();
  const prompt = `Đề xuất phương án tối ưu hóa (Refactoring) cho mã nguồn đã nộp dưới đây trong ngôn ngữ ${params.language}.
Bài toán: ${params.problem.tieu_de}
Mô tả: ${params.problem.mo_ta_chi_tiet}

Mã nguồn gốc ứng viên đã nộp:
\`\`\`${params.language}
${params.submittedCode.slice(0, 5000)}
\`\`\`

Hãy trả về phiên bản mã nguồn tối ưu hơn (sạch hơn, rõ ràng hơn hoặc tối ưu Big-O hơn) bằng ${params.language}, giữ nguyên tên hàm "${params.problem.ham_muc_tieu}", kèm giải thích các cải tiến bằng tiếng Việt.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction:
        params.systemPrompt ||
        'Bạn là Principal Engineer hướng dẫn code review & refactoring. Chỉ trả về JSON hợp lệ theo schema.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ma_nguon_toi_uu: { type: Type.STRING },
          giai_thich_cai_tien: { type: Type.ARRAY, items: { type: Type.STRING } },
          do_phuc_tap_truoc: { type: Type.STRING },
          do_phuc_tap_sau: { type: Type.STRING },
        },
        required: [
          'ma_nguon_toi_uu',
          'giai_thich_cai_tien',
          'do_phuc_tap_truoc',
          'do_phuc_tap_sau',
        ],
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim()) as {
    ma_nguon_toi_uu: string;
    giai_thich_cai_tien: string[];
    do_phuc_tap_truoc: string;
    do_phuc_tap_sau: string;
  };
}

export async function generateProblemDraftWithAI(params: {
  positionName: string;
  topicName: string;
  difficulty: DifficultyLevel;
  customPrompt: string;
}) {
  const ai = getClient();
  const prompt = `Hãy tạo một bản nháp bài toán phỏng vấn kỹ thuật hoàn chỉnh bằng tiếng Việt cho quản trị viên duyệt.
Thông số đầu vào:
- Vị trí: ${params.positionName}
- Chủ đề: ${params.topicName}
- Độ khó: ${params.difficulty}
- Yêu cầu bổ sung từ Admin: ${params.customPrompt || 'Tạo bài toán thực tế, có tính phân loại cao.'}

Quan trọng:
- "ham_muc_tieu" phải là tên hàm hợp lệ dạng camelCase (ví dụ: solveProblem).
- Mỗi test case phải có "dau_vao" là chuỗi JSON mảng tham số truyền vào hàm (ví dụ: "[[1,2,3], 4]") và "dau_ra_mong_doi" là chuỗi JSON kết quả trả về (ví dụ: "true").
- Phải có ít nhất 2 test SAMPLE và 2 test HIDDEN.
- Cung cấp starter code cho javascript, typescript, và python với đúng tên hàm.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction:
        'Bạn là kiến trúc sư ngân hàng đề thi kỹ thuật. Luôn trả về JSON hợp lệ, đầy đủ starter code 3 ngôn ngữ và test case chính xác.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tieu_de: { type: Type.STRING },
          mo_ta_chi_tiet: { type: Type.STRING },
          yeu_cau_dau_vao: { type: Type.STRING },
          yeu_cau_dau_ra: { type: Type.STRING },
          rang_buoc: { type: Type.ARRAY, items: { type: Type.STRING } },
          ham_muc_tieu: { type: Type.STRING },
          code_mau: {
            type: Type.OBJECT,
            properties: {
              javascript: { type: Type.STRING },
              typescript: { type: Type.STRING },
              python: { type: Type.STRING },
            },
            required: ['javascript', 'typescript', 'python'],
          },
          goi_y_huong_dan: { type: Type.ARRAY, items: { type: Type.STRING } },
          test_cases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ten_test: { type: Type.STRING },
                loai: { type: Type.STRING },
                dau_vao: { type: Type.STRING },
                dau_ra_mong_doi: { type: Type.STRING },
                giai_thich: { type: Type.STRING },
              },
              required: ['ten_test', 'loai', 'dau_vao', 'dau_ra_mong_doi'],
            },
          },
        },
        required: [
          'tieu_de',
          'mo_ta_chi_tiet',
          'yeu_cau_dau_vao',
          'yeu_cau_dau_ra',
          'rang_buoc',
          'ham_muc_tieu',
          'code_mau',
          'goi_y_huong_dan',
          'test_cases',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  return parsed as {
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
      loai: 'SAMPLE' | 'HIDDEN';
      dau_vao: string;
      dau_ra_mong_doi: string;
      giai_thich?: string;
    }>;
  };
}

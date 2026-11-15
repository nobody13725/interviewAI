import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import esbuild from 'esbuild';
import type { CodeLanguage, KetQuaTestChiTiet, TestCase } from './types.ts';

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, idx) => deepEqual(item, b[idx]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    );
  }
  return false;
}

function formatVal(val: unknown): string {
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

export interface SandboxExecutionSummary {
  so_test_dat: number;
  tong_test: number;
  so_hidden_dat: number;
  tong_hidden: number;
  stdout: string;
  loi_bien_dich?: string;
  chi_tiet_sample: KetQuaTestChiTiet[];
}

function runJsOrTsTests(
  code: string,
  language: 'javascript' | 'typescript',
  fnName: string,
  testCases: TestCase[],
  includeHiddenInDetail: boolean
): SandboxExecutionSummary {
  let jsCode = code;
  if (language === 'typescript') {
    try {
      const transformed = esbuild.transformSync(code, {
        loader: 'ts',
        target: 'es2022',
      });
      jsCode = transformed.code;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi biên dịch TypeScript';
      return {
        so_test_dat: 0,
        tong_test: testCases.length,
        so_hidden_dat: 0,
        tong_hidden: testCases.filter((t) => t.loai === 'HIDDEN').length,
        stdout: '',
        loi_bien_dich: msg,
        chi_tiet_sample: [],
      };
    }
  }

  const logs: string[] = [];
  const sandboxConsole = {
    log: (...args: unknown[]) => {
      if (logs.length < 40) {
        logs.push(args.map((a) => (typeof a === 'string' ? a : formatVal(a))).join(' '));
      }
    },
    warn: (...args: unknown[]) => {
      if (logs.length < 40) logs.push(args.map((a) => String(a)).join(' '));
    },
    error: (...args: unknown[]) => {
      if (logs.length < 40) logs.push(args.map((a) => String(a)).join(' '));
    },
  };

  const context = vm.createContext({
    console: sandboxConsole,
    Math,
    JSON,
    Array,
    Object,
    Map,
    Set,
    Number,
    String,
    Boolean,
    RegExp,
    Error,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
  });

  try {
    vm.runInContext(jsCode, context, { timeout: 1200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi cú pháp hoặc thực thi';
    return {
      so_test_dat: 0,
      tong_test: testCases.length,
      so_hidden_dat: 0,
      tong_hidden: testCases.filter((t) => t.loai === 'HIDDEN').length,
      stdout: logs.join('\n'),
      loi_bien_dich: msg,
      chi_tiet_sample: [],
    };
  }

  let targetFn = (context as Record<string, unknown>)[fnName];
  if (typeof targetFn !== 'function') {
    // Try finding any user-defined function in context
    const fnMatch = jsCode.match(/function\s+([A-Za-z0-9_]+)/) || jsCode.match(/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=/);
    if (fnMatch && typeof (context as Record<string, unknown>)[fnMatch[1]] === 'function') {
      targetFn = (context as Record<string, unknown>)[fnMatch[1]];
    }
  }

  if (typeof targetFn !== 'function') {
    return {
      so_test_dat: 0,
      tong_test: testCases.length,
      so_hidden_dat: 0,
      tong_hidden: testCases.filter((t) => t.loai === 'HIDDEN').length,
      stdout: logs.join('\n'),
      loi_bien_dich: `Không tìm thấy hàm mục tiêu '${fnName}'. Vui lòng giữ đúng tên hàm đề bài yêu cầu.`,
      chi_tiet_sample: [],
    };
  }

  let passed = 0;
  let hiddenPassed = 0;
  let hiddenTotal = 0;
  const sampleDetails: KetQuaTestChiTiet[] = [];

  for (const tc of testCases) {
    if (tc.loai === 'HIDDEN') hiddenTotal++;
    const start = performance.now();
    let dat = false;
    let actualVal: unknown;
    let errMsg: string | undefined;

    try {
      const args = JSON.parse(tc.dau_vao);
      const expected = JSON.parse(tc.dau_ra_mong_doi);
      const callArgs = Array.isArray(args) ? args : [args];
      (context as Record<string, unknown>).__testArgs = structuredClone(callArgs);
      (context as Record<string, unknown>).__targetFn = targetFn;
      actualVal = vm.runInContext('__targetFn(...__testArgs)', context, { timeout: 1000 });
      dat = deepEqual(actualVal, expected);
    } catch (err) {
      errMsg = err instanceof Error ? err.message : 'Lỗi thực thi test case';
      dat = false;
    }

    const duration = Math.max(1, Math.round(performance.now() - start));
    if (dat) {
      passed++;
      if (tc.loai === 'HIDDEN') hiddenPassed++;
    }

    if (tc.loai === 'SAMPLE' || includeHiddenInDetail) {
      sampleDetails.push({
        test_case_id: tc.id,
        ten_test: tc.ten_test,
        loai: tc.loai,
        dat,
        dau_vao: tc.dau_vao,
        dau_ra_mong_doi: tc.dau_ra_mong_doi,
        dau_ra_thuc_te: errMsg ? undefined : formatVal(actualVal),
        thong_bao_loi: errMsg,
        thoi_gian_ms: duration,
      });
    }
  }

  return {
    so_test_dat: passed,
    tong_test: testCases.length,
    so_hidden_dat: hiddenPassed,
    tong_hidden: hiddenTotal,
    stdout: logs.join('\n'),
    chi_tiet_sample: sampleDetails,
  };
}

function runPythonTests(
  code: string,
  fnName: string,
  testCases: TestCase[],
  includeHiddenInDetail: boolean
): SandboxExecutionSummary {
  const payload = JSON.stringify({
    code,
    fnName,
    tests: testCases.map((tc) => ({
      id: tc.id,
      ten_test: tc.ten_test,
      loai: tc.loai,
      dau_vao: tc.dau_vao,
      dau_ra_mong_doi: tc.dau_ra_mong_doi,
    })),
  });

  const runnerScript = `
import json, sys, io, time, copy
from contextlib import redirect_stdout

data = json.loads(sys.stdin.read())
user_code = data["code"]
fn_name = data["fnName"]
tests = data["tests"]

ns = {}
stdout_buf = io.StringIO()
try:
    with redirect_stdout(stdout_buf):
        exec(user_code, ns)
except Exception as e:
    print(json.dumps({
        "compileError": str(e),
        "stdout": stdout_buf.getvalue(),
        "results": []
    }))
    sys.exit(0)

fn = ns.get(fn_name)
if not callable(fn):
    for k, v in ns.items():
        if not k.startswith("__") and callable(v):
            fn = v
            break

if not callable(fn):
    print(json.dumps({
        "compileError": f"Không tìm thấy hàm '{fn_name}' trong mã Python.",
        "stdout": stdout_buf.getvalue(),
        "results": []
    }))
    sys.exit(0)

results = []
for tc in tests:
    t0 = time.perf_counter()
    try:
        args = json.loads(tc["dau_vao"])
        expected = json.loads(tc["dau_ra_mong_doi"])
        call_args = args if isinstance(args, list) else [args]
        with redirect_stdout(stdout_buf):
            actual = fn(*copy.deepcopy(call_args))
        ok = (actual == expected) and (type(actual) is type(expected) or (isinstance(actual, (int, float)) and isinstance(expected, (int, float)) and not isinstance(actual, bool) and not isinstance(expected, bool)))
        results.append({
            "id": tc["id"],
            "dat": bool(ok),
            "actual": json.dumps(actual),
            "err": None,
            "ms": max(1, int((time.perf_counter() - t0) * 1000))
        })
    except Exception as e:
        results.append({
            "id": tc["id"],
            "dat": False,
            "actual": None,
            "err": str(e),
            "ms": max(1, int((time.perf_counter() - t0) * 1000))
        })

print(json.dumps({
    "compileError": None,
    "stdout": stdout_buf.getvalue(),
    "results": results
}))
`;

  try {
    const output = execFileSync('python3', ['-c', runnerScript], {
      input: payload,
      encoding: 'utf-8',
      timeout: 2500,
    });
    const parsed = JSON.parse(output.trim());
    if (parsed.compileError) {
      return {
        so_test_dat: 0,
        tong_test: testCases.length,
        so_hidden_dat: 0,
        tong_hidden: testCases.filter((t) => t.loai === 'HIDDEN').length,
        stdout: parsed.stdout || '',
        loi_bien_dich: parsed.compileError,
        chi_tiet_sample: [],
      };
    }

    const resultMap = new Map<string, { dat: boolean; actual: string | null; err: string | null; ms: number }>();
    for (const r of parsed.results) {
      resultMap.set(r.id, r);
    }

    let passed = 0;
    let hiddenPassed = 0;
    let hiddenTotal = 0;
    const sampleDetails: KetQuaTestChiTiet[] = [];

    for (const tc of testCases) {
      if (tc.loai === 'HIDDEN') hiddenTotal++;
      const res = resultMap.get(tc.id);
      const dat = Boolean(res?.dat);
      if (dat) {
        passed++;
        if (tc.loai === 'HIDDEN') hiddenPassed++;
      }
      if (tc.loai === 'SAMPLE' || includeHiddenInDetail) {
        sampleDetails.push({
          test_case_id: tc.id,
          ten_test: tc.ten_test,
          loai: tc.loai,
          dat,
          dau_vao: tc.dau_vao,
          dau_ra_mong_doi: tc.dau_ra_mong_doi,
          dau_ra_thuc_te: res?.actual ?? undefined,
          thong_bao_loi: res?.err ?? undefined,
          thoi_gian_ms: res?.ms ?? 1,
        });
      }
    }

    return {
      so_test_dat: passed,
      tong_test: testCases.length,
      so_hidden_dat: hiddenPassed,
      tong_hidden: hiddenTotal,
      stdout: parsed.stdout || '',
      chi_tiet_sample: sampleDetails,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Python 3 sandbox timeout hoặc không khả dụng';
    return {
      so_test_dat: 0,
      tong_test: testCases.length,
      so_hidden_dat: 0,
      tong_hidden: testCases.filter((t) => t.loai === 'HIDDEN').length,
      stdout: '',
      loi_bien_dich: `Không thể chạy Python sandbox: ${msg}`,
      chi_tiet_sample: [],
    };
  }
}

export function executeSandboxTests(
  code: string,
  language: CodeLanguage,
  fnName: string,
  testCases: TestCase[],
  mode: 'SAMPLE_ONLY' | 'ALL_FOR_SUBMIT'
): SandboxExecutionSummary {
  const activeTests = testCases.filter((t) => t.trang_thai === 'ACTIVE');
  const targetTests =
    mode === 'SAMPLE_ONLY' ? activeTests.filter((t) => t.loai === 'SAMPLE') : activeTests;

  if (language === 'python') {
    return runPythonTests(code, fnName, targetTests, false);
  }
  return runJsOrTsTests(code, language, fnName, targetTests, false);
}

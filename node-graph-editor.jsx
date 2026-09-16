import React, { useState, useRef, useCallback, useEffect } from "react";

// ---------- constants ----------
const W = { general: 200, static: 168, variable: 168, formula: 220 };
const H = { general: 108, static: 86, variable: 78, formula: 118 };
const DATA_TYPES = ["number", "string", "boolean"];
const MARGIN = 14; // hover hit-zone padding around each node, ports live in here

// pixel layout constants for a formula node's stacked input/output rows - kept in
// sync with the .formula-io-row / .formula-expr CSS below so ports line up exactly.
const FORMULA_BODY_TOP = 84; // distance from node top to the first io row's center-line zone
const FORMULA_ROW_H = 24;

const ANCHORS = {
  N: { fx: 0.5, fy: 0, nx: 0, ny: -1 },
  S: { fx: 0.5, fy: 1, nx: 0, ny: 1 },
  E: { fx: 1, fy: 0.5, nx: 1, ny: 0 },
  W: { fx: 0, fy: 0.5, nx: -1, ny: 0 },
  NE: { fx: 1, fy: 0, nx: 0.7071, ny: -0.7071 },
  NW: { fx: 0, fy: 0, nx: -0.7071, ny: -0.7071 },
  SE: { fx: 1, fy: 1, nx: 0.7071, ny: 0.7071 },
  SW: { fx: 0, fy: 1, nx: -0.7071, ny: 0.7071 },
};
const ANCHOR_LIST = Object.keys(ANCHORS);
const PORT_SIZE = {
  N: { w: 22, h: 8 }, S: { w: 22, h: 8 },
  E: { w: 8, h: 22 }, W: { w: 8, h: 22 },
  NE: { w: 11, h: 11 }, NW: { w: 11, h: 11 }, SE: { w: 11, h: 11 }, SW: { w: 11, h: 11 },
};
const FORMULA_PORT_SIZE = { w: 13, h: 13 };

const NODE_THEME = {
  dark: {
    general: { bg: "#2B2A26", border: "#57524A", accent: "#C9BFA8", text: "#EDE7DA" },
    static: { bg: "#33241A", border: "#8A5A2E", accent: "#E0954D", text: "#F5E3C8" },
    variable: { bg: "#241B33", border: "#6A4F9C", accent: "#B592E8", text: "#EAE0F7" },
    formula: { bg: "#122B2D", border: "#2F6E76", accent: "#6FD3DE", text: "#DFF3F5" },
    error: "#E15C5C", dataEdge: "#5FD0C0", linkEdge: "#7B8098",
  },
  light: {
    general: { bg: "#EFEAE0", border: "#B9AF9C", accent: "#6B6248", text: "#3A3628" },
    static: { bg: "#FCEFDA", border: "#D98F3F", accent: "#A6621C", text: "#5B3A10" },
    variable: { bg: "#F1E9FB", border: "#9B7FD1", accent: "#6E48AE", text: "#3C2A5C" },
    formula: { bg: "#E3F5F6", border: "#4FA8B3", accent: "#1F6E78", text: "#123A3E" },
    error: "#D14343", dataEdge: "#1E9C8A", linkEdge: "#8991A6",
  },
};

const THEME_VARS = {
  dark: {
    "--bg-app": "#0F1016", "--bg-topbar": "#14151D", "--bg-sidebar": "#14151D",
    "--border-subtle": "#22242F", "--text-primary": "#EDE7DA", "--text-muted": "#767C93",
    "--bg-canvas": "#0F1016", "--grid-dot": "#20222E", "--input-bg": "#1B1C26",
    "--input-border": "#2C2E3C", "--row-bg": "#191A24", "--row-border": "#262837",
    "--btn-bg": "#2A2C3A", "--btn-border": "#3A3D50", "--btn-text": "#C9CCDB",
    "--btn-bg-hover": "#333648", "--label-bg": "#1B1C26", "--selection-ring": "#5B9DFF",
  },
  light: {
    "--bg-app": "#F4F5F9", "--bg-topbar": "#FFFFFF", "--bg-sidebar": "#FFFFFF",
    "--border-subtle": "#E2E4EC", "--text-primary": "#1E2130", "--text-muted": "#6B7086",
    "--bg-canvas": "#EEF0F6", "--grid-dot": "#D8DBE6", "--input-bg": "#FFFFFF",
    "--input-border": "#D5D8E3", "--row-bg": "#FAFAFD", "--row-border": "#E5E7EF",
    "--btn-bg": "#EDEFF6", "--btn-border": "#D5D8E3", "--btn-text": "#3A3F55",
    "--btn-bg-hover": "#E2E5F0", "--label-bg": "#FFFFFF", "--selection-ring": "#2563EB",
  },
};

let uid = 1;
const nextId = (prefix) => `${prefix}_${uid++}`;
const emptyGraph = () => ({ nodes: [], edges: [], variables: [] });

// ---------- i18n ----------
const TEXT = {
  en: {
    hint: "Drag from the left panel · right-click/middle-click drag to pan the canvas · Ctrl+scroll to zoom · select a node and press Delete to remove it",
    undo: "Undo", redo: "Redo",
    title_undo: "Undo (Ctrl+Z)", title_redo: "Redo (Ctrl+Y)",
    delete: "🗑 Delete", title_delete: "Delete selected nodes (Delete/Backspace)",
    title_zoom_out: "Zoom out", title_zoom_reset: "Reset to 100%", title_zoom_in: "Zoom in",
    theme_day: "☀ Day", theme_night: "☾ Night", lang_btn: "TH",
    heading_file: "File", heading_nodes: "Basic Nodes", heading_variables: "Variables", heading_lines: "Lines",
    placeholder_filename: "File name",
    btn_save: "💾 Save (.rpggraph)", btn_open: "📂 Open File",
    label_general: "General Node", sub_general: "Links freely to anything, doesn't compute",
    label_static: "Static Node", sub_static: "Enter a constant value, connects from any side",
    label_formula: "Formula Node", sub_formula: "e.g. answer = x + 50",
    placeholder_varname: "Variable name, e.g. STR",
    btn_declare: "Declare Variable",
    empty_vars: "No variables yet — declare one above",
    title_delete_var: "Delete variable",
    legend_data: "Calculation line (data)", legend_link: "Just a link (mindmap)",
    placeholder_edge_label: "Line label...",
    node_general: "General", node_static: "Static", node_formula: "Formula",
    node_get: "Get · {name}", node_set: "Set · {name}",
    placeholder_general_text: "Write anything...",
    placeholder_formula_expr: "e.g. answer = x + 50",
    val_no_value: "— no value", val_waiting: "waiting for value",

    err_invalid_json: "Not a valid JSON file",
    err_unknown_char: 'Unknown character: "{c}"',
    err_expected: 'Expected "{type}" but got {got}',
    err_end_of_expr: "end of expression",
    err_incomplete_expr: "Incomplete expression",
    err_unexpected_token: 'Unexpected token: "{type}"',
    err_trailing_chars: "Unexpected characters after the expression",
    err_var_not_found: 'Variable "{name}" not found',
    err_unknown_func: 'Unknown function "{name}"',
    err_bad_ast: "Invalid expression",
    err_no_formula: "No formula entered yet",
    err_need_equals: "Must include an = sign, e.g. answer = x + 50",
    err_bad_output_name: "The result name (left of =) must be a valid variable name",
    err_no_rhs: "No expression entered on the right side of =",
    err_input_source_deleted: 'input "{name}": source was deleted',
    err_input_needs_number: 'input "{name}": expected a number but got {type}',
    err_input_default_invalid: 'input "{name}": default value is not a number',
    err_result_invalid: "Result is not a valid number (e.g. divide by zero)",
    err_calc_failed: "Calculation error: {message}",
    err_static_mismatch: "Constant value doesn't match its data type",
    err_var_circular: "Circular variable reference",
    err_no_value: "No value yet",
    err_not_output_port: "This port is not a formula's output",
    err_formula_circular: "Circular formula reference",
    err_source_unsupported: "This source can't provide a value",
    err_need_name: "Needs a name",
    err_dup_name: "Duplicate name with another variable",
    err_source_deleted: "Source was deleted",
    err_static_value_mismatch: "Current value doesn't match type {type}",
    err_var_deleted: "Variable has been deleted",
    err_type_mismatch: "Type mismatch: expected {expected} but got {got}",
    import_partial: "Imported successfully (skipped {count} incomplete items)",
    import_success: "File imported successfully",
    import_failed: "Failed to open file: {message}",
    import_read_failed: "Failed to read file",
  },
  th: {
    hint: "ลากจากแถบซ้าย · คลิกขวา/กลางค้างเพื่อเลื่อน canvas · Ctrl+เลื่อนล้อเมาส์เพื่อซูม · เลือก node แล้วกด Delete เพื่อลบ",
    undo: "เลิกทำ", redo: "ทำซ้ำ",
    title_undo: "เลิกทำ (Ctrl+Z)", title_redo: "ทำซ้ำ (Ctrl+Y)",
    delete: "🗑 ลบ", title_delete: "ลบ node ที่เลือก (Delete/Backspace)",
    title_zoom_out: "ซูมออก", title_zoom_reset: "รีเซ็ตเป็น 100%", title_zoom_in: "ซูมเข้า",
    theme_day: "☀ กลางวัน", theme_night: "☾ กลางคืน", lang_btn: "EN",
    heading_file: "ไฟล์", heading_nodes: "Node พื้นฐาน", heading_variables: "ตัวแปร", heading_lines: "เส้น",
    placeholder_filename: "ชื่อไฟล์",
    btn_save: "💾 บันทึก (.rpggraph)", btn_open: "📂 เปิดไฟล์",
    label_general: "General Node", sub_general: "โน้ตเชื่อมได้อิสระ ไม่คำนวณ",
    label_static: "Static Node", sub_static: "ใส่ค่าคงที่ ต่อได้ทุกทิศ",
    label_formula: "Formula Node", sub_formula: "เช่น answer = x + 50",
    placeholder_varname: "ชื่อตัวแปร เช่น STR",
    btn_declare: "ประกาศตัวแปร",
    empty_vars: "ยังไม่มีตัวแปร — ประกาศด้านบนก่อน",
    title_delete_var: "ลบตัวแปร",
    legend_data: "เส้นคำนวณ (data)", legend_link: "เส้นโยงเฉยๆ (mindmap)",
    placeholder_edge_label: "ชื่อเส้น...",
    node_general: "General", node_static: "Static", node_formula: "Formula",
    node_get: "Get · {name}", node_set: "Set · {name}",
    placeholder_general_text: "เขียนอะไรก็ได้...",
    placeholder_formula_expr: "เช่น answer = x + 50",
    val_no_value: "— ไม่มีค่า", val_waiting: "รอค่า",

    err_invalid_json: "ไฟล์ไม่ใช่ JSON ที่ถูกต้อง",
    err_unknown_char: 'อักขระที่ไม่รู้จัก: "{c}"',
    err_expected: 'คาดหวัง "{type}" แต่เจอ {got}',
    err_end_of_expr: "จุดจบของนิพจน์",
    err_incomplete_expr: "นิพจน์ไม่สมบูรณ์",
    err_unexpected_token: 'โทเค็นที่ไม่คาดคิด: "{type}"',
    err_trailing_chars: "มีอักขระเกินหลังนิพจน์",
    err_var_not_found: 'ไม่พบตัวแปร "{name}"',
    err_unknown_func: 'ไม่รู้จักฟังก์ชัน "{name}"',
    err_bad_ast: "นิพจน์ผิดพลาด",
    err_no_formula: "ยังไม่ได้ใส่สูตร",
    err_need_equals: "ต้องมีเครื่องหมาย = เช่น answer = x + 50",
    err_bad_output_name: "ชื่อผลลัพธ์ (ซ้ายของ =) ต้องเป็นชื่อตัวแปรที่ถูกต้อง",
    err_no_rhs: "ยังไม่ได้ใส่นิพจน์ฝั่งขวาของ =",
    err_input_source_deleted: 'input "{name}": ต้นทางถูกลบ',
    err_input_needs_number: 'input "{name}": ต้องการตัวเลข แต่ได้ {type}',
    err_input_default_invalid: 'input "{name}": ค่าเริ่มต้นไม่ใช่ตัวเลข',
    err_result_invalid: "ผลลัพธ์ไม่ใช่ตัวเลขที่ถูกต้อง (เช่น หารด้วย 0)",
    err_calc_failed: "คำนวณผิดพลาด: {message}",
    err_static_mismatch: "ค่าคงที่ไม่ตรงกับชนิดข้อมูล",
    err_var_circular: "ตัวแปรอ้างอิงถึงกันเป็นวงกลม",
    err_no_value: "ยังไม่มีค่า",
    err_not_output_port: "พอร์ตนี้ไม่ใช่ output ของสูตร",
    err_formula_circular: "สูตรอ้างอิงตัวเองเป็นวงกลม",
    err_source_unsupported: "ต้นทางนี้ไม่รองรับการส่งค่า",
    err_need_name: "ต้องมีชื่อ",
    err_dup_name: "ชื่อซ้ำกับตัวแปรอื่น",
    err_source_deleted: "ต้นทางถูกลบ",
    err_static_value_mismatch: "ค่าปัจจุบันไม่ตรงกับชนิด {type}",
    err_var_deleted: "ตัวแปรถูกลบไปแล้ว",
    err_type_mismatch: "ชนิดไม่ตรง: ต้องการ {expected} แต่ได้ {got}",
    import_partial: "นำเข้าสำเร็จ (ข้ามไป {count} รายการที่ข้อมูลไม่สมบูรณ์)",
    import_success: "นำเข้าไฟล์สำเร็จ",
    import_failed: "เปิดไฟล์ไม่สำเร็จ: {message}",
    import_read_failed: "อ่านไฟล์ไม่สำเร็จ",
  },
};

// module-level "current language" so plain helper functions (outside the component) can also
// produce localized error messages without threading a `lang` argument through every call.
// The component syncs this synchronously at the top of every render (see NodeGraphEditor below).
let currentLang = "en";
function T(key, vars) {
  const dict = TEXT[currentLang] || TEXT.en;
  let str = dict[key] ?? TEXT.en[key] ?? key;
  if (vars) Object.keys(vars).forEach((k) => { str = str.split(`{${k}}`).join(String(vars[k])); });
  return str;
}

// best-effort validation for imported .rpggraph files: keep only well-formed entries rather than
// crashing outright on a corrupted or hand-edited file.
function validateGraph(parsed) {
  if (!parsed || typeof parsed !== "object") throw new Error(T("err_invalid_json"));
  const nodes = Array.isArray(parsed.nodes)
    ? parsed.nodes.filter((n) => n && typeof n.id === "string" && typeof n.kind === "string" && typeof n.x === "number" && typeof n.y === "number")
    : [];
  const variables = Array.isArray(parsed.variables)
    ? parsed.variables.filter((v) => v && typeof v.id === "string" && typeof v.name === "string" && DATA_TYPES.includes(v.dataType))
    : [];
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = Array.isArray(parsed.edges)
    ? parsed.edges.filter((e) => e && typeof e.id === "string" && nodeIds.has(e.from) && nodeIds.has(e.to) && typeof e.fromAnchor === "string" && typeof e.toAnchor === "string")
    : [];
  const droppedCount =
    (Array.isArray(parsed.nodes) ? parsed.nodes.length - nodes.length : 0) +
    (Array.isArray(parsed.edges) ? parsed.edges.length - edges.length : 0) +
    (Array.isArray(parsed.variables) ? parsed.variables.length - variables.length : 0);
  return { graph: { nodes, edges, variables }, droppedCount };
}

// ---------- static value coercion ----------
function coerceStaticValue(node) {
  const raw = (node.value ?? "").trim();
  if (node.dataType === "number") {
    // plain decimal only - rejects JS quirks like "0x10", "1e3", "+5", "Infinity"
    if (!/^-?\d+(\.\d+)?$/.test(raw)) return { ok: false };
    return { ok: true, value: Number(raw) };
  }
  if (node.dataType === "boolean") {
    if (raw.toLowerCase() === "true") return { ok: true, value: true };
    if (raw.toLowerCase() === "false") return { ok: true, value: false };
    return { ok: false };
  }
  return { ok: true, value: node.value ?? "" };
}

// ---------- tiny safe expression engine for formula nodes (no eval/Function) ----------
const FORMULA_FUNCS = {
  min: Math.min, max: Math.max, floor: Math.floor, ceil: Math.ceil,
  round: Math.round, abs: Math.abs, sqrt: Math.sqrt, pow: Math.pow,
  clamp: (v, lo, hi) => Math.min(Math.max(v, lo), hi),
};

function tokenizeExpr(str) {
  const tokens = [];
  let i = 0;
  while (i < str.length) {
    const c = str[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < str.length && /[0-9.]/.test(str[j])) j++;
      tokens.push({ type: "num", value: parseFloat(str.slice(i, j)) });
      i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < str.length && /[A-Za-z0-9_]/.test(str[j])) j++;
      tokens.push({ type: "ident", value: str.slice(i, j) });
      i = j; continue;
    }
    if ("+-*/%^(),".includes(c)) { tokens.push({ type: c }); i++; continue; }
    throw new Error(T("err_unknown_char", { c }));
  }
  return tokens;
}

function parseExprTokens(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (type) => {
    const t = tokens[pos];
    if (!t || (type && t.type !== type)) throw new Error(T("err_expected", { type, got: t ? t.type : T("err_end_of_expr") }));
    pos++; return t;
  };
  function parseExpr() {
    let node = parseTerm();
    while (peek() && (peek().type === "+" || peek().type === "-")) {
      const op = eat().type;
      node = { type: "bin", op, left: node, right: parseTerm() };
    }
    return node;
  }
  function parseTerm() {
    let node = parseUnary();
    while (peek() && (peek().type === "*" || peek().type === "/" || peek().type === "%")) {
      const op = eat().type;
      node = { type: "bin", op, left: node, right: parseUnary() };
    }
    return node;
  }
  function parseUnary() {
    if (peek() && (peek().type === "-" || peek().type === "+")) {
      const op = eat().type;
      return { type: "unary", op, value: parseUnary() };
    }
    return parsePow();
  }
  function parsePow() {
    let node = parsePrimary();
    if (peek() && peek().type === "^") {
      eat("^");
      node = { type: "bin", op: "^", left: node, right: parseUnary() };
    }
    return node;
  }
  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error(T("err_incomplete_expr"));
    if (t.type === "num") { eat(); return { type: "num", value: t.value }; }
    if (t.type === "ident") {
      eat();
      if (peek() && peek().type === "(") {
        eat("(");
        const args = [];
        if (peek() && peek().type !== ")") {
          args.push(parseExpr());
          while (peek() && peek().type === ",") { eat(","); args.push(parseExpr()); }
        }
        eat(")");
        return { type: "call", name: t.value, args };
      }
      return { type: "ident", name: t.value };
    }
    if (t.type === "(") { eat("("); const node = parseExpr(); eat(")"); return node; }
    throw new Error(T("err_unexpected_token", { type: t.type }));
  }
  const ast = parseExpr();
  if (pos !== tokens.length) throw new Error(T("err_trailing_chars"));
  return ast;
}

function evaluateAst(node, vars) {
  switch (node.type) {
    case "num": return node.value;
    case "ident":
      if (!(node.name in vars)) throw new Error(T("err_var_not_found", { name: node.name }));
      return vars[node.name];
    case "unary": { const v = evaluateAst(node.value, vars); return node.op === "-" ? -v : v; }
    case "bin": {
      const l = evaluateAst(node.left, vars), r = evaluateAst(node.right, vars);
      if (node.op === "+") return l + r;
      if (node.op === "-") return l - r;
      if (node.op === "*") return l * r;
      if (node.op === "/") return l / r;
      if (node.op === "%") return l % r;
      if (node.op === "^") return Math.pow(l, r);
      break;
    }
    case "call": {
      const fn = FORMULA_FUNCS[node.name];
      if (!fn) throw new Error(T("err_unknown_func", { name: node.name }));
      return fn(...node.args.map((a) => evaluateAst(a, vars)));
    }
    default: break;
  }
  throw new Error(T("err_bad_ast"));
}

function collectIdentifiers(node, out) {
  if (node.type === "ident") out.add(node.name);
  else if (node.type === "unary") collectIdentifiers(node.value, out);
  else if (node.type === "bin") { collectIdentifiers(node.left, out); collectIdentifiers(node.right, out); }
  else if (node.type === "call") node.args.forEach((a) => collectIdentifiers(a, out));
}

// "answer = x + 50" -> { ok, outputName, inputNames, ast } | { ok:false, error }
function parseFormula(expression) {
  const raw = (expression ?? "").trim();
  if (!raw) return { ok: false, error: T("err_no_formula") };
  const eqIdx = raw.indexOf("=");
  if (eqIdx === -1) return { ok: false, error: T("err_need_equals") };
  const outputName = raw.slice(0, eqIdx).trim();
  const exprStr = raw.slice(eqIdx + 1).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(outputName)) return { ok: false, error: T("err_bad_output_name") };
  if (!exprStr) return { ok: false, error: T("err_no_rhs") };
  try {
    const ast = parseExprTokens(tokenizeExpr(exprStr));
    const idents = new Set();
    collectIdentifiers(ast, idents);
    const inputNames = Array.from(idents).filter((n) => !(n in FORMULA_FUNCS));
    return { ok: true, outputName, inputNames, ast };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function evalFormula(node, nodes, edges, variables, visiting = new Set()) {
  const parsed = parseFormula(node.expression);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const vars = {};
  for (const name of parsed.inputNames) {
    const edge = edges.find((e) => e.to === node.id && e.isData && e.toAnchor === "in:" + name);
    if (edge) {
      const src = nodes.find((n) => n.id === edge.from);
      if (!src) return { ok: false, error: T("err_input_source_deleted", { name }) };
      const r = resolveSourceValue(src, edge.fromAnchor, nodes, edges, variables, visiting);
      if (!r.ok) return { ok: false, error: `input "${name}": ${r.error}` };
      if (r.type && r.type !== "number") return { ok: false, error: T("err_input_needs_number", { name, type: r.type }) };
      vars[name] = r.value;
    } else {
      const raw = (node.defaults && node.defaults[name]) ?? "0";
      const c = coerceStaticValue({ dataType: "number", value: raw });
      if (!c.ok) return { ok: false, error: T("err_input_default_invalid", { name }) };
      vars[name] = c.value;
    }
  }
  try {
    const result = evaluateAst(parsed.ast, vars);
    if (typeof result !== "number" || Number.isNaN(result) || !Number.isFinite(result)) {
      return { ok: false, error: T("err_result_invalid") };
    }
    return { ok: true, value: result, outputName: parsed.outputName };
  } catch (e) {
    return { ok: false, error: T("err_calc_failed", { message: e.message }) };
  }
}

// ---------- pure/derived value resolution shared by static / variable / formula nodes ----------
// resolveSourceValue: "if I read a value out of this node's given output port right now, what do I get?"
function resolveSourceValue(node, fromAnchor, nodes, edges, variables, visiting) {
  if (node.kind === "static") {
    const c = coerceStaticValue(node);
    if (!c.ok) return { ok: false, error: T("err_static_mismatch") };
    return { ok: true, value: c.value, type: node.dataType };
  }
  if (node.kind === "variableGet") {
    const key = "var:" + node.variableId;
    if (visiting.has(key)) return { ok: false, error: T("err_var_circular") };
    const nextVisiting = new Set(visiting); nextVisiting.add(key);
    const r = resolveVariableValue(node.variableId, variables, nodes, edges, nextVisiting);
    if (r.value === undefined) return { ok: false, error: T("err_no_value") };
    return { ok: true, value: r.value, type: r.dataType };
  }
  if (node.kind === "formula") {
    if (fromAnchor !== "out") return { ok: false, error: T("err_not_output_port") };
    const key = "node:" + node.id;
    if (visiting.has(key)) return { ok: false, error: T("err_formula_circular") };
    const nextVisiting = new Set(visiting); nextVisiting.add(key);
    const r = evalFormula(node, nodes, edges, variables, nextVisiting);
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, value: r.value, type: "number" };
  }
  return { ok: false, error: T("err_source_unsupported") };
}

// resolveVariableValue: "what does this declared variable currently hold?" - fully derived, never stale.
function resolveVariableValue(variableId, variables, nodes, edges, visiting = new Set()) {
  const v = variables.find((vv) => vv.id === variableId);
  if (!v) return { value: undefined, dataType: undefined };
  const key = "var:" + variableId;
  if (visiting.has(key)) return { value: undefined, dataType: v.dataType };
  const setNode = nodes.find(
    (n) => n.kind === "variableSet" && n.variableId === variableId && edges.some((e) => e.to === n.id && e.isData)
  );
  if (!setNode) return { value: undefined, dataType: v.dataType };
  const edge = edges.find((e) => e.to === setNode.id && e.isData);
  const src = edge && nodes.find((n) => n.id === edge.from);
  if (!src) return { value: undefined, dataType: v.dataType };
  const nextVisiting = new Set(visiting); nextVisiting.add(key);
  const r = resolveSourceValue(src, edge.fromAnchor, nodes, edges, variables, nextVisiting);
  if (!r.ok) return { value: undefined, dataType: v.dataType };
  if (r.type && r.type !== v.dataType) return { value: undefined, dataType: v.dataType };
  return { value: r.value, dataType: v.dataType };
}

function formulaInputNames(node) {
  const parsed = parseFormula(node.expression);
  return parsed.ok ? parsed.inputNames : [];
}

function PaletteChip({ label, sub, color, onDragStart }) {
  return (
    <div draggable onDragStart={onDragStart} className="chip" style={{ borderColor: color.border, background: color.bg }}>
      <div className="chip-label" style={{ color: color.text }}>{label}</div>
      {sub && <div className="chip-sub" style={{ color: color.accent }}>{sub}</div>}
    </div>
  );
}

function cubicPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
  const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
  return { x, y };
}

export default function NodeGraphEditor() {
  const [mode, setMode] = useState("dark");
  const nodeTheme = NODE_THEME[mode];
  const [lang, setLang] = useState("en");
  currentLang = lang; // sync module-level lang so plain helper functions (parser, resolvers) can call T() too

  const [graph, setGraph] = useState(emptyGraph);
  const { nodes, edges, variables } = graph || emptyGraph();
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);
  const [nodeSizes, setNodeSizes] = useState({});

  const [newVarName, setNewVarName] = useState("");
  const [newVarType, setNewVarType] = useState("number");
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [fileName, setFileName] = useState("my-rpg-graph");
  const [importMessage, setImportMessage] = useState(null); // { text, isError }
  const fileInputRef = useRef(null);

  const graphRef = useRef(graph);
  useEffect(() => { graphRef.current = graph; }, [graph]);

  const dragRef = useRef(null);
  const dragSnapshotRef = useRef(null);
  const editSnapshotRef = useRef(null);
  const panRef = useRef(null);
  const connectRef = useRef(null);
  const selectDragRef = useRef(null);
  const [connectPreview, setConnectPreview] = useState(null);
  const [editingEdge, setEditingEdge] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectionBox, setSelectionBox] = useState(null);
  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const nodeElRefs = useRef({});

  // ---------- zoom ----------
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 2.5;
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // zooms while keeping the world point under (screenX, screenY) fixed on screen - defaults to the
  // viewport's own center when no screen position is given (e.g. from a toolbar button click).
  const zoomTo = (newZoomRaw, screenX, screenY) => {
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoomRaw));
    const viewport = viewportRef.current;
    const oldZoom = zoomRef.current;
    if (!viewport || newZoom === oldZoom) return;
    const vpRect = viewport.getBoundingClientRect();
    const cursorX = screenX != null ? screenX - vpRect.left : viewport.clientWidth / 2;
    const cursorY = screenY != null ? screenY - vpRect.top : viewport.clientHeight / 2;
    const worldX = (viewport.scrollLeft + cursorX) / oldZoom;
    const worldY = (viewport.scrollTop + cursorY) / oldZoom;
    setZoom(newZoom);
    // the scrollable area's size only updates after this render commits, so defer the scroll fix-up
    requestAnimationFrame(() => {
      viewport.scrollLeft = worldX * newZoom - cursorX;
      viewport.scrollTop = worldY * newZoom - cursorY;
    });
  };
  const onCanvasWheel = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return; // plain wheel/trackpad scroll should pan the viewport normally,
    // matching Figma/Miro-style convention: only Ctrl/Cmd+wheel (or trackpad pinch, which browsers report
    // as wheel+ctrlKey) zooms - otherwise every scroll gesture would hijack navigation into zooming.
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    zoomTo(zoomRef.current * factor, e.clientX, e.clientY);
  };

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      setNodeSizes((prev) => {
        let changed = false;
        const next = { ...prev };
        entries.forEach((entry) => {
          const id = entry.target.dataset.nodeId;
          if (!id) return;
          const box = entry.borderBoxSize && entry.borderBoxSize[0];
          const w = Math.round(box ? box.inlineSize : entry.contentRect.width);
          const h = Math.round(box ? box.blockSize : entry.contentRect.height);
          if (!next[id] || next[id].w !== w || next[id].h !== h) { next[id] = { w, h }; changed = true; }
        });
        return changed ? next : prev;
      });
    });
    Object.values(nodeElRefs.current).forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [nodes.length]);

  const commitGraph = (updater) => {
    setHistoryPast((hp) => [...hp.slice(-49), graphRef.current]);
    setHistoryFuture([]);
    setGraph((g) => updater(g));
  };
  const beginFieldEdit = () => { editSnapshotRef.current = graphRef.current; };
  const endFieldEdit = () => {
    const snapshot = editSnapshotRef.current;
    editSnapshotRef.current = null; // clear the ref first, then use the captured local value below -
    // reading editSnapshotRef.current lazily inside the setState updater would see this null instead
    if (snapshot && snapshot !== graphRef.current) {
      setHistoryPast((hp) => [...hp.slice(-49), snapshot]);
      setHistoryFuture([]);
    }
  };
  const undo = useCallback(() => {
    if (editSnapshotRef.current) endFieldEdit();
    setHistoryPast((hp) => {
      if (hp.length === 0) return hp;
      const prev = hp[hp.length - 1];
      if (!prev) return hp.slice(0, -1);
      setGraph((g) => { setHistoryFuture((hf) => [...hf, g]); return prev; });
      return hp.slice(0, -1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const redo = useCallback(() => {
    setHistoryFuture((hf) => {
      if (hf.length === 0) return hf;
      const next = hf[hf.length - 1];
      if (!next) return hf.slice(0, -1);
      setGraph((g) => { setHistoryPast((hp) => [...hp, g]); return next; });
      return hf.slice(0, -1);
    });
  }, []);

  const deleteSelected = () => {
    const ids = selectedIdsRef.current;
    if (ids.size === 0) return;
    commitGraph((g) => ({
      ...g,
      nodes: g.nodes.filter((n) => !ids.has(n.id)),
      edges: g.edges.filter((e) => !ids.has(e.from) && !ids.has(e.to)),
    }));
    setSelectedIds(new Set());
  };

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); document.activeElement?.blur?.(); undo(); return; }
      if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); document.activeElement?.blur?.(); redo(); return; }
      if (!inField && (e.key === "Delete" || e.key === "Backspace") && selectedIdsRef.current.size > 0) {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (!inField && e.key === "Escape" && selectedIdsRef.current.size > 0) {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const getNode = (id) => nodes.find((n) => n.id === id);
  const getVar = (id) => variables.find((v) => v.id === id);
  const typeOf = (kind) => (kind === "variableGet" || kind === "variableSet" ? "variable" : kind);

  const dims = (node) => {
    const base = { w: W[typeOf(node.kind)], h: H[typeOf(node.kind)] };
    const measured = nodeSizes[node.id];
    if (!measured) return base;
    return { w: Math.max(base.w, measured.w), h: Math.max(base.h, measured.h) };
  };

  // local (node-relative) position + outward normal for any anchor, generic or formula-specific
  const portLocal = (node, anchor, wh) => {
    const { w, h } = wh;
    if (node.kind === "formula" && anchor !== "N" && anchor !== "S") {
      const rows = formulaInputNames(node);
      const isOut = anchor === "out";
      const rowIndex = isOut ? rows.length : Math.max(0, rows.indexOf(anchor.slice(3)));
      const y = FORMULA_BODY_TOP + rowIndex * FORMULA_ROW_H + FORMULA_ROW_H / 2;
      return { x: isOut ? w : 0, y, nx: isOut ? 1 : -1, ny: 0 };
    }
    const a = ANCHORS[anchor];
    return { x: a.fx * w, y: a.fy * h, nx: a.nx, ny: a.ny };
  };

  const portPos = (node, anchor) => {
    const wh = dims(node);
    const local = portLocal(node, anchor, wh);
    return { x: node.x + local.x, y: node.y + local.y, nx: local.nx, ny: local.ny };
  };

  const anchorsForNode = (node) => {
    if (node.kind !== "formula") return ANCHOR_LIST;
    const inputs = formulaInputNames(node);
    if (!parseFormula(node.expression).ok) return ["N", "S"];
    return ["N", "S", ...inputs.map((n) => "in:" + n), "out"];
  };
  const portSizeFor = (node, anchor) =>
    node.kind === "formula" && anchor !== "N" && anchor !== "S" ? FORMULA_PORT_SIZE : PORT_SIZE[anchor];

  // ---------- node creation ----------
  const addNode = (kind, x, y, extra = {}) => {
    const id = nextId(kind);
    const base = { id, kind, x, y, text: "", value: "0", dataType: "number", variableId: null };
    if (kind === "formula") { base.expression = "answer = x + 50"; base.defaults = {}; }
    commitGraph((g) => ({ ...g, nodes: [...g.nodes, { ...base, ...extra }] }));
  };

  const onCanvasDrop = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomRef.current;
    const y = (e.clientY - rect.top) / zoomRef.current;
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (payload.kind === "general" || payload.kind === "static" || payload.kind === "formula") addNode(payload.kind, x, y);
    else if (payload.kind === "variableGet" || payload.kind === "variableSet") addNode(payload.kind, x, y, { variableId: payload.variableId });
  };

  const onNodeMouseDown = (e, node) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (e.shiftKey) {
      // shift-click only toggles this node's membership in the selection - it never starts a drag,
      // so it's safe to add/remove nodes from a multi-selection without accidentally moving anything.
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id); else next.add(node.id);
        return next;
      });
      return;
    }
    // read straight from current state (not from inside a setState updater) so this is available
    // synchronously below when building drag anchors for every member of the group
    const dragAsGroup = selectedIds.has(node.id) && selectedIds.size > 1;
    const idsToMove = dragAsGroup ? new Set(selectedIds) : new Set([node.id]);
    if (!dragAsGroup) setSelectedIds(idsToMove); // plain click on a non-multi-selected node selects just this one

    const rect = canvasRef.current.getBoundingClientRect();
    const anchors = {};
    idsToMove.forEach((id) => {
      const n = getNode(id);
      if (n) anchors[id] = { dx: (e.clientX - rect.left) / zoomRef.current - n.x, dy: (e.clientY - rect.top) / zoomRef.current - n.y };
    });
    dragRef.current = { anchors };
    dragSnapshotRef.current = graphRef.current;
  };

  // starting a drag on the empty canvas background begins a rubber-band selection box
  const onCanvasBgMouseDown = (e) => {
    if (e.button !== 0 || e.target !== canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomRef.current, y = (e.clientY - rect.top) / zoomRef.current;
    const startSelection = e.shiftKey ? new Set(selectedIds) : new Set();
    selectDragRef.current = { startX: x, startY: y, startSelection };
    setSelectionBox({ x, y, w: 0, h: 0 });
    if (!e.shiftKey) setSelectedIds(new Set());
  };

  const onViewportMouseDown = (e) => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      panRef.current = { startX: e.clientX, startY: e.clientY, scrollLeft: viewportRef.current.scrollLeft, scrollTop: viewportRef.current.scrollTop };
    }
  };

  const nodeSizesRef = useRef(nodeSizes);
  useEffect(() => { nodeSizesRef.current = nodeSizes; }, [nodeSizes]);

  const onWindowMouseMove = useCallback((e) => {
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      viewportRef.current.scrollLeft = panRef.current.scrollLeft - dx;
      viewportRef.current.scrollTop = panRef.current.scrollTop - dy;
      return;
    }
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / zoomRef.current;
    const my = (e.clientY - rect.top) / zoomRef.current;
    if (selectDragRef.current) {
      const s = selectDragRef.current;
      const x0 = Math.min(s.startX, mx), y0 = Math.min(s.startY, my);
      const w = Math.abs(mx - s.startX), h = Math.abs(my - s.startY);
      setSelectionBox({ x: x0, y: y0, w, h });
      const hits = new Set(s.startSelection);
      graphRef.current.nodes.forEach((n) => {
        const measured = nodeSizesRef.current[n.id];
        const base = { w: W[typeOf(n.kind)], h: H[typeOf(n.kind)] };
        const nw = measured ? Math.max(base.w, measured.w) : base.w;
        const nh = measured ? Math.max(base.h, measured.h) : base.h;
        if (!(n.x + nw < x0 || n.x > x0 + w || n.y + nh < y0 || n.y > y0 + h)) hits.add(n.id);
      });
      setSelectedIds(hits);
      return;
    }
    if (dragRef.current) {
      const { anchors } = dragRef.current;
      setGraph((g) => ({ ...g, nodes: g.nodes.map((n) => (anchors[n.id] ? { ...n, x: Math.max(0, mx - anchors[n.id].dx), y: Math.max(0, my - anchors[n.id].dy) } : n)) }));
    }
    if (connectRef.current) setConnectPreview({ x1: connectRef.current.x1, y1: connectRef.current.y1, x2: mx, y2: my });
  }, []);

  const portDataKind = (node, anchor) => {
    if (node.kind === "general") return "link";
    if (node.kind === "formula") return anchor === "N" || anchor === "S" ? "link" : "data";
    return "data";
  };
  // a formula's real wiring pins have a strict direction: "in:*" can only ever be a target (data sink),
  // "out" can only ever be a source. Its N/S anchors are ordinary link points (not covered here -> null).
  const formulaPinRole = (node, anchor) => {
    if (node.kind !== "formula" || anchor === "N" || anchor === "S") return null;
    return anchor === "out" ? "out" : "in";
  };
  const isSelfVarLoop = (fromNode, toNode) => {
    const a = fromNode.kind === "variableGet" && toNode.kind === "variableSet";
    const b = fromNode.kind === "variableSet" && toNode.kind === "variableGet";
    return (a || b) && fromNode.variableId != null && fromNode.variableId === toNode.variableId;
  };

  const makeEdge = (fromId, fromAnchor, toId, toAnchor) => {
    const from = getNode(fromId);
    const to = getNode(toId);
    if (!from || !to) return;
    if (isSelfVarLoop(from, to)) return;

    const fromRole = formulaPinRole(from, fromAnchor);
    const toRole = formulaPinRole(to, toAnchor);
    if (fromRole === "in") return; // can't pull a value OUT of an input pin
    if (toRole === "out") return; // can't push a value INTO an output pin
    // a formula's real data pin only accepts a genuine data endpoint on the other side (not a general note,
    // and not another formula's plain N/S link point) - otherwise it would look wired but silently do nothing
    if (toRole === "in" && portDataKind(from, fromAnchor) !== "data") return;
    if (fromRole === "out" && portDataKind(to, toAnchor) !== "data") return;

    const isData = portDataKind(from, fromAnchor) === "data" && portDataKind(to, toAnchor) === "data";
    commitGraph((g) => {
      let edgesNext = g.edges;
      if (isData) {
        edgesNext = edgesNext.filter((ed) => {
          if (!ed.isData) return true;
          const sameSlot = to.kind === "formula" ? ed.to === toId && ed.toAnchor === toAnchor : ed.to === toId;
          return !sameSlot;
        });
      }
      return { ...g, edges: [...edgesNext, { id: nextId("edge"), from: fromId, fromAnchor, to: toId, toAnchor, isData, label: "" }] };
    });
  };

  const onWindowMouseUp = useCallback(
    (e) => {
      if (panRef.current) { panRef.current = null; return; }
      if (selectDragRef.current) { selectDragRef.current = null; setSelectionBox(null); return; }
      if (dragRef.current) {
        const { anchors } = dragRef.current;
        const snapshot = dragSnapshotRef.current; // capture before clearing the ref below
        const movedAny = Object.keys(anchors).some((id) => {
          const now = getNode(id);
          const before = snapshot?.nodes.find((n) => n.id === id);
          return now && before && (now.x !== before.x || now.y !== before.y);
        });
        dragRef.current = null;
        dragSnapshotRef.current = null;
        if (movedAny && snapshot) {
          setHistoryPast((hp) => [...hp.slice(-49), snapshot]);
          setHistoryFuture([]);
        }
      }
      if (connectRef.current) {
        const target = e.target.closest && e.target.closest("[data-role='port']");
        if (target) {
          const targetId = target.dataset.nodeId;
          const targetAnchor = target.dataset.anchor;
          if (targetId && targetId !== connectRef.current.fromId) makeEdge(connectRef.current.fromId, connectRef.current.fromAnchor, targetId, targetAnchor);
        }
        connectRef.current = null;
        setConnectPreview(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, edges, variables]
  );

  useEffect(() => {
    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
    };
  }, [onWindowMouseMove, onWindowMouseUp]);

  const startConnect = (e, node, anchor) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const p = portPos(node, anchor);
    connectRef.current = { fromId: node.id, fromAnchor: anchor, x1: p.x, y1: p.y };
    setConnectPreview({ x1: p.x, y1: p.y, x2: (e.clientX - rect.left) / zoomRef.current, y2: (e.clientY - rect.top) / zoomRef.current });
  };

  const deleteEdge = (id) => commitGraph((g) => ({ ...g, edges: g.edges.filter((e) => e.id !== id) }));

  const declareVariable = () => {
    const name = newVarName.trim();
    if (!name) return;
    commitGraph((g) => ({ ...g, variables: [...g.variables, { id: nextId("var"), name, dataType: newVarType }] }));
    setNewVarName("");
  };
  const removeVariable = (id) => commitGraph((g) => ({ ...g, variables: g.variables.filter((v) => v.id !== id) }));
  const setVarField = (id, patch) => setGraph((g) => ({ ...g, variables: g.variables.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));
  const setVarTypeCommit = (id, dataType) => commitGraph((g) => ({ ...g, variables: g.variables.map((v) => (v.id === id ? { ...v, dataType } : v)) }));

  const duplicateNameError = (id) => {
    const self = getVar(id);
    if (!self) return null;
    const name = self.name.trim().toLowerCase();
    if (!name) return T("err_need_name");
    const dup = variables.some((v) => v.id !== id && v.name.trim().toLowerCase() === name);
    return dup ? T("err_dup_name") : null;
  };

  const resolveIncomingValue = (nodeId, anchorFilter = null) => {
    const edge = edges.find((e) => e.to === nodeId && e.isData && (anchorFilter == null || e.toAnchor === anchorFilter));
    if (!edge) return { value: undefined, error: null };
    const src = getNode(edge.from);
    if (!src) return { value: undefined, error: T("err_source_deleted") };
    const r = resolveSourceValue(src, edge.fromAnchor, nodes, edges, variables, new Set());
    if (!r.ok) return { value: undefined, error: r.error };
    return { value: r.value, type: r.type };
  };

  const nodeError = (node) => {
    if (node.kind === "static") {
      const c = coerceStaticValue(node);
      if (!c.ok) return T("err_static_value_mismatch", { type: node.dataType });
      return null;
    }
    if (node.kind === "formula") {
      const r = evalFormula(node, nodes, edges, variables, new Set());
      return r.ok ? null : r.error;
    }
    if (node.kind === "variableGet" || node.kind === "variableSet") {
      const v = getVar(node.variableId);
      if (!v) return T("err_var_deleted");
    }
    if (node.kind === "variableSet") {
      const v = getVar(node.variableId);
      const incoming = resolveIncomingValue(node.id);
      if (incoming.error) return incoming.error;
      if (v && incoming.type && incoming.type !== v.dataType) return T("err_type_mismatch", { expected: v.dataType, got: incoming.type });
    }
    return null;
  };

  const updateNodeLive = (id, patch) => setGraph((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  const updateNodeCommit = (id, patch) => commitGraph((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  const deleteNode = (id) => {
    commitGraph((g) => ({ ...g, nodes: g.nodes.filter((n) => n.id !== id), edges: g.edges.filter((e) => e.from !== id && e.to !== id) }));
    setSelectedIds((prev) => { if (!prev.has(id)) return prev; const next = new Set(prev); next.delete(id); return next; });
  };

  const openEdgeLabel = (edge, mx, my) => setEditingEdge({ id: edge.id, x: mx, y: my, value: edge.label });
  const commitEdgeLabel = () => {
    if (!editingEdge) return;
    commitGraph((g) => ({ ...g, edges: g.edges.map((e) => (e.id === editingEdge.id ? { ...e, label: editingEdge.value } : e)) }));
    setEditingEdge(null);
  };

  // ---------- save / load (.rpggraph) ----------
  const exportGraph = () => {
    const payload = JSON.stringify({ format: "rpggraph", version: 1, ...graph }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(fileName || "graph").trim() || "graph"}.rpggraph`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const triggerImport = () => fileInputRef.current?.click();

  const onImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const { graph: loaded, droppedCount } = validateGraph(parsed);
        // keep future ids from colliding with whatever numeric suffixes this file already used
        let maxNum = 0;
        [...loaded.nodes, ...loaded.edges, ...loaded.variables].forEach((item) => {
          const m = /_(\d+)$/.exec(item.id || "");
          if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
        });
        uid = Math.max(uid, maxNum + 1);
        commitGraph(() => loaded);
        setImportMessage({
          text: droppedCount > 0 ? T("import_partial", { count: droppedCount }) : T("import_success"),
          isError: false,
        });
      } catch (err) {
        setImportMessage({ text: T("import_failed", { message: err.message }), isError: true });
      }
    };
    reader.onerror = () => setImportMessage({ text: T("import_read_failed"), isError: true });
    reader.readAsText(file);
  };

  const themeVars = THEME_VARS[mode];
  const isConnecting = !!connectPreview && !!connectRef.current;

  return (
    <div className="app-root" style={themeVars}>
      <style>{CSS}</style>

      <div className="topbar">
        <div className="topbar-title">RPG Stat Graph</div>
        <div className="topbar-hint">{T("hint")}</div>
        <button className="icon-btn" disabled={historyPast.length === 0} onClick={undo} title={T("title_undo")}>↶ {T("undo")}</button>
        <button className="icon-btn" disabled={historyFuture.length === 0} onClick={redo} title={T("title_redo")}>↷ {T("redo")}</button>
        <button className="icon-btn danger-btn" disabled={selectedIds.size === 0} onClick={deleteSelected} title={T("title_delete")}>
          {T("delete")}{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
        </button>
        <div className="zoom-group">
          <button className="icon-btn zoom-btn" disabled={zoom <= MIN_ZOOM} onClick={() => zoomTo(zoom / 1.2)} title={T("title_zoom_out")}>−</button>
          <button className="icon-btn zoom-reset" onClick={() => zoomTo(1)} title={T("title_zoom_reset")}>{Math.round(zoom * 100)}%</button>
          <button className="icon-btn zoom-btn" disabled={zoom >= MAX_ZOOM} onClick={() => zoomTo(zoom * 1.2)} title={T("title_zoom_in")}>+</button>
        </div>
        <button className="theme-toggle" onClick={() => setLang(lang === "en" ? "th" : "en")} title="Switch language">
          {T("lang_btn")}
        </button>
        <button className="theme-toggle" onClick={() => setMode(mode === "dark" ? "light" : "dark")}>
          {mode === "dark" ? T("theme_day") : T("theme_night")}
        </button>
      </div>

      <div className="body">
        <div className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-heading">{T("heading_file")}</div>
            <input className="text-input" placeholder={T("placeholder_filename")} value={fileName} onChange={(e) => setFileName(e.target.value)} />
            <div className="file-btn-row">
              <button className="btn-add" onClick={exportGraph}>{T("btn_save")}</button>
              <button className="btn-add" onClick={triggerImport}>{T("btn_open")}</button>
            </div>
            <input ref={fileInputRef} type="file" accept=".rpggraph,application/json" style={{ display: "none" }} onChange={onImportFile} />
            {importMessage && (
              <div className={"import-message" + (importMessage.isError ? " is-error" : "")}>
                {importMessage.isError ? "⚠ " : "✓ "}{importMessage.text}
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-heading">{T("heading_nodes")}</div>
            <PaletteChip label={T("label_general")} sub={T("sub_general")} color={nodeTheme.general}
              onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify({ kind: "general" }))} />
            <PaletteChip label={T("label_static")} sub={T("sub_static")} color={nodeTheme.static}
              onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify({ kind: "static" }))} />
            <PaletteChip label={T("label_formula")} sub={T("sub_formula")} color={nodeTheme.formula}
              onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify({ kind: "formula" }))} />
          </div>

          <div className="sidebar-section">
            <div className="sidebar-heading">{T("heading_variables")}</div>
            <div className="var-form">
              <input className="text-input" placeholder={T("placeholder_varname")} value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && declareVariable()} />
              <select className="select-input" value={newVarType} onChange={(e) => setNewVarType(e.target.value)}>
                {DATA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button className="btn-add" onClick={declareVariable}>{T("btn_declare")}</button>
            </div>

            <div className="var-list">
              {variables.length === 0 && <div className="empty-note">{T("empty_vars")}</div>}
              {variables.map((v) => {
                const dupErr = duplicateNameError(v.id);
                return (
                  <div key={v.id} className="var-row">
                    <div className="var-row-head">
                      <input
                        className={"var-name-input" + (dupErr ? " has-error" : "")}
                        value={v.name}
                        onFocus={beginFieldEdit}
                        onChange={(e) => setVarField(v.id, { name: e.target.value })}
                        onBlur={endFieldEdit}
                      />
                      <select className="var-type-select" value={v.dataType} onChange={(e) => setVarTypeCommit(v.id, e.target.value)}>
                        {DATA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button className="var-del" onClick={() => removeVariable(v.id)} title={T("title_delete_var")}>×</button>
                    </div>
                    {dupErr && <div className="var-error">⚠ {dupErr}</div>}
                    <div className="var-row-chips">
                      <div draggable className="mini-chip get"
                        onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify({ kind: "variableGet", variableId: v.id }))}>Get</div>
                      <div draggable className="mini-chip set"
                        onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify({ kind: "variableSet", variableId: v.id }))}>Set</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sidebar-section legend">
            <div className="sidebar-heading">{T("heading_lines")}</div>
            <div className="legend-row"><span className="swatch data" />{T("legend_data")}</div>
            <div className="legend-row"><span className="swatch link" />{T("legend_link")}</div>
          </div>
        </div>

        <div
          className="canvas-viewport"
          ref={viewportRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onCanvasDrop}
          onMouseDown={onViewportMouseDown}
          onContextMenu={(e) => e.preventDefault()}
          onWheel={onCanvasWheel}
        >
          <div className="canvas-scroll-content" style={{ width: 2400 * zoom, height: 1500 * zoom }}>
          <div className="canvas-inner" ref={canvasRef} onMouseDown={onCanvasBgMouseDown} style={{ transform: `scale(${zoom})` }}>
            <svg className="edge-layer">
              <defs>
                <marker id="arrow-data" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill={nodeTheme.dataEdge} />
                </marker>
                <marker id="arrow-link" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill={nodeTheme.linkEdge} />
                </marker>
              </defs>

              {edges.map((edge) => {
                const from = getNode(edge.from);
                const to = getNode(edge.to);
                if (!from || !to) return null;
                const p1 = portPos(from, edge.fromAnchor);
                const p2 = portPos(to, edge.toAnchor);
                const dist = Math.min(180, Math.max(55, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.5));
                const c1 = { x: p1.x + p1.nx * dist, y: p1.y + p1.ny * dist };
                const c2 = { x: p2.x + p2.nx * dist, y: p2.y + p2.ny * dist };
                const path = `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
                const mid = cubicPoint(p1, c1, c2, p2, 0.5);
                const stroke = edge.isData ? nodeTheme.dataEdge : nodeTheme.linkEdge;
                return (
                  <g key={edge.id}>
                    <path d={path} stroke={stroke} strokeWidth={edge.isData ? 4 : 3}
                      strokeDasharray={edge.isData ? "0" : "6,6"} fill="none" className="edge-path"
                      markerEnd={`url(#${edge.isData ? "arrow-data" : "arrow-link"})`}
                      onClick={(e) => { e.stopPropagation(); openEdgeLabel(edge, mid.x, mid.y); }} />
                    {edge.label && (
                      <g onClick={(e) => { e.stopPropagation(); openEdgeLabel(edge, mid.x, mid.y); }} style={{ cursor: "pointer" }}>
                        <rect x={mid.x - (edge.label.length * 3.6 + 8)} y={mid.y - 20} width={edge.label.length * 7.2 + 16} height={16} rx={4}
                          fill="var(--label-bg)" stroke={stroke} strokeWidth="1" />
                        <text x={mid.x} y={mid.y - 8} textAnchor="middle" className="edge-label" fill="var(--text-primary)">{edge.label}</text>
                      </g>
                    )}
                    <circle cx={mid.x} cy={mid.y} r={4.5} fill="var(--bg-canvas)" stroke={stroke} strokeWidth="1.5"
                      className="edge-del" onClick={(e) => { e.stopPropagation(); deleteEdge(edge.id); }} />
                  </g>
                );
              })}

              {connectPreview && (
                <path d={`M ${connectPreview.x1} ${connectPreview.y1} L ${connectPreview.x2} ${connectPreview.y2}`}
                  stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="3,5" fill="none" />
              )}
            </svg>

            {editingEdge && (
              <input autoFocus className="edge-label-input" style={{ left: editingEdge.x, top: editingEdge.y }}
                value={editingEdge.value} placeholder={T("placeholder_edge_label")}
                onChange={(e) => setEditingEdge({ ...editingEdge, value: e.target.value })}
                onBlur={commitEdgeLabel} onKeyDown={(e) => e.key === "Enter" && commitEdgeLabel()} />
            )}

            {selectionBox && (
              <div className="selection-box" style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.w, height: selectionBox.h }} />
            )}

            {nodes.map((node) => {
              const err = nodeError(node);
              const kindGroup = typeOf(node.kind);
              const color = nodeTheme[kindGroup];
              const { w: width, h: height } = dims(node);
              const showPorts = hoveredNodeId === node.id || isConnecting;
              const anchors = anchorsForNode(node);

              return (
                <div key={node.id} className="node-wrapper"
                  style={{ left: node.x - MARGIN, top: node.y - MARGIN, width: width + MARGIN * 2, height: height + MARGIN * 2 }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId((h) => (h === node.id ? null : h))}
                >
                  <div
                    className={"node" + (selectedIds.has(node.id) ? " selected" : "")}
                    data-node-id={node.id}
                    ref={(el) => { if (el) nodeElRefs.current[node.id] = el; else delete nodeElRefs.current[node.id]; }}
                    style={{ left: MARGIN, top: MARGIN, width: W[kindGroup], minHeight: H[kindGroup], background: color.bg, borderColor: err ? nodeTheme.error : color.border }}
                    onMouseDown={(e) => onNodeMouseDown(e, node)}>
                    <div className="node-head" style={{ color: color.accent }}>
                      <span>
                        {node.kind === "general" && T("node_general")}
                        {node.kind === "static" && T("node_static")}
                        {node.kind === "formula" && T("node_formula")}
                        {node.kind === "variableGet" && T("node_get", { name: getVar(node.variableId)?.name ?? "?" })}
                        {node.kind === "variableSet" && T("node_set", { name: getVar(node.variableId)?.name ?? "?" })}
                      </span>
                      <button className="node-close" onClick={() => deleteNode(node.id)}>×</button>
                    </div>

                    <div className="node-body" style={{ color: color.text }}>
                      {node.kind === "general" && (
                        <textarea className="node-textarea" placeholder={T("placeholder_general_text")} value={node.text}
                          onFocus={beginFieldEdit}
                          onChange={(e) => updateNodeLive(node.id, { text: e.target.value })}
                          onBlur={endFieldEdit}
                          onMouseDown={(e) => e.stopPropagation()} />
                      )}
                      {node.kind === "static" && (
                        <div className="static-row" onMouseDown={(e) => e.stopPropagation()}>
                          <input className="node-input" value={node.value}
                            onFocus={beginFieldEdit}
                            onChange={(e) => updateNodeLive(node.id, { value: e.target.value })}
                            onBlur={() => {
                              endFieldEdit();
                              if (node.dataType === "number") {
                                const c = coerceStaticValue(node);
                                if (c.ok) updateNodeLive(node.id, { value: String(c.value) });
                              }
                            }} />
                          <select className="node-select" value={node.dataType} onChange={(e) => updateNodeCommit(node.id, { dataType: e.target.value })}>
                            {DATA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      )}
                      {node.kind === "formula" && (() => {
                        const parsed = parseFormula(node.expression);
                        return (
                          <div onMouseDown={(e) => e.stopPropagation()}>
                            <input className="node-input formula-expr" value={node.expression}
                              onFocus={beginFieldEdit}
                              onChange={(e) => updateNodeLive(node.id, { expression: e.target.value })}
                              onBlur={endFieldEdit}
                              placeholder={T("placeholder_formula_expr")} />
                            {parsed.ok && parsed.inputNames.map((name) => {
                              const hasEdge = edges.some((e) => e.to === node.id && e.isData && e.toAnchor === "in:" + name);
                              const incoming = hasEdge ? resolveIncomingValue(node.id, "in:" + name) : null;
                              return (
                                <div className="formula-io-row" key={name}>
                                  <span className="formula-io-label">{name}</span>
                                  {hasEdge ? (
                                    <span className="formula-io-live">{incoming.error ? "⚠" : String(incoming.value)}</span>
                                  ) : (
                                    <input className="formula-default-input" value={(node.defaults && node.defaults[name]) ?? "0"}
                                      onFocus={beginFieldEdit}
                                      onChange={(e) => updateNodeLive(node.id, { defaults: { ...(node.defaults || {}), [name]: e.target.value } })}
                                      onBlur={endFieldEdit} />
                                  )}
                                </div>
                              );
                            })}
                            {parsed.ok && (
                              <div className="formula-io-row formula-output-row">
                                <span className="formula-io-label out">{parsed.outputName}</span>
                                <span className="formula-io-live">
                                  {(() => { const r = evalFormula(node, nodes, edges, variables, new Set()); return r.ok ? String(r.value) : "—"; })()}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {node.kind === "variableGet" && (() => {
                        const resolved = resolveVariableValue(node.variableId, variables, nodes, edges);
                        return <div className="var-node-value">= {resolved.value === undefined ? T("val_no_value") : String(resolved.value)}</div>;
                      })()}
                      {node.kind === "variableSet" && (() => {
                        const incoming = resolveIncomingValue(node.id);
                        return <div className="var-node-value">← {incoming.value === undefined ? T("val_waiting") : String(incoming.value)}</div>;
                      })()}
                      {err && <div className="node-error">⚠ {err}</div>}
                    </div>
                  </div>

                  {anchors.map((anchor) => {
                    const wh = dims(node);
                    const local = portLocal(node, anchor, wh);
                    const size = portSizeFor(node, anchor);
                    const cx = MARGIN + local.x;
                    const cy = MARGIN + local.y;
                    return (
                      <div key={anchor} className={"port port-generic" + (showPorts ? " visible" : "")}
                        style={{ left: cx - size.w / 2, top: cy - size.h / 2, width: size.w, height: size.h }}
                        data-role="port" data-anchor={anchor} data-node-id={node.id}
                        onMouseDown={(e) => startConnect(e, node, anchor)} />
                    );
                  })}
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
* { box-sizing: border-box; }
.app-root { width: 100%; height: 100vh; display: flex; flex-direction: column; background: var(--bg-app); color: var(--text-primary); font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
.topbar { padding: 14px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 10px; background: var(--bg-topbar); }
.topbar-title { font-size: 16px; font-weight: 600; letter-spacing: 0.2px; }
.topbar-hint { font-size: 12.5px; color: var(--text-muted); flex: 1; }
.icon-btn { background: var(--btn-bg); border: 1px solid var(--btn-border); color: var(--btn-text); border-radius: 7px; padding: 7px 10px; font-size: 12.5px; cursor: pointer; }
.icon-btn:hover:not(:disabled) { background: var(--btn-bg-hover); }
.icon-btn:disabled { opacity: 0.4; cursor: default; }
.icon-btn.danger-btn:not(:disabled) { color: #E15C5C; border-color: #E15C5C; }
.icon-btn.danger-btn:not(:disabled):hover { background: rgba(225,92,92,0.15); }
.zoom-group { display: flex; align-items: stretch; gap: 0; }
.zoom-group .icon-btn { border-radius: 0; padding: 7px 9px; }
.zoom-group .icon-btn:first-child { border-radius: 7px 0 0 7px; }
.zoom-group .icon-btn:last-child { border-radius: 0 7px 7px 0; }
.zoom-group .icon-btn + .icon-btn { border-left: none; }
.zoom-reset { min-width: 52px; font-variant-numeric: tabular-nums; }
.theme-toggle { background: var(--btn-bg); border: 1px solid var(--btn-border); color: var(--btn-text); border-radius: 7px; padding: 7px 12px; font-size: 12.5px; cursor: pointer; }
.theme-toggle:hover { background: var(--btn-bg-hover); }
.body { flex: 1; display: flex; min-height: 0; }

.sidebar { width: 250px; flex-shrink: 0; background: var(--bg-sidebar); border-right: 1px solid var(--border-subtle); padding: 16px 14px; overflow-y: auto; }
.sidebar-section { margin-bottom: 22px; }
.sidebar-heading { font-size: 11.5px; color: var(--text-muted); margin-bottom: 8px; font-weight: 600; }

.chip { border: 1px solid; border-radius: 8px; padding: 9px 10px; margin-bottom: 8px; cursor: grab; }
.chip:active { cursor: grabbing; }
.chip-label { font-size: 13.5px; font-weight: 600; }
.chip-sub { font-size: 11px; margin-top: 2px; }

.var-form { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.text-input, .select-input { background: var(--input-bg); border: 1px solid var(--input-border); color: var(--text-primary); border-radius: 6px; padding: 7px 8px; font-size: 12.5px; outline: none; }
.text-input:focus, .select-input:focus { border-color: var(--text-muted); }
.btn-add { background: var(--btn-bg); border: 1px solid var(--btn-border); color: var(--btn-text); border-radius: 6px; padding: 7px 8px; font-size: 12.5px; cursor: pointer; }
.btn-add:hover { background: var(--btn-bg-hover); }
.file-btn-row { display: flex; gap: 6px; margin-top: 6px; }
.file-btn-row .btn-add { flex: 1; }
.import-message { margin-top: 8px; font-size: 11px; color: var(--text-muted); }
.import-message.is-error { color: #D14343; }

.empty-note { font-size: 11.5px; color: var(--text-muted); font-style: italic; }
.var-row { background: var(--row-bg); border: 1px solid var(--row-border); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
.var-row-head { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.var-name-input { flex: 1; min-width: 0; background: var(--input-bg); border: 1px solid var(--input-border); color: var(--text-primary); border-radius: 5px; padding: 4px 6px; font-size: 12.5px; font-weight: 600; outline: none; }
.var-name-input.has-error { border-color: #D14343; }
.var-type-select { font-size: 10.5px; color: var(--text-muted); background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 4px; padding: 2px; }
.var-del { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px; }
.var-del:hover { color: #E15C5C; }
.var-error { font-size: 10.5px; color: #D14343; margin-bottom: 6px; }
.var-row-chips { display: flex; gap: 6px; }
.mini-chip { font-size: 11px; padding: 4px 9px; border-radius: 6px; cursor: grab; border: 1px solid var(--input-border); background: var(--input-bg); }

.legend-row { font-size: 11.5px; color: var(--text-muted); display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.swatch { width: 18px; height: 0; border-top: 3px solid; display: inline-block; }
.swatch.data { border-color: #5FD0C0; border-top-style: solid; }
.swatch.link { border-color: #8991A6; border-top-style: dashed; }

.canvas-viewport { flex: 1; overflow: auto; position: relative; background: var(--bg-canvas); }
.canvas-scroll-content { position: relative; }
.canvas-inner { position: relative; width: 2400px; height: 1500px; transform-origin: 0 0; background-image: radial-gradient(var(--grid-dot) 1px, transparent 1px); background-size: 22px 22px; }
.edge-layer { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.edge-path { pointer-events: stroke; cursor: pointer; }
.edge-del { pointer-events: all; cursor: pointer; }
.edge-label { font-size: 11px; pointer-events: none; }
.edge-label-input { position: absolute; transform: translate(-50%, -100%); z-index: 20; background: var(--input-bg); border: 1px solid var(--text-muted); color: var(--text-primary); border-radius: 5px; font-size: 11.5px; padding: 3px 6px; width: 120px; outline: none; }

.node-wrapper { position: absolute; }
.node { position: absolute; border: 1.5px solid; border-radius: 10px; padding: 8px 10px; cursor: grab; box-shadow: 0 4px 14px rgba(0,0,0,0.25); }
.node.selected { box-shadow: 0 0 0 2.5px #4FA8FF, 0 4px 14px rgba(0,0,0,0.25); }
.selection-box { position: absolute; border: 1px dashed #4FA8FF; background: rgba(79,168,255,0.12); pointer-events: none; z-index: 5; }
.node:active { cursor: grabbing; }
.node-head { height: 16px; display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; font-weight: 600; margin-bottom: 8px; }
.node-close { background: none; border: none; color: inherit; opacity: 0.6; cursor: pointer; font-size: 13px; line-height: 1; }
.node-close:hover { opacity: 1; }
.node-body { font-size: 12.5px; }
.node-textarea { width: 100%; min-height: 56px; background: transparent; border: none; color: inherit; font-size: 12.5px; resize: vertical; outline: none; font-family: inherit; }
.static-row { display: flex; gap: 6px; }
.node-input { flex: 1; background: rgba(0,0,0,0.15); border: 1px solid currentColor; color: inherit; border-radius: 5px; padding: 5px 7px; font-size: 12.5px; font-family: ui-monospace, monospace; outline: none; min-width: 0; }
.node-select { background: rgba(0,0,0,0.15); border: 1px solid currentColor; color: inherit; border-radius: 5px; font-size: 11px; outline: none; }
.var-node-value { font-family: ui-monospace, monospace; font-size: 13px; margin-top: 2px; }
.node-error { margin-top: 6px; font-size: 10.5px; color: #E15C5C; background: rgba(225,92,92,0.15); border-radius: 5px; padding: 4px 6px; }

.formula-expr { width: 100%; margin-bottom: 6px; box-sizing: border-box; height: 26px; }
.formula-io-row { height: 24px; display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; }
.formula-io-label { font-weight: 600; font-family: ui-monospace, monospace; }
.formula-io-label.out { color: inherit; opacity: 0.95; }
.formula-io-live { font-family: ui-monospace, monospace; opacity: 0.85; }
.formula-default-input { width: 52px; background: rgba(0,0,0,0.15); border: 1px solid currentColor; color: inherit; border-radius: 4px; padding: 2px 5px; font-size: 11px; font-family: ui-monospace, monospace; outline: none; text-align: right; }
.formula-output-row { border-top: 1px dashed currentColor; opacity: 0.9; margin-top: 2px; padding-top: 2px; }

.port { position: absolute; border-radius: 4px; background: var(--bg-canvas); border: 2px solid var(--text-muted); cursor: crosshair; opacity: 0; transform: scale(0.7); transition: opacity 0.12s ease, transform 0.12s ease; }
.port.visible { opacity: 1; transform: scale(1); }
.port:hover { border-color: var(--text-primary); background: var(--text-primary); }
`;

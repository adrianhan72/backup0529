// ════════════════════════════════════════════════════════════
// 계약서 HTML → Word(docx) 서버 변환 (2026-09-02 전면 개편)
// - 클라이언트가 화면(#cpm-doc-area) 디자인을 getComputedStyle 기반으로
//   전 요소에 인라인 스타일로 심어 보낸 HTML을 받는다.
// - Word는 외부 CSS 해석이 불안정하므로, 서버는 인라인 스타일만 파싱해
//   문서(문단/표/셀/러닝) 서식으로 1:1 재현한다. (클래스 기반 매핑 제거)
// ════════════════════════════════════════════════════════════
const cheerio = require('cheerio');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, VerticalAlign,
  TableLayoutType, LineRuleType, HeightRule,
} = require('docx');

const FONT = 'Noto Sans KR';
const DEFAULT_COLOR = '1A1A1A';

/** 자식 재귀 순회 대상 블록 컨테이너 태그 */
const BLOCK_CONTAINERS = new Set(['div', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav', 'blockquote', 'figure', 'body']);

// ── 단위 변환 ──
// px → half-points (폰트 크기)
const szPx = v => Math.round((Number(v) || 0) * 1.5);
// px → twips (여백·간격)
const twPx = v => Math.round((Number(v) || 0) * 15);
// px → 1/8pt (테두리 두께)
const bdPx = v => Math.max(2, Math.round((Number(v) || 0) * 6));
const parseNum = v => { const m = String(v || '').match(/-?[\d.]+/); return m ? parseFloat(m[0]) : 0; };

/** 색상 정규화: hex/rgb(a) → 'RRGGBB' (투명/알파0 → null) */
function toHex(c){
  if (!c) return null;
  const s = String(c).trim();
  if (/^transparent$/i.test(s)) return null;
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.slice(1).toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) return s.slice(1).split('').map(x => x + x).join('').toUpperCase();
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m){
    const p = m[1].split(',').map(x => parseFloat(x));
    // 알파 0(투명)은 스타일 미적용 — 검정 배경(rgba(0,0,0,0) → 000000) 오염 방지
    if (p.length >= 4 && p[3] <= 0.01) return null;
    const h = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase();
    return h(p[0]) + h(p[1]) + h(p[2]);
  }
  return null;
}

/** style 속성 → 맵 */
function cssOf($, el){
  const st = $(el).attr('style') || '';
  const out = {};
  st.split(';').forEach(part => {
    const idx = part.indexOf(':');
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k && v) out[k] = v;
  });
  return out;
}

function isSkipped($, el){
  return $(el).attr('data-docx-skip') === '1' || cssOf($, el)['display'] === 'none';
}

/** 한 변(상/우/하/좌) 테두리 → docx Border (spacePt: 텍스트-테두리 간격 pt) */
function sideBorder(css, s, spacePt = 0){
  const w = css[`border-${s}-width`];
  const st = css[`border-${s}-style`];
  if (!w || parseNum(w) <= 0 || !st || st === 'none' || st === 'hidden') return undefined;
  const color = toHex(css[`border-${s}-color`]) || 'CBD5E1';
  const b = {
    style: st.includes('dash') ? BorderStyle.DASHED : (st === 'double' ? BorderStyle.DOUBLE : BorderStyle.SINGLE),
    size: bdPx(parseNum(w)),
    color,
  };
  if (spacePt > 0) b.space = spacePt;
  return b;
}

/** 텍스트 정렬 → docx AlignmentType */
function alignOf(css){
  const a = (css['text-align'] || '').trim();
  if (a === 'center') return AlignmentType.CENTER;
  if (a === 'right') return AlignmentType.RIGHT;
  if (a === 'justify') return AlignmentType.JUSTIFIED;
  return AlignmentType.LEFT;
}

/** run 컨텍스트(폰트/크기/색/굵기/기울임/취소선) */
function runCtxOf(css, base = {}){
  const weight = String(css['font-weight'] || '').trim();
  const bold = base.bold || weight === 'bold' || parseInt(weight, 10) >= 600;
  const size = css['font-size'] ? szPx(parseNum(css['font-size'])) : (base.size || szPx(12.5));
  const ctx = {
    font: css['font-family'] ? (css['font-family'].split(',')[0].replace(/['"]/g, '').trim() || FONT) : (base.font || FONT),
    size,
    bold,
    italics: base.italics || (css['font-style'] === 'italic'),
    color: toHex(css.color) || base.color || DEFAULT_COLOR,
  };
  if ((css['text-decoration-line'] || '').includes('line-through')) ctx.strike = true;
  if ((css['text-decoration-line'] || '').includes('underline')) ctx.underline = {};
  return ctx;
}

/** 인라인 콘텐츠(텍스트/br/strong/b/em/i/u/span) → TextRun[] — 의미 있는 텍스트 포함 여부 반환 */
function collectRuns($, el, base, out){
  let hasContent = false;
  const startLen = out.length;
  $(el).contents().each((i, node) => {
    if (node.type === 'text'){
      let raw = String(node.data || '').replace(/\u00a0/g, ' ');
      if (!raw) return;
      // 문단 첫 런의 선행 공백 제거 — HTML 소스의 들여쓰기(개행+스페이스)가
      // Word에서 들여쓰기로 보이는 것 방지
      if (out.length === startLen) raw = raw.replace(/^\s+/, '');
      if (!raw) return;
      out.push(new TextRun({ text: raw, ...base }));
      if (raw.trim()) hasContent = true;
      return;
    }
    if (node.type !== 'tag') return;
    const tag = node.name.toLowerCase();
    if (tag === 'br'){ out.push(new TextRun({ break: 1, ...base })); hasContent = true; return; }
    if (tag === 'style' || tag === 'script' || tag === 'table') return;
    if (isSkipped($, node)) return;
    const css = cssOf($, node);
    let nctx = { ...base };
    if (tag === 'strong' || tag === 'b') nctx.bold = true;
    if (tag === 'em' || tag === 'i') nctx.italics = true;
    if (tag === 'u') nctx.underline = {};
    nctx = runCtxOf(css, nctx);
    // 중첩 블록(div/p 등)은 재귀 수집하되 단어 사이 공백 유지
    if (['p', 'div', 'li'].includes(tag) && out.length) out.push(new TextRun({ text: ' ', ...base }));
    if (collectRuns($, node, nctx, out)) hasContent = true;
  });
  return hasContent;
}

/** 블록 요소 → 문단 옵션 (공백 전용 문단은 null) */
function paragraphOpts($, el, baseOverride){
  const css = cssOf($, el);
  const base = baseOverride || runCtxOf(css);
  const runs = [];
  if (!collectRuns($, el, base, runs)) return null;
  const ls = lineSpacingOf(css);
  const opts = {
    children: runs,
    alignment: alignOf(css),
    spacing: {
      ...ls,
      before: twPx(parseNum(css['margin-top'])),
      after: twPx(parseNum(css['margin-bottom'])),
    },
  };
  const fill = toHex(css['background-color']);
  if (fill) opts.shading = { type: ShadingType.CLEAR, fill };
  const border = {};
  for (const s of ['top', 'right', 'bottom', 'left']){
    // 문단 패딩은 Word에 없으므로 테두리-텍스트 간격(space)으로 재현 (pt = twips/20)
    const b = sideBorder(css, s, Math.round(twPx(parseNum(css[`padding-${s}`])) / 20));
    if (b) border[s] = b;
  }
  if (Object.keys(border).length) opts.border = border;
  if (css['white-space'] === 'nowrap') opts.keepLines = true;
  // 아래 간격(after)은 buildBlock이 반환하는 margin-bottom으로 상쇄 처리 — 여기선 0
  opts.spacing.after = 0;
  return opts;
}

/** 수직 정렬 → docx VerticalAlign */
function alignV(css){
  const a = String(css['vertical-align'] || '').trim();
  if (a === 'top') return VerticalAlign.TOP;
  if (a === 'bottom') return VerticalAlign.BOTTOM;
  return VerticalAlign.CENTER;
}

/**
 * line-height → docx spacing.line
 * - 화면과 동일한 줄 높이를 위해 px값을 twips(px×15)로 보내고
 *   rule=EXACT(정확한 줄높이)로 고정한다.
 *   (AUTO 다중배수 방식은 폰트 기본 행간의 배수라서 화면보다 넓게 렌더링됨)
 */
function lineSpacingOf(css){
  const lh = parseNum(css['line-height']);
  if (lh > 0) return { line: Math.round(lh * 15), lineRule: LineRuleType.EXACT };
  return { line: 360, lineRule: LineRuleType.AUTO };
}

/** 테이블 → docx Table — 셀 병합(colspan/rowspan)·열그리드·행높이·셀 서식 재현 */
function makeTable($, el){
  const css = cssOf($, el);
  const tableW = parseNum(css.width);
  const rows = [];
  // 열 그리드 기준 행: 총 병합 열 수(Σ colspan)가 가장 많은 행 사용
  // (첫 행에 colspan 셀이 있으면 열 수가 부족해져 이후 행 비율이 깨짐)
  let gridRowIdx = -1, gridRowCols = 0;
  const trEls = [];
  $(el).find('tr').each((ri, tr) => {
    if (isSkipped($, tr)) return;
    trEls.push(tr);
    let cols = 0;
    $(tr).children('th, td').each((ci, c) => {
      if (isSkipped($, c)) return;
      cols += parseInt($(c).attr('colspan') || '1', 10) || 1;
    });
    if (cols > gridRowCols){ gridRowCols = cols; gridRowIdx = trEls.length - 1; }
  });
  const columnWidths = [];
  trEls.forEach((tr, ri) => {
    const isHead = $(tr).parent().length && $(tr).parent()[0].name === 'thead';
    const cells = [];
    $(tr).children('th, td').each((ci, c) => {
      if (isSkipped($, c)) return;
      const cc = cssOf($, c);
      const th = c.name.toLowerCase() === 'th';
      const base = runCtxOf(cc, { bold: th });
      const runs = [];
      collectRuns($, c, base, runs);
      if (runs.length === 0) runs.push(new TextRun({ text: '', ...base }));
      const cellPar = new Paragraph({
        children: runs,
        alignment: alignOf(cc),
        spacing: { ...lineSpacingOf(cc), before: 0, after: 0 },
      });
      const opts = {
        children: [cellPar],
        verticalAlign: alignV(cc),
        margins: {
          top: 0,
          bottom: 0,
          left: twPx(parseNum(cc['padding-left'])),
          right: twPx(parseNum(cc['padding-right'])),
        },
      };
      // 셀 병합: gridSpan(colspan) / vMerge(rowspan) — 연속 셀은 docx가 자동 삽입
      const colSpan = parseInt($(c).attr('colspan') || '1', 10) || 1;
      const rowSpan = parseInt($(c).attr('rowspan') || '1', 10) || 1;
      if (colSpan > 1) opts.columnSpan = colSpan;
      if (rowSpan > 1) opts.rowSpan = rowSpan;
      // 열 그리드: 기준 행(최다 병합열 행)의 셀 폭 사용 — colspan 셀은 병합 열 수로 균등 분할
      if (ri === gridRowIdx){
        const pxW = parseNum(cc.width);
        if (pxW > 0){
          const per = Math.round(twPx(pxW) / colSpan);
          for (let k = 0; k < colSpan; k++) columnWidths.push(per);
        }
      }
      const fill = toHex(cc['background-color']);
      if (fill) opts.shading = { type: ShadingType.CLEAR, fill };
      const border = {};
      for (const s of ['top', 'right', 'bottom', 'left']){
        const b = sideBorder(cc, s);
        if (b) border[s] = b;
      }
      if (Object.keys(border).length) opts.borders = border;
      cells.push(new TableCell(opts));
    });
    if (!cells.length) return;
    const rowOpts = { children: cells, cantSplit: true };
    if (isHead) rowOpts.tableHeader = true;
    // 행 높이: 0.6cm(340twips) 고정 — 내용(2줄 셀 등)이 더 크면 자동 확장
    rowOpts.height = { value: 340, rule: HeightRule.ATLEAST };
    rows.push(new TableRow(rowOpts));
  });
  if (!rows.length) return null;
  // 표 폭: 인라인 width(px) → DXA, 없으면 100%
  const width = tableW > 0 ? { size: twPx(tableW), type: WidthType.DXA } : { size: 100, type: WidthType.PERCENTAGE };
  // 표 기본 셀 여백(Word 기본값 0.19cm)을 0으로 — 셀 패딩/너비가 화면과 정확히 일치
  return new Table({
    width, layout: TableLayoutType.FIXED,
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    columnWidths: columnWidths.length ? columnWidths : undefined,
    rows,
  });
}

/** 블록 자식(표/문단/제목/중첩 컨테이너) 보유 여부 */
function hasBlockChild($, el){
  let found = false;
  $(el).children().each((i, c) => {
    if (found || c.type !== 'tag') return;
    const t = c.name.toLowerCase();
    if (t === 'table' || t === 'p' || t === 'ul' || t === 'ol' || t === 'li' || /^h[1-6]$/.test(t) || BLOCK_CONTAINERS.has(t)) found = true;
  });
  return found;
}

/** 하위(중첩)에 표가 존재하는지 */
function containsTable($, el){
  return $(el).find('table').length > 0;
}

/** display:grid/flex 여부 */
function isGridDisplay(css){
  const d = String(css.display || '').trim();
  return d === 'grid' || d === 'inline-grid' || d === 'flex' || d === 'inline-flex';
}

/** 하위에 표 또는 그리드/플렉스(블록 자식) 레이아웃이 존재하는지 */
function containsComplex($, el){
  let found = false;
  $(el).find('*').each((i, d) => {
    if (found || d.type !== 'tag') return;
    if (d.name.toLowerCase() === 'table'){ found = true; return; }
    if (isGridDisplay(cssOf($, d))) found = true;
  });
  return found;
}

/** 블록 디스크립터 목록 → 실제 docx 인스턴스 배열 */
function materialize(list){
  return list.map(d => {
    if (d.t === 'p') return new Paragraph(d.opts);
    if (d.t === 'tbl') return d.table;
    // gap: 표 사이 분리용 — 여백 전체를 문단 줄높이(EXACT)로 만들고
    // 문단 기호(¶)는 w:vanish로 숨겨 서식기호 표시가 켜져도 보이지 않게 함
    const gapH = (d.before || 0) + (d.after || 0);
    return new Paragraph({
      children: [new TextRun({ text: '', size: 1 })],
      spacing: { before: 0, after: 0, line: gapH || 60, lineRule: LineRuleType.EXACT },
      run: { vanish: true },
    });
  });
}

/**
 * display:grid/flex 컨테이너 → 단일 행 표로 재현
 * - 각 자식을 블록으로 처리(중첩 grid/표 감지), gap은 셀 좌우 여백으로 근사
 * - 컨테이너 자체의 배경/테두리/패딩을 표·셀에 입혀 박스 디자인 재현
 * - 내부선 없음(기본 auto 검은선 방지)
 */
function makeGridTable($, el){
  const css = cssOf($, el);
  const gap = parseNum(css['column-gap']) || parseNum(css['gap']) || 0;
  const containerFill = toHex(css['background-color']);
  const children = [];
  const rawW = [];
  $(el).children().each((i, c) => {
    if (c.type !== 'tag' || isSkipped($, c)) return;
    children.push(c);
    rawW.push(twPx(parseNum(cssOf($, c).width)));
  });
  if (!children.length) return null;
  // 자식 폭 합계를 컨테이너 내용 폭에 비례 배분 —
  // 단일 자식(요약박스)이 컨테이너보다 좁아도 표 폭과 동일하게 맞춤
  const tableW = parseNum(css.width);
  const contentW = tableW > 0 ? twPx(tableW) : 10410;
  const sumW = rawW.reduce((a, b) => a + b, 0);
  const gridW = sumW > 0 ? rawW.map(w => Math.round(w * contentW / sumW)) : rawW;
  const cells = [];
  children.forEach((c, i) => {
    const cc = cssOf($, c);
    const complex = hasBlockChild($, c);
    // 자식 자체를 블록으로 처리 — 중첩 grid/flex/표도 재귀 변환
    const blocks = [];
    buildBlock($, c, blocks);
    const materialized = materialize(blocks);
    const padCss = complex ? cc : css; // 복합 자식은 자기 패딩, 단순 자식은 컨테이너 패딩
    const opts = {
      children: materialized.length ? materialized : [new Paragraph({ children: [], run: { vanish: true } })],
      verticalAlign: alignV(cc),
      margins: {
        top: twPx(parseNum(padCss['padding-top'])),
        bottom: twPx(parseNum(padCss['padding-bottom'])),
        left: twPx(parseNum(padCss['padding-left'])) + (i > 0 ? Math.round(twPx(gap) / 2) : 0),
        right: twPx(parseNum(padCss['padding-right'])) + (i < children.length - 1 ? Math.round(twPx(gap) / 2) : 0),
      },
    };
    if (gridW[i] > 0) opts.width = { size: gridW[i], type: WidthType.DXA };
    if (containerFill) opts.shading = { type: ShadingType.CLEAR, fill: containerFill };
    else if (complex){
      const fill = toHex(cc['background-color']);
      if (fill) opts.shading = { type: ShadingType.CLEAR, fill };
      const border = {};
      for (const s of ['top', 'right', 'bottom', 'left']){
        const b = sideBorder(cc, s);
        if (b) border[s] = b;
      }
      if (Object.keys(border).length) opts.borders = border;
    }
    cells.push(new TableCell(opts));
  });
  const width = tableW > 0 ? { size: twPx(tableW), type: WidthType.DXA } : { size: 100, type: WidthType.PERCENTAGE };
  const none = () => ({ style: BorderStyle.NONE });
  const borders = {
    top: sideBorder(css, 'top') || none(),
    left: sideBorder(css, 'left') || none(),
    bottom: sideBorder(css, 'bottom') || none(),
    right: sideBorder(css, 'right') || none(),
    insideHorizontal: none(),
    insideVertical: none(),
  };
  return new Table({
    width, layout: TableLayoutType.FIXED,
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    borders,
    columnWidths: gridW.length ? gridW : undefined,
    rows: [new TableRow({ children: cells, cantSplit: true })],
  });
}

/**
 * 블록 요소 → docx 블록 디스크립터 배열에 추가 (재귀)
 * - table → Table / h1·h2 → 중앙 제목 / ul·ol → 자식 li 문단
 * - grid/flex(자식 보유) → 단일 행 표로 재현
 * - div 등 컨테이너: 자체 배경/테두리가 있으면 문단 평탄화(박스 재현),
 *   없으면 자식 재귀 순회
 * - 반환값: { before, after } — 위/아래 여백(twips), 문단은 자체 before 포함돼 0
 */
function buildBlock($, node, out){
  const tag = node.name.toLowerCase();
  const css = cssOf($, node);
  const mb = twPx(parseNum(css['margin-bottom']));
  const mt = twPx(parseNum(css['margin-top']));
  if (tag === 'table'){
    const t = makeTable($, node);
    if (t) out.push({ t: 'tbl', table: t });
    return { before: mt, after: mb };
  }
  if (tag === 'h1' || tag === 'h2'){
    const opts = paragraphOpts($, node);
    if (opts){
      opts.alignment = AlignmentType.CENTER;
      out.push({ t: 'p', opts });
    }
    return { before: 0, after: mb };
  }
  if (tag === 'ul' || tag === 'ol'){
    const start = out.length;
    const inner = buildChildren($, node, out);
    applyBeforeTo($, out, start, mt);
    return { before: 0, after: Math.max(inner, mb) };
  }
  if (BLOCK_CONTAINERS.has(tag)){
    if (isGridDisplay(css) && $(node).children().length){
      const t = makeGridTable($, node);
      if (t) out.push({ t: 'tbl', table: t });
      return { before: mt, after: mb };
    }
    const styled = !!toHex(css['background-color']) || ['top', 'right', 'bottom', 'left'].some(s => sideBorder(css, s));
    // 자체 스타일(배경/테두리)이 없고 블록 자식이 있으면 재귀,
    // 표/그리드를 품은 스타일 컨테이너도 재귀 (내용 소실 방지)
    if ((!styled && hasBlockChild($, node)) || (styled && containsComplex($, node))){
      const start = out.length;
      const inner = buildChildren($, node, out);
      // 부모 위 여백은 첫 자식의 위 여백과 상쇄(더 큰 값)
      applyBeforeTo($, out, start, mt);
      return { before: 0, after: Math.max(inner, mb) };
    }
    const opts = paragraphOpts($, node);
    if (opts) out.push({ t: 'p', opts });
    return { before: 0, after: mb };
  }
  const opts = paragraphOpts($, node);
  if (opts) out.push({ t: 'p', opts });
  return { before: 0, after: mb };
}

/** 컨테이너의 위 여백(mt)을 첫 자식 블록에 상쇄 적용 */
function applyBeforeTo($, out, start, mt){
  if (mt <= 0 || out.length <= start) return;
  const d = out[start];
  if (d.t === 'p') d.opts.spacing.before = Math.max(d.opts.spacing.before || 0, mt);
  else if (d.t === 'tbl'){
    const prev = out[start - 1];
    if (prev && prev.t === 'p') prev.opts.spacing.after = (prev.opts.spacing.after || 0) + mt;
    else out.splice(start, 0, { t: 'gap', before: 0, after: mt });
  }
  else d.after = (d.after || 0) + mt;
}

/**
 * 잔여 아래 여백을 직전 블록에 흡수 — 빈 문단(¶ 서식기호) 생성 방지
 * - 직전이 문단이면 그 문단의 after에 합산
 * - 직전이 표면 생략(표끼리는 Word에서 여백 표현 불가, 눈에 띄지 않음)
 */
function addGapAfter(list, endIdx, twips){
  if (twips <= 0 || endIdx <= 0) return;
  const prev = list[endIdx - 1];
  if (prev && prev.t === 'p') prev.opts.spacing.after = (prev.opts.spacing.after || 0) + twips;
}

/** 특정 요소 하위 → 디스크립터 목록 */
function buildBlockList($, el){
  const out = [];
  buildChildren($, el, out);
  return out;
}

/**
 * 루트 children 순회 → 블록 디스크립터 배열
 * - 이웃 블록 간 마진 상쇄(CSS 방식): 이전 아래 여백과 현재 위 여백 중 큰 값만 적용
 * - 반환값: 마지막 자식 이후 남은 아래 여백 (부모 여백과 상쇄)
 */
function buildChildren($, root, out){
  let gapAfter = 0;
  $(root).contents().each((i, node) => {
    if (node.type === 'text'){
      const raw = String(node.data || '').replace(/\u00a0/g, ' ').trim();
      if (!raw) return;
      if (gapAfter > 0){ addGapAfter(out, out.length, gapAfter); gapAfter = 0; }
      out.push({ t: 'p', opts: { children: [new TextRun({ text: raw, font: FONT, size: szPx(12.5), color: DEFAULT_COLOR })], spacing: { line: 360, lineRule: LineRuleType.AUTO, before: 0, after: 0 } } });
      return;
    }
    if (node.type !== 'tag') return;
    const tag = node.name.toLowerCase();
    if (tag === 'style' || tag === 'script') return;
    if (isSkipped($, node)) return;
    const collapse = gapAfter; gapAfter = 0;
    const start = out.length;
    const ret = buildBlock($, node, out) || { before: 0, after: 0 };
    gapAfter = ret.after;
    // 이전 아래 여백 vs 현재 위 여백 상쇄 (표는 자체 margin-top도 반영)
    const gapBefore = Math.max(collapse, ret.before || 0);
    if (gapBefore > 0 && out.length > start){
      const d = out[start];
      if (d.t === 'p') d.opts.spacing.before = Math.max(d.opts.spacing.before || 0, gapBefore);
      else if (d.t === 'tbl'){
        const prev = out[start - 1];
        if (prev && prev.t === 'p') prev.opts.spacing.after = (prev.opts.spacing.after || 0) + gapBefore;
        else out.splice(start, 0, { t: 'gap', before: 0, after: gapBefore }); // 표-표 분리 스페이서
      }
      else d.after = (d.after || 0) + gapBefore;
    }
  });
  return gapAfter;
}

/** HTML → docx Buffer */
async function buildContractDocx(html){
  const $ = cheerio.load(html);
  const root = $('#_docx_inline_root, .contract-doc, #cpm-doc-area, #ct-print-area').first();
  const desc = [];
  if (root.length){
    buildChildren($, root[0], desc);
  } else {
    buildChildren($, $.root(), desc);
  }
  // 참고: keepNext(다음 단락과 함께)는 Word에서 왼쪽 여백에 네모 점(▪) 표시가
  // 생겨 사용자가 제거를 요청함 — 문단-표 붙이기는 적용하지 않음 (2026-09-03)
  const out = materialize(desc);
  const doc = new Document({
    creator: '인사톡 노무톡',
    title: '근로계약서',
    styles: {
      default: {
        document: {
          run: { font: FONT, size: szPx(12.5), color: DEFAULT_COLOR },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          // 화면(#cpm-doc-area) 패딩 40px 상하 / 50px 좌우와 동일한 여백으로
          // 본문 폭(694px)을 화면과 일치시켜 줄바꿈·셀 높이·페이지 분리가 그대로 재현되게 함
          margin: { top: 600, right: 750, bottom: 600, left: 750 },
        },
      },
      children: out,
    }],
  });
  return await Packer.toBuffer(doc);
}

module.exports = { buildContractDocx };


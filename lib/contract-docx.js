// ════════════════════════════════════════════════════════════
// 계약서 HTML → Word(docx) 서버 변환
// 화면(#cpm-doc-area)에 보이는 계약서 HTML을 클래스 기반으로 매핑하여
// 화면과 동일한 디자인(섹션 배경/인디고 좌측 라인, 셀 음영/테두리, 글자색)을
// Word 서식으로 재현한다.
// (html-to-docx는 인라인 CSS의 폰트/색/배경을 변환하지 못해 docx 라이브러리로 직접 구성)
// ════════════════════════════════════════════════════════════
const cheerio = require('cheerio');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, VerticalAlign,
  TableLayoutType, LineRuleType,
} = require('docx');

const FONT = 'Noto Sans KR';

// 화면 CSS(#cpm-doc-area) 색상
const C = {
  baseText:      '1A1A1A',
  title:         '0F172A',
  sectionBg:     'F1F5F9',
  sectionBorder: '4F46E5',      // 인디고 좌측 라인
  thBg:          'F8FAFC',
  tableBorder:   'CBD5E1',
  thText:        '374151',
  tdText:        '1E293B',
  totalBg:       'EFF6FF',
  totalText:     '1D4ED8',
  partiesBg:     'F8FAFC',
  signBorder:    'E2E8F0',
  noteText:      '64748B',
  signTitleText: '374151',
  highlight:     '1D4ED8',
  daily:         'D97706',
  dailyNoteBg:   'FFF7ED',
  dailyNoteBd:   'FED7AA',
  dailyNoteText: '9A3412',
  stampText:     '94A3B8',
  badgeBlueBg:   'DBEAFE',
  badgeBlueTxt:  '1D4ED8',
  badgeOrangeBg: 'FEF3C7',
  badgeOrangeTxt:'92400E',
};

// px → docx size(반 포인트, half-point)
const sz = pxVal => Math.round((Number(pxVal) || 0) * 1.5);
// px → twips (여백/간격)
const tw = pxVal => Math.round((Number(pxVal) || 0) * 15);

const BORDER_TABLE = { style: BorderStyle.SINGLE, size: 6, color: C.tableBorder };
const BORDER_SIGN  = { style: BorderStyle.SINGLE, size: 6, color: C.signBorder };

// ── 인라인 노드(텍스트/strong/highlight/badge/br) → TextRun 배열 ──
function collectRuns($, el, ctx, out){
  $(el).contents().each((i, node) => {
    if(node.type === 'text'){
      const t = String(node.data || '').replace(/\u00a0/g, ' ').trim();
      // trim은 첫/끝 공백 제거, 내부 공백은 유지
      const raw = String(node.data || '').replace(/\u00a0/g, ' ');
      if(!raw) return;
      out.push(new TextRun({ text: raw, ...ctx }));
      return;
    }
    if(node.type !== 'tag') return;
    const tag = node.name.toLowerCase();
    if(tag === 'br'){ out.push(new TextRun({ break: 1, ...ctx })); return; }
    const nctx = { ...ctx };
    const cls = node.attribs.class || '';
    if(tag === 'strong' || tag === 'b'){
      nctx.bold = true;
      if(cls.includes('daily-highlight')) nctx.color = C.daily;
    }
    if(tag === 'em' || tag === 'i') nctx.italics = true;
    if(tag === 'span'){
      if(cls.includes('highlight')){ nctx.bold = true; nctx.color = C.highlight; }
      else if(cls.includes('badge-orange')){ nctx.bold = true; nctx.fontSize = sz(10); nctx.color = C.badgeOrangeTxt; }
      else if(cls.includes('badge')){ nctx.bold = true; nctx.fontSize = sz(10); nctx.color = C.badgeBlueTxt; }
    }
    collectRuns($, node, nctx, out);
  });
}

// ── 요소 → Paragraph ──
function makeParagraph($, el, opts = {}){
  const ctx = {
    font: FONT,
    size: opts.size != null ? opts.size : sz(12.5),
    color: opts.color || C.baseText,
  };
  const runs = [];
  collectRuns($, el, ctx, runs);
  if(runs.length === 0) runs.push(new TextRun({ text: '', ...ctx }));
  const pOpts = {
    children: runs,
    spacing: {
      line: opts.line || 360,
      lineRule: LineRuleType.AUTO,
      before: opts.before || 0,
      after: opts.after != null ? opts.after : 60,
    },
  };
  if(opts.alignment) pOpts.alignment = opts.alignment;
  if(opts.border) pOpts.border = opts.border;
  if(opts.shading) pOpts.shading = opts.shading;
  if(opts.indent) pOpts.indent = opts.indent;
  if(opts.keepNext) pOpts.keepNext = true;
  if(opts.keepLines) pOpts.keepLines = true;
  return new Paragraph(pOpts);
}

// ── 테이블 요소 → docx Table ──
function makeTable($, tableEl, opts = {}){
  const isSchedule = $(tableEl).hasClass('work-schedule-table');
  const rows = [];
  $(tableEl).find('tr').each((i, tr) => {
    const $tr = $(tr);
    const isTotal = $tr.hasClass('total-row');
    const isHeaderRow = $tr.parent()[0] && $tr.parent()[0].name === 'thead';
    const cells = [];
    $tr.children('th, td').each((j, c) => {
      const tag = c.name.toLowerCase();
      const th = tag === 'th';
      const ctx = {
        font: FONT,
        size: opts.size != null ? opts.size : sz(12.5),
        color: th ? C.thText : C.tdText,
        bold: th ? true : false,
      };
      const runs = [];
      collectRuns($, c, ctx, runs);
      if(runs.length === 0) runs.push(new TextRun({ text: '', ...ctx }));
      // 셀 음영
      let fill = null;
      if(isTotal) fill = C.totalBg;
      else if(th || isHeaderRow) fill = C.thBg;
      // total-row 강조
      if(isTotal){
        if(th) ctx.color = C.totalText;
        ctx.bold = true;
      }
      // 셀 폭
      let widthPct = 50;
      if(isSchedule){
        const nCol = $tr.children('th, td').length || 6;
        widthPct = Math.round(100 / nCol);
      } else {
        widthPct = th ? 32 : 68;
      }
      const cellChildren = [ new Paragraph({
        children: runs,
        alignment: AlignmentType.CENTER,
        spacing: { line: 300, lineRule: LineRuleType.AUTO, before: 0, after: 0 },
      }) ];
      const cellOpts = {
        children: cellChildren,
        width: { size: widthPct, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: tw(3), bottom: tw(3), left: tw(8), right: tw(8) },
        borders: {
          top: BORDER_TABLE, bottom: BORDER_TABLE, left: BORDER_TABLE, right: BORDER_TABLE,
        },
      };
      if(fill) cellOpts.shading = { fill };
      cells.push(new TableCell(cellOpts));
    });
    rows.push(new TableRow({ children: cells, cantSplit: true, tableHeader: isHeaderRow }));
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows,
  });
}

// ── doc-sign(사업주/근로자 서명 박스) → 2열 테이블 ──
function makeSignTable($, signEl){
  const boxes = [];
  $(signEl).find('> .doc-sign-box').each((i, box) => {
    const $box = $(box);
    const children = [];
    // 서명 타이틀
    const $t = $box.find('> .sign-title');
    if($t.length){
      children.push(makeParagraph($, $t[0], {
        size: sz(12), color: C.signTitleText,
        alignment: AlignmentType.CENTER,
        line: 360, after: 80,
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.signBorder } },
        keepNext: true,
      }));
    }
    // sign-info-table
    const $st = $box.find('> table.sign-info-table');
    if($st.length){
      children.push(makeTable($, $st[0], { size: sz(11.5) }));
    }
    // 스탬프 영역
    const $stamp = $box.find('> .sign-stamp-area');
    if($stamp.length){
      const stampCtx = { font: FONT, size: sz(10.5), color: C.stampText };
      const runs = [];
      collectRuns($, $stamp[0], stampCtx, runs);
      if(runs.length) children.push(new Paragraph({
        children: runs,
        alignment: AlignmentType.CENTER,
        spacing: { line: 300, lineRule: LineRuleType.AUTO, before: 80, after: 0 },
      }));
    }
    // doc-sign-box의 전체 텍스트만 있고 위 매핑이 없으면 그대로 문단 처리
    if(children.length === 0){
      const ctx = { font: FONT, size: sz(12.5), color: C.baseText };
      const runs = [];
      collectRuns($, $box[0], ctx, runs);
      if(runs.length) children.push(new Paragraph({ children: runs, spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 60 } }));
    }
    boxes.push(new TableCell({
      children,
      width: { size: 50, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.TOP,
      margins: { top: tw(6), bottom: tw(6), left: tw(8), right: tw(8) },
      borders: {
        top: BORDER_SIGN, bottom: BORDER_SIGN, left: BORDER_SIGN, right: BORDER_SIGN,
      },
    }));
  });
  if(boxes.length === 0) return null;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [ new TableRow({ children: boxes, cantSplit: false }) ],
  });
}

// ── 계약서 전체 children 생성 ──
function buildChildren($, root){
  const out = [];
  $(root).children().each((i, el) => {
    const $el = $(el);
    const tag = el.name.toLowerCase();
    const cls = el.attribs.class || '';
    // 제목
    if(tag === 'h1' || tag === 'h2'){
      out.push(makeParagraph($, el, {
        size: sz(20), color: C.title,
        alignment: AlignmentType.CENTER,
        line: 360, after: 120,
        keepNext: true,
        border: { bottom: { style: BorderStyle.DOUBLE, size: 12, color: C.title } },
      }));
      return;
    }
    // 사업주·근로자 체결 서문
    if(cls.includes('doc-parties')){
      out.push(makeParagraph($, el, {
        size: sz(12.5), color: C.baseText,
        alignment: AlignmentType.CENTER,
        line: 380, after: 160,
        shading: { fill: C.partiesBg },
        border: {
          top: BORDER_SIGN, bottom: BORDER_SIGN, left: BORDER_SIGN, right: BORDER_SIGN,
        },
        keepNext: true,
      }));
      return;
    }
    // 섹션
    if(cls.includes('doc-section')){
      const titleEl = $el.find('> .doc-section-title');
      if(titleEl.length){
        out.push(makeParagraph($, titleEl[0], {
          size: sz(13), color: C.title,
          line: 360, before: 80, after: 80,
          keepNext: true,
          shading: { fill: C.sectionBg },
          border: { left: { style: BorderStyle.SINGLE, size: 32, color: C.sectionBorder } },
        }));
      }
      // 섹션 내용
      $el.children().each((j, sub) => {
        const $sub = $(sub);
        const st = sub.name.toLowerCase();
        const sc = sub.attribs.class || '';
        if(st === 'div' && sc.includes('doc-section-title')) return; // 위에서 처리
        if(sc.includes('work-schedule-wrap')){
          const $tbl = $sub.find('> table.work-schedule-table');
          if($tbl.length) out.push(makeTable($, $tbl[0], { size: sz(11.5) }));
          const $tot = $sub.find('> .wsh-total, .wsh-row');
          if($tot.length){
            const vals = [];
            $sub.find('.wsh-val, .wsh-item').each((k, it) => {
              const t = $(it).text().replace(/\s+/g, ' ').trim();
              if(t) vals.push(t);
            });
            const ctx = { font: FONT, size: sz(12.5), bold: true, color: C.tdText };
            const runs = vals.map((t, idx) => new TextRun({ text: (idx ? '      ' : '') + t, ...ctx }));
            if(runs.length) out.push(new Paragraph({ children: runs, alignment: AlignmentType.CENTER, spacing: { line: 340, lineRule: LineRuleType.AUTO, before: 60, after: 60 } }));
          }
          return;
        }
        if(sc.includes('doc-daily-note')){
          out.push(makeParagraph($, sub, {
            size: sz(12), color: C.dailyNoteText,
            line: 360, before: 60, after: 80,
            shading: { fill: C.dailyNoteBg },
            border: { top: { style: BorderStyle.SINGLE, size: 12, color: C.dailyNoteBd },
                      bottom: { style: BorderStyle.SINGLE, size: 12, color: C.dailyNoteBd },
                      left: { style: BorderStyle.SINGLE, size: 12, color: C.dailyNoteBd },
                      right: { style: BorderStyle.SINGLE, size: 12, color: C.dailyNoteBd } },
          }));
          return;
        }
        if(sc.includes('doc-note')){
          out.push(makeParagraph($, sub, {
            size: sz(11.5), color: C.noteText,
            line: 340, before: 20, after: 60,
          }));
          return;
        }
        if(st === 'table' && (sc.includes('info-table') || sc.includes('sign-info-table'))){
          out.push(makeTable($, sub, { size: sz(12.5) }));
          return;
        }
        if(st === 'p' || st === 'div'){
          out.push(makeParagraph($, sub, {
            size: sz(12.5), color: C.baseText,
            line: 380, after: 80,
          }));
          return;
        }
        // 그 외: 원시 문단
        const ctx = { font: FONT, size: sz(12.5), color: C.baseText };
        const runs = [];
        collectRuns($, sub, ctx, runs);
        if(runs.length) out.push(new Paragraph({ children: runs, spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 60 } }));
      });
      return;
    }
    // 계약일(작성일) 박스
    if(cls.includes('doc-sign-date')){
      out.push(makeParagraph($, el, {
        size: sz(13), color: C.thText,
        alignment: AlignmentType.CENTER,
        line: 380, before: 160, after: 120,
        shading: { fill: C.partiesBg },
        border: { top: BORDER_SIGN, bottom: BORDER_SIGN, left: BORDER_SIGN, right: BORDER_SIGN },
      }));
      return;
    }
    // 서명 영역
    if(cls.includes('doc-sign')){
      const sign = makeSignTable($, el);
      if(sign) out.push(sign);
      return;
    }
    // 기타 기본 문단
    const ctx = { font: FONT, size: sz(12.5), color: C.baseText };
    const runs = [];
    collectRuns($, el, ctx, runs);
    if(runs.length) out.push(new Paragraph({ children: runs, spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 60 } }));
  });
  return out;
}

// HTML → docx Buffer
async function buildContractDocx(html){
  const $ = cheerio.load(html);
  // 루트: 화면 계약서 컨테이너 (print 모달 #cpm-doc-area / 미리보기 #ct-print-area / 기존 .contract-doc)
  const root = $('.contract-doc, #cpm-doc-area, #ct-print-area').first();
  let children;
  if(root.length){
    children = buildChildren($, root[0]);
  } else {
    // 컨테이너 없으면 body 직속 자식 기준
    children = buildChildren($, $.root());
  }
  const doc = new Document({
    creator: '인사톡 노무톡',
    title: '근로계약서',
    styles: {
      default: {
        document: {
          run: { font: FONT, size: sz(12.5), color: C.baseText },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1080, right: 1020, bottom: 1080, left: 1020 },
        },
      },
      children,
    }],
  });
  return await Packer.toBuffer(doc);
}

module.exports = { buildContractDocx };

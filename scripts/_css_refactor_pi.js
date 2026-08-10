const fs = require('fs');
let h = fs.readFileSync('admin/pages/payroll-input.html', 'utf8');

// pi-work-auto-panel container - remove inline styles
h = h.replace(
  '<div id="pi-work-auto-panel" style="display:none;margin-top:8px;margin-bottom:4px;background:#f8faff;border:1px solid #c7d2f0;border-radius:8px;padding:10px 12px;">',
  '<div id="pi-work-auto-panel">'
);

// Header
h = h.replace(
  /<div style="font-size:11\.5px;font-weight:700;color:#4f46e5;margin-bottom:7px;display:flex;align-items:center;gap:5px;">\s*<i class="fas fa-calculator" style="font-size:11px;"><\/i> 근로 실적 기반 자동 산출\s*<span style="font-size:10px;font-weight:400;color:#818cf8;">\(계약 \+ 근태 반영\)<\/span>/,
  '<div class="pi-wap-header"><i class="fas fa-calculator"></i> 근로 실적 기반 자동 산출 <span>(계약 + 근태 반영)</span>'
);

// Section titles
h = h.replace(/<div style="font-size:10\.5px;font-weight:700;color:#4338ca;margin-bottom:4px;padding:2px 6px;background:#eef2ff;border-radius:4px;">만근 기준 \(계약\)<\/div>/g,
  '<div class="pi-wap-sec-title purple">만근 기준 (계약)</div>');
h = h.replace(/<div style="font-size:10\.5px;font-weight:700;color:#dc2626;margin:8px 0 4px;padding:2px 6px;background:#fff1f2;border-radius:4px;">결근·지각·조퇴 차감<\/div>/g,
  '<div class="pi-wap-sec-title red">결근·지각·조퇴 차감</div>');
h = h.replace(/<div style="font-size:10\.5px;font-weight:700;color:#059669;margin:8px 0 4px;padding:2px 6px;background:#ecfdf5;border-radius:4px;">실제 지급<\/div>/g,
  '<div class="pi-wap-sec-title green">실제 지급</div>');
h = h.replace(/<div style="font-size:10\.5px;font-weight:700;color:#6366f1;margin:8px 0 4px;padding:2px 6px;background:#eef2ff;border-radius:4px;">고정 근로 \(근무시간표\)<\/div>/g,
  '<div class="pi-wap-sec-title indigo">고정 근로 (근무시간표)</div>');
h = h.replace(/<div style="font-size:10\.5px;font-weight:700;color:#2563eb;margin:8px 0 4px;padding:2px 6px;background:#eff6ff;border-radius:4px;">추가 근로 \(실적\)<\/div>/g,
  '<div class="pi-wap-sec-title blue">추가 근로 (실적)</div>');
h = h.replace(/<div style="font-size:10\.5px;font-weight:700;color:#dc2626;margin:8px 0 4px;padding:2px 6px;background:#fff1f2;border-radius:4px;">근태 차감 내역<\/div>/g,
  '<div class="pi-wap-sec-title red">근태 차감 내역</div>');

// Readonly input values - by ID
h = h.replace(/style="width:50px;text-align:right;background:transparent;border:none;color:#6366f1;font-size:11px;font-weight:600;padding:0;"/g,
  'class="pi-wap-val hours indigo-bold"');
h = h.replace(/style="width:90px;text-align:right;background:transparent;border:none;color:#4338ca;font-size:11px;padding:0;"/g,
  'class="pi-wap-val pay purple"');
h = h.replace(/style="width:50px;text-align:right;background:transparent;border:none;color:#2563eb;font-size:11px;font-weight:600;padding:0;"/g,
  'class="pi-wap-val hours blue-bold"');
h = h.replace(/style="width:90px;text-align:right;background:transparent;border:none;color:#3b82f6;font-size:11px;padding:0;"/g,
  'class="pi-wap-val pay blue"');
h = h.replace(/style="width:50px;text-align:right;background:transparent;border:none;color:#ef4444;font-size:10\.5px;font-weight:600;padding:0;"/g,
  'class="pi-wap-val hours red-bold"');
h = h.replace(/style="width:90px;text-align:right;background:transparent;border:none;color:#dc2626;font-size:10\.5px;padding:0;"/g,
  'class="pi-wap-val pay red"');

// Wide inputs
h = h.replace(/style="width:100px;text-align:right;background:transparent;border:none;color:#4338ca;font-size:11px;font-weight:600;padding:0;"/g,
  'class="pi-wap-val wide purple-bold"');
h = h.replace(/style="width:100px;text-align:right;background:transparent;border:none;color:#059669;font-size:11px;font-weight:700;padding:0;"/g,
  'class="pi-wap-val wide green"');
h = h.replace(/style="width:100px;text-align:right;background:transparent;border:none;color:#dc2626;font-size:11px;font-weight:600;padding:0;"/g,
  'class="pi-wap-val wide red"');
h = h.replace(/style="width:80px;text-align:right;background:transparent;border:none;color:#ef4444;font-size:10\.5px;font-weight:600;padding:0;"/g,
  'class="pi-wap-val hours red-bold"');

// Labels in pi-work-auto-panel
h = h.replace(/style="color:#4338ca;font-size:11px;">근로일수/g, '>근로일수');
h = h.replace(/style="color:#4338ca;font-size:12px;">기본급/g, '>기본급');
h = h.replace(/style="color:#4338ca;font-size:12px;">주휴수당/g, '>주휴수당');
h = h.replace(/style="color:#4338ca;font-size:11px;">월 기본급/g, '>월 기본급');
h = h.replace(/style="color:#4338ca;font-size:11px;">주휴수당/g, '>주휴수당');

// Deduction row backgrounds
h = h.replace(/style="background:#fff5f5;border-radius:4px;padding:3px 6px;"/g, 'class="pi-wap-row ded"');
h = h.replace(/style="background:#f0fdf4;border-radius:4px;padding:3px 6px;"/g, 'class="pi-wap-row green-bg"');

// Value display div
h = h.replace(/<div style="display:flex;align-items:center;gap:6px;">/g, '<div class="pi-wap-inline">');

// Deduction toggle row
h = h.replace(
  /<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10\.5px;color:#6366f1;">\s*<input type="checkbox" id="pi-attendance-deduction-chk"\s*style="width:13px;height:13px;accent-color:#6366f1;cursor:pointer;"\s*onchange="calcPI\(\)" \/>\s*근태차감 \(취업규칙에 규정\)/,
  '<label class="pi-wap-ded-toggle"><input type="checkbox" id="pi-attendance-deduction-chk" onchange="calcPI()" />근태차감 (취업규칙에 규정)'
);
h = h.replace(/<span style="font-size:9\.5px;color:#9ca3af;">체크 시 결근에 따른 고정수당 차감 적용<\/span>/g,
  '<span class="pi-wap-ded-toggle-hint">체크 시 결근에 따른 고정수당 차감 적용</span>');

// Total section
h = h.replace(
  /<div style="margin-top:8px;padding-top:6px;border-top:2px solid #4f46e5;">\s*<div class="pi-row" style="background:#eef2ff;border-radius:6px;padding:6px 8px;">\s*<label style="color:#4f46e5;font-size:12px;font-weight:700;">총 보수월액 \(과세기준\)<\/label>\s*<input type="text" id="pi-std-monthly-disp" readonly tabindex="-1" style="width:120px;text-align:right;background:transparent;border:none;color:#4f46e5;font-size:13px;font-weight:800;padding:0;" value="0원" \/>/,
  '<div class="pi-wap-total"><div class="pi-wap-total-row"><label>총 보수월액 (과세기준)</label><input type="text" id="pi-std-monthly-disp" readonly tabindex="-1" value="0원" />'
);

// Deduction label color
h = h.replace(/style="color:#dc2626;font-size:10\.5px;">차감시간/g, '>차감시간');
h = h.replace(/style="color:#dc2626;font-size:10\.5px;">기본급 차감/g, '>기본급 차감');
h = h.replace(/style="color:#dc2626;font-size:10\.5px;">주휴수당 차감/g, '>주휴수당 차감');
h = h.replace(/style="color:#dc2626;font-size:10\.5px;">차감 연장근로/g, '>차감 연장근로');
h = h.replace(/style="color:#dc2626;font-size:10\.5px;">차감 야간근로/g, '>차감 야간근로');
h = h.replace(/style="color:#dc2626;font-size:10\.5px;">차감 휴일근로/g, '>차감 휴일근로');
h = h.replace(/style="color:#3b82f6;font-size:11px;">추가 연장근로/g, '>추가 연장근로');
h = h.replace(/style="color:#3b82f6;font-size:11px;">추가 야간근로/g, '>추가 야간근로');
h = h.replace(/style="color:#3b82f6;font-size:11px;">추가 휴일근로/g, '>추가 휴일근로');

// pi-deduction-detail
h = h.replace(/style="font-size:9\.5px;font-weight:400;color:#9ca3af;display:block;"/g, '');

// Simple span
h = h.replace(/style="color:#4338ca;font-size:11px;font-weight:600;">/g, '>');

// Add inline CSS
h = h.replace('<!-- 근로 실적 자동 산출 결과 패널 -->',
  '<style>.pi-wap-inline{display:flex;align-items:center;gap:6px}</style>\n              <!-- 근로 실적 자동 산출 결과 패널 -->');

fs.writeFileSync('admin/pages/payroll-input.html', h, 'utf8');
// 추가 정리
h = h.replace(/style="color:#dc2626;font-size:10\.5px;">/g, '>');
h = h.replace(/style="color:#4338ca;font-size:12px;font-weight:600;">/g, '>');
h = h.replace(/<label >/g, '<label>');
h = h.replace(/<span >/g, '<span>');
fs.writeFileSync('admin/pages/payroll-input.html', h, 'utf8');
console.log('done');

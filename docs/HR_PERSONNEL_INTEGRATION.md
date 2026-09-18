# 인사관리대장 인원유형 통합 (2026-08-18)

## 개요
인사관리대장을 직원 전용 명부에서 **대표자 본인·등기임원·특수관계인까지 포함하는 통합 인원대장**으로 확장하고,
고객사 정보의 대표자/등기임원/특수관계인 입력을 인사관리대장 목록에서 선택하는 방식으로 개편했다.

## 데이터 모델
- `employees.personnel_type`: `employee`(기본) / `representative`(대표자 본인) / `executive`(등기임원) / `related`(특수관계인)
- `employees.relationship`: 특수관계인 관계 (배우자/자녀/부모 등)
- 마이그레이션: `scripts/_hr_personnel_types.js`
  - 기존 `is_representative=1` → `representative` 백필
  - `registered_executives` → 사번·이름 매칭 시 `executive` 승격, 없으면 새 직원 INSERT
  - `related_party_workers` → 동일 규칙으로 `related` 병합

## 단일 정보원 (Source of Truth)
- **인사관리대장(employees)** 이 기준. 등록/수정 시 다음으로 write-through 동기화 (`_hrSyncPersonnel`):
  - 등기임원 → `registered_executives` upsert
  - 특수관계인 → `related_party_workers` upsert
  - 대표자 본인 → `companies.representatives` JSON upsert
- 고객사 수정 모달을 열면 인사관리대장에 등록된 인원을 자동 병합 (`_cmMergeHrReps` / `_cmMergeHrPersons`)

## 고객사 정보 선택 방식
- 대표자 정보 / 등기임원 / 특수관계인 급여대상자 섹션에 **「인사관리대장 선택」** 버튼 추가
- 근로자 선택 피커(`ct-emp-picker-modal`)를 범용화: `openCtEmpPicker({ title, companyId, typeFilter, onSelect })`
- 선택 시 기존 행/카드와 사번·이름 중복 체크 후 자동 채움 (관계·직책 등 누락분은 수기 보완 가능)

## UI
- 인사관리대장 목록: 인원 구분 배지(대표자 본인/등기임원/특수관계인) + 구분 필터
- 인사관리대장 등록/편집 폼: 구분 select, 특수관계인일 때 관계 입력 필드 노출, 대표자 본인 선택 시 대표자 체크 자동
- 상세 조회 모달: 구분·관계 표시

## 급여 연동 (2026-08-18)
- 고객사 카드·급여 입력 지급대상 목록에 계약이 없는 대표자·등기임원·특수관계인도 포함 (별도계약 배지, 유효계약 보유 시 계약 정보 우선·중복 제외)
- 가상 인원 급여 입력: 근로일수·통상시급 등 수동 입력, 연차 자동계산 섹션 숨김
- 4대보험: 대표자·등기임원·특수관계인은 국민연금·건강·장기요양·고용보험 적용제외로 공제 0원 (근로자성 없는 인원의 법적 기본값)

## 데이터 정합성 스크립트
- `scripts/_hr_personnel_types.js`: 컬럼 추가 + 인원유형 백필·병합 (고객사 representatives JSON, registered_executives, related_party_workers → employees, 멱등)
- `scripts/_hr_audit_roster_gaps.js`: 전 고객사 인사관리대장 누락 점검 (dry-run) — 누락 시 위 마이그레이션 재실행


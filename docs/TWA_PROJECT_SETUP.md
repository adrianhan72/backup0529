# TWA(Trusted Web Activity) 프로젝트 생성 절차 상세 문서

> 기준 URL: `https://insanomutok.com/client/`
> 패키지명(가칭): `com.daehwa.insanomutok` — **출시 전 확정 필요 (변경 불가)**
> 개발 PC: Windows

---

## 0. 사전 준비

| 도구 | 용도 | 필수? |
|---|---|---|
| JDK 17 | keytool·Gradle 빌드 | ✅ (A/B/C 공통) |
| Android SDK cmdline-tools | AAB 빌드 (B 방식) | B 방식만 |
| Android Studio | IDE (C 방식) | C 방식만 |
| PWABuilder(웹) | 프로젝트 zip 생성 (A 방식) | A 방식만 |

**JDK 설치 확인 (PowerShell):**

```powershell
java -version        # 17 이상 권장
keytool -version     # JDK에 포함
```

---

## 방식 A — PWABuilder (가장 빠름, 권장)

### A-1. 웹에서 패키지 생성

1. https://www.pwabuilder.com 접속
2. 시작 URL 입력: `https://insanomutok.com/client/`
3. PWA 점검 통과 여부 확인 (점수가 낮아도 진행 가능 — TWA 패키징에는 지장 없음)
4. **Package for Stores** → **Android** 탭
5. 설정 항목:
   - App name: `인사톡 노무톡`
   - Package ID: `com.daehwa.insanomutok`
   - Version: `1.0.0`, Version code: `1`
   - Host / Start URL: `https://insanomutok.com/client/`
   - Signing key: **Generate new** (키 비밀번호 기억/보관)
6. **Download** → `zip` 파일 저장 (TWA 프로젝트)

### A-2. 지문 확인

- PWABuilder 다운로드 화면에서 **Signing Key Fingerprint(SHA-256)** 표시됨 → 복사해 보관
- 또는 zip 안의 `.jks`(또는 `.keystore`)로 직접 추출:

```powershell
keytool -list -v -keystore <zip에서 푼 keystore> -alias android | findstr SHA256
```

### A-3. 빌드 (Windows)

zip 해제 후 `twa-manifest.json` 확인 → Bubblewrap으로 빌드하거나 zip 안 Gradle 프로젝트 사용:

```powershell
# Bubblewrap 설치 (Node.js 필요)
npm i -g @bubblewrap/cli

# 빌드 (첫 실행 시 Android SDK 경로·라이선스 동의 물어봄)
bubblewrap build
```

결과물: `app-release-signed.aab` (또는 `.apk`)

---

## 방식 B — Bubblewrap CLI로 처음부터 생성

### B-1. Bubblewrap 설치

```powershell
npm i -g @bubblewrap/cli
```

### B-2. 프로젝트 초기화

```powershell
bubblewrap init --manifest https://insanomutok.com/client/
```

대화형 질문 답변:

| 질문 | 입력 |
|---|---|
| Domain | `insanomutok.com` |
| Package name | `com.daehwa.insanomutok` |
| App name | `인사톡 노무톡` |
| Launcher activity name | 기본값 |
| App version / version code | `1.0.0` / `1` |
| Start URL | `https://insanomutok.com/client/` |
| Host | `https://insanomutok.com/client/` |
| Icon | 512×512 PNG 경로 |
| Play billing / location delegation | 필요 없으면 N |

### B-3. keystore 생성 (최초 1회)

```powershell
keytool -genkey -v -keystore insanomutok-upload.jks `
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

- 비밀번호 2회 입력 (키/스토어)
- `insanomutok-upload.jks` 파일과 비밀번호 **별도 안전 보관** (분실 시 업데이트 불가)

### B-4. 키 설정

```powershell
bubblewrap update --keystore .\insanomutok-upload.jks `
  --keyAlias upload --keyPass <키비번> --storePass <스토어비번>
```

### B-5. 지문 추출

```powershell
keytool -list -v -keystore .\insanomutok-upload.jks -alias upload | findstr SHA256
# 예: SHA256: AA:BB:CC:... → 콜론 제거한 대문자 문자열을 assetlinks에 사용
```

### B-6. 빌드

```powershell
bubblewrap build
```

결과물: `app-release-signed.aab`

---

## 방식 C — Android Studio

1. New Project → **Empty Views Activity** (언어: Java 또는 Kotlin 무관)
2. Package: `com.daehwa.insanomutok`
3. `app/build.gradle` 의존성 추가:

```gradle
dependencies {
    implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
}
```

4. `AndroidManifest.xml` 수정:

```xml
<application ...>
    <activity android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
        android:exported="true"
        android:theme="@style/Theme.AppCompat.DayNight.NoActionBar">
        <meta-data android:name="android.support.customtabs.trusted.DEFAULT_URL"
            android:value="https://insanomutok.com/client/" />
        <meta-data android:name="android.support.customtabs.trusted.STATUS_BAR_COLOR"
            android:resource="@color/colorPrimary" />
        <meta-data android:name="android.support.customtabs.trusted.NAVIGATION_BAR_COLOR"
            android:resource="@color/colorPrimary" />
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
    </activity>
</application>
```

5. keystore 생성·서명 설정: `Build > Generate Signed App Bundle` 마법사에서 keystore 생성 가능
6. 지문 추출은 위 B-5와 동일

---

## 공통 후속 작업 (방식 무관)

### assetlinks.json 반영

`.well-known/assetlinks.json`의 `sha256_cert_fingerprints`에 추출한 지문 입력 (콜론 제거, 대문자):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.daehwa.insanomutok",
      "sha256_cert_fingerprints": ["추출한SHA256지문"]
    }
  }
]
```

> ⚠️ Play App Signing 사용 시에는 Play Console의 **앱 서명 키 인증서 지문**으로 교체.

### 검증 순서

1. 서버 배포 후: `https://insanomutok.com/.well-known/assetlinks.json` 200 확인
2. 디버그 서명 APK로 실기기 설치 → 앱 실행 시 **브라우저로 튀지 않고** 앱 안에서 열리는지 확인
3. Play Console → 개발자 도구 → 디지털 자산 링크 검증

### 자주 하는 실수

| 실수 | 증상 |
|---|---|
| assetlinks 미배포/지문 불일치 | 앱이 Chrome으로 강제 이동 |
| Play App Signing 지문 대신 업로드 키 지문 사용 | 심사/출시 후 브라우저 튐 |
| `.jks` 분실 | 업데이트 불가 (영구) |
| `unzip -o` 배포로 `.well-known` 삭제 | build-dist 포함 여부 확인 |
| Start URL에 trailing slash 누락 | 첫 화면 리다이렉트 발생 |

---

## 최소 진행 체크리스트

- [ ] JDK 17 설치 및 `keytool` 확인
- [ ] 방식 선택 (A/B/C)
- [ ] 프로젝트 생성 (zip 또는 초기화)
- [ ] keystore 생성 + 백업
- [ ] SHA-256 지문 추출·보관
- [ ] `assetlinks.json`에 지문 반영 → 서버 배포
- [ ] AAB 빌드
- [ ] 실기기 테스트 (브라우저 튐 여부)
- [ ] Play Console 업로드 준비

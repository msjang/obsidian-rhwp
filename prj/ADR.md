# 아키텍처 결정 기록

## ADR-001: 기본 read-only 문서 영역에 `@rhwp/core` 사용

날짜: 2026-06-01

상태: 채택

### 맥락

`rhwp`는 직접 WASM 파서/렌더링 API를 제공하는 `@rhwp/core`와 iframe 기반 전체 편집기 UI를 제공하는 `@rhwp/editor`를 노출합니다. 이 플러그인은 Obsidian 안에서 HWP/HWPX 파일을 열어야 하며, 기본 동작은 read-only여야 합니다.

### 결정

초기 구현에는 `@rhwp/core`를 사용합니다. 문서 페이지는 Obsidian `FileView` 안에 SVG로 렌더링합니다.

### 결과

- 렌더링을 로컬과 read-only 상태로 유지할 수 있습니다.
- 로딩, 오류, 향후 뷰 컨트롤은 Obsidian UI가 담당합니다.
- 첫 마일스톤에는 편집 기능을 포함하지 않습니다.
- 빌드는 `rhwp_bg.wasm`을 플러그인 출력물에 복사해야 합니다.

## ADR-002: 편집 모드는 명시적으로 진입하고 저장은 통제된 방식으로 처리

날짜: 2026-06-01

상태: 채택

### 맥락

제품 요청은 가능하다면 기본을 read-only로 두고, 사용자가 UI를 통해 직접 전환했을 때만 편집하도록 선호합니다. `@rhwp/editor`는 iframe 편집과 export API를 제공하지만, README에는 read-only 옵션이 문서화되어 있지 않습니다.

### 결정

기본 read-only 경로에는 `@rhwp/core`를 사용합니다. 명시적인 편집 버튼을 추가해 `@rhwp/editor`를 로드합니다. 사용자가 저장 버튼을 누를 때만 vault에 씁니다.

### 결과

- 일반 보기 상태는 로컬과 read-only로 유지됩니다.
- 편집 모드는 ADR-003의 로컬 `rhwp-studio` 자산을 사용합니다.
- 로드나 편집만으로는 `Vault.modifyBinary`를 호출하지 않고, 저장 버튼을 누를 때만 쓰므로 실수로 원본을 바꿀 가능성을 줄입니다.

## ADR-003: 로컬 편집 모드를 위해 rhwp-studio 포함

날짜: 2026-06-01

상태: 채택

### 맥락

`@rhwp/editor`는 `studioUrl` 옵션을 받습니다. 패키지 코드는 로컬에 설치되지만, 기본 편집기 UI는 iframe을 통해 upstream 호스팅 rhwp-studio 사이트를 로드합니다.

### 결정

고정된 upstream `rhwp` 버전과 맞는 `rhwp-studio`를 빌드하고, 배포용 정적 자산을 `rhwp-studio/` 아래에 포함합니다. `createEditor`에는 플러그인 로컬 `rhwp-studio/index.html` 리소스 URL을 전달합니다.

### 결과

- 편집 모드는 더 이상 upstream hosted editor에 의존하지 않습니다.
- 편집기 UI, WASM, CanvasKit, 번들 대체 폰트를 포함하므로 플러그인 릴리스 크기가 커집니다.
- 고정한 `rhwp` 버전이 바뀌면 포함된 편집기 빌드를 함께 갱신해야 합니다.

## ADR-004: README는 한국어 우선, 영어 요약 포함

날짜: 2026-06-01

상태: 채택

### 맥락

Obsidian 플러그인 README는 커뮤니티 플러그인 브라우저가 전 세계 사용자를 대상으로 하므로 영어 우선인 경우가 많습니다. 다만 한국어 사용자를 주 대상으로 하는 플러그인은 한국어 설명을 앞에 두거나 언어별 섹션을 제공하기도 합니다.

### 결정

HWP/HWPX는 한국 업무 맥락과 강하게 연결되어 있으므로 이 플러그인은 한국어 우선 문서를 사용합니다. 비한국어 사용자와 플러그인 도구가 프로젝트를 이해할 수 있도록 짧은 영어 요약과 영어 키워드는 유지합니다.

### 결과

- 한국어 사용자가 가장 명확한 사용 경로를 얻습니다.
- 전 세계 사용자는 플러그인을 평가할 수 있는 최소한의 맥락을 얻습니다.
- 배포 필요에 따라 나중에 `README.md`와 `README.ko.md`로 분리할 수 있습니다.

## ADR-005: 플러그인 i18n에 Obsidian `getLanguage()` 사용

날짜: 2026-06-01

상태: 채택

### 맥락

Obsidian은 공개 플러그인 API에서 `getLanguage()`를 제공합니다. 이 함수는 현재 설정된 앱 언어의 ISO 코드를 반환하며 기본값은 영어입니다.

### 결정

`getLanguage()`로 플러그인 UI 문자열을 선택합니다. 언어 코드가 `ko`로 시작하면 한국어를 사용하고, 그렇지 않으면 영어로 대체합니다.

### 결과

- UI 라벨, 알림, 확인 메시지, 기본 HWPX 이름이 Obsidian 언어 설정을 따를 수 있습니다.
- 플러그인 로드 시 command 이름이 현지화되므로, Obsidian 언어를 바꾼 뒤 command palette 라벨을 갱신하려면 플러그인을 다시 로드해야 할 수 있습니다.
- 로컬 문자열 테이블을 확장해 다른 언어를 추가할 수 있습니다.

## ADR-006: 새 문서 기본 형식은 HWP

날짜: 2026-06-09

상태: 채택

### 맥락

플러그인은 `rhwp`를 통해 HWP와 HWPX를 모두 export할 수 있지만, 현재 테스트 기준으로 HWPX 렌더링과 저장 일관성은 아직 충분히 안정적이지 않습니다.

### 결정

새 파일 기본 형식은 HWP로 둡니다. HWPX는 설정에서 선택할 수 있게 유지합니다.

### 결과

- 새 파일 생성은 더 안전한 기본값을 따릅니다.
- 사용자는 필요하면 HWPX를 선택할 수 있습니다.
- HWPX 동작이 안정화되면 설정 기본값을 다시 검토할 수 있습니다.

## ADR-007: 추측성 작성자 메타데이터는 표시하지 않음

날짜: 2026-06-09

상태: 채택

### 맥락

사용자는 생성, 수정, 작성자, 조직 같은 문서형 속성을 요청했습니다. 현재 `@rhwp/core` 타입은 document info 읽기를 일부 노출하지만, 작성자나 조직 메타데이터를 안정적으로 읽고 쓰는 명확한 API는 확인되지 않았습니다.

### 결정

Obsidian 파일 통계에서 신뢰할 수 있는 생성/수정 시각만 표시합니다. rhwp의 지원 메타데이터 API나 문서 수준 파싱 방식이 확인되기 전까지 작성자와 조직은 표시하지 않습니다.

### 결과

- 속성 패널이 오해를 줄 수 있는 값을 보여주지 않습니다.
- 신뢰할 수 있는 출처가 생기면 작성자/조직 정보를 나중에 추가할 수 있습니다.

## ADR-008: 프로젝트 개발 문서는 `prj/`에 두고 main 배포 브랜치에서는 제외

날짜: 2026-06-10

상태: 채택

### 맥락

`prj/` 문서는 제품 요구사항, 아키텍처 결정, 작업 절차, 검증 상태처럼 개발 중 판단과 맥락을 기록합니다. 이런 문서는 코드 변경과 함께 움직여야 추적하기 쉽지만, Obsidian 커뮤니티 플러그인 사용자에게 직접 필요한 도움말 문서와는 성격이 다릅니다.

GitHub Wiki는 외부에 공유하기 좋은 정제된 문서를 두기에는 적합하지만, 코드 브랜치나 특정 커밋의 판단 근거와 함께 버전 관리하기에는 불편합니다.

### 결정

`prj/`는 `dev` 브랜치에 둡니다. `main` 브랜치는 사용자에게 공개되는 플러그인 배포 기준으로 유지하고, `prj/`는 포함하지 않습니다.

GitHub Wiki에는 나중에 외부 기여자나 사용자가 읽을 만큼 정제된 개발 가이드, 릴리스 절차, 긴 사용자 도움말만 옮깁니다.

### 결과

- 개발 중 결정과 검증 기록은 코드 변경과 같은 Git 히스토리에서 추적할 수 있습니다.
- `main` 브랜치는 커뮤니티 플러그인 제출과 사용자 노출에 맞게 간결하게 유지됩니다.
- `dev`에서 `main`으로 반영할 때는 `prj/` 관련 커밋을 제외하거나, `main`에서 `prj/` 삭제 상태를 유지합니다.
- Wiki는 프로젝트 내부 작업 기억이 아니라 외부 공유용 문서로 제한합니다.

## ADR-009: 추가 자산은 GitHub Release zip self-hydration으로 설치

날짜: 2026-06-10

상태: 채택

### 맥락

Obsidian 커뮤니티 플러그인은 `community-plugins.json`에 등록된 저장소의 `manifest.json`과 `README.md`를 읽어 상세 페이지를 구성합니다. 공식 `obsidian-releases` README는 실제 설치 시 `manifest.json`의 버전과 같은 GitHub Release tag를 찾고, release asset 중 `manifest.json`, `main.js`, `styles.css`를 다운로드한다고 설명합니다.

현재 플러그인은 read-only 렌더링과 편집 모드에 `rhwp_bg.wasm`과 `rhwp-studio/` 정적 자산이 필요합니다. 이 자산을 GitHub Release에 추가로 올렸을 때 Obsidian 커뮤니티 설치 과정에서 자동으로 함께 내려받는지 확인해야 했습니다.

실제 설치된 커뮤니티 플러그인 중 `obsidian-advanced-slides`는 플러그인 폴더 안에 `dist/`, `plugin/`, `template/` 같은 추가 디렉터리와 자산을 가집니다. 해당 프로젝트의 release workflow는 `obsidian-advanced-slides.zip`을 만들고 `main.js`, `manifest.json`, `styles.css`와 함께 GitHub Release asset으로 올립니다.

설치된 `obsidian-advanced-slides/main.js`를 확인한 결과, 추가 자산은 Obsidian 설치 과정이 자동으로 푼 것이 아니라 플러그인 실행 시 누락되거나 오래된 자산을 감지한 뒤 같은 GitHub Release의 zip을 다운로드하고 JSZip으로 풀어 플러그인 폴더에 쓰는 방식이었습니다.

### 결정

`obsidian-rhwp`도 같은 self-hydration 방식을 채택합니다.

릴리스 생성 시 `main.js`, `manifest.json`, `styles.css`를 개별 asset으로 만들고, `obsidian-rhwp.zip`에는 이 세 파일과 함께 `rhwp_bg.wasm`, `rhwp-studio/`, `rhwp-assets.json`을 포함합니다.

플러그인 로드 시 `rhwp_bg.wasm`, `rhwp-studio/index.html`, `rhwp-assets.json`을 확인합니다. 자산이 없거나 `rhwp-assets.json`의 플러그인 버전과 rhwp core 버전이 현재 코드와 다르면 같은 GitHub Release의 `obsidian-rhwp.zip`을 다운로드합니다. 압축 해제 시에는 `rhwp_bg.wasm`, `rhwp-studio/`, `rhwp-assets.json`만 설치하고 `main.js`, `manifest.json`, `styles.css`는 덮어쓰지 않습니다.

### 결과

- 공식 커뮤니티 설치 직후에는 네트워크를 통해 추가 자산 zip을 한 번 더 받을 수 있습니다.
- 추가 자산 설치가 끝난 뒤 read-only 렌더링과 편집 모드는 플러그인 로컬 자산을 사용합니다.
- GitHub Release tag는 `manifest.json`의 `version`과 같은 값이어야 합니다.
- release asset 목록에는 `main.js`, `manifest.json`, `styles.css`, `obsidian-rhwp.zip`이 필요합니다.
- 버전이 바뀌면 self-hydration marker가 불일치하므로 플러그인은 새 release zip에서 로컬 자산을 갱신합니다.

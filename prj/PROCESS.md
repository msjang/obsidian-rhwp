# 작업 절차

## 작업 원칙

- 결정이 바뀌면 README와 문서를 함께 갱신합니다.
- Obsidian에서 직접 확인할 수 있는 작은 구현 단위로 진행합니다.
- HWP/HWPX 파일은 원본 문서로 취급하고, 사용자의 명시적 저장 없이 쓰지 않습니다.
- 아키텍처 결정은 `prj/ADR.md`에 기록합니다.

## 로컬 작업 흐름

1. 플러그인 의존성을 설치합니다.

   ```bash
   npm install
   ```

2. 플러그인을 빌드합니다.

   ```bash
   npm run build
   ```

3. `env.sample`을 `.env`로 복사하고 로컬 플러그인 디렉터리를 설정합니다.

   ```bash
   OBSIDIAN_RHWP_PLUGIN_DIR=/path/to/vault/.obsidian/plugins/obsidian-rhwp
   ```

4. 로컬 Obsidian 테스트 vault로 배포합니다.

   ```bash
   npm run deploy:test-vault
   ```

5. Obsidian을 다시 불러옵니다.
6. Community plugins에서 `rHWP Editor`를 활성화합니다.
7. vault 안의 `.hwp` 또는 `.hwpx` 파일을 엽니다.

## 테스트 Vault

테스트 vault 경로는 추적하지 않는 루트 `.env` 파일에만 둡니다. 개인 장비에만 해당하는 vault 경로를 커밋하지 않습니다.

## 릴리스 체크리스트

- 빌드가 성공합니다.
- `npm run package:release`가 성공하고 `release/`에 `main.js`, `manifest.json`, `styles.css`, `obsidian-rhwp.zip`이 생성됩니다.
- `manifest.json`의 플러그인 id와 최소 Obsidian 버전이 맞습니다.
- 플러그인 폴더에 `main.js`, `styles.css`, `rhwp_bg.wasm`, `rhwp-studio/`가 있습니다.
- `obsidian-rhwp.zip` 안에 `rhwp_bg.wasm`, `rhwp-studio/`, `rhwp-assets.json`이 있습니다.
- GitHub Release tag는 `manifest.json`의 `version`과 같은 값으로 만듭니다.
- GitHub Release asset에는 Obsidian이 직접 받는 `main.js`, `manifest.json`, `styles.css`와 추가 자산 설치에 쓰는 `obsidian-rhwp.zip`을 올립니다.
- HWP/HWPX 파일을 열었을 때 문서 페이지가 렌더링되거나, 실패 시 읽을 수 있는 오류가 표시됩니다.

## GitHub Actions 릴리스

`.github/workflows/release.yml`은 `0.2.0`처럼 `*.*.*` 형식의 tag가 push되면 실행됩니다.

1. `npm ci`로 의존성을 설치합니다.
2. tag 이름, `manifest.json` 버전, `package.json` 버전이 같은지 확인합니다.
3. `npm run package:release`로 릴리즈 산출물을 만듭니다.
4. `release/main.js`, `release/manifest.json`, `release/styles.css`, `release/obsidian-rhwp.zip`을 GitHub Release asset으로 업로드합니다.

따라서 릴리스할 때는 `manifest.json`과 `package.json`의 `version`을 먼저 맞추고 같은 이름의 tag를 push합니다.

# 작업 절차

## 작업 원칙

- 결정이 바뀌면 README와 문서를 함께 갱신합니다.
- Obsidian에서 직접 확인할 수 있는 작은 구현 단위로 진행합니다.
- HWP/HWPX 파일은 원본 문서로 취급하고, 사용자의 명시적 저장 없이 쓰지 않습니다.
- 아키텍처 결정은 `docs/ADR.md`에 기록합니다.

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
6. Community plugins에서 `HWPX Editor`를 활성화합니다.
7. vault 안의 `.hwp` 또는 `.hwpx` 파일을 엽니다.

## 테스트 Vault

테스트 vault 경로는 추적하지 않는 루트 `.env` 파일에만 둡니다. 개인 장비에만 해당하는 vault 경로를 커밋하지 않습니다.

## 릴리스 체크리스트

- 빌드가 성공합니다.
- `manifest.json`의 플러그인 id와 최소 Obsidian 버전이 맞습니다.
- 플러그인 폴더에 `main.js`, `styles.css`, `rhwp_bg.wasm`, `rhwp-studio/`가 있습니다.
- HWP/HWPX 파일을 열었을 때 문서 페이지가 렌더링되거나, 실패 시 읽을 수 있는 오류가 표시됩니다.

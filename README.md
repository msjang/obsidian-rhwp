# rHWP Editor for Obsidian

[![Version](https://img.shields.io/badge/version-0.2.0-blue?style=flat-square)](https://github.com/msjang/obsidian-rhwp)
[![License](https://img.shields.io/github/license/msjang/obsidian-rhwp?style=flat-square)](LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-desktop%20plugin-7C3AED?style=flat-square)](https://obsidian.md)
[![HWP/HWPX](https://img.shields.io/badge/HWP%2FHWPX-rhwp-2F855A?style=flat-square)](https://github.com/edwardkim/rhwp)

Open, create, and edit `.hwp` and `.hwpx` files in Obsidian Desktop with [rhwp](https://github.com/edwardkim/rhwp).

옵시디언(데스크탑)에서 [rhwp](https://github.com/edwardkim/rhwp)를 사용하여 `.hwp`와 `.hwpx` 파일을 열고, 만들고, 편집합니다.

## Features

### Open and edit

Select a `.hwp` or `.hwpx` file in Obsidian to open it in read-only mode. Press ✏️ to switch to edit mode.

- ✏️ Edit: open edit mode
- 💾 Save: save changes to the original file
- 📖 Read-only: return to read-only mode
- 🔄 Reload: reload the current file

### Rename files

Click the file name in read-only mode to rename the current HWP/HWPX file.

### Create new HWP/HWPX files

1. Right-click a file or folder in Obsidian's file explorer.
2. Select `New HWP` or `New HWPX`.
3. The new file opens directly in edit mode.

The default new file format is `HWP`. You can change it to `HWPX` in Settings.

### Large file warning

Large files can make Obsidian slow while rendering. rHWP Editor can ask before opening files over the configured size. It can be configured in Settings.

## Development

Refer to [dev/prj](https://github.com/msjang/obsidian-rhwp/tree/dev/prj) for development, verification, and release processes.


---

## 기능

### 열기, 편집

옵시디언에서 `.hwp` 또는 `.hwpx` 파일을 선택하면 읽기 모드로 열립니다. ✏️을 누르면 편집 모드로 전환됩니다.

- ✏️ 편집: 편집 모드 열기
- 💾 저장: 편집 내용을 원본 파일에 저장
- 📖 읽기: 읽기 모드로 돌아가기
- 🔄 새로고침: 현재 파일 다시 읽기

### Rename files (파일 이름 변경)

읽기 모드에서 뷰어의 파일 이름을 클릭하면 현재 파일의 이름을 바꿀 수 있습니다.

### 새 HWP/HWPX 생성

1. 옵시디언 파일 탐색기에서 파일 또는 폴더를 우클릭합니다.
2. `새 HWP` 또는 `새 HWPX`를 선택합니다.
3. 새 파일은 바로 편집 모드로 열립니다.

기본 새 파일 형식은 `HWP`입니다. Settings에서 `HWPX`로 바꿀 수 있습니다.

### 큰 파일 열기 확인

큰 파일은 렌더링 중 옵시디언을 느리게 만들 수 있습니다. rHWP Editor는 설정한 기준 용량보다 큰 파일을 열기 전에 확인할 수 있습니다. 기준 파일 용량은 설정에서 변경할 수 있습니다.

## 개발

개발, 검증, 릴리스 과정은 [dev 브랜치의 prj/](https://github.com/msjang/obsidian-rhwp/tree/dev/prj)를 참고해주세요.

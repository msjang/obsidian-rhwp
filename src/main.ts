import {
  App,
  FileView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TAbstractFile,
  TFile,
  TFolder,
  ViewStateResult,
  WorkspaceLeaf,
  getLanguage,
  normalizePath,
  requestUrl,
  setIcon
} from "obsidian";
import initRhwp, { HwpDocument } from "@rhwp/core";
import { createEditor } from "@rhwp/editor";
import type { RhwpEditor } from "@rhwp/editor";
import JSZip from "jszip";

const VIEW_TYPE_RHWP = "rhwp-view";
const RHWP_CORE_VERSION = "0.7.13";
const BYTES_PER_MB = 1024 * 1024;
const RELEASE_ZIP_NAME = "obsidian-rhwp.zip";
const ASSET_MARKER_FILE = "rhwp-assets.json";
const ASSET_PATHS = ["rhwp_bg.wasm", "rhwp-studio/index.html"];

let rhwpReady: Promise<void> | null = null;
type RhwpMode = "read" | "edit";
type Locale = "en" | "ko";
type NewFileFormat = "hwp" | "hwpx";
type LargeFileBehavior = "ask" | "open";
type EditLeaveAction = "keep" | "discard" | "save";

interface RhwpSettings {
  newFileFormat: NewFileFormat;
  largeFileBehavior: LargeFileBehavior;
  largeFileThresholdMb: number;
}

const DEFAULT_SETTINGS: RhwpSettings = {
  newFileFormat: "hwp",
  largeFileBehavior: "ask",
  largeFileThresholdMb: 50
};

const I18N = {
  en: {
    backToReadOnly: "Back to read-only",
    cancel: "Cancel",
    createFailed: "Failed to create {{format}}: {{message}}",
    createNewFile: "Create new HWP/HWPX file",
    created: "Created {{name}}",
    discarded: "Discarded edit session for {{name}}",
    discard: "Discard",
    edit: "Edit",
    editing: "Editing",
    keepEditing: "Keep editing",
    largeFileBody: "{{name}} is {{size}} MB. Large files can make Obsidian slow while rendering.\n\nOpen it anyway?",
    largeFileTitle: "Open large file?",
    leaveEditBody: "\"{{name}}\" is open in edit mode.\n\nWhat do you want to do before leaving this view?",
    leaveEditTitle: "Unsaved edit session",
    loadingDocument: "Loading document...",
    loadingEditor: "Loading editor...",
    newFileBaseName: "Noname",
    newFileMenu: "New {{format}}",
    noAvailableName: "No available {{format}} file name found.",
    noOpenFile: "No HWP/HWPX file is open.",
    open: "Open",
    pageCount: "{{count}} {{pageWord}} · {{mode}}",
    propertyCreated: "created",
    propertyTitle: "Properties",
    propertyUpdated: "updated",
    renameEmpty: "File name cannot be empty.",
    renameExtensionMismatch: "Keep the .{{extension}} extension when renaming this file.",
    renameFailed: "Failed to rename {{name}}: {{message}}",
    renamePlaceholder: "File name",
    renamed: "Renamed to {{name}}",
    readOnly: "Read-only",
    reload: "Reload",
    reloadCurrentView: "Reload current HWP/HWPX view",
    rhwpInfo: "rhwp {{version}}",
    saveFailed: "Failed to save {{name}}: {{message}}",
    save: "Save",
    saved: "Saved {{name}}",
    saving: "Saving...",
    assetsInstalling: "Installing HWP/HWPX editor assets...",
    assetsInstallFailed: "Failed to install HWP/HWPX editor assets: {{message}}",
    settingFormatDesc: "HWP is the default because HWPX export/rendering is still less consistent in rhwp.",
    settingFormatName: "New file format",
    settingLargeFileBehaviorDesc: "Ask before opening files over the configured size, or always open them.",
    settingLargeFileBehaviorName: "Large file handling",
    settingLargeFileOpen: "Always open",
    settingLargeFileAsk: "Ask before opening",
    settingLargeFileThresholdDesc: "Files larger than this size can be slower to render.",
    settingLargeFileThresholdName: "Large file threshold (MB)",
    settingTitle: "HWPX Editor"
  },
  ko: {
    backToReadOnly: "읽기 모드로 돌아가기",
    cancel: "취소",
    createFailed: "{{format}} 생성 실패: {{message}}",
    createNewFile: "새 HWP/HWPX 파일 만들기",
    created: "{{name}} 생성됨",
    discarded: "{{name}} 편집 세션을 폐기했습니다",
    discard: "저장 안 함",
    edit: "편집",
    editing: "편집 중",
    keepEditing: "계속 편집",
    largeFileBody: "{{name}} 파일은 {{size}} MB입니다. 큰 파일은 렌더링 중 Obsidian이 느려질 수 있습니다.\n\n그래도 열까요?",
    largeFileTitle: "큰 파일을 열까요?",
    leaveEditBody: "\"{{name}}\" 파일이 편집 모드로 열려 있습니다.\n\n이 뷰를 떠나기 전에 어떻게 할까요?",
    leaveEditTitle: "편집 세션이 열려 있습니다",
    loadingDocument: "문서를 불러오는 중...",
    loadingEditor: "편집기를 불러오는 중...",
    newFileBaseName: "새 파일",
    newFileMenu: "새 {{format}}",
    noAvailableName: "사용 가능한 {{format}} 파일 이름을 찾지 못했습니다.",
    noOpenFile: "열려 있는 HWP/HWPX 파일이 없습니다.",
    open: "열기",
    pageCount: "{{count}}쪽 · {{mode}}",
    propertyCreated: "생성",
    propertyTitle: "속성",
    propertyUpdated: "수정",
    renameEmpty: "파일 이름은 비워둘 수 없습니다.",
    renameExtensionMismatch: "이 파일의 확장자 .{{extension}}를 유지해야 합니다.",
    renameFailed: "{{name}} 이름 변경 실패: {{message}}",
    renamePlaceholder: "파일 이름",
    renamed: "{{name}}(으)로 이름을 바꿨습니다",
    readOnly: "읽기 전용",
    reload: "새로고침",
    reloadCurrentView: "현재 HWP/HWPX 뷰 새로고침",
    rhwpInfo: "rhwp {{version}}",
    saveFailed: "{{name}} 저장 실패: {{message}}",
    save: "저장",
    saved: "{{name}} 저장됨",
    saving: "저장 중...",
    assetsInstalling: "HWP/HWPX 편집기 자산을 설치하는 중...",
    assetsInstallFailed: "HWP/HWPX 편집기 자산 설치 실패: {{message}}",
    settingFormatDesc: "rhwp의 HWPX 내보내기/렌더링 일관성이 아직 낮아서 HWP를 기본값으로 둡니다.",
    settingFormatName: "새 파일 형식",
    settingLargeFileBehaviorDesc: "설정한 용량보다 큰 파일을 열기 전에 물어볼지 정합니다.",
    settingLargeFileBehaviorName: "큰 파일 처리",
    settingLargeFileOpen: "항상 열기",
    settingLargeFileAsk: "열기 전에 묻기",
    settingLargeFileThresholdDesc: "이 용량보다 큰 파일은 렌더링이 느릴 수 있습니다.",
    settingLargeFileThresholdName: "큰 파일 기준 용량(MB)",
    settingTitle: "HWPX Editor"
  }
} satisfies Record<Locale, Record<string, string>>;

type I18nKey = keyof typeof I18N.en;

interface RhwpViewState extends Record<string, unknown> {
  file?: string;
}

export default class RhwpPlugin extends Plugin {
  settings: RhwpSettings = { ...DEFAULT_SETTINGS };
  private assetsReady: Promise<void> | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.assetsReady = this.ensureBundledAssets();
    void this.assetsReady.catch((error) => {
      new Notice(t("assetsInstallFailed", { message: getErrorMessage(error) }));
    });

    this.registerView(VIEW_TYPE_RHWP, (leaf) => new RhwpFileView(leaf, this));
    this.registerExtensions(["hwp", "hwpx"], VIEW_TYPE_RHWP);
    this.registerFileMenu();
    this.addSettingTab(new RhwpSettingTab(this.app, this));

    this.addCommand({
      id: "reload-rhwp-view",
      name: t("reloadCurrentView"),
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(RhwpFileView);
        if (!view) {
          return false;
        }

        if (!checking) {
          void view.reload();
        }

        return true;
      }
    });

    this.addCommand({
      id: "create-new-rhwp-file",
      name: t("createNewFile"),
      callback: () => {
        void this.createNewFile();
      }
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(await this.loadData())
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async ensureRhwpReady(): Promise<void> {
    await this.ensureAssetsReady();

    if (!rhwpReady) {
      registerMeasureTextWidth();
      rhwpReady = initRhwp({ module_or_path: this.getWasmUrl() }).then(() => undefined);
    }

    return rhwpReady;
  }

  async ensureAssetsReady(): Promise<void> {
    if (!this.assetsReady) {
      this.assetsReady = this.ensureBundledAssets();
    }

    return this.assetsReady;
  }

  getWasmUrl(): string {
    const adapter = this.app.vault.adapter;
    const wasmPath = normalizePath(`${this.manifest.dir}/rhwp_bg.wasm`);

    if ("getResourcePath" in adapter && typeof adapter.getResourcePath === "function") {
      return adapter.getResourcePath(wasmPath);
    }

    return wasmPath;
  }

  getStudioUrl(): string {
    const adapter = this.app.vault.adapter;
    const studioPath = normalizePath(`${this.manifest.dir}/rhwp-studio/index.html`);

    if ("getResourcePath" in adapter && typeof adapter.getResourcePath === "function") {
      return adapter.getResourcePath(studioPath);
    }

    return studioPath;
  }

  private async ensureBundledAssets(): Promise<void> {
    if (await this.hasCurrentAssets()) {
      return;
    }

    new Notice(t("assetsInstalling"));
    await this.installReleaseAssets();

    if (!(await this.hasRequiredAssets())) {
      throw new Error("Required local assets are still missing after installation.");
    }

    await this.writeAssetMarker();
  }

  private async hasCurrentAssets(): Promise<boolean> {
    if (!(await this.hasRequiredAssets())) {
      return false;
    }

    const markerPath = this.getPluginPath(ASSET_MARKER_FILE);
    const adapter = this.app.vault.adapter;

    if (!(await adapter.exists(markerPath))) {
      return false;
    }

    try {
      const marker = JSON.parse(await adapter.read(markerPath)) as Partial<{
        pluginVersion: string;
        rhwpCoreVersion: string;
      }>;

      return marker.pluginVersion === this.manifest.version && marker.rhwpCoreVersion === RHWP_CORE_VERSION;
    } catch {
      return false;
    }
  }

  private async hasRequiredAssets(): Promise<boolean> {
    const adapter = this.app.vault.adapter;

    for (const assetPath of ASSET_PATHS) {
      if (!(await adapter.exists(this.getPluginPath(assetPath)))) {
        return false;
      }
    }

    return true;
  }

  private async installReleaseAssets(): Promise<void> {
    const response = await requestUrl({
      url: this.getReleaseZipUrl(),
      method: "GET"
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`GitHub release asset returned HTTP ${response.status}.`);
    }

    const zip = await JSZip.loadAsync(response.arrayBuffer);

    for (const [rawPath, entry] of Object.entries(zip.files)) {
      const relativePath = normalizeZipPath(rawPath);
      if (!relativePath || !isInstallableAssetPath(relativePath)) {
        continue;
      }

      const targetPath = this.getPluginPath(relativePath);

      if (entry.dir) {
        if (!(await this.app.vault.adapter.exists(targetPath))) {
          await this.app.vault.adapter.mkdir(targetPath);
        }
        continue;
      }

      await this.ensureParentFolder(targetPath);
      const bytes = await entry.async("uint8array");
      await this.app.vault.adapter.writeBinary(targetPath, toArrayBuffer(bytes));
    }
  }

  private getReleaseZipUrl(): string {
    return `https://github.com/msjang/obsidian-rhwp/releases/download/${this.manifest.version}/${RELEASE_ZIP_NAME}`;
  }

  private async writeAssetMarker(): Promise<void> {
    await this.app.vault.adapter.write(
      this.getPluginPath(ASSET_MARKER_FILE),
      JSON.stringify(
        {
          pluginVersion: this.manifest.version,
          rhwpCoreVersion: RHWP_CORE_VERSION
        },
        null,
        2
      )
    );
  }

  private getPluginPath(relativePath: string): string {
    return normalizePath(`${this.manifest.dir}/${relativePath}`);
  }

  private async ensureParentFolder(filePath: string): Promise<void> {
    const parts = normalizePath(filePath).split("/");
    parts.pop();

    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!(await this.app.vault.adapter.exists(current))) {
        await this.app.vault.adapter.mkdir(current);
      }
    }
  }

  private registerFileMenu(): void {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile) && !(file instanceof TFolder)) {
          return;
        }

        menu.addItem((item) => {
          item
            .setTitle(t("newFileMenu", { format: this.settings.newFileFormat.toUpperCase() }))
            .setIcon("file-plus")
            .setSection("create")
            .onClick(() => {
              void this.createNewFile(file);
            });
        });
      })
    );
  }

  async createNewFile(target?: TAbstractFile): Promise<void> {
    try {
      await this.ensureRhwpReady();
      const format = this.settings.newFileFormat;
      const folder = this.getTargetFolder(target);
      const path = this.getAvailableNewFilePath(folder, format);
      const bytes = this.createBlankFile(format, path.split("/").pop() ?? `Noname.${format}`);
      const file = await this.app.vault.createBinary(path, bytes);
      new Notice(t("created", { name: file.name }));
      const leaf = this.app.workspace.getLeaf(true);
      await leaf.openFile(file);

      if (leaf.view instanceof RhwpFileView) {
        await leaf.view.openInEditMode();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(t("createFailed", { format: this.settings.newFileFormat.toUpperCase(), message }));
    }
  }

  private getTargetFolder(target?: TAbstractFile): TFolder {
    if (target instanceof TFolder) {
      return target;
    }

    return target?.parent ?? this.app.vault.getRoot();
  }

  private getAvailableNewFilePath(folder: TFolder, format: NewFileFormat): string {
    const folderPath = folder.isRoot() ? "" : `${folder.path}/`;
    const baseNamePrefix = t("newFileBaseName");
    const korean = getLocale() === "ko";

    for (let index = 0; index < 1000; index += 1) {
      const suffix = korean ? index + 1 : index;
      const baseName = index === 0 ? baseNamePrefix : `${baseNamePrefix} ${suffix}`;
      const path = normalizePath(`${folderPath}${baseName}.${format}`);

      if (!this.app.vault.getAbstractFileByPath(path)) {
        return path;
      }
    }

    throw new Error(t("noAvailableName", { format: format.toUpperCase() }));
  }

  private createBlankFile(format: NewFileFormat, fileName: string): ArrayBuffer {
    const doc = HwpDocument.createEmpty();

    try {
      doc.createBlankDocument();
      doc.setFileName(fileName);
      return toArrayBuffer(format === "hwpx" ? doc.exportHwpx() : doc.exportHwp());
    } finally {
      doc.free();
    }
  }
}

function getLocale(): Locale {
  return getLanguage().toLowerCase().startsWith("ko") ? "ko" : "en";
}

function t(key: I18nKey, values: Record<string, string | number> = {}): string {
  return I18N[getLocale()][key].replace(/\{\{(\w+)}}/g, (match, token: string) => {
    const value = values[token];
    return value === undefined ? match : String(value);
  });
}

function pageCountText(count: number, mode: RhwpMode): string {
  const locale = getLocale();
  const pageWord = count === 1 ? "page" : "pages";
  const modeText = mode === "edit" ? t("editing") : t("readOnly");

  return t("pageCount", {
    count,
    mode: modeText,
    pageWord: locale === "en" ? pageWord : "쪽"
  });
}

function rhwpInfoText(): string {
  return t("rhwpInfo", {
    version: RHWP_CORE_VERSION
  });
}

function formatMb(bytes: number): string {
  return (bytes / BYTES_PER_MB).toFixed(1);
}

function formatDateTime(timestamp: number): string {
  const locale = getLocale() === "ko" ? "ko-KR" : "en-US";

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function registerMeasureTextWidth(): void {
  const global = globalThis as typeof globalThis & {
    measureTextWidth?: (font: string, text: string) => number;
  };

  if (typeof global.measureTextWidth === "function") {
    return;
  }

  let context: CanvasRenderingContext2D | null = null;
  let lastFont = "";

  global.measureTextWidth = (font: string, text: string): number => {
    if (!context) {
      context = document.createElement("canvas").getContext("2d");
    }

    if (!context) {
      return text.length * 10;
    }

    if (font !== lastFont) {
      context.font = font;
      lastFont = font;
    }

    return context.measureText(text).width;
  };
}

class RhwpFileView extends FileView {
  private readonly plugin: RhwpPlugin;
  private pagesEl: HTMLElement | null = null;
  private metaEl: HTMLElement | null = null;
  private currentFile: TFile | null = null;
  private mode: RhwpMode = "read";
  private editor: RhwpEditor | null = null;
  private largeFileApprovals = new Set<string>();
  private saving = false;

  constructor(leaf: WorkspaceLeaf, plugin: RhwpPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_RHWP;
  }

  getDisplayText(): string {
    return this.currentFile?.basename ?? "HWPX Editor";
  }

  getIcon(): string {
    return "file-text";
  }

  async onLoadFile(file: TFile): Promise<void> {
    if (this.saving && this.currentFile?.path === file.path) {
      return;
    }

    if (this.currentFile && this.currentFile.path !== file.path) {
      const canLeave = await this.confirmSaveBeforeLeaving();
      if (!canLeave) {
        this.file = this.currentFile;
        return;
      }
      this.mode = "read";
    }

    if (!(await this.confirmLargeFileOpen(file))) {
      this.currentFile = null;
      this.contentEl.empty();
      this.contentEl.addClass("rhwp-view");
      this.pagesEl = this.contentEl.createDiv({ cls: "rhwp-pages" });
      this.showMessage(t("noOpenFile"));
      return;
    }

    this.currentFile = file;
    await this.render();
  }

  async onUnloadFile(_file: TFile): Promise<void> {
    const canLeave = await this.confirmSaveBeforeLeaving();
    if (!canLeave) {
      return;
    }

    this.destroyEditor();
    this.currentFile = null;
    this.contentEl.empty();
  }

  async onRename(file: TFile): Promise<void> {
    this.currentFile = file;
    this.file = file;

    if (this.mode === "read") {
      await this.render();
    }
  }

  protected async onClose(): Promise<void> {
    const canLeave = await this.confirmSaveBeforeLeaving();
    if (!canLeave) {
      return;
    }

    this.destroyEditor();
    await super.onClose();
  }

  async setState(state: Record<string, unknown>, result: ViewStateResult): Promise<void> {
    await super.setState(state, result);

    if (typeof state.file === "string") {
      const abstractFile = this.app.vault.getAbstractFileByPath(state.file);
      if (abstractFile instanceof TFile) {
        await this.onLoadFile(abstractFile);
      }
    }
  }

  getState(): RhwpViewState {
    return {
      ...super.getState(),
      file: this.currentFile?.path
    };
  }

  async reload(): Promise<void> {
    if (!this.currentFile) {
      new Notice(t("noOpenFile"));
      return;
    }

    await this.render();
  }

  async openInEditMode(): Promise<void> {
    if (!this.currentFile) {
      return;
    }

    this.mode = "edit";
    await this.render();
  }

  private async render(): Promise<void> {
    const file = this.currentFile;
    this.contentEl.empty();
    this.contentEl.addClass("rhwp-view");

    const toolbarEl = this.contentEl.createDiv({ cls: "rhwp-toolbar" });
    this.renderTitle(toolbarEl, file);
    this.renderRhwpVersion(toolbarEl);
    this.metaEl = toolbarEl.createDiv({ cls: "rhwp-meta", text: this.mode === "edit" ? t("editing") : t("readOnly") });

    if (this.mode === "read") {
      const editButton = toolbarEl.createEl("button", { attr: { "aria-label": t("edit"), title: t("edit") } });
      setIcon(editButton, "pencil");
      editButton.addEventListener("click", () => {
        void this.enableEditMode();
      });
    } else {
      const saveButton = toolbarEl.createEl("button", { attr: { "aria-label": t("save"), title: t("save") } });
      setIcon(saveButton, "save");
      saveButton.addEventListener("click", () => {
        void this.saveEdits();
      });

      const readButton = toolbarEl.createEl("button", {
        attr: { "aria-label": t("backToReadOnly"), title: t("backToReadOnly") }
      });
      setIcon(readButton, "book-open");
      readButton.addEventListener("click", () => {
        void this.enableReadMode();
      });
    }

    const reloadButton = toolbarEl.createEl("button", { attr: { "aria-label": t("reload"), title: t("reload") } });
    setIcon(reloadButton, "refresh-cw");
    reloadButton.addEventListener("click", () => {
      void this.reload();
    });

    if (!file) {
      this.pagesEl = this.contentEl.createDiv({ cls: "rhwp-pages" });
      this.showMessage(t("noOpenFile"));
      return;
    }

    this.renderProperties(file);
    this.pagesEl = this.contentEl.createDiv({ cls: "rhwp-pages" });

    if (this.mode === "edit") {
      await this.renderEditor(file);
      return;
    }

    this.destroyEditor();
    this.showMessage(t("loadingDocument"));

    try {
      await this.plugin.ensureRhwpReady();
      const buffer = await this.app.vault.readBinary(file);
      const doc = new HwpDocument(new Uint8Array(buffer));

      try {
        const pageCount = this.getPageCount(doc);

        if (this.metaEl) {
          this.metaEl.setText(pageCountText(pageCount, "read"));
        }

        this.pagesEl?.empty();

        for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
          const pageEl = this.pagesEl?.createDiv({ cls: "rhwp-page" });
          const svg = doc.renderPageSvg(pageIndex);
          if (pageEl) {
            pageEl.innerHTML = svg;
          }
        }
      } finally {
        doc.free();
      }
    } catch (error) {
      this.showError(error);
    }
  }

  private async enableEditMode(): Promise<void> {
    if (!this.currentFile) {
      return;
    }

    this.mode = "edit";
    await this.render();
  }

  private renderTitle(toolbarEl: HTMLElement, file: TFile | null): void {
    if (!file || this.mode === "edit") {
      toolbarEl.createDiv({ cls: "rhwp-title", text: file?.name ?? "HWPX Editor" });
      return;
    }

    const titleButton = toolbarEl.createEl("button", {
      cls: "rhwp-title rhwp-title-button",
      text: file.name,
      attr: { title: file.name }
    });

    titleButton.addEventListener("click", () => {
      this.startRename(titleButton, file);
    });
  }

  private renderRhwpVersion(toolbarEl: HTMLElement): void {
    const versionLink = toolbarEl.createEl("a", {
      cls: "rhwp-version",
      text: rhwpInfoText(),
      href: "https://github.com/edwardkim/rhwp"
    });
    versionLink.setAttr("target", "_blank");
    versionLink.setAttr("rel", "noopener");
  }

  private startRename(titleButton: HTMLButtonElement, file: TFile): void {
    const inputEl = createEl("input", {
      cls: "rhwp-title rhwp-title-input",
      attr: {
        "aria-label": t("renamePlaceholder"),
        type: "text"
      }
    });

    inputEl.value = file.name;
    titleButton.replaceWith(inputEl);
    inputEl.focus();
    inputEl.setSelectionRange(0, file.basename.length);

    let committed = false;

    const cancel = (): void => {
      if (!committed) {
        inputEl.replaceWith(titleButton);
      }
    };

    const commit = async (): Promise<void> => {
      if (committed) {
        return;
      }

      committed = true;
      await this.renameCurrentFile(inputEl.value);
    };

    inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void commit();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      }
    });

    inputEl.addEventListener("blur", () => {
      void commit();
    });
  }

  private async renameCurrentFile(nextName: string): Promise<void> {
    const file = this.currentFile;
    if (!file) {
      return;
    }

    const trimmed = nextName.trim();
    if (!trimmed) {
      new Notice(t("renameEmpty"));
      await this.render();
      return;
    }

    const currentExtension = file.extension.toLowerCase();
    const nextExtension = getExtension(trimmed).toLowerCase();
    if (nextExtension !== currentExtension) {
      new Notice(t("renameExtensionMismatch", { extension: file.extension }));
      await this.render();
      return;
    }

    if (trimmed === file.name) {
      await this.render();
      return;
    }

    const parentPath = file.parent?.path;
    const newPath = normalizePath(parentPath && parentPath !== "/" ? `${parentPath}/${trimmed}` : trimmed);

    try {
      await this.app.vault.rename(file, newPath);
      new Notice(t("renamed", { name: trimmed }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(t("renameFailed", { name: file.name, message }));
      await this.render();
    }
  }

  private async enableReadMode(): Promise<void> {
    const canLeave = await this.confirmSaveBeforeLeaving();
    if (!canLeave) {
      return;
    }

    this.mode = "read";
    this.destroyEditor();
    await this.render();
  }

  private async renderEditor(file: TFile): Promise<void> {
    this.destroyEditor();
    this.pagesEl?.empty();
    this.pagesEl?.addClass("rhwp-editing");
    this.showMessage(t("loadingEditor"));

    try {
      await this.plugin.ensureAssetsReady();
      this.pagesEl?.empty();
      const hostEl = this.pagesEl?.createDiv({ cls: "rhwp-editor-host" });
      if (!hostEl) {
        throw new Error("Editor host could not be created.");
      }

      const editor = await createEditor(hostEl, {
        studioUrl: this.plugin.getStudioUrl(),
        width: "100%",
        height: "100%"
      });
      this.editor = editor;

      const buffer = await this.app.vault.readBinary(file);
      const result = await editor.loadFile(buffer, file.name);

      if (this.metaEl) {
        this.metaEl.setText(pageCountText(result.pageCount, "edit"));
      }
    } catch (error) {
      this.destroyEditor();
      this.showError(error);
    }
  }

  private renderProperties(file: TFile): void {
    const detailsEl = this.contentEl.createEl("details", { cls: "rhwp-properties" });

    const summaryEl = detailsEl.createEl("summary", { cls: "rhwp-properties-summary" });
    const chevronEl = summaryEl.createSpan({ cls: "rhwp-properties-chevron" });
    setIcon(chevronEl, "chevron-right");
    summaryEl.createSpan({ cls: "rhwp-properties-title", text: t("propertyTitle") });

    const bodyEl = detailsEl.createDiv({ cls: "rhwp-properties-body" });
    this.createPropertyRow(bodyEl, "clock", t("propertyCreated"), formatDateTime(file.stat.ctime));
    this.createPropertyRow(bodyEl, "calendar", t("propertyUpdated"), formatDateTime(file.stat.mtime));
  }

  private createPropertyRow(containerEl: HTMLElement, icon: string, label: string, value: string): void {
    const rowEl = containerEl.createDiv({ cls: "rhwp-property-row" });
    const labelIconEl = rowEl.createSpan({ cls: "rhwp-property-icon" });
    setIcon(labelIconEl, icon);
    rowEl.createSpan({ cls: "rhwp-property-label", text: label });
    rowEl.createSpan({ cls: "rhwp-property-value", text: value });
  }

  private async saveEdits(): Promise<void> {
    if (!this.currentFile || !this.editor || this.saving) {
      return;
    }

    if (this.metaEl) {
      this.metaEl.setText(t("saving"));
    }

    try {
      await this.writeEditorToFile();
      new Notice(t("saved", { name: this.currentFile.name }));
      this.mode = "read";
      this.destroyEditor();
      await this.render();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(t("saveFailed", { name: this.currentFile.name, message }));
      this.showError(error);
    }
  }

  private async confirmSaveBeforeLeaving(): Promise<boolean> {
    if (this.mode !== "edit" || !this.currentFile || !this.editor) {
      return true;
    }

    const action = await new EditLeaveModal(this.app, this.currentFile.name).openAndWait();

    if (action === "keep") {
      return false;
    }

    if (action === "save") {
      try {
        await this.writeEditorToFile();
        new Notice(t("saved", { name: this.currentFile.name }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        new Notice(t("saveFailed", { name: this.currentFile.name, message }));
        return false;
      }
    } else {
      new Notice(t("discarded", { name: this.currentFile.name }));
    }

    this.mode = "read";
    return true;
  }

  private async confirmLargeFileOpen(file: TFile): Promise<boolean> {
    const thresholdBytes = this.plugin.settings.largeFileThresholdMb * BYTES_PER_MB;

    if (
      this.plugin.settings.largeFileBehavior === "open" ||
      file.stat.size <= thresholdBytes ||
      this.largeFileApprovals.has(file.path)
    ) {
      return true;
    }

    const shouldOpen = await new LargeFileModal(this.app, file.name, file.stat.size).openAndWait();
    if (shouldOpen) {
      this.largeFileApprovals.add(file.path);
    }

    return shouldOpen;
  }

  private async writeEditorToFile(): Promise<void> {
    if (!this.currentFile || !this.editor) {
      return;
    }

    this.saving = true;

    try {
      const bytes = await this.exportEditorBytes();
      await this.app.vault.modifyBinary(this.currentFile, toArrayBuffer(bytes));
    } finally {
      this.saving = false;
    }
  }

  private async exportEditorBytes(): Promise<Uint8Array> {
    if (!this.currentFile || !this.editor) {
      return new Uint8Array();
    }

    const extension = this.currentFile.extension.toLowerCase();

    if (extension === "hwpx") {
      return this.editor.exportHwpx();
    }

    try {
      return await this.editor.exportHwp();
    } catch (error) {
      await this.plugin.ensureRhwpReady();
      await sleep(50);

      const hwpx = await this.editor.exportHwpx();
      const doc = new HwpDocument(hwpx);

      try {
        return doc.exportHwp();
      } catch {
        throw error;
      } finally {
        doc.free();
      }
    }
  }

  private getPageCount(doc: HwpDocument): number {
    const candidate = doc as HwpDocument & {
      pageCount?: () => number;
      getPageCount?: () => number;
    };

    if (typeof candidate.pageCount === "function") {
      return candidate.pageCount();
    }

    if (typeof candidate.getPageCount === "function") {
      return candidate.getPageCount();
    }

    return 1;
  }

  private showMessage(message: string): void {
    this.pagesEl?.empty();
    this.pagesEl?.createDiv({ cls: "rhwp-message", text: message });
  }

  private showError(error: unknown): void {
    this.pagesEl?.empty();
    this.pagesEl?.removeClass("rhwp-editing");
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    this.pagesEl?.createDiv({ cls: "rhwp-error", text: message });
  }

  private destroyEditor(): void {
    this.editor?.destroy();
    this.editor = null;
  }
}

class EditLeaveModal extends Modal {
  private readonly fileName: string;
  private resolved = false;
  private resolve: ((action: EditLeaveAction) => void) | null = null;

  constructor(app: App, fileName: string) {
    super(app);
    this.fileName = fileName;
  }

  openAndWait(): Promise<EditLeaveAction> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }

  onOpen(): void {
    this.titleEl.setText(t("leaveEditTitle"));
    this.contentEl.createDiv({ cls: "rhwp-modal-message", text: t("leaveEditBody", { name: this.fileName }) });

    const buttonRow = this.contentEl.createDiv({ cls: "rhwp-modal-buttons" });
    this.createButton(buttonRow, t("keepEditing"), "keep", "rhwp-secondary-button");
    this.createButton(buttonRow, t("discard"), "discard", "rhwp-warning-button");
    this.createButton(buttonRow, t("save"), "save", "mod-cta");
  }

  onClose(): void {
    this.contentEl.empty();

    if (!this.resolved) {
      this.resolve?.("keep");
    }

    this.resolve = null;
  }

  private createButton(containerEl: HTMLElement, label: string, action: EditLeaveAction, cls: string): void {
    const button = containerEl.createEl("button", { text: label, cls });
    button.addEventListener("click", () => {
      this.resolved = true;
      this.resolve?.(action);
      this.close();
    });
  }
}

class LargeFileModal extends Modal {
  private readonly fileName: string;
  private readonly fileSize: number;
  private resolved = false;
  private resolve: ((shouldOpen: boolean) => void) | null = null;

  constructor(app: App, fileName: string, fileSize: number) {
    super(app);
    this.fileName = fileName;
    this.fileSize = fileSize;
  }

  openAndWait(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }

  onOpen(): void {
    this.titleEl.setText(t("largeFileTitle"));
    this.contentEl.createDiv({
      cls: "rhwp-modal-message",
      text: t("largeFileBody", { name: this.fileName, size: formatMb(this.fileSize) })
    });

    const buttonRow = this.contentEl.createDiv({ cls: "rhwp-modal-buttons" });
    this.createButton(buttonRow, t("cancel"), false, "rhwp-secondary-button");
    this.createButton(buttonRow, t("open"), true, "mod-cta");
  }

  onClose(): void {
    this.contentEl.empty();

    if (!this.resolved) {
      this.resolve?.(false);
    }

    this.resolve = null;
  }

  private createButton(containerEl: HTMLElement, label: string, shouldOpen: boolean, cls: string): void {
    const button = containerEl.createEl("button", { text: label, cls });
    button.addEventListener("click", () => {
      this.resolved = true;
      this.resolve?.(shouldOpen);
      this.close();
    });
  }
}

class RhwpSettingTab extends PluginSettingTab {
  private readonly rhwpPlugin: RhwpPlugin;

  constructor(app: App, plugin: RhwpPlugin) {
    super(app, plugin);
    this.rhwpPlugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: t("settingTitle") });

    new Setting(containerEl)
      .setName(t("settingFormatName"))
      .setDesc(t("settingFormatDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("hwp", "HWP")
          .addOption("hwpx", "HWPX")
          .setValue(this.rhwpPlugin.settings.newFileFormat)
          .onChange(async (value) => {
            this.rhwpPlugin.settings.newFileFormat = value === "hwpx" ? "hwpx" : "hwp";
            await this.rhwpPlugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t("settingLargeFileBehaviorName"))
      .setDesc(t("settingLargeFileBehaviorDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("ask", t("settingLargeFileAsk"))
          .addOption("open", t("settingLargeFileOpen"))
          .setValue(this.rhwpPlugin.settings.largeFileBehavior)
          .onChange(async (value) => {
            this.rhwpPlugin.settings.largeFileBehavior = value === "open" ? "open" : "ask";
            await this.rhwpPlugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t("settingLargeFileThresholdName"))
      .setDesc(t("settingLargeFileThresholdDesc"))
      .addText((text) => {
        text
          .setValue(String(this.rhwpPlugin.settings.largeFileThresholdMb))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed <= 0) {
              return;
            }

            this.rhwpPlugin.settings.largeFileThresholdMb = parsed;
            await this.rhwpPlugin.saveSettings();
          });
      });

  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes);
  return copy.buffer;
}

function normalizeZipPath(rawPath: string): string | null {
  const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);

  if (parts.length === 0 || parts.includes("..")) {
    return null;
  }

  return parts.join("/");
}

function isInstallableAssetPath(relativePath: string): boolean {
  return (
    relativePath === "rhwp_bg.wasm" ||
    relativePath === ASSET_MARKER_FILE ||
    relativePath.startsWith("rhwp-studio/")
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index === -1 ? "" : fileName.slice(index + 1);
}

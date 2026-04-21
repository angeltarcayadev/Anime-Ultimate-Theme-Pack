import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mapa de imágenes inteligentes (Wallpaper)
const WALLPAPER_MAP: { [key: string]: string } = {
    "Deku-Pack: Jujutsu Kaisen": "jjk.png",
    "Deku-Pack: Attack on Titan": "aot.png",
    "Deku-Pack: Demon Slayer": "demon_slayer.png",
    "Deku-Pack: My Hero Academia": "dekuBlack.png",
    "Deku-Pack: One Piece": "one_piece.png",
    "Deku-Pack: Cyberpunk Night": "cyberpunk.png",
    "Deku-Pack: Naruto Hokage": "naruto.png",
    "Deku-Pack: Akira Neo Tokyo": "akira.png",
    "Deku-Pack: Anime Classics": "classics.png"
};

// Mapa de Stickers (Personajes en la esquina)
// Nota: Si no tienes PNGs transparentes aún, usaremos los mismos del wallpaper o los de tu carpeta images
const STICKER_MAP: { [key: string]: string } = {
    "Deku-Pack: My Hero Academia": "dekuBlack.png", 
    "Deku-Pack: Jujutsu Kaisen": "jjk.png"
    // El usuario podrá añadir más o usar personalizados
};

export function activate(context: vscode.ExtensionContext) {
    console.log('Deku-Pack Pro + Stickers is now active!');

    context.subscriptions.push(
        vscode.commands.registerCommand('deku-pack.install', () => installAssets(context)),
        vscode.commands.registerCommand('deku-pack.remove', () => removeAssets()),
        vscode.commands.registerCommand('deku-pack.select-theme', () => selectTheme())
    );

    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('dekuPack')) {
            installAssets(context, true);
        }
    });
}

async function selectTheme() {
    const themes = Object.keys(WALLPAPER_MAP).map(t => ({ label: t, id: t }));
    const selected = await vscode.window.showQuickPick(themes, { placeHolder: 'Deku-Pack: Elige tu Anime' });

    if (selected) {
        await vscode.workspace.getConfiguration().update('workbench.colorTheme', selected.id, vscode.ConfigurationTarget.Global);
        vscode.commands.executeCommand('deku-pack.install');
    }
}

async function installAssets(context: vscode.ExtensionContext, silent = false) {
    const config = vscode.workspace.getConfiguration('dekuPack');
    const enabled = config.get<boolean>('enabled');
    const stickerEnabled = config.get<boolean>('stickerEnabled');

    // 1. Obtener URLs de imágenes
    const currentTheme = vscode.workspace.getConfiguration().get<string>('workbench.colorTheme') || "";
    const extensionPath = context.extensionPath;

    // Lógica para Wallpaper
    let wallpaperPath = config.get<string>('customBackground');
    if (!wallpaperPath) {
        const wpFile = WALLPAPER_MAP[currentTheme];
        if (wpFile) wallpaperPath = path.join(extensionPath, 'images', wpFile);
    }

    // Lógica para Sticker
    let stickerPath = config.get<string>('stickerCustomPath');
    if (!stickerPath) {
        const stFile = STICKER_MAP[currentTheme];
        if (stFile) stickerPath = path.join(extensionPath, 'images', stFile);
    }

    try {
        const cssPath = getCssPath();
        let css = fs.readFileSync(cssPath, 'utf-8');
        css = css.replace(/\/\* --- DEKU PACK START --- \*\/[\s\S]*?\/\* --- DEKU PACK END --- \*\//g, '');

        if (!enabled && !stickerEnabled) {
            fs.writeFileSync(cssPath, css, 'utf-8');
            return;
        }

        const markerStart = '/* --- DEKU PACK START --- */';
        const markerEnd = '/* --- DEKU PACK END --- */';
        
        let backgroundSection = "";
        if (enabled && wallpaperPath) {
            const wpUri = formatUri(wallpaperPath);
            backgroundSection = `
body::after {
    content: "";
    background-image: url('${wpUri}') !important;
    background-size: cover !important;
    background-position: ${config.get('anchor')} !important;
    background-attachment: fixed !important;
    background-repeat: no-repeat !important;
    position: absolute !important; top: 0 !important; left: 0 !important;
    width: 100% !important; height: 100% !important;
    z-index: -2 !important; pointer-events: none !important;
    opacity: ${config.get('opacity')} !important;
    filter: blur(${config.get('blur')}) !important;
}`;
        }

        let stickerSection = "";
        if (stickerEnabled && stickerPath) {
            const stUri = formatUri(stickerPath);
            stickerSection = `
/* Sticker Estilo Doki */
[id="workbench.parts.editor"]::after {
    content: "";
    background-image: url('${stUri}') !important;
    background-repeat: no-repeat !important;
    background-position: bottom right !important;
    background-size: contain !important;
    position: absolute !important;
    bottom: 10px !important; right: 10px !important;
    width: 300px !important; height: 300px !important;
    z-index: 100 !important; pointer-events: none !important;
    opacity: ${config.get('stickerOpacity')} !important;
}`;
        }

        const transparencyFixes = `
body { background-color: transparent !important; }
.monaco-workbench, .monaco-workbench .part, .monaco-workbench .part > .content,
.monaco-editor, .monaco-editor-background, .monaco-editor .margin,
.editor-container, .editor-instance, .tabs-container, .tab,
.activitybar, .activitybar .content, .sidebar, .composite.side-bar,
.statusbar, .titlebar, .panel, .terminal,
.monaco-list, .monaco-list-rows, .monaco-list-row {
    background-color: transparent !important;
    background-image: none !important;
}
[id="workbench.parts.editor"] .split-view-view .editor-container .editor-instance>.monaco-editor .overflow-guard>.monaco-scrollable-element>.monaco-editor-background { background: none !important; }
.lines-content.monaco-editor-background { background-color: transparent !important; }
.overflow-guard > .margin, .overflow-guard > .margin > .margin-view-overlays,
.monaco-workbench .part.panel > .content .monaco-editor .monaco-editor-background,
[id="workbench.panel.repl"] * { background-color: transparent !important; }
`;

        const finalCss = `${markerStart}${backgroundSection}${stickerSection}${transparencyFixes}${markerEnd}`;
        fs.writeFileSync(cssPath, css + finalCss, 'utf-8');

        if (!silent) {
            const res = await vscode.window.showInformationMessage('Deku-Pack: Assets e Imágenes cargadas. ¡Plus Ultra!', 'Reiniciar');
            if (res === 'Reiniciar') vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    } catch (e) {
        vscode.window.showErrorMessage('Error Deku-Pack: ' + e);
    }
}

function formatUri(filePath: string): string {
    if (filePath.startsWith('http')) return filePath;
    let p = filePath.replace(/\\/g, '/');
    if (!p.startsWith('/')) p = '/' + p;
    return 'vscode-file://vscode-app' + p;
}

function removeAssets() {
    try {
        const cssPath = getCssPath();
        let css = fs.readFileSync(cssPath, 'utf-8');
        const cleaned = css.replace(/\/\* --- DEKU PACK START --- \*\/[\s\S]*?\/\* --- DEKU PACK END --- \*\//g, '');
        fs.writeFileSync(cssPath, cleaned, 'utf-8');
        vscode.window.showInformationMessage('Deku-Pack: Assets removidos. Reinicia VS Code.');
    } catch (e) { console.error(e); }
}

function getCssPath(): string {
    // vscode.env.appRoot nos da la carpeta raíz de la instalación de VS Code
    return path.join(vscode.env.appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.css');
}

export function deactivate() {}

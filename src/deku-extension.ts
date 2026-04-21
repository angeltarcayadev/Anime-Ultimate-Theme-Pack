import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const THEME_IMAGE_MAP: { [key: string]: string } = {
    "Jujutsu Kaisen: Gojo Satoru": "jjk.png",
    "Attack on Titan: Eren": "aot.png",
    "Demon Slayer: Sakura": "demon_slayer.png",
    "Akira: Neo Tokyo": "akira.png",
    "Anime Classics": "classics.png",
    "My Hero Academia: Deku": "dekuBlack.png",
    "One Piece: Straw Hat": "one_piece.png",
    "Cyberpunk: Neon Night": "cyberpunk.png",
    "Naruto: Hokage Orange": "naruto.png"
};

function getCssPath(): string {
    const mainFilename = require.main?.filename;
    if (mainFilename) {
        const p = path.join(path.dirname(mainFilename), '..', '..', '..', 'workbench', 'workbench.desktop.main.css');
        if (fs.existsSync(p)) return p;
    }
    const userLocal = process.env.LOCALAPPDATA || '';
    const possibleBases = [path.join(userLocal, 'Programs', 'Microsoft VS Code'), path.join('C:\\Program Files', 'Microsoft VS Code')];
    for (const base of possibleBases) {
        if (!fs.existsSync(base)) continue;
        try {
            const subs = fs.readdirSync(base);
            for (const sub of subs) {
                const p = path.join(base, sub, 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.desktop.main.css');
                if (fs.existsSync(p)) return p;
            }
        } catch (e) {}
    }
    return '';
}

async function applyAnimeWallpaper(context: vscode.ExtensionContext, silent: boolean = false, forceImage?: string) {
    try {
        const cssPath = getCssPath();
        if (!cssPath) return;

        const config = vscode.workspace.getConfiguration('animeTheme.background');
        const opacity = config.get<number>('opacity', 0.15);
        const blur = config.get<string>('blur', '0px');
        const anchor = config.get<string>('anchor', 'center');

        const currentTheme = vscode.workspace.getConfiguration('workbench').get<string>('colorTheme') || "";
        let imageFile = forceImage || THEME_IMAGE_MAP[currentTheme] || 'dekuBlack.png';
        let imagePath = context.asAbsolutePath(path.join('images', imageFile));

        if (!fs.existsSync(imagePath)) {
            // Fallback to default image if specific theme image is missing
            imageFile = 'dekuBlack.png';
            imagePath = context.asAbsolutePath(path.join('images', imageFile));
            if (!fs.existsSync(imagePath)) {
                if (!silent) vscode.window.showErrorMessage(`No se encontró la imagen por defecto.`);
                return;
            }
        }

        // VS Code 1.90+ bloquea file:/// por seguridad CSP, usamos vscode-file://vscode-app/
        const isWin = process.platform === 'win32';
        let fileUri = imagePath.replace(/\\/g, '/');
        if (fileUri.startsWith('/') === false && isWin) {
            fileUri = '/' + fileUri;
        }
        const cssImg = 'vscode-file://vscode-app' + fileUri;

        const markerStart = '/* --- ANIME PACK PRO START --- */';
        const markerEnd = '/* --- ANIME PACK PRO END --- */';

        const injectedCss = `
${markerStart}
/* Animación y Setup base */
body {
    background-color: transparent !important;
}

body::after {
    content: "";
    background-image: url('${cssImg}') !important;
    background-size: cover !important;
    background-position: ${anchor} !important;
    background-attachment: fixed !important;
    background-repeat: no-repeat !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: -1 !important;
    pointer-events: none !important;
    opacity: ${opacity} !important;
    filter: blur(${blur}) !important;
}

/* Forzar transparencia en toda la UI de VS Code al estilo Doki Theme */
.monaco-workbench,
.monaco-workbench .part,
.monaco-workbench .part > .content,
.monaco-editor,
.monaco-editor-background,
.monaco-editor .margin,
.editor-container,
.editor-instance,
.tabs-container,
.tab,
.activitybar,
.activitybar .content,
.sidebar,
.composite.side-bar,
.statusbar,
.titlebar,
.panel,
.terminal,
.monaco-list,
.monaco-list-rows,
.monaco-list-row {
    background-color: transparent !important;
    background-image: none !important;
}

/* Doki Theme CSS Overrides específicos para evitar bugs de visualización */
[id="workbench.parts.editor"] .split-view-view .editor-container .editor-instance>.monaco-editor .overflow-guard>.monaco-scrollable-element>.monaco-editor-background { background: none !important; }
.lines-content.monaco-editor-background { background-color: transparent !important; }
.overflow-guard > .margin,
.overflow-guard > .margin > .margin-view-overlays,
.monaco-workbench .part.panel > .content .monaco-editor .monaco-editor-background,
[id="workbench.panel.repl"] * {
    background-color: transparent !important;
}
.monaco-list.list_id_1 .monaco-list-rows,
.settings-tree-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows,
.monaco-list.list_id_2:not(.drop-target) .monaco-list-row:hover:not(.selected):not(.focused) {
    background-color: transparent !important;
}
[id="workbench.view.explorer"] .monaco-list-rows,
[id="workbench.view.explorer"] .pane-header,
[id="workbench.view.explorer"] .monaco-pane-view,
[id="workbench.view.explorer"] .split-view-view,
[id="workbench.view.explorer"] .monaco-tl-twistie,
[id="terminal"] .pane-header,
[id="terminal"] .monaco-pane-view,
.explorer-folders-view > .monaco-list > .monaco-scrollable-element > .monaco-list-rows,
.show-file-icons > .monaco-list > .monaco-scrollable-element > .monaco-list-rows,
.extensions-list > .monaco-list > .monaco-scrollable-element > .monaco-list-rows,
div.details .header-container .header,
.monaco-workbench .part.editor>.content .gettingStartedContainer .gettingStartedSlideCategories>.gettingStartedCategoriesContainer>.header,
.monaco-workbench .part.editor>.content .gettingStartedContainer .gettingStartedSlideCategories .getting-started-category {
    background-color: transparent !important;
    border: none !important;
}
${markerEnd}
`;

        let css = fs.readFileSync(cssPath, 'utf8');
        if (css.includes(markerStart)) {
            const regex = new RegExp(`\\/\\* --- ANIME PACK PRO START --- \\*\\/[\\s\\S]*?\\/\\* --- ANIME PACK PRO END --- \\*\\/`, 'g');
            css = css.replace(regex, injectedCss);
        } else {
            css += injectedCss;
        }
        fs.writeFileSync(cssPath, css, 'utf8');

        if (!silent) {
            const action = await vscode.window.showInformationMessage('¡Configuración Aplicada! VS Code necesita reiniciarse para mostrar los cambios en la UI.', 'Reiniciar Ahora');
            if (action === 'Reiniciar Ahora') vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    } catch (e) {}
}

export function activate(context: vscode.ExtensionContext) {
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('workbench.colorTheme') || e.affectsConfiguration('animeTheme.background')) {
            applyAnimeWallpaper(context, false);
        }
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('animeTheme.installBackground', () => applyAnimeWallpaper(context, false)),
        vscode.commands.registerCommand('animeTheme.chooseBackground', async () => {
            const items = Object.entries(THEME_IMAGE_MAP).map(([label, img]) => ({ label, img }));
            const choice = await vscode.window.showQuickPick(items, { placeHolder: 'Escoge fondo manual' });
            if (choice) applyAnimeWallpaper(context, false, choice.img);
        }),
        vscode.commands.registerCommand('animeTheme.setOpacity', async () => {
            const val = await vscode.window.showInputBox({ placeHolder: 'Ej: 0.2 (0 es transparente, 1 es opaco)' });
            if (val) {
                await vscode.workspace.getConfiguration('animeTheme.background').update('opacity', parseFloat(val), true);
            }
        }),
        vscode.commands.registerCommand('animeTheme.setBlur', async () => {
            const val = await vscode.window.showInputBox({ placeHolder: 'Ej: 5px (0px para nítido)' });
            if (val) {
                await vscode.workspace.getConfiguration('animeTheme.background').update('blur', val, true);
            }
        }),
        vscode.commands.registerCommand('animeTheme.removeBackground', async () => {
            const cssPath = getCssPath();
            if (!cssPath) return;
            let css = fs.readFileSync(cssPath, 'utf8');
            const regex = new RegExp(`\\/\\* --- ANIME PACK PRO START --- \\*\\/[\\s\\S]*?\\/\\* --- ANIME PACK PRO END --- \\*\\/`, 'g');
            fs.writeFileSync(cssPath, css.replace(regex, ''), 'utf8');
            vscode.window.showInformationMessage('Wallpaper eliminado.');
        })
    );
}

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
        const imageFile = forceImage || THEME_IMAGE_MAP[currentTheme] || 'dekuBlack.png';
        const imagePath = context.asAbsolutePath(path.join('images', imageFile));

        if (!fs.existsSync(imagePath)) {
            if (!silent) vscode.window.showErrorMessage(`No se encontró la imagen: ${imageFile}`);
            return;
        }

        const cssImg = 'file:///' + imagePath.replace(/\\/g, '/');
        const markerStart = '/* --- ANIME PACK PRO START --- */';
        const markerEnd = '/* --- ANIME PACK PRO END --- */';

        const injectedCss = `
${markerStart}
body::after {
    content: "";
    background-image: url('${cssImg}') !important;
    background-size: cover !important;
    background-position: ${anchor} !important;
    background-repeat: no-repeat !important;
    position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1;
    opacity: ${opacity} !important;
    filter: blur(${blur}) !important;
}
.monaco-workbench, .monaco-workbench .part, .monaco-workbench .part > .content,
.monaco-editor, .monaco-editor .margin, .monaco-editor-background,
.editor-container, .editor-instance, .tabs-container, .tab, .composite.side-bar, .activitybar .content {
    background-color: transparent !important;
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
            const action = await vscode.window.showInformationMessage('¡Visualización PRO Actualizada!', 'Reiniciar');
            if (action === 'Reiniciar') vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    } catch (e) {}
}

export function activate(context: vscode.ExtensionContext) {
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('workbench.colorTheme') || e.affectsConfiguration('animeTheme.background')) {
            applyAnimeWallpaper(context, true);
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
                applyAnimeWallpaper(context, false);
            }
        }),
        vscode.commands.registerCommand('animeTheme.setBlur', async () => {
            const val = await vscode.window.showInputBox({ placeHolder: 'Ej: 5px (0px para nítido)' });
            if (val) {
                await vscode.workspace.getConfiguration('animeTheme.background').update('blur', val, true);
                applyAnimeWallpaper(context, false);
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

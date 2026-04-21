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

async function applyAnimeWallpaper(context: vscode.ExtensionContext, specificImage?: string) {
    try {
        const cssPath = getCssPath();
        if (!cssPath) return;

        const config = vscode.workspace.getConfiguration('animeTheme.background');
        const opacity = config.get<number>('opacity', 0.15);
        const blur = config.get<string>('blur', '0px');
        const anchor = config.get<string>('anchor', 'center');
        const customPath = config.get<string>('path', '');

        let imageToUse = "";
        if (customPath && fs.existsSync(customPath)) {
            imageToUse = customPath;
        } else if (specificImage) {
            imageToUse = context.asAbsolutePath(path.join('images', specificImage));
        } else {
            const currentTheme = vscode.workspace.getConfiguration('workbench').get<string>('colorTheme') || "";
            imageToUse = context.asAbsolutePath(path.join('images', THEME_IMAGE_MAP[currentTheme] || 'dekuBlack.png'));
        }

        const cssImg = 'file:///' + imageToUse.replace(/\\/g, '/');
        const markerStart = '/* --- ANIME PACK START --- */';
        const markerEnd = '/* --- ANIME PACK END --- */';

        const injectedCss = `
${markerStart}
body::after {
    content: "";
    background-image: url('${cssImg}') !important;
    background-size: cover !important;
    background-position: ${anchor} !important;
    background-repeat: no-repeat !important;
    background-attachment: fixed !important;
    position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1;
    opacity: ${opacity} !important;
    filter: blur(${blur}) !important;
    pointer-events: none;
}
.monaco-workbench, .monaco-workbench .part, .monaco-editor, .monaco-editor-background {
    background-color: transparent !important;
}
${markerEnd}
`;

        let css = fs.readFileSync(cssPath, 'utf8');
        if (css.includes(markerStart)) {
            const regex = new RegExp(`\\/\\* --- ANIME PACK START --- \\*\\/[\\s\\S]*?\\/\\* --- ANIME PACK END --- \\*\\/`, 'g');
            css = css.replace(regex, injectedCss);
        } else {
            css += injectedCss;
        }
        fs.writeFileSync(cssPath, css, 'utf8');
        
        const action = await vscode.window.showInformationMessage('¡Anime Background Aplicado!', 'Reiniciar');
        if (action === 'Reiniciar') vscode.commands.executeCommand('workbench.action.reloadWindow');
    } catch (e: any) {
        vscode.window.showErrorMessage('Error: ' + e.message);
    }
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('animeTheme.installBackground', () => applyAnimeWallpaper(context)),
        vscode.commands.registerCommand('animeTheme.chooseBackground', async () => {
            const items = Object.entries(THEME_IMAGE_MAP).map(([label, img]) => ({ label, img }));
            const choice = await vscode.window.showQuickPick(items, { placeHolder: 'Elige el fondo de tu anime favorito' });
            if (choice) applyAnimeWallpaper(context, choice.img);
        }),
        vscode.commands.registerCommand('animeTheme.removeBackground', async () => {
            const cssPath = getCssPath();
            if (!cssPath) return;
            let css = fs.readFileSync(cssPath, 'utf8');
            const regex = new RegExp(`\\/\\* --- ANIME PACK START --- \\*\\/[\\s\\S]*?\\/\\* --- ANIME PACK END --- \\*\\/`, 'g');
            fs.writeFileSync(cssPath, css.replace(regex, ''), 'utf8');
            vscode.window.showInformationMessage('Background eliminado.');
        })
    );
}

export function deactivate() {}

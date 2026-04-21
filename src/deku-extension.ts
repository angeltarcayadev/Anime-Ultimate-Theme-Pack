import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mapa de Wallpapers
const WALLPAPER_MAP: { [key: string]: string } = {
    "Deku-Pack: My Hero Academia": "dekuBlack.png",
    "Deku-Pack: Jujutsu Kaisen": "jjk.png",
    "Deku-Pack: Attack on Titan": "aot.png",
    "Deku-Pack: Demon Slayer": "demon_slayer.png",
    "Deku-Pack: One Piece": "one_piece.png",
    "Deku-Pack: Cyberpunk Night": "cyberpunk.png",
    "Deku-Pack: Naruto Hokage": "naruto.png",
    "Deku-Pack: Akira Neo Tokyo": "akira.png",
    "Deku-Pack: Anime Classics": "classics.png"
};

// Mapa de Colores de Acento (Armonía de Letras e Iconos)
const ACCENT_COLOR_MAP: { [key: string]: string } = {
    "Deku-Pack: My Hero Academia": "#00e676", // Verde Deku
    "Deku-Pack: Jujutsu Kaisen": "#a29bfe",    // Morado Gojo
    "Deku-Pack: Attack on Titan": "#fab1a0",   // Arena/Titan
    "Deku-Pack: Demon Slayer": "#ff7675",      // Rosa Sakura
    "Deku-Pack: One Piece": "#fdcb6e",         // Amarillo Luffy
    "Deku-Pack: Cyberpunk Night": "#00cec9",   // Cian Neón
    "Deku-Pack: Naruto Hokage": "#e17055",      // Naranja Hokage
    "Deku-Pack: Akira Neo Tokyo": "#d63031",   // Rojo Akira
    "Deku-Pack: Anime Classics": "#74b9ff"     // Azul Clásico
};

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('deku-pack.install', () => installAssets(context)),
        vscode.commands.registerCommand('deku-pack.remove', () => removeAssets()),
        vscode.commands.registerCommand('deku-pack.select-theme', () => selectTheme())
    );

    // Auto-instalación inmediata al cambiar configuraciones
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('dekuPack')) {
            // Llamamos con silent = false para que el usuario reciba el aviso de reiniciar al momento
            installAssets(context, false);
        }
    });
}

async function selectTheme() {
    const themes = Object.keys(WALLPAPER_MAP).map(t => ({ label: t, id: t }));
    const selected = await vscode.window.showQuickPick(themes, { placeHolder: 'Deku-Pack: Elige tu Armonía' });
    if (selected) {
        await vscode.workspace.getConfiguration().update('workbench.colorTheme', selected.id, vscode.ConfigurationTarget.Global);
        vscode.commands.executeCommand('deku-pack.install');
    }
}

async function installAssets(context: vscode.ExtensionContext, silent = false) {
    const config = vscode.workspace.getConfiguration('dekuPack');
    const enabled = config.get<boolean>('enabled');
    const currentTheme = vscode.workspace.getConfiguration().get<string>('workbench.colorTheme') || "";
    const accentColor = ACCENT_COLOR_MAP[currentTheme] || "#00e676";
    const wbOpacity = config.get<number>('workbenchOpacity') ?? 0.5;

    let wallpaperPath = config.get<string>('customBackground');
    if (!wallpaperPath) {
        const wpFile = WALLPAPER_MAP[currentTheme];
        if (wpFile) wallpaperPath = path.join(context.extensionPath, 'images', wpFile);
    }

    try {
        const cssPath = getCssPath();
        let css = fs.readFileSync(cssPath, 'utf-8').replace(/\/\* --- DEKU PACK START --- \*\/[\s\S]*?\/\* --- DEKU PACK END --- \*\//g, '');
        
        const markerStart = '/* --- DEKU PACK START --- */';
        const markerEnd = '/* --- DEKU PACK END --- */';

        // Estilos de Fondo y Translucidez
        const backgroundStyle = enabled && wallpaperPath ? `
body::after {
    content: ""; background-image: url('${formatUri(wallpaperPath)}') !important;
    background-size: cover !important; background-position: ${config.get('anchor')} !important;
    background-attachment: fixed !important; position: absolute !important; 
    top: 0; left: 0; width: 100%; height: 100%; z-index: -2; pointer-events: none;
    opacity: ${config.get('opacity')} !important; filter: blur(${config.get('blur')}) !important;
}` : "";

        // LA MAGIA: Armonía de Colores de Letras y UI
        const harmonyStyle = `
:root { --deku-accent: ${accentColor}; }
.monaco-workbench { color: var(--deku-accent) !important; }
.monaco-workbench .part > .content { background-color: rgba(15, 15, 15, ${wbOpacity}) !important; backdrop-filter: blur(10px) !important; }
.monaco-editor, .monaco-editor-background { background-color: rgba(10, 10, 10, ${Math.min(wbOpacity + 0.1, 0.9)}) !important; }

/* Letras e Iconos con el color del tema */
.monaco-list-row.selected .label-name, .monaco-list-row.selected .action-label,
.tab.active .label-name, .action-item.active .action-label,
.monaco-workbench .part.statusbar, .activitybar .action-label {
    color: var(--deku-accent) !important;
}
.monaco-workbench .activitybar .content .action-item.active .action-label,
.monaco-workbench .activitybar .content .action-item:hover .action-label {
    color: var(--deku-accent) !important;
}

/* Bordes y Cursillos Armónicos */
.tab.active { border-bottom: 2px solid var(--deku-accent) !important; }
.monaco-editor .cursor { background-color: var(--deku-accent) !important; border-color: var(--deku-accent) !important; }
`;

        fs.writeFileSync(cssPath, css + markerStart + backgroundStyle + harmonyStyle + markerEnd, 'utf-8');
        if (!silent) {
            const res = await vscode.window.showInformationMessage('Deku-Pack: Sistema de Armonía de Color instalado.', 'Reiniciar');
            if (res === 'Reiniciar') vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    } catch (e) { console.error(e); }
}

function formatUri(p: string): string {
    let np = p.replace(/\\/g, '/');
    if (!np.startsWith('/')) np = '/' + np;
    return 'vscode-file://vscode-app' + np;
}

function removeAssets() {
    const cssPath = getCssPath();
    const css = fs.readFileSync(cssPath, 'utf-8').replace(/\/\* --- DEKU PACK START --- \*\/[\s\S]*?\/\* --- DEKU PACK END --- \*\//g, '');
    fs.writeFileSync(cssPath, css, 'utf-8');
}

function getCssPath() {
    return path.join(vscode.env.appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.css');
}

export function deactivate() {}

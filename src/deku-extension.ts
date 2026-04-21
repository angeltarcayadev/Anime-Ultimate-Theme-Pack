import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mapa de imágenes por defecto para cada tema de nuestro pack
const THEME_IMAGE_MAP: { [key: string]: string } = {
    "Deku-Pack: Jujutsu Kaisen": "jjk.png",
    "Deku-Pack: Attack on Titan": "aot.png",
    "Deku-Pack: Demon Slayer": "demon_slayer.png",
    "Deku-Pack: Akira Neo Tokyo": "akira.png",
    "Deku-Pack: Anime Classics": "classics.png",
    "Deku-Pack: My Hero Academia": "dekuBlack.png",
    "Deku-Pack: One Piece": "one_piece.png",
    "Deku-Pack: Cyberpunk Night": "cyberpunk.png",
    "Deku-Pack: Naruto Hokage": "naruto.png"
};

export function activate(context: vscode.ExtensionContext) {
    console.log('Deku-Pack Pro is now active!');

    context.subscriptions.push(
        vscode.commands.registerCommand('deku-pack.install', () => installThemeAssets(context)),
        vscode.commands.registerCommand('deku-pack.remove', () => removeThemeAssets()),
        vscode.commands.registerCommand('deku-pack.select-theme', () => selectAnimeTheme())
    );

    // Auto-instalación al cambiar configuraciones
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('dekuPack')) {
            installThemeAssets(context, true);
        }
    });
}

async function selectAnimeTheme() {
    const themes = [
        { label: 'Deku-Pack: My Hero Academia', id: 'Deku-Pack: My Hero Academia' },
        { label: 'Deku-Pack: Jujutsu Kaisen', id: 'Deku-Pack: Jujutsu Kaisen' },
        { label: 'Deku-Pack: Attack on Titan', id: 'Deku-Pack: Attack on Titan' },
        { label: 'Deku-Pack: Demon Slayer', id: 'Deku-Pack: Demon Slayer' },
        { label: 'Deku-Pack: One Piece', id: 'Deku-Pack: One Piece' },
        { label: 'Deku-Pack: Cyberpunk Night', id: 'Deku-Pack: Cyberpunk Night' },
        { label: 'Deku-Pack: Naruto Hokage', id: 'Deku-Pack: Naruto Hokage' },
        { label: 'Deku-Pack: Akira Neo Tokyo', id: 'Deku-Pack: Akira Neo Tokyo' },
        { label: 'Deku-Pack: Anime Classics', id: 'Deku-Pack: Anime Classics' }
    ];

    const selected = await vscode.window.showQuickPick(themes, {
        placeHolder: 'Selecciona un tema de Anime de Deku-Pack'
    });

    if (selected) {
        await vscode.workspace.getConfiguration().update('workbench.colorTheme', selected.id, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Deku-Pack: Tema "${selected.label}" aplicado con éxito.`);
        
        // Ejecutamos la instalación de assets inmediatamente después de cambiar el tema
        // No necesitamos pasar el context aquí si lo manejamos globalmente o lo extraemos
        vscode.commands.executeCommand('deku-pack.install');
    }
}

async function installThemeAssets(context: vscode.ExtensionContext | undefined, silent = false) {
    const config = vscode.workspace.getConfiguration('dekuPack');
    const enabled = config.get<boolean>('enabled');
    
    if (!enabled) {
        removeThemeAssets(true);
        return;
    }

    const customBg = config.get<string>('customBackground');
    const opacity = config.get<number>('opacity') || 0.3;
    const blur = config.get<string>('blur') || '0px';
    const anchor = config.get<string>('anchor') || 'center';

    let finalImageUrl = "";

    // Lógica inteligente de selección de imagen
    if (customBg && customBg.trim() !== "") {
        // 1. Usar imagen personalizada del usuario
        finalImageUrl = customBg;
    } else {
        // 2. Usar imagen por defecto del tema actual
        const currentTheme = vscode.workspace.getConfiguration().get<string>('workbench.colorTheme') || "";
        const imageName = THEME_IMAGE_MAP[currentTheme];
        
        if (imageName) {
            // Construir ruta a la carpeta images de la extensión
            const extensionPath = vscode.extensions.getExtension('angeltarcayadev.anime-ultimate-theme-pack')?.extensionPath;
            if (extensionPath) {
                finalImageUrl = path.join(extensionPath, 'images', imageName);
            }
        }
    }

    if (!finalImageUrl) {
        if (!silent) vscode.window.showWarningMessage('Deku-Pack: No se encontró una imagen para el tema actual. Configura una en "dekuPack.customBackground".');
        return;
    }

    try {
        const cssPath = getCssPath();
        let currentCss = fs.readFileSync(cssPath, 'utf-8');

        // Limpieza de rastros anteriores
        currentCss = currentCss.replace(/\/\* --- DEKU PACK START --- \*\/[\s\S]*?\/\* --- DEKU PACK END --- \*\//g, '');

        // Formatear URI para VS Code 1.90+
        let imageUri = finalImageUrl;
        if (!finalImageUrl.startsWith('http')) {
            let normalizedPath = finalImageUrl.replace(/\\/g, '/');
            if (!normalizedPath.startsWith('/')) normalizedPath = '/' + normalizedPath;
            imageUri = 'vscode-file://vscode-app' + normalizedPath;
        }

        const markerStart = '/* --- DEKU PACK START --- */';
        const markerEnd = '/* --- DEKU PACK END --- */';

        const injectedCss = `
${markerStart}
body { background-color: transparent !important; }
body::after {
    content: "";
    background-image: url('${imageUri}') !important;
    background-size: cover !important;
    background-position: ${anchor} !important;
    background-attachment: fixed !important;
    background-repeat: no-repeat !important;
    position: absolute !important; top: 0 !important; left: 0 !important;
    width: 100% !important; height: 100% !important;
    z-index: -1 !important;
    pointer-events: none !important;
    opacity: ${opacity} !important;
    filter: blur(${blur}) !important;
}
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
${markerEnd}
`;

        fs.writeFileSync(cssPath, currentCss + injectedCss, 'utf-8');

        if (!silent) {
            const res = await vscode.window.showInformationMessage('Deku-Pack: Assets actualizados. Reinicia para aplicar.', 'Reiniciar');
            if (res === 'Reiniciar') vscode.commands.executeCommand('workbench.action.reloadWindow');
        }

    } catch (e) {
        vscode.window.showErrorMessage('Error en Deku-Pack: ' + e);
    }
}

function removeThemeAssets(silent = false) {
    try {
        const cssPath = getCssPath();
        let currentCss = fs.readFileSync(cssPath, 'utf-8');
        const newCss = currentCss.replace(/\/\* --- DEKU PACK START --- \*\/[\s\S]*?\/\* --- DEKU PACK END --- \*\//g, '');
        
        if (currentCss !== newCss) {
            fs.writeFileSync(cssPath, newCss, 'utf-8');
            if (!silent) {
                vscode.window.showInformationMessage('Deku-Pack: Assets eliminados.', 'Reiniciar').then(res => {
                    if (res === 'Reiniciar') vscode.commands.executeCommand('workbench.action.reloadWindow');
                });
            }
        }
    } catch (e) {
        console.error(e);
    }
}

function getCssPath(): string {
    const appDir = path.dirname(require.main!.filename);
    return path.join(appDir, 'vs', 'workbench', 'workbench.desktop.main.css');
}

export function deactivate() {}

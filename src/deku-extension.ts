import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('Deku-Pack is now active!');

    // Registrar comandos con el nuevo branding
    context.subscriptions.push(
        vscode.commands.registerCommand('deku-pack.install', () => installThemeAssets(context)),
        vscode.commands.registerCommand('deku-pack.remove', () => removeThemeAssets()),
        vscode.commands.registerCommand('deku-pack.select-theme', () => selectAnimeTheme())
    );

    // Escuchar cambios en la configuración para auto-aplicar cambios
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('dekuPack')) {
            installThemeAssets(context, true); // Silent update
        }
    });
}

async function selectAnimeTheme() {
    const themes = [
        { label: 'My Hero Academia', id: 'Deku-Pack: My Hero Academia' },
        { label: 'Jujutsu Kaisen', id: 'Deku-Pack: Jujutsu Kaisen' },
        { label: 'Attack on Titan', id: 'Deku-Pack: Attack on Titan' },
        { label: 'Demon Slayer', id: 'Deku-Pack: Demon Slayer' },
        { label: 'One Piece', id: 'Deku-Pack: One Piece' },
        { label: 'Cyberpunk Night', id: 'Deku-Pack: Cyberpunk Night' },
        { label: 'Naruto Hokage', id: 'Deku-Pack: Naruto Hokage' },
        { label: 'Akira Neo Tokyo', id: 'Deku-Pack: Akira Neo Tokyo' },
        { label: 'Anime Classics', id: 'Deku-Pack: Anime Classics' }
    ];

    const selected = await vscode.window.showQuickPick(themes, {
        placeHolder: 'Selecciona tu tema de Anime favorito'
    });

    if (selected) {
        // 1. Cambiar el tema de color oficial de VS Code
        await vscode.workspace.getConfiguration().update('workbench.colorTheme', selected.id, vscode.ConfigurationTarget.Global);
        
        // 2. Notificar e instalar los assets visuales (Background)
        vscode.window.showInformationMessage(`Deku-Pack: Tema ${selected.label} activado.`);
        vscode.commands.executeCommand('deku-pack.install');
    }
}

async function installThemeAssets(context: vscode.ExtensionContext, silent = false) {
    const config = vscode.workspace.getConfiguration('dekuPack');
    const customBg = config.get<string>('customBackground');
    const opacity = config.get<number>('opacity') || 0.3;
    const blur = config.get<string>('blur') || '0px';
    const anchor = config.get<string>('anchor') || 'center';

    if (!customBg) {
        if (!silent) {
            vscode.window.showWarningMessage('Deku-Pack: No hay una imagen configurada. Por favor, añade una ruta en los settings (dekuPack.customBackground).');
        }
        return;
    }

    try {
        const cssPath = getCssPath();
        let currentCss = fs.readFileSync(cssPath, 'utf-8');

        // Limpiar inyecciones previas
        currentCss = currentCss.replace(/\/\* --- DEKU PACK START --- \*\/[\s\S]*?\/\* --- DEKU PACK END --- \*\//g, '');

        // VS Code 1.90+ bloquea file:/// por seguridad CSP, usamos vscode-file://vscode-app/
        let imageUri = customBg;
        if (!customBg.startsWith('http')) {
            const isWin = process.platform === 'win32';
            let fileUri = customBg.replace(/\\/g, '/');
            if (fileUri.startsWith('/') === false && isWin) {
                fileUri = '/' + fileUri;
            }
            imageUri = 'vscode-file://vscode-app' + fileUri;
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
/* Transparencias Estilo Doki Theme */
.monaco-workbench, .monaco-workbench .part, .monaco-workbench .part > .content,
.monaco-editor, .monaco-editor-background, .monaco-editor .margin,
.editor-container, .editor-instance, .tabs-container, .tab,
.activitybar, .activitybar .content, .sidebar, .composite.side-bar,
.statusbar, .titlebar, .panel, .terminal,
.monaco-list, .monaco-list-rows, .monaco-list-row {
    background-color: transparent !important;
    background-image: none !important;
}
/* Fixes de visualización específicos */
[id="workbench.parts.editor"] .split-view-view .editor-container .editor-instance>.monaco-editor .overflow-guard>.monaco-scrollable-element>.monaco-editor-background { background: none !important; }
.lines-content.monaco-editor-background { background-color: transparent !important; }
.overflow-guard > .margin, .overflow-guard > .margin > .margin-view-overlays,
.monaco-workbench .part.panel > .content .monaco-editor .monaco-editor-background,
[id="workbench.panel.repl"] * { background-color: transparent !important; }
${markerEnd}
`;

        fs.writeFileSync(cssPath, currentCss + injectedCss, 'utf-8');

        if (!silent) {
            const result = await vscode.window.showInformationMessage(
                'Deku-Pack: Assets instalados con éxito. Debes reiniciar VS Code para aplicar los cambios.',
                'Reiniciar ahora'
            );
            if (result === 'Reiniciar ahora') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        }

    } catch (error) {
        vscode.window.showErrorMessage('Error al instalar Deku-Pack Assets: ' + error);
    }
}

function removeThemeAssets() {
    try {
        const cssPath = getCssPath();
        let currentCss = fs.readFileSync(cssPath, 'utf-8');
        const newCss = currentCss.replace(/\/\* --- DEKU PACK START --- \*\/[\s\S]*?\/\* --- DEKU PACK END --- \*\//g, '');
        
        if (currentCss !== newCss) {
            fs.writeFileSync(cssPath, newCss, 'utf-8');
            vscode.window.showInformationMessage('Deku-Pack: Assets eliminados. Reinicia VS Code.', 'Reiniciar').then(res => {
                if (res === 'Reiniciar') vscode.commands.executeCommand('workbench.action.reloadWindow');
            });
        }
    } catch (error) {
        vscode.window.showErrorMessage('Error al eliminar Deku-Pack Assets: ' + error);
    }
}

function getCssPath(): string {
    const isWin = process.platform === 'win32';
    const appDir = path.dirname(require.main!.filename);
    if (isWin) {
        return path.join(appDir, 'vs', 'workbench', 'workbench.desktop.main.css');
    } else {
        return path.join(appDir, 'vs', 'workbench', 'workbench.desktop.main.css');
    }
}

export function deactivate() {
    // Limpieza opcional
}

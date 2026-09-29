import * as vscode from 'vscode';
//import {EditorProvider} from './editorprovider';


export function activate(context: vscode.ExtensionContext) {
    // Enable logging.
    configure(context);

    // Show warning to install another the new nex-sna-file-viewer.
    vscode.window.showErrorMessage(
        'The "SNA File Viewer" (sna-fileviewer) is not maintained anymore. It is recommended to install the new "NEX & SNA File Viewer" (nex-sna-file-viewer) extension.',
        {modal: false},
        'Upgrade to "NEX & SNA File Viewer" now'
    ).then(async selection => {
        if (selection) {
            /* When the user  clicks, following is tried, if not successful the next:
                1. uninstall 'sna-file-viewer'
                2. install 'nex-sna-file-viewer'            */
            try {
                // Uninstall
                await vscode.commands.executeCommand('workbench.extensions.uninstallExtension', 'maziac.sna-fileviewer');
            } catch (e) {
                vscode.window.showWarningMessage("An error occurred. Please uninstall 'maziac.sna-fileviewer' by yourself and afterwards install 'NEX & SNA File Viewer' from the marketplace.", "OK");
                return;
            }
            try {
                // Install new
                await vscode.commands.executeCommand('workbench.extensions.installExtension', 'maziac.nex-sna-file-viewer');
                vscode.window.showInformationMessage("NEX & SNA File Viewer has been successfully updated. To use it you need to reload the extensions.",
                    {modal: false},
                    "Reload Extensions"
                ).then(selection => {
                    if (selection) {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                });
            } catch (e) {
                // If there is still an error, then a warning is shown
                vscode.window.showWarningMessage("An error occurred. Please search for 'NEX & SNA File Viewer' in the marketplace and install it by yourself.", "OK");
            }
        }
    });


    // // Check for every change.
    // context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
    //     configure(context, event);
    // }));

    // // Register custom readonly editor provider
    // const viewProvider = new EditorProvider();
    // vscode.window.registerCustomEditorProvider('sna-fileviewer.viewer', viewProvider, {webviewOptions: {enableFindWidget: true, retainContextWhenHidden: true}});
}


/**
 * Reads the configuration.
 */
function configure(context: vscode.ExtensionContext, event?) {
    /*
    const settings = vscode.workspace.getConfiguration('z80-instruction-set');

    // Note: don't add 'language' property, otherwise other extension with similar file pattern may not work.
    // If the identifier is missing it also don't help to define it in package.json. And if "id" would be used it clashes again with other extensions.
    const asmFiles: vscode.DocumentSelector = { scheme: "file", pattern: settings.files};

     // Enable/disable hovering
    if(settings.enableHovering) {
        if(!regHoverProvider) {
            // Register
            regHoverProvider = vscode.languages.registerHoverProvider(asmFiles, new HoverProvider());
            context.subscriptions.push(regHoverProvider);
        }
    }
    else {
        if(regHoverProvider) {
            // Deregister
            regHoverProvider.dispose();
            regHoverProvider = undefined;
        }
    }
    */
}



// this method is called when your extension is deactivated
export function deactivate() {
    //
}

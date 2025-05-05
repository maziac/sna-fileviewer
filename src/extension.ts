import * as vscode from 'vscode';
import {EditorProvider} from './editorprovider';
import {Usage} from './usage';


export function activate(context: vscode.ExtensionContext) {
    // Activate usage telemetry
    Usage.init(context);

    // Enable logging.
    configure(context);

    // Check for every change.
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
        configure(context, event);
    }));

    // Register custom readonly editor provider
    const viewProvider = new EditorProvider();
    vscode.window.registerCustomEditorProvider('sna-fileviewer.viewer', viewProvider, {webviewOptions: {enableFindWidget: true, retainContextWhenHidden: true}});
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
    Usage.dispose();
}

import * as vscode from "vscode";
import * as path from 'path';
import {readFileSync} from 'fs';
import {EditorDocument} from "./editordocument";


export class EditorProvider implements vscode.CustomReadonlyEditorProvider {

	/**
	 * Called by vscode when a file is opened.
	 * Create document
	 */
	public openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
		// Return a SnaDocument
		const snaDoc = new EditorDocument();
		snaDoc.uri = uri;
		return snaDoc;
	}


	/**
	 * Called by vscode.
	 * Here vscode gives us the webview.
	 */
	public resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
		const snaDoc = document as EditorDocument;

		// Allow js
		webviewPanel.webview.options = {
			enableScripts: true
		};

		// Read the file
		const filePath = snaDoc.uri.fsPath;

		// Handle 'ready' message from the webview
		webviewPanel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'ready':
					// Send file data to webview
					const snaData = readFileSync(filePath);
					const message = {
						command: 'setData',
						snaData: [...snaData]
					};
					webviewPanel.webview.postMessage(message);
					break;
			}
		});

		// Create html code
		const html = this.getMainHtml(webviewPanel);
		webviewPanel.webview.html = html;
	}


	/**
	 * Returns the html code to display the text.
	 */
	protected getMainHtml(webviewPanel) {
		// Add the html styles etc.
		const extPath = vscode.extensions.getExtension("maziac.sna-fileviewer")!.extensionPath as string;
		const mainHtmlFile = path.join(extPath, 'html/main.html');
		let mainHtml = readFileSync(mainHtmlFile).toString();
		// Exchange local path
		const resourcePath = vscode.Uri.file(extPath);
		const vscodeResPath = webviewPanel.webview.asWebviewUri(resourcePath).toString();
		mainHtml = mainHtml.replace('${vscodeResPath}', vscodeResPath);

		// Add a Reload and Copy button for debugging
		//mainHtml = mainHtml.replace('<body>', '<body><button onclick="parseStart()">Reload</button><button onclick="copyHtmlToClipboard()">Copy HTML to clipboard</button>');

		return mainHtml;
	}

}

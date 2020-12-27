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
		const snaData = readFileSync(filePath);

		// Create html code
		const html = this.getMainHtml(webviewPanel);
		webviewPanel.webview.html = html;
		// Parse data
		const message = {
			command: 'setData',
			snaData: [...snaData]
		};
		webviewPanel.webview.postMessage(message);
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

		// Add a Reload button for debugging
		//mainHtml = mainHtml.replace('<body>', '<body> <button onclick="parseRoot()">Reload</button>');

		return mainHtml;
	}

}

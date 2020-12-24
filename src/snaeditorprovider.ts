import * as vscode from "vscode";
import * as path from 'path';
import {readFileSync} from 'fs';
import {SnaDocument} from "./snadocument";


export class SnaEditorProvider implements vscode.CustomReadonlyEditorProvider {

	/**
	 * Called by vscode when a file is opened.
	 * Create document
	 */
	public openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
		// Return a SnaDocument
		const snaDoc = new SnaDocument();
		snaDoc.uri = uri;
		return snaDoc;
	}


	/**
	 * Called by vscode.
	 * Here vscode gives us the webview.
	 */
	public resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
		const snaDoc = document as SnaDocument;

		// Allow js
		webviewPanel.webview.options = {
			enableScripts: true
		};

		// Read the file
		const filePath = snaDoc.uri.fsPath;
		const title = path.basename(filePath);
		const snaData = readFileSync(filePath);

		// Create html code
		const html = this.getHtml(webviewPanel);
		webviewPanel.webview.html = html;

		// Parse data
		const message = {
			command: 'setData',
			snaData: [...snaData]
		};
		webviewPanel.webview.postMessage(message);
	}


	/**
	 * Sets the html code to display the text.
	 */
	protected getHtml(webviewPanel) {
		// Add the html styles etc.
		const extPath = vscode.extensions.getExtension("maziac.sna-fileviewer")!.extensionPath as string;
		const mainHtmlFile = path.join(extPath, 'html/main.html');
		let mainHtml = readFileSync(mainHtmlFile).toString();
		//const mainJsFile = path.join(extPath, 'html/main.js');
		//let mainJs = readFileSync(mainJsFile).toString();
		// Exchange local path
		const resourcePath = vscode.Uri.file(path.join(extPath, 'html'));
		const vscodeResPath = webviewPanel.webview.asWebviewUri(resourcePath).toString();
		mainHtml = mainHtml.replace('${vscodeResPath}', vscodeResPath);
		//mainHtml = mainHtml.replace('//${script}', mainJs);

		return mainHtml;
	}

}

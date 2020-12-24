import * as vscode from 'vscode';
import {readFileSync} from 'fs';
import {Utility} from './utility';
import * as path from 'path';


/**
 * A Webview that showa a SNA file binary.
 */
export class SnaView {

	/// A panel (containing the webview).
	protected vscodePanel: vscode.WebviewPanel;


	/**
	 * Creates the text view.
	 */
	constructor(filePath: string) {
		// Create vscode panel view
		const title = path.basename(filePath);
		this.vscodePanel = vscode.window.createWebviewPanel('', title, {preserveFocus: true, viewColumn: vscode.ViewColumn.Nine}, {enableScripts: true, enableFindWidget: true});
		Utility.assert(this.vscodePanel);

		// Read file
		const buffer = readFileSync(filePath);
		// Convert to html
		this.setHtml(buffer);


		// Handle messages from the webview
		/*
		this.vscodePanel.webview.onDidReceiveMessage(message => {
			//console.log("webView command '"+message.command+"':", message);
			this.webViewMessageReceived(message);
		});
		*/
	}


	/**
	 * Sets the html code to display the text.
	 * @param snaData The data to convert.
	 */
	protected setHtml(snaData: Buffer) {
		// Add the html styles etc.
		const extPath = vscode.extensions.getExtension("maziac.sna-fileviewer")!.extensionPath as string;
		const mainHtmlFile = path.join(extPath, 'html/main.html');
		let mainHtml = readFileSync(mainHtmlFile).toString();
		const mainJsFile = path.join(extPath, 'html/main.js');
		let mainJs = readFileSync(mainJsFile).toString();
		// Exchange local path
		const resourcePath = vscode.Uri.file(path.join(extPath, 'html'));
		const vscodeResPath = this.vscodePanel.webview.asWebviewUri(resourcePath).toString();
		mainHtml = mainHtml.replace('${vscodeResPath}', vscodeResPath);
		//mainHtml = mainHtml.replace('//${script}', mainJs);

		this.vscodePanel.webview.html = mainHtml;

		// Set data
		const message = {
			command: 'setData',
			snaData: [...snaData]
		};
		this.vscodePanel.webview.postMessage(message);
	}

}


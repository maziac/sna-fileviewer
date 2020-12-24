import * as vscode from "vscode";


export class SnaDocument implements vscode.CustomDocument {
	uri: vscode.Uri;
	public dispose(): void {
	}
}


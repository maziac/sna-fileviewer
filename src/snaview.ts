import * as vscode from 'vscode';
import {readFileSync} from 'fs';
import {Utility} from './utility';
import * as path from 'path';


// To determine how to convert.
enum DataType {
	HEX_BYTE = 0,
	HEX_WORD,
	INT
};

// SNA header length
const SNA_HEADER_LENGTH = 27;


/**
 * A Webview that showa a SNA file binary.
 */
export class SnaView {

	/// A panel (containing the webview).
	protected vscodePanel: vscode.WebviewPanel;

	// Contains the SNA file during conversion to html.
	protected data: Buffer;

	// Index to the current data (during conversion to html).
	protected index: number;


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

		// Title
//		const mdText = readFileSync(path).toString();
		// Use the text
//		this.setMarkdown(mdText);
	}


	/**
	 * Sets the html code to display the text.
	 * @param data The data to convert.
	 */
	protected setHtml(data: Buffer) {
		this.index = 0;
		this.data = data;
		let html = '';

		// Get registers
		html += this.htmlByte("I");
		html += this.htmlWord("HL'");
		html += this.htmlWord("DE'");
		html += this.htmlWord("BC'");
		html += this.htmlWord("AF'");
		html += this.htmlWord("HL");
		html += this.htmlWord("DE");
		html += this.htmlWord("BC");
		html += this.htmlWord("IY");
		html += this.htmlWord("IX");
		html += this.htmlWord("IFF2");
		html += this.htmlByte("R");
		html += this.htmlWord("AF");
		const sp = this.readWord();
		html += this.htmlTitleValue("SP", sp);
		html += this.htmlByte("IM");
		html += this.htmlWord("HL'");

		html += this.htmlMemDump("4000-7FFF", 0x4000);
		html += this.htmlMemDump("8000-BFFF", 0x4000);
		html += this.htmlMemDump("C000-FFFF", 0x4000);


		// Check for 128k
		if (this.data.length > 49179) {
			// ZX 48k, get PC from SP
			if (sp >= 0x4000) {
				const pcIndex = SNA_HEADER_LENGTH + sp - 0x4000;
				const pc = this.data[pcIndex];
				html += this.htmlTitleValue("Derived from data at address " + this.getHexWordString(sp) + " -> PC", pc);
			}
			else {
				// SP points to ROM
				html += this.htmlTitleValue("Derived from data at address " + this.getHexWordString(sp) + " -> PC", undefined);
			}
		}
		else {

		}


		// Add the html styles etc.
		const mainHtml=`
<!DOCTYPE HTML>
<html>
<head>
	<meta charset="utf-8" >
</head>

<style>
.simple_value {
	display: table-row;
}
.simple_value div {
	display: table-cell;
}
.simple_value_title {
  font-weight: bold;
}


.mem_dump {
	display: table-row;
}
.mem_dump div {
	display: table-cell;
}

</style>

<body>

${html}

</body>
</html>
`;

		this.vscodePanel.webview.html = mainHtml;;
	}


	/**
	 * Creates html output for title and value.
	 * @param title The title for the value. E.g. "SP".
	 * @param value The value to show.
	 * @param dataType How to convert. As HEX or INT.
	 * @returns The html describing title and value.
	 */
	protected htmlTitleValue(title: string, value: number, dataType = DataType.HEX_WORD) {
		let valString;
		let valIntString;
		let titleString = '';
		if (value == undefined) {
			switch (dataType) {
				case DataType.HEX_BYTE: valString = '??'; break;
				case DataType.HEX_WORD: valString = '????'; break;
				case DataType.INT: valString = '?'; break;
			}
			valIntString = '?';
		}
		else {
			valIntString = value.toString() + 'd';
			if (dataType == DataType.HEX_BYTE || dataType == DataType.HEX_WORD) {
				// HEX
				valString = (dataType == DataType.HEX_BYTE) ? this.getHexByteString(value) : this.getHexWordString(value);
				titleString = title + ' = ' + valIntString;
			}
			else {
				// INT
				valString = valIntString;
			}
		}
		//const html = `<div>${title} = ${valHexString}</div>`;
		const html = `
<div class='simple_value' title="${titleString}">
<div class='simple_value_title'>${title}:</div>
<div>&nbsp;</div>
<div>${valString}</div>
</div>
`;
		return html;
	}

	/**
	 * Reads one byte from the buffer and creates html output for it.
	 * @param title The title for the value. E.g. "SP".
	 * @param dataType How to convert. As HEX or INT.
	 * @returns The html describing title and value.
	 */
	protected htmlByte(title: string, dataType = DataType.HEX_BYTE) {
		const value = this.readByte();
		return this.htmlTitleValue(title, value, dataType);
	}

	/**
	 * Reads one word from the buffer and creates html output for it.
	 * @param title The title for the value. E.g. "SP".
	 * @param dataType How to convert. As HEX or INT.
	 * @returns The html describing title and value.
	 */
	protected htmlWord(title: string, dataType = DataType.HEX_WORD) {
		const value = this.readWord();
		return this.htmlTitleValue(title, value, dataType);
	}


	/**
	 * Creates html output for a memory dump.
	 * The memory dump is collapsible.
	 * @param title The title for the memory dump
	 * @param size The size of the mem dump.
	 * @returns The html describing title and the mem dump.
	 */
	protected htmlMemDump(title: string, size: number) {
		let html = `
<div>
<details>
	<summary>${title}</summary>
`;

		// Loop given size
		let prevClose = '';
		for (let i = 0; i < size; i++) {
			const k = i % 16;
			// Get value
			const val = this.readByte();
			// Convert
			const valString = this.getHexByteString(val);
			const valIntString = val.toString();
			const hoverText = 'Index (Hex): ' + this.getHexWordString(i)
				+ '\nIndex (Dec): ' + i.toString() + '\nValue (Dec): ' + valIntString;

			// Create html
			if (k == 0) {
				// Start of row (div + indentation)
				html += `
${prevClose}
<div class='mem_dump'>
<div>&nbsp;</div>
`;
				prevClose = '</div>';
			}
			html += `<div title="${hoverText}">${valString}&nbsp;</div>`;
		}
		// Close
		html += '</div></div>';
		return html;
	}


	/**
	 * Returns a hex string.
	 * @param value The value to convert.
	 * @param size The number of digits (e.g. 2 or 4)
	 * @returns E.g. "0Fh" or "12FAh"
	 */
	protected getHexString(value: number, size: number) {
		if (value == undefined)
			return "".padStart(size, '?');
		const s = value.toString(16).toUpperCase().padStart(size, '0');
		return s;
	}


	/**
	 * Returns a hex string.
	 * @param value The value to convert [0-255].
	 * @returns E.g. "0Fh"
	 */
	protected getHexByteString(value: number) {
		return this.getHexString(value, 2);
	}

	/**
	 * Returns a hex string.
	 * @param value The value to convert [0-65535].
	 * @returns E.g. "A2FFh"
	 */
	protected getHexWordString(value: number) {
		return this.getHexString(value, 4);
	}


	/**
	 * Reads a byte from the buffer.
	 */
	protected readByte(): number {
		const value = this.data[this.index++];
		return value;
	}

	/**
	 * Reads a word (little endian) from the buffer.
	 */
	protected readWord() {
		let value = this.data[this.index++];
		value += 256 * this.data[this.index++];
		return value;
	}

}


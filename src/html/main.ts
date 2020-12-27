declare var acquireVsCodeApi: any;
declare var document: any;
declare var window: any;
declare var ImageConvert: any;
declare var UlaScreen: any;

const vscode = acquireVsCodeApi();


/**
 * This js script parses a file, does all the decoding and presents the
 * data in the webview.
 * It is done as script inside the webview (opposed to creating a html file in
 * the extension) to allow lazy loading.
 * Large blocks of data are skipped in the initial pass and decoded only
 * when needed. I.e. when the user expands an item.
 */


// Initialize variables


// The data to parse.
var snaData: number[];

// Index into snaData
var snaIndex: number;

// The root node for parsing. new objects are appended here.
var parseNode: any;


/*
//---- Handle Mouse Over, Calculation of hover text -------
function mouseOverValue(obj) {
	const address = obj.getAttribute("address");
	// Send request to vscode to calculate the hover text
	vscode.postMessage({
		command: 'getValueInfoText',
		address: address
	});
}

function mouseOverAddress(obj) {
	// Send request to vscode to calculate the hover text
	const address = obj.getAttribute("addressLine");
	vscode.postMessage({
		command: 'getAddressInfoText',
		address: address
	});
}
*/


/**
 * Convert array  to base 64.
 */
function arrayBufferToBase64(buffer) {
	var binary = '';
	var bytes = [].slice.call(new Uint8Array(buffer));
	bytes.forEach((b) => binary += String.fromCharCode(b));
	return window.btoa(binary);
};


//---- Parse functions. --------


/**
 * Returns the right bank for an index.
 *  5,2,0,1,3,4,6,7,8,9,10,...,111.
 * @returns the bank number 0-111.
 */
function getMemBankPermutation(i: number): number {
	if (i >= 6)
		return i;
	return [5, 2, 0, 1, 3, 4][i];
}


/**
 * Returns a hex string.
 * @param value The value to convert.
 * @param size The number of digits (e.g. 2 or 4)
 * @returns E.g. "0Fh" or "12FAh"
 */
function getHexString(value: number, size: number): string {
	if (value == undefined)
		return "".padStart(size, '?');
	const s = value.toString(16).toUpperCase().padStart(size, '0');
	return s;
}


/**
 * Creates html output for title and value.
 * @param title The title for the value. E.g. "SP".
 * @param value The value to show.
 * @param size 1 = byte, 2 = word.
 * @param hoverTitleString String to show on hover for the title. Can be undefined.
 * @param hoverValueString String to show on hover for the value. Can be undefined for default.
 * @returns The created node.
 */
function htmlTitleValue(title: string, value: number, size: number, hoverTitleString?: string, hoverValueString?: string): any {
	const digitSize = 2 * size;
	let valString;
	let valIntString;
	let titleString = '';
	if (value == undefined) {
		valString = ''.padStart(digitSize, '?');
		valIntString = '?';
	}
	else {
		valIntString = value.toString() + ' (dec)';
		valString = getHexString(value, digitSize);
	}

	if (hoverTitleString == undefined) {
		// Add index as hover string
		const previndex = snaIndex - size;
		hoverTitleString = title + '\nIndex (hex): ' + getHexString(previndex, 4) + '\nIndex (dec): ' + previndex;
	}
	if (hoverValueString == undefined)
		hoverValueString = title + ': ' + valIntString;

	// Create new node
	const node = document.createElement("DIV");
	node.classList.add("simple_value");
	const html = `
<div class="simple_value_title indent" title="${hoverTitleString}">${title}:</div>
<div>&nbsp;</div>
<div title="${hoverValueString}">${valString}</div>
`;
	node.innerHTML = html;

	// Append it
	parseNode.appendChild(node);

	// Return node
	return node;
}


/**
 * Reads a data (little endian) from the buffer.
 * @param size The number of bytes to read.
 */
function readData(size: number) {
	let value = snaData[snaIndex++];
	let factor = 1;
	for (let i = 1; i < size; i++) {
		factor *= 256;
		value += factor * snaData[snaIndex++];
	}
	return value;
}


/**
 * Reads one byte from the buffer and creates html output for it.
 * @param title The title for the value. E.g. "SP".
 * @returns The html describing title and value.
 */
function htmlByte(title: string) {
	const value = readData(1);
	return htmlTitleValue(title, value, 1);
}

/**
 * Reads one word from the buffer and creates html output for it.
 * @param title The title for the value. E.g. "SP".
 * @returns The html describing title and value.
 */
function htmlWord(title: string) {
	const value = readData(2);
	return htmlTitleValue(title, value, 2);
}


/**
 * Is called if the user opens the details of for the ULA screen.
 * Decodes the image data
 */
function htmlUlaScreen() {
	// Image
	try {
		// Convert image
		const ulaScreen = new UlaScreen(snaData, snaIndex);
		const imgBuffer = ulaScreen.getUlaScreen();
		// Create gif
		const base64String = arrayBufferToBase64(imgBuffer);
		// Add to html
		parseNode.innerHTML += '<img width="500px" src="data:image/gif;base64,' + base64String + '">';
	}
	catch {
		parseNode.innerHTML += '<div class="error">Error converting image.</div>';
	}
}


/**
 * Is called if the user opens the details of an item.
 * Decodes the data.
 */
function htmlMemDump(size: number, offset = 0) {
	let html = '';
	let prevClose = '';

	// In case of an error, show at least what has been parsed so far.
	try {
		// Loop given size
		for (let i = 0; i < size; i++) {
			const k = i % 16;
			// Get value
			const iIndex = snaIndex + i;	// For indexing
			const iOffset = offset + i;	// For display
			const val = snaData[iIndex];
			const valString = getHexString(val, 2);
			const valIntString = val.toString();

			// Start of row?
			if (k == 0) {
				// Close previous
				html += prevClose;
				prevClose = '</div>';
				// Calc address
				let addrString = getHexString(iOffset, 4);

				// Check for same values
				let l = i + 1
				for (; l < size; l++) {
					if (val != snaData[snaIndex + l])
						break;
				}
				const l16 = l - (l % 16);
				if (l16 > i + 16) {
					// At least 2 complete rows contains same values
					i = l16 - 1;
					const toAddrString = getHexString(offset + i, 4);
					const hoverText = 'Index (dec): ' + iOffset + '-' + (offset + i) + '\nValue (dec): ' + valIntString;
					html += '<div>';
					html += '<span class="indent mem_index">' + addrString + '-' + toAddrString + ':</span>';
					html += '<span> contain all ' + valString + '</span>';
					continue;
				}

				// Afterwards proceed normal
				html += '<div class="mem_dump"> <div class="indent mem_index">' + addrString + ':</div>';
			}

			// Convert to html
			const hoverText = 'Index (hex): ' + getHexString(iOffset, 4) + '\nIndex (dec): ' + iOffset + '\nValue (dec): ' + valIntString;
			html += '<div class="mem_dump_cell" title="' + hoverText + '">' + valString + '&nbsp;</div>';
		}
		// Close
		html += prevClose;
	}
	catch (e) {
		// Close
		html += prevClose;
		// Error while parsing
		html += '<div class="error indent">Error while parsing.</div>';
	}

	// Append
	parseNode.innerHTML += html;
}


/**
 * Creates a collapsible summary/details node.
 * @param title The title of the node.
 * @param size The size of the node.
 */
function htmlDetails(title: string, size: number, func: () => void) {
	// Create new node
	const detailsNode = document.createElement("DETAILS");
	detailsNode.innerHTML = "<summary>" + title + "</summary>";
	// Indent
	detailsNode.classList.add("indent");

	// Set attributes
	detailsNode.setAttribute('sna-index', snaIndex.toString());
	//detailsNode.setAttribute('sna-size', size.toString());

	// Increase index
	snaIndex += size;

	// Append it
	parseNode.appendChild(detailsNode);

	// Install listener
	detailsNode.addEventListener("toggle", function handler(event: any) {
		// Get parse node and index
		parseNode = event.target;
		const indexString = parseNode.getAttribute('sna-index');
		snaIndex = parseInt(indexString);
		func();
		this.removeEventListener("toggle", handler);
	});

	// Return
	return detailsNode;
}


//---- Parse the data (root level) --------
function parseRoot() {
	snaIndex = 0;
	let divRoot = document.getElementById("div_root");
	let html = '';

	// Check length. ZX48K or ZX128K
	const length = snaData.length;
	html += '<div><b>';
	let zx128k = false;
	if (length == 49179) {
		// ZX48K
		html += 'ZX48K SNA file.';
	}
	else if (length == 131103 || length == 147487) {
		// ZX128K
		html += 'ZX128K SNA file.';
		zx128k = true;
	}
	else {
		// Length wrong
		html += '<span class="error">Wrong length.</span>';
	}
	html += '</b></div>';
	html += '<div><b>Length:</b> ' + length + '</div>';

	// Print banks
	let pagedInBank;
	if (zx128k) {
		// Used banks
		html += '<div>Banks: 5, 2, ';
		// Get used bank
		const port7FFD = snaData[49181];
		pagedInBank = port7FFD & 0x03;
		html += pagedInBank.toString();
		// Remaining banks
		for (let i = 2; i < 8; i++) {
			const p = getMemBankPermutation(i);
			if (p == pagedInBank)
				continue;	// skip already read bank
			html += ', ' + p.toString();
		}
		// End
		html += '</div>';
	}

	// End meta info
	//html += '<hr>';
	html += '<br>';
	divRoot.innerHTML = html;

	// Get registers
	parseNode = divRoot;
	htmlByte("I");
	htmlWord("HL'");
	htmlWord("DE'");
	htmlWord("BC'");
	htmlWord("AF'");
	htmlWord("HL");
	htmlWord("DE");
	htmlWord("BC");
	htmlWord("IY");
	htmlWord("IX");
	htmlByte("Interrupt");
	htmlByte("R");
	htmlWord("AF");

	const sp = readData(2);
	htmlTitleValue("SP", sp, 2);
	// Print PC if ZX48K
	if (!zx128k) {
		const hoverPcText = 'PC is derived from the location SP points to.';
		let pcNode;
		if (sp >= 0x4000) {
			const snaHeaderLength = 27;
			const pcIndex = snaHeaderLength + sp - 0x4000;
			const pc = snaData[pcIndex] + 256 * snaData[pcIndex + 1];
			pcNode = htmlTitleValue("PC", pc, 2, hoverPcText);
		}
		else {
			pcNode = htmlTitleValue("PC", undefined, 2, hoverPcText, "SP points to ROM. Can't decode PC.");
		}
		// Indent
		const keyNode = pcNode.firstElementChild;
		keyNode.classList.add("indent");
		pcNode.classList.add("gray");
	}

	htmlByte("IM");
	htmlByte("Border");


	// Split for different formats
	if (zx128k) {
		// ZX128K
		// Memdumps
		htmlDetails("Bank5: 4000-7FFF", 0x4000, () => {
			const index = snaIndex;	// Save
			// Details as picture
			htmlDetails("Screen", 0x4000, () => {
				htmlUlaScreen();
			});
			// Details as mem dump
			snaIndex = index;	// Restore
			htmlDetails("Memory Dump", 0x4000, () => {
				htmlMemDump(0x4000, 0x4000);
			});
		});
		htmlDetails("Bank2: 8000-BFFF", 0x8000, () => {
			htmlMemDump(0x4000, 0x8000);
		});
		htmlDetails("Bank" + pagedInBank.toString() + ": C000-FFFF", 0x4000, () => {
			htmlMemDump(0x4000, 0xC000);
		});
		// A few more registers
		htmlWord("PC");
		htmlByte("Port 7FFD");
		htmlByte("TRDOS ROM");
		// Remaining banks
		for (let i = 2; i < 8; i++) {
			const p = getMemBankPermutation(i);
			if (p == pagedInBank)
				continue;	// skip already read bank
			htmlDetails("Bank" + p.toString() + ":", 0x4000, () => {
				htmlMemDump(0x4000);
			});
		}
	}
	else {
		// ZX48K
		const mem4000 =
		htmlDetails("4000-7FFF", 0x4000, () => {
			const index = snaIndex;	// Save
			// Details as picture
			const screen =
			htmlDetails("Screen", 0x4000, () => {
				htmlUlaScreen();
			});
			// Details as mem dump
			snaIndex = index;	// Restore
			htmlDetails("Memory Dump", 0x4000, () => {
				htmlMemDump(0x4000, 0x4000);
			});
			// Open screen by default
			screen.open = true;
		});
		htmlDetails("8000-BFFF", 0x4000, () => {
			htmlMemDump(0x4000, 0x8000);
		});
		htmlDetails("C000-FFFF", 0x4000, () => {
			htmlMemDump(0x4000, 0xC000);
		});

		// Open the loading screen
		mem4000.open = true;
	}
}



//---- Handle Messages from vscode extension --------
window.addEventListener('message', event => {
	const message = event.data;

	switch (message.command) {
		case 'setData':
			{
				// Store in global variable
				snaData = message.snaData;
				// Parse
				parseRoot();
			} break;
	}
});


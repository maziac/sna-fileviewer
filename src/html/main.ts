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

// Index into snaData
var index: number;

// The data to parse.
var snaData: number[];

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
		const previndex = index - size;
		hoverTitleString = title + '\nIndex (hex): ' + getHexString(previndex, 4) + '\nIndex (dec): ' + previndex;
	}
	if (hoverValueString == undefined)
		hoverValueString = title + ': ' + valIntString;

	// Create new node
	const node = document.createElement("DIV");
	node.classList.add("simple_value");
	const html = `
<div class="simple_value_title" title="${hoverTitleString}">${title}:</div>
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
	let value = snaData[index++];
	let factor = 1;
	for (let i = 1; i < size; i++) {
		factor *= 256;
		value += factor * snaData[index++];
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
 * Is called if the user opens the details of an item.
 * Decodes the data.
 * Afterwards removes the listener as it is no longer needed
 * (the data is decoded).
 * @param event The event. event.target contains the object that was clicked.
 */
function htmlMemDump(event: any) {
	// Get node and attributes
	const node = event.target;
	const indexString = node.getAttribute('sna-index');
	const sizeString = node.getAttribute('sna-size');
	const offsetString = node.getAttribute('sna-offset');
	index = parseInt(indexString);
	const size = parseInt(sizeString);
	const offset = parseInt(offsetString);

	// Image
	let screenGifString = '';
	try {
		// Convert image
		const ulaScreen = new UlaScreen(snaData, index);
		const imgBuffer = ulaScreen.getUlaScreen();
		// Create gif
		const base64String = arrayBufferToBase64(imgBuffer);
		// Add to html
		node.innerHTML += '<img width="1024" height="1024" src="data:image/gif;base64,' + base64String + '">';
	}
	catch {
		node.innerHTML += '<div class="error">Error converting image.</div>';
	}




	let html = ''; // '<div>';
	let prevClose = '';

	// In case of an error, show at least what has been parsed so far.
	try {
		// Loop given size
		for (let i = 0; i < size; i++) {
			const k = i % 16;
			// Get value
			const iIndex = index + i;	// For indexing
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
					if (val != snaData[index + l])
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
	node.innerHTML += html;

	/*
		// Interestingly this is slower!!!
		// Loop given size
		let html = ''; // '<div>';
		let prevClose = '';
		let rowNode;
		for (let i = 0; i < size; i++) {
			const k = i % 16;
			// Get value
			const val = snaData[index++];
			// Convert
			const valString = getHexString(val, 2);
			const valIntString = val.toString();
			//		const hoverText = 'Index (hex): ' + getHexString(i, 4)
			//			+ '\nIndex (dec): ' + i.toString() + '\nValue (dec): ' + valIntString;

			// Create html
			if (k == 0) {
				// Create node
				rowNode = document.createElement("DIV");
				rowNode.classList.add("mem_dump");
				node.appendChild(rowNode);
				// Address
				const addrNode = document.createElement("DIV");
				const addrString = getHexString(offset + i, 4);
				addrNode.textContent = addrString;
				rowNode.appendChild(addrNode);
			}
			// Value
			const valueNode = document.createElement("DIV");
			valueNode.textContent = valString;
			rowNode.appendChild(valueNode);
		}
	}
	*/

	// do this only once, remove listener
	node.removeEventListener("toggle", htmlMemDump);
}


/**
 * Creates html output for a memory dump.
 * The memory dump is collapsible.
 * @param title The title for the memory dump
 * @param size The size of the mem dump.
 * @param offset If given this will be added in the first row.
 */
function htmlMemDumpSummary(title: string, size: number, offset?: number) {
	// Create new node
	const node = document.createElement("DIV");
	const detailsNode = document.createElement("DETAILS");
	detailsNode.setAttribute('sna-index', index.toString());
	detailsNode.setAttribute('sna-size', size.toString());
	if (offset == undefined)
		offset = 0;
	detailsNode.setAttribute('sna-offset', offset.toString());
	detailsNode.innerHTML = "<summary><b>" + title + "</b></summary>";
	node.appendChild(detailsNode);

	// Increase index
	index += size;

	// Append it
	parseNode.appendChild(node);

	// Install listener
	detailsNode.addEventListener("toggle", htmlMemDump);
}


//---- Parse the data (root level) --------
function parseRoot() {
	index = 0;
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
	// From here on the main DOM tree is manipulated via objects.

	// TODO: 0x4000 memdump: Stattdessen Bild ausgeben (oder beides)

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
		htmlMemDumpSummary("Bank5: 4000-7FFF", 0x4000, 0x4000);
		htmlMemDumpSummary("Bank2: 8000-BFFF", 0x4000, 0x8000);
		htmlMemDumpSummary("Bank" + pagedInBank.toString() + ": C000-FFFF", 0x4000, 0xC000);
		// A few more registers
		htmlWord("PC");
		htmlByte("Port 7FFD");
		htmlByte("TRDOS ROM");
		// Remaining banks
		for (let i = 2; i < 8; i++) {
			const p = getMemBankPermutation(i);
			if (p == pagedInBank)
				continue;	// skip already read bank
			htmlMemDumpSummary("Bank" + p.toString() + ":", 0x4000);
		}
	}
	else {
		// ZX48K
		htmlMemDumpSummary("4000-7FFF", 0x4000, 0x4000);
		htmlMemDumpSummary("8000-BFFF", 0x4000, 0x8000);
		htmlMemDumpSummary("C000-FFFF", 0x4000, 0xC000);
	}


	var mygw = new ImageConvert(undefined);

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


const vscode = acquireVsCodeApi();

// Initialize variables

// Index into snaData
var index;

// The data to parse.
var snaData;

// The root node for parsing. new objects are appended here.
var parseNode;


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


//---- Parse functions. --------


/**
 * Returns the right bank for an index.
 *  5,2,0,1,3,4,6,7,8,9,10,...,111.
 * @returns the bank number 0-111.
 */
function getMemBankPermutation(i) {
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
function getHexString(value, size) {
	if (value == undefined)
		return "".padStart(size, '?');
	const s = value.toString(16).toUpperCase().padStart(size, '0');
	return s;
}


/**
 * Creates html output for title and value.
 * @param title The title for the value. E.g. "SP".
 * @param value The value to show.
 * @param dataType How to convert. As HEX or INT.
 * @returns The html describing title and value.
 */
function htmlTitleValue(title, value, size, hoverString) {
	const digitSize = 2 * size;
	let valString;
	let valIntString;
	let titleString = '';
	if (value == undefined) {
		valString = ''.padStart(digitSize, '?');
		valIntString = '?';
	}
	else {
		valIntString = value.toString() + 'd';
		valString = getHexString(value, digitSize);
	}
	if (hoverString == undefined)
		hoverString = '';
	titleString = title + ': ' + valIntString;

	// Create new node
	const node = document.createElement("DIV");
	node.classList.add("simple_value");
	const html = `
<div class="simple_value_title" title="${hoverString}">${title}:</div>
<div>&nbsp;</div>
<div title="${titleString}">${valString}</div>
`;
	node.innerHTML = html;

	// Append it
	parseNode.appendChild(node);
}


/**
 * Reads a data (little endian) from the buffer.
 * @param size The number of bytes to read.
 */
function readData(size) {
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
function htmlByte(title) {
	const value = readData(1);
	return htmlTitleValue(title, value, 1);
}

/**
 * Reads one word from the buffer and creates html output for it.
 * @param title The title for the value. E.g. "SP".
 * @returns The html describing title and value.
 */
function htmlWord(title) {
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
function htmlMemDump(event) {
	// Get node and attributes
	const node = event.target;
	const indexString = node.getAttribute('sna-index');
	const sizeString = node.getAttribute('sna-size');
	const offsetString = node.getAttribute('sna-offset');
	index = parseInt(indexString);
	const size = parseInt(sizeString);
	const offset = parseInt(offsetString);

	// TODO: Change to objects (instead of html)
	// TODO: Add "intelligent" lines. I.e. summarize areas with same values.

	// Loop given size
	let html = ''; // '<div>';
	let prevClose = '';
	for (let i = 0; i < size; i++) {
		const k = i % 16;
		// Get value
		const val = snaData[index++];
		// Convert
		const valString = getHexString(val, 2);
		const valIntString = val.toString();
		const hoverText = 'Index (Hex): ' + getHexString(i, 4)
			+ '\nIndex (Dec): ' + i.toString() + '\nValue (Dec): ' + valIntString;

		// Create html
		if (k == 0) {
			// Start of row (div + indentation)
			const addrString = getHexString(offset + i, 4);
			html += `
${prevClose}
<div class='mem_dump'>
<div>&nbsp;</div>
<div><b>${addrString}:</b></div>
`;
			prevClose = '</div>';
		}
		html += `<div title="${hoverText}">${valString}&nbsp;</div>`;
	}

	// Append
	node.innerHTML += html;

	// do this only once, remove listener
	node.removeEventListener("toggle", htmlMemDump);
}


/**
 * Creates html output for a memory dump.
 * The memory dump is collapsible.
 * @param title The title for the memory dump
 * @param size The size of the mem dump.
 * @param offset If given this will be added in the first row.
 * @returns The html describing title and the mem dump.
 */
function htmlMemDumpSummary(title, size, offset) {
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
	//divRoot.innerHTML = '<div>TEXT UNDEF</div>';

	let html = ''; //'<div>TEXT DEFED</div>';

	// Check length. ZX48K or ZX128K
	const length = snaData.length;
	html += '<div><b>Length:</b> ' + length.toString() + '</div>';
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
		html += 'Wrong length.';
	}
	html += '</b></div>';

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
	html += '<hr>';
	divRoot.innerHTML = html;

	// Get registers
	parseNode = divRoot;
	html += htmlByte("I");
	html += htmlWord("HL'");
	html += htmlWord("DE'");
	html += htmlWord("BC'");
	html += htmlWord("AF'");
	html += htmlWord("HL");
	html += htmlWord("DE");
	html += htmlWord("BC");
	html += htmlWord("IY");
	html += htmlWord("IX");
	html += htmlWord("IFF2");
	html += htmlByte("R");
	html += htmlWord("AF");
	const sp = readData(2);
	html += htmlTitleValue("SP", sp, 2);
	html += htmlByte("IM");
	html += htmlWord("HL'");

	// Memory banks
	if (zx128k) {
		// ZX128K
		html += htmlMemDumpSummary("Bank5: 4000-7FFF", 0x4000, 0x4000);
		html += htmlMemDumpSummary("Bank2: 8000-BFFF", 0x4000, 0x8000);
		html += htmlMemDumpSummary("Bank" + pagedInBank.toString() + ": C000-FFFF", 0x4000, 0xC000);
		// Remaining banks
		for (let i = 2; i < 8; i++) {
			const p = getMemBankPermutation(i);
			if (p == pagedInBank)
				continue;	// skip already read bank
			html += htmlMemDumpSummary("Bank" + p.toString() + ":", 0x4000);
		}
	}
	else {
		// ZX48K
		html += htmlMemDumpSummary("4000-7FFF", 0x4000);
		html += htmlMemDumpSummary("8000-BFFF", 0x4000);
		html += htmlMemDumpSummary(" C000-FFFF", 0x4000);
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

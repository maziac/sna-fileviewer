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


// The data to parse.
var dataBuffer: number[];

// Index into snaData
var dataIndex: number;

// The root node for parsing. new objects are appended here.
var parseNode: any;


/**
 * Convert array to base 64 string.
 */
function arrayBufferToBase64(buffer) {
	var binary = '';
	var bytes = [].slice.call(new Uint8Array(buffer));
	bytes.forEach((b) => binary += String.fromCharCode(b));
	return window.btoa(binary);
};


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
 * Creates a node for title and value.
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
	let additionalClass;
	if (value == undefined || isNaN(value)) {
		valString = ''.padStart(digitSize, '?');
		valIntString = '?';
		additionalClass = 'class="error"';
		hoverValueString = 'Error while parsing.';
	}
	else {
		valIntString = value.toString() + ' (dec)';
		valString = getHexString(value, digitSize);
		let additionalClass = '';
	}

	if (hoverTitleString == undefined) {
		// Add index as hover string
		const previndex = dataIndex - size;
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
<div title="${hoverValueString}" ${additionalClass}>${valString}</div>
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
	let value = dataBuffer[dataIndex++];
	let factor = 1;
	for (let i = 1; i < size; i++) {
		factor *= 256;
		value += factor * dataBuffer[dataIndex++];
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
			const iIndex = dataIndex + i;	// For indexing
			const iOffset = offset + i;	// For display
			const val = dataBuffer[iIndex];
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
					if (val != dataBuffer[dataIndex + l])
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
	detailsNode.setAttribute('data-index', dataIndex.toString());
	//detailsNode.setAttribute('sna-size', size.toString());

	// Increase index
	dataIndex += size;

	// Append it
	parseNode.appendChild(detailsNode);

	// Install listener
	detailsNode.addEventListener("toggle", function handler(event: any) {
		// Get parse node and index
		parseNode = event.target;
		const indexString = parseNode.getAttribute('data-index');
		dataIndex = parseInt(indexString);
		func();
		this.removeEventListener("toggle", handler);
	});

	// Return
	return detailsNode;
}



//---- Handle messages from vscode extension --------
window.addEventListener('message', event => {
	const message = event.data;

	switch (message.command) {
		case 'setData':
			{
				// Store in global variable
				dataBuffer = message.snaData;
				dataIndex = 0;
				// Parse
				parseRoot();
			} break;
	}
});


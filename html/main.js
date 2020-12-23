const vscode = acquireVsCodeApi();

// Initialize variables
var index;
var snaData;


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
	const html = `
<div class="simple_value">
<div class="simple_value_title" title="${hoverString}">${title}:</div>
<div>&nbsp;</div>
<div title="${titleString}">${valString}</div>
</div>
`;
	return html;
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


//---- Parse the data (root level) --------
function parseRoot() {
	index = 0;
	let divRoot = document.getElementById("div_root");
	divRoot.innerHTML = '<div>TEXT UNDEF</div>';

	let html = '<div>TEXT DEFED</div>';

	// Get registers
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

	divRoot.innerHTML = html;
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



//parseRoot();

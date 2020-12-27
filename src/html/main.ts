declare var acquireVsCodeApi: any;
declare var document: any;
declare var window: any;
declare var ImageConvert: any;
declare var UlaScreen: any;

declare var snaData: number[];
declare var snaIndex: number;
declare var parseNode: any;



/**
 * The main program which starts the decoding.
 * Must implement the parseRoot function.
 */


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


//---- Parse the data (root level) --------
function parseRoot() {
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


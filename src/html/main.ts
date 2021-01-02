declare var acquireVsCodeApi: any;
declare var document: any;
declare var window: any;
declare var ImageConvert: any;
declare var UlaScreen: any;

declare var dataBuffer: number[];
declare var dataIndex: number;
declare var lastNode: any;



/**
 * The main program which starts the decoding.
 * Must implement the parseRoot function.
 */



//---- Parse the data (root level) --------
function parseRoot() {
	try {
		// Check length. ZX48K or ZX128K
		let html = '<div><b>';
		const length = dataBuffer.length;
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
			const port7FFD = dataBuffer[49181];
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

		html += '<br>';
		lastNode.innerHTML = html;
		// End meta info

		// Header
		read(27);
		createNode('Header').open = true;
		addDetailsParsing(() => {
			// Get registers/data
			read(1);
			createNode("I", hex0xValue(), "Interrupt Vector Register");

			read(2);
			createNode("HL'", hex0xValue(), "HL' Register");

			read(2);
			createNode("DE'", hex0xValue(), "DE' Register");

			read(2);
			createNode("BC'", hex0xValue(), "BC' Register");

			read(2);
			createNode("AF'", hex0xValue(), "AF' Register");

			read(2);
			createNode("HL", hex0xValue(), "HL Register");

			read(2);
			createNode("DE", hex0xValue(), "DE Register");

			read(2);
			createNode("BC", hex0xValue(), "BC Register");

			read(2);
			createNode("IY", hex0xValue(), "IY Register");

			read(2);
			createNode("IX", hex0xValue(), "IX Register");

			read(1);
			createNode("Interrupt", hex0xValue(), "Interrupt (bit 2 contains IFF2, 1=EI/0=DI)");

			read(1);
			createNode("R", hex0xValue(), "Memory Refresh Register");

			read(2);
			createNode("AF", hex0xValue(), "AF Register");

			read(2);
			const sp = getValue();
			createNode("SP", hex0xValue(), "Stack Pointer");

			/*
			// Print PC if ZX48K
			if (!zx128k) {
				const hoverPcText = 'PC is derived from the location SP points to.';
				let pcNode;
				if (sp >= 0x4000) {
					const snaHeaderLength = 27;
					const pcIndex = snaHeaderLength + sp - 0x4000;
					const pc = dataBuffer[pcIndex] + 256 * dataBuffer[pcIndex + 1];
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
			*/

			read(1);
			createNode("IM", hex0xValue(), "Interrupt Mode (0=IM0/1=IM1/2=IM2)");

			read(1);
			createNode("Border", zxColorValue(), "Memory Refresh Register");
			addHoverValue(hex0xValue());

		});

		// Split for different formats
		if (zx128k) {
			// ZX128K
			// Memdumps
			read(0x4000);
			createNode("Bank5: 0x4000-0x7FFF").open = true;
			addDetailsParsing(() => {
				read(0x1B00);	// 6912
				createNode('Screen', '', '0x4000-0x5AFF').open = true;
				addDetailsParsing(() => {
					read(0x1B00);	// 6912
					createUlaScreen();
					createNode('Memory dump: 0x4000-0x5AFF');
					addDelayedDetailsParsing(() => {
						read(0x1B00);
						createMemDump(0x4000);
					});
				});

				// Remaining
				read(0x4000 - 0x1B00);
				createNode('0x5B00-0x7FFF');
				addDelayedDetailsParsing(() => {
					read(0x4000 - 0x1B00);
					createMemDump(0x5B00);
				});
			});

			read(0x4000);
			createNode("Bank2: 0x8000-0xBFFF");
			addDelayedDetailsParsing(() => {
				read(0x4000);
				createMemDump(0x8000);
			});

			read(0x4000);
			createNode("Bank" + pagedInBank.toString() + ": C000-FFFF");
			addDelayedDetailsParsing(() => {
				read(0x4000);
				createMemDump(0xC000);
			});

			// A few more registers
			read(2);
			createNode("PC", hex0xValue(), "Program Counter");

			read(1);
			createNode("Port 0x7FFD", hex0xValue(), "Port 0x7ffd setting");

			read(1);
			createNode("TRDOS ROM", hex0xValue(), " TR-DOS rom paged (1) or not (0)");
			// Remaining banks
			for (let i = 2; i < 8; i++) {
				const p = getMemBankPermutation(i);
				if (p == pagedInBank)
					continue;	// skip already read bank
				// Memory bank
				read(0x4000);
				createNode("Bank" + p.toString() + ":");
				addDelayedDetailsParsing(() => {
					read(0x4000);
					createMemDump();
				});
			}
		}
		else {
			// ZX48K
			read(0x4000);
			createNode("0x4000-0x7FFF").open = true;
			addDetailsParsing(() => {
				read(0x1B00);	// 6912
				createNode('Screen', '', '0x4000-0x5AFF').open = true;
				addDetailsParsing(() => {
					read(0x1B00);	// 6912
					createUlaScreen();
					createNode('Memory dump: 0x4000-0x5AFF');
					addDelayedDetailsParsing(() => {
						read(0x1B00);
						createMemDump(0x4000);
					});
				});

				// Remaining
				read(0x4000 - 0x1B00);
				createNode('0x5B00-0x7FFF');
				addDelayedDetailsParsing(() => {
					read(0x4000 - 0x1B00);
					createMemDump(0x5B00);
				});
			});

			read(0x4000);
			createNode("0x8000-0xBFFF");
			addDelayedDetailsParsing(() => {
				read(0x4000);
				createMemDump(0x8000);
			});

			read(0x4000);
			createNode("0xC000-0xFFFF");
			addDelayedDetailsParsing(() => {
				read(0x4000);
				createMemDump(0xC000);
			});
		}
	}
	catch (e) {
		// In case of an error show the rest as memdump.
		// Partly decoded data might be re-dumped.
		const remainingLength = dataBuffer.length - lastOffset;
		assert(remainingLength >= 0);
		if (remainingLength > 0) {
			read(remainingLength);
			createNode('Remaining', '', 'Remaining data after parsing error.');
			addDelayedDetailsParsing(() => {
				read(remainingLength);
				createMemDump();
			});
		}
	}
}


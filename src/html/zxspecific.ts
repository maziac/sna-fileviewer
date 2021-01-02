declare var dataBuffer: number[];
declare var lastOffset: number;
declare var lastNode: any;




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
 * Return a ZX color value as a string.
 */
function zxColorValue() {
	const val = getValue();
	switch (val) {
		case 0: return "BLACK";
		case 1: return "BLUE";
		case 2: return "RED";
		case 3: return "MAGENTA";
		case 4: return "GREEN";
		case 5: return "CYAN";
		case 6: return "YELLOW";
		case 7: return "WHITE";
	}
	return "UNKNOWN";
}


/**
 * Returns a ZX color value as a html color.
 * @param zxColor 0-7
 * @param bright true/false
 * @returns An array with rgb value, e.g. [255, 0, 0]
 */
function zxHtmlColor(zxColor: number, bright: boolean): number[] {
	if (bright) {
		switch (zxColor) {
			case 0: return [ 0, 0, 0 ];	// Black
			case 1: return [0, 0, 0xFF];	// Blue
			case 2: return [0xFF, 0, 0];	// Red
			case 3: return [0xFF, 0, 0xFF];	// Magenta
			case 4: return [0, 0xFF, 0];	// Green
			case 5: return [0, 0xFF, 0xFF];	// Cyan
			case 6: return [0xFF, 0xFF, 0];	// Yellow
			case 7: return [0xFF, 0xFF, 0xFF];	// White
		}
	}
	else {
		switch (zxColor) {
			case 0: return [0, 0, 0];	// Black
			case 1: return [0, 0, 0xD7];	// Blue
			case 2: return [0xD7, 0, 0];	// Red
			case 3: return [0xD7, 0, 0xD7];	// Magenta
			case 4: return [0, 0xD7, 0];	// Green
			case 5: return [0, 0xD7, 0xD7];	// Cyan
			case 6: return [0xD7, 0xD7, 0];	// Yellow
			case 7: return [0xD7, 0xD7, 0xD7];	// White
		}
	}
	assert(false);
	return [0, 0, 0];
}


/**
 * Converts a color (RGB, 0-255) into a html string.
 * @param red 0-255
 * @param green 0-255
 * @param blue 0-255
 * @returns Eg. "#00FF00"
 */
function getHtmlColor(red: number, green: number, blue: number): string {
	return '#' + getHexString(red, 2) + getHexString(green, 2) + getHexString(blue, 2);
}


/**
 * @returns The core version number.
 */
function coreVersionValue(): string {
	const charOffset = '0'.charCodeAt(0);
	let s = String.fromCharCode(charOffset + dataBuffer[lastOffset]) + '.';
	s += String.fromCharCode(charOffset + dataBuffer[lastOffset + 1]) + '.';
	s += String.fromCharCode(charOffset + dataBuffer[lastOffset + 2]);
	return s;
}


/**
 * @returns The included banks. If string gets too long '...' is returned instead.
 */
function banksValue(): string {
	let s = '';
	for (let i = 0; i < lastSize; i++) {
		const val = dataBuffer[lastOffset + i];
		if (val == 1) {
			s += i + ' ';
			if (s.length > 15)
				return '...';
		}
	}
	return s;
}


/**
 * Reads the palette and returns a number array.
 * @return an array in the from R, G, B, R, G, B, ... R, G, B
 */
function getPalette(): number[] {
	// Convert palette
	const palette = new Array<number>(3 * 256);
	for (let i = 0; i < lastSize / 2; i++) {
		// Get value
		const iOffset = lastOffset + 2 * i;	// For indexing
		const val0 = dataBuffer[iOffset];
		const val1 = dataBuffer[iOffset + 1];
		// Decode to RGB
		const red = (val0 >> 5) * 32;
		const green = ((val0 >> 2) & 0b111) * 32;
		const blue = (((val0 << 1) & 0b110) + (val1 & 0b1)) * 32;
		// Put into palette
		const k = 3 * i;
		palette[k] = red;
		palette[k + 1] = green;
		palette[k + 2] = blue;
	}
	return palette;
}


/**
 * Returns the ZX NExt default palette.
 * @return an array in the from R, G, B, R, G, B, ... R, G, B
 */
function getZxNextDefaultPalette(): number[] {
	// Create palette
	const palette = new Array<number>(3 * 256);
	for (let i = 0; i < 256; i++) {
		// Get value
		const iOffset = lastOffset + 2 * i;	// For indexing
		const val0 = dataBuffer[iOffset];
		const val1 = dataBuffer[iOffset + 1];
		// Decode to RGB
		const red = (i >> 5) * 32;
		const green = ((i >> 2) & 0b111) * 32;
		const blue = ((i << 1) & 0b110) * 32;
		// Put into palette
		const k = 3 * i;
		palette[k] = red;
		palette[k + 1] = green;
		palette[k + 2] = blue;
	}
	return palette;
}


/**
 * Creates a new palette from the given palette with the given offset.
 */
function createPaletteWithOffset(palette: number[], offset: number): number[] {
	// Create palette
	const offsPalette = new Array<number>(3 * 256);
	for (let i = 0; i < 256; i++) {
		// Get value RGB
		const red = (i >> 5) * 32;
		const green = ((i >> 2) & 0b111) * 32;
		const blue = ((i << 1) & 0b110) * 32;
		// Put into palette
		const k = 3 * i;
		const kOffs = 3 * ((i + offset) & 0xFF);
		offsPalette[kOffs] = palette[k];
		offsPalette[kOffs + 1] = palette[k + 1];
		offsPalette[kOffs + 2] = palette[k + 2];
	}
	return offsPalette;
}


/**
 * Creates a palette from dataBuffer.
 * 512 bytes are converted to 256 palette entries each in the format:
 * RRRGGGBB  P000000B
 * With P being the priority bit for Layer 2.
 */
function createPalette() {
	let html = '';

	// In case of an error, show at least what has been parsed so far.
	try {
		// Loop given size
		for (let i = 0; i < lastSize; i += 2) {
			// Get value
			const iOffset = lastOffset + i;	// For indexing
			const iRelOffset = i / 2;	// For display
			const val0 = dataBuffer[iOffset];
			const val1 = dataBuffer[iOffset + 1];
			// Decode to RGB
			const red = val0 >> 5;
			const green = (val0 >> 2) & 0b111;
			const blue = ((val0 << 1) & 0b110) + (val1 & 0b1);
			const priority = val1 >> 7;

			// Start of row
			const iOffsetHex = getHexString(iOffset, 4);
			const val = 256 * val1 + val0;
			const bitsString = convertBitsToString(val, 2);
			html += `<div class="mem_dump">
					<div class="indent mem_offset" title = "Offset\nHex: ${iOffsetHex}">${iOffset}</div>
				<div class="mem_rel_offset"> [${iRelOffset}]</div>`;

			// Hex values
			const valHex = getHexString(val, 4);
			const hoverText = 'Bin: P000_000B_RRRG_GGBB = ' + bitsString;
			html += '<div class="mem_byte" title="' + hoverText + '">0x' + valHex + ':</div>';

			// RGB values
			html += '<div class="mem_byte">R=' + red + ',</div>';
			html += '<div class="mem_byte">G=' + green + ',</div>';
			html += '<div class="mem_byte">B=' + blue + ',</div>';
			html += '<div class="mem_byte">P=' + priority + '</div>';

			// As color
			const colorHex = getHexString(red * 32, 2) + getHexString(green * 32, 2) + getHexString(blue * 32, 2)
			html += '<div class="mem_byte" style="background:#'+colorHex+'" title="#'+colorHex+'">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>';

			// Close
			html += '</div>';
		}
	}
	catch (e) {
		// Close
		html += '</div>';
		// Error while parsing
		html += '<div class="error indent">Error while parsing.</div>';
	}

	// Append
	lastNode.innerHTML += html;
}


/**
 * Creates a palette image from the dataBuffer (512 bytes).
 */
function createPaletteImage() {
	assert(lastSize == 512);
	try {
		// Image array
		const pixels = new Array<number>(256);
		for (let i = 0; i < 256; i++)
			pixels[i] = i;
		// Convert palette
		const palette = getPalette();
		// Create image. 1 pixel per palette entry.
		const gifBuffer = ImageConvert.createGifFromArray(16, 16, pixels, palette);
		const base64String = arrayBufferToBase64(gifBuffer);
		// Add to html
		const size = 256;
		let html = '<img usemap="#palette_map" width="'+size+'px" style="image-rendering:pixelated" src="data:image/gif;base64,' + base64String + '">';
		// Add image map with tooltips
		html += '<map name="palette_map">';
		const partSize = (size / 16);
		let i = 0;
		for (let y = 0; y < 16; y++) {
			for (let x = 0; x < 16; x++) {
				const k = i * 3;
				const hoverText = `Index: ${i}\nR=${palette[k]/32}\nG=${palette[k+1]/32}\nB=${palette[k+2]/32}`;
				html += '<area title="' + hoverText + '" shape="rect" coords="' + x * partSize + ',' + y * partSize + ',' + (x + 1) * partSize + ',' + (y + 1) * partSize + '">';
				i++;
			}
		}
		html += '</map>';
		lastNode.innerHTML += html;
	}
	catch {
		lastNode.innerHTML += '<div class="error">Error converting image.</div>';
	}
}

/**
 * Is called if the user opens the details of for the ULA screen.
 * Decodes the image data
 */
function createUlaScreen() {
	// Image
	try {
		// Check size
		if (lastOffset + UlaScreen.SCREEN_SIZE > dataBuffer.length)
			throw Error();
		// Convert image
		const ulaScreen = new UlaScreen(dataBuffer, lastOffset);
		const imgBuffer = ulaScreen.getUlaScreen();
		// Create gif
		const base64String = arrayBufferToBase64(imgBuffer);
		// Add to html
		lastNode.innerHTML += '<img width="500px" style="image-rendering:pixelated" src="data:image/gif;base64,' + base64String + '">';
	}
	catch {
		lastNode.innerHTML += '<div class="error">Error converting image.</div>';
	}
}


/**
 * Is called if the user opens the details of for the Layer2 screen.
 * Decodes the image data.
 */
function createLayer2Screen(palette: number[]) {
	// Image
	try {
		// Check size
		if (lastOffset + 49152 > dataBuffer.length)
			throw Error();
		// Get image data
		const pixels = dataBuffer.slice(lastOffset, lastOffset + 49152);
		// Convert image
		const gifBuffer = ImageConvert.createGifFromArray(256, 192, pixels, palette);
		const base64String = arrayBufferToBase64(gifBuffer);
		// Add to html
		lastNode.innerHTML += '<img class="load_screen" style="image-rendering:pixelated" src="data:image/gif;base64,' + base64String + '">';
	}
	catch {
		lastNode.innerHTML += '<div class="error">Error converting image.</div>';
	}
}


/**
 * Is called if the user opens the details of for the Layer2 screen
 * with 320x256 pixels.
 * Decodes the image data.
 */
function createLayer2Screen320(palette: number[]) {
	// Image
	try {
		// Check size
		if (lastOffset + 81920 > dataBuffer.length)
			throw Error();
		// Get image data. X and Y are swapped.
		const pixels = new Array<number>(81920);
		let index = lastOffset;
		for (let x = 0; x < 320; x++) {
			for (let y = 0; y < 256; y++) {
				pixels[x+y*320] = dataBuffer[index++];
			}
		}
		// Convert image
		const gifBuffer = ImageConvert.createGifFromArray(320, 256, pixels, palette);
		const base64String = arrayBufferToBase64(gifBuffer);
		// Add to html
		lastNode.innerHTML += '<img class="load_screen_layer2_320_640" style="image-rendering:pixelated" src="data:image/gif;base64,' + base64String + '">';
	}
	catch {
		lastNode.innerHTML += '<div class="error">Error converting image.</div>';
	}
}


/**
 * Is called if the user opens the details of for the Layer2 screen
 * with 640x256 pixels.
 * Decodes the image data.
 */
function createLayer2Screen640(palette: number[]) {
	// Image
	try {
		// Check size
		if (lastOffset + 81920 > dataBuffer.length)
			throw Error();
		// Get image data. X and Y are swapped.
		const pixels = new Array<number>(640 * 256);
		let index = lastOffset;
		for (let x = 0; x < 640; x += 2) {
			for (let y = 0; y < 256; y++) {
				const val = dataBuffer[index++];
				const k = x + y * 640;
				pixels[k] = val >> 4;
				pixels[k + 1] = val & 0x0F;
			}
		}
		// Convert image
		const gifBuffer = ImageConvert.createGifFromArray(640, 256, pixels, palette);
		const base64String = arrayBufferToBase64(gifBuffer);
		// Add to html
		lastNode.innerHTML += '<img class="load_screen_layer2_320_640" style="image-rendering:pixelated" src="data:image/gif;base64,' + base64String + '">';
	}
	catch {
		lastNode.innerHTML += '<div class="error">Error converting image.</div>';
	}
}


/**
 * Is called if the user opens the details of for the LoRes screen.
 * Decodes the image data
 */
function createLoResScreen(palette: number[]) {
	// Image
	try {
		// Check size
		if (lastOffset + 12288 > dataBuffer.length)
			throw Error();
		// Get image data
		const pixels = dataBuffer.slice(lastOffset, lastOffset + 12288);
		// Convert image
		const gifBuffer = ImageConvert.createGifFromArray(128, 96, pixels, palette);
		const base64String = arrayBufferToBase64(gifBuffer);
		// Add to html
		lastNode.innerHTML += '<img class="load_screen" style="image-rendering:pixelated" src="data:image/gif;base64,' + base64String + '">';
	}
	catch {
		lastNode.innerHTML += '<div class="error">Error converting image.</div>';
	}
}


/**
 * Is called if the user opens the details of for the timex HiRes 512x192
 * two color screen.
 * Decodes the image data.
 * @param inkColor the ink color. The paper color is deducted as complement color to this.
 */
function createTimexHiResScreen(inkColor: number) {
	// Complement color
	const paperColor = (~inkColor) & 0b111;
	// Image
	try {
		// Check size
		if (lastOffset + 12288 > dataBuffer.length)
			throw Error();
		// Create palette
		const palette = new Array<number>();
		palette.push(...zxHtmlColor(paperColor, true));
		palette.push(...zxHtmlColor(inkColor, true));
		// Get image data
		const buffer = dataBuffer.slice(lastOffset, lastOffset + 12288);
		// Convert every bit into a pixel
		const pixels = new Array<number>(8 * 12288);

		// One line after the other
		let pixelIndex = 0;
		let inIndex = 0;
		const buf2Offset = 12288 / 2;
		for (let y = 0; y < 192; y++) {
			// Calculate offset in ZX Spectrum screen
			inIndex = (((y & 0b111) << 8) | ((y & 0b1100_0000) << 5) | ((y & 0b11_1000) << 2));
			//inIndex=y*32
			for (let x = 0; x < 32; x++) {
				let val = buffer[inIndex];
				// Color
				for (let k = 7; k >= 0; k--) {
					pixels[pixelIndex + k] = val & 0b1;
					val >>= 1;
				}
				pixelIndex += 8;
				// Alternate buffer
				val = buffer[inIndex + buf2Offset];
				for (let k = 7; k >= 0; k--) {
					pixels[pixelIndex + k] = val & 0b1;
					val >>= 1;
				}
				pixelIndex += 8;
				// Next
				inIndex++;
			}
		}
		// Convert image
		const gifBuffer = ImageConvert.createGifFromArray(512, 192, pixels, palette);
		const base64String = arrayBufferToBase64(gifBuffer);
		// Add to html
		lastNode.innerHTML += '<img class="load_screen_hires" style="image-rendering:pixelated" src="data:image/gif;base64,' + base64String + '">';
	}
	catch {
		lastNode.innerHTML += '<div class="error">Error converting image.</div>';
	}
}


/**
 * Is called if the user opens the details of for the timex HiCol 8x1
 * screen.
 * Decodes the image data.
 * Half of the buffer is used for pixel data. The other half is attribute data.
 * I.e. each byte has an own attribute.
 */
function createTimexHiColScreen() {
	// Image
	try {
		// Check size
		if (lastOffset + 12288 > dataBuffer.length)
			throw Error();
		// Create palette
		const palette = UlaScreen.getZxPalette();
		// Get image data
		const buffer = dataBuffer.slice(lastOffset, lastOffset + 12288);
		// Convert every bit into a pixel
		const pixels = new Array<number>(8 * 12288);

		// One line after the other
		let pixelIndex = 0;
		let inIndex = 0;
		const attrOffset = 12288 / 2;
		for (let y = 0; y < 192; y++) {
			// Calculate offset in ZX Spectrum screen
			inIndex = (((y & 0b111) << 8) | ((y & 0b1100_0000) << 5) | ((y & 0b11_1000) << 2));
			//inIndex=y*32
			for (let x = 0; x < 32; x++) {
				// Get pixel value
				let val = buffer[inIndex];
				// Get color
				let color = buffer[inIndex+attrOffset];
				let mask = 0x80;
				while (mask) {	// 8x
					const value = val & mask;
					// Check if pixel is set
					let cIndex = (color & 0x40) >>> 3;	// Brightness
					if (value) {
						// Set: foreround
						cIndex |= color & 0x07;
					}
					else {
						// Unset: background
						cIndex |= (color >>> 3) & 0x07;
					}

					// Save color index
					pixels[pixelIndex] = cIndex;

					// Next pixel
					mask >>>= 1;
					pixelIndex++;
				}
				// Next
				inIndex++;
			}
		}
		// Convert image
		const gifBuffer = ImageConvert.createGifFromArray(256, 192, pixels, palette);
		const base64String = arrayBufferToBase64(gifBuffer);
		// Add to html
		lastNode.innerHTML += '<img class="load_screen" style="image-rendering:pixelated" src="data:image/gif;base64,' + base64String + '">';
	}
	catch {
		lastNode.innerHTML += '<div class="error">Error converting image.</div>';
	}
}



/**
 * Is called if the user opens the details for the copper code.
 * Decodes the data.
 * @param displayOffset The displayOffset is added to the index before displaying.
 * @param hoverRelativeOffset You can replace the default relative Offset hover text.
 */
function createCopperDump() {
	let html = '';

	// In case of an error, show at least what has been parsed so far.
	try {
		const hoverRelativeOffset = 'Relative Offset'
		// Find last non NOOP command.

		// Loop given size
		for (let i = 0; i < lastSize; i += 2) {
			// Get value
			const iOffset = lastOffset + i;	// For indexing
			const iRelOffset = i / 2;	// For display
			const val = 256*dataBuffer[iOffset] + dataBuffer[iOffset + 1];
			const valString = convertBitsToString(val, 2);
			const iRelOffsetHex = getHexString(iRelOffset, 4);

			// Search for more NOOPs
			if (val == 0) {
				// NOOP
				let k = i + 2;
				for (; k < lastSize; k++) {
					if (dataBuffer[lastOffset + k] != 0)
						break;
				}
				const count = ((k - i) >>> 1) - 1;
				if (count > 0) {
					// At least 1 additional
					const iOffsetHex = getHexString(iOffset, 4);
					const kOffset = lastOffset + i + 2 * count;
					const kOffsetHex = getHexString(kOffset, 4);
					const kRelOffset = i + 2 * count;
					const kRelOffsetHex = getHexString(kRelOffset, 4);
					html += `<div class="mem_dump">
				<div class="indent mem_offset" title = "Offset\nHex: ${iOffsetHex}-${kOffsetHex}">${iOffset}-${kOffset}</div>
			<div class="mem_rel_offset" title="${hoverRelativeOffset}\nHex: ${iRelOffsetHex}-${kRelOffsetHex}">[${iRelOffset}...${kRelOffset}]:</div>`;
					html += '<div class="mem_byte">' + valString + '</div>';
					html += '<div class="copper_cmd">&nbsp;= All NOOP</div>';
					// Next
					i += 2 * count;
					continue;
				}
			}

			// Show offset
			const iOffsetHex = getHexString(iOffset, 4);
			html += `<div class="mem_dump">
				<div class="indent mem_offset" title = "Offset\nHex: ${iOffsetHex}">${iOffset}</div>
			<div class="mem_rel_offset" title="${hoverRelativeOffset}\nHex: ${iRelOffsetHex}">[${iRelOffset}]:</div>
			`;

			// Value
			html += '<div class="mem_byte">' + valString + '</div>';

			// Decoded value
			let cmd;
			if (val == 0) {
				// NOOP
				cmd = 'NOOP';
			}
			else if (val == 0xFFFF) {
				// HALT
				cmd = 'HALT';
			}
			else if (val & 0x8000) {
				// WAIT
				const v = val & 0x1FF;
				const h = (val >>> 9) & 0b111111;
				cmd = `WAIT v==${v} (0x${getHexString(v,2)}) AND h==${h} (0x${getHexString(h,2)})`;
			}
			else {
				// MOVE
				const v = val & 0xFF;
				const r = (val >>> 8) & 0b1111111;
				cmd = `MOVE ${v} (0x${getHexString(v, 2)}) TO REG ${r} (0x${getHexString(r, 2)})`;
			}
			html += '<div class="copper_cmd">&nbsp;= ' + cmd + '</div>';

			// Close
			html += '</div>';
		}
	}
	catch (e) {
		// Close
		html += '</div>';
		// Error while parsing
		html += '<div class="error indent">Error while parsing.</div>';
	}

	// Append
	lastNode.innerHTML += html;
}


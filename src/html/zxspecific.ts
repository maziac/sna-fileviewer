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

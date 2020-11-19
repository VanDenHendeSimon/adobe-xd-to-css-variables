var assets = require("assets");
var { alert } = require("./lib/dialogs.js");
const fs = require("uxp").storage.localFileSystem;

function adobeColorToHex(adobeColor) {
    // 978639103 => 0x3A54D8FF (AARRGGBB)
    const hex = adobeColor.color.value.toString(16);

    // Put alpha channel on the end (RRGGBBAA)
    const alpha = hex.slice(0, 2);
    const rgb = hex.slice(2, 8);

    return rgb + alpha;
}

function hexTo8Bit(hex) {
    return parseInt(hex, 16);
}

function hextoHSL(hex) {
    // Convert hex to rgb
    let r = hexTo8Bit(hex.slice(0, 2)) / 255,
        g = hexTo8Bit(hex.slice(2, 4)) / 255,
        b = hexTo8Bit(hex.slice(4, 6)) / 255;

    let cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin,
        h = 0,
        s = 0,
        l = 0;

    if (delta == 0) h = 0;
    else if (cmax == r) h = ((g - b) / delta) % 6;
    else if (cmax == g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return {
        hue: h,
        sat: s,
        lightness: l,
    };
}

function isGreyish(colorObject) {
    if (colorObject.sat < 25) {
        return true;
    } else if (colorObject.sat >= 25 && colorObject.sat < 40) {
        if (colorObject.lightness < 10 || colorObject.lightness > 90) {
            return true;
        }
    }

    return false;
}

function xForeachNumber(number) {
    let returnString = "";
    for (let i = 0; i < number; i++) {
        returnString += "x";
    }

    return returnString;
}

function exportColors() {
    const allColors = assets.colors.get();
    let colors = [],
        neutralColors = [];

    for (const color of allColors) {
        const hexCSSFormat = adobeColorToHex(color);
        const HSL = hextoHSL(hexCSSFormat);
        const colorObject = {
            hue: HSL.hue,
            lightness: HSL.lightness,
            sat: HSL.sat,
            hex: `#${hexCSSFormat}`,
        };

        // Mark color as either grey or colorful
        if (isGreyish(colorObject)) {
            neutralColors.push(colorObject);
        } else {
            colors.push(colorObject);
        }
    }

    // Sort grey colors based on lightness ( light to dark )
    neutralColors.sort(function (a, b) {
        return b.lightness - a.lightness;
    });

    // Construct css string
    let cssString = "";
    if (colors.length > 0) {
        cssString = "\t/* Colors */\n";
        for (const colorIndex in colors) {
            cssString += `\t--color-${parseInt(colorIndex) + 1}: ${colors[colorIndex].hex};\n`;
        }
        cssString += "\n";
    }

    if (neutralColors.length > 0) {
        const neutralCenter = parseInt(neutralColors.length / 2);
        for (const neutralColorIndex in neutralColors) {
            let suffix = "";
            if (neutralColorIndex != neutralCenter) {
                const distanceFromCenter = Math.abs(neutralColorIndex - neutralCenter) - 1;
                if (distanceFromCenter === 0) {
                    suffix = neutralColorIndex < neutralCenter ? "-light" : "-dark";
                } else {
                    suffix = neutralColorIndex < neutralCenter ? `-${xForeachNumber(distanceFromCenter)}-light` : `-${xForeachNumber(distanceFromCenter)}-dark`;
                }
            }

            cssString += `\t--color-neutral${suffix}: ${neutralColors[neutralColorIndex].hex};\n`;
        }
    }

    return cssString;
}

function exportFonts() {
    const allCharacterStyles = assets.characterStyles.get();

    if (allCharacterStyles.length > 0) {
        let fontFamilies = [],
            fontStyles = [],
            cssString = "\n\t/* Fonts */\n";

        for (const characterStyle of allCharacterStyles) {
            const fontFamily = characterStyle.style.fontFamily;
            const fontStyle = characterStyle.style.fontStyle;
            if (!fontFamilies.includes(fontFamily)) {
                fontFamilies.push(fontFamily);
            }
            if (!fontStyles.includes(fontStyle)) {
                fontStyles.push(fontStyle);
            }
        }

        for (const fontFamilyIndex in fontFamilies) {
            cssString += `\t--font-family-${parseInt(fontFamilyIndex) + 1}: "${fontFamilies[fontFamilyIndex]}";\n`;
        }

        for (const fontStyleIndex in fontStyles) {
            cssString += `\t--font-style-${parseInt(fontStyleIndex) + 1}: "${fontStyles[fontStyleIndex]}";\n`;
        }

        return cssString;
    }

    return "";
}

async function writeToDisk(content) {
    const folder = await fs.getFolder();
    const newFile = await folder.createFile("global-styles.css", { overwrite: true });

    newFile.write(content);
    // prettier-ignore
    await alert("Export done", `${content}\n${folder.nativePath + escape("\global-styles.css")}`);

    // Cant open a file explorer window / the actual .css file so this is the best I can do for now
}

function exportAssets(selection) {
    let exportString = exportColors();
    exportString += exportFonts();

    writeToDisk(`:root {\n${exportString}}\n`);
}

module.exports = {
    commands: {
        exportGlobalStyles: exportAssets,
    },
};


import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ASSETS_DIR = 'assets';
const SOURCE_Logo = 'client/public/fovicon.jpg';

async function generate() {
    if (!fs.existsSync(ASSETS_DIR)) {
        fs.mkdirSync(ASSETS_DIR);
    }

    console.log('Generating assets from', SOURCE_Logo);

    // Generate logo.png (1024x1024)
    await sharp(SOURCE_Logo)
        .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .toFile(path.join(ASSETS_DIR, 'logo.png'));
    console.log('Generated assets/logo.png');

    // Generate splash.png (2732x2732)
    await sharp(SOURCE_Logo)
        .resize(2732, 2732, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .toFile(path.join(ASSETS_DIR, 'splash.png'));
    console.log('Generated assets/splash.png');

    // Generate dark mode versions (same for now)
    fs.copyFileSync(path.join(ASSETS_DIR, 'logo.png'), path.join(ASSETS_DIR, 'logo-dark.png'));
    fs.copyFileSync(path.join(ASSETS_DIR, 'splash.png'), path.join(ASSETS_DIR, 'splash-dark.png'));
    console.log('Generated dark mode assets');
}

generate().catch(console.error);

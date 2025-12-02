import fs from 'fs';
import path from 'path';
import stripComments from 'strip-comments';

const baseDir = './docs';

function removeComments(content, ext) {
    if (ext === '.html') {
        return content.replace(/<!--[\s\S]*?-->/g, '');
    } else if (ext === '.css') {
        return stripComments(content, { language: 'css', preserveNewlines: true });
    } else if (ext === '.js') {
        return stripComments(content, { language: 'js', preserveNewlines: true });
    }
    return content;
}

function processDir(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && item.name !== 'node_modules' && item.name !== 'img' && item.name !== 'artigos' && item.name !== 'fonts' && item.name !== 'sounds' && item.name !== 'models') {
            processDir(fullPath);
        } else if (item.isFile()) {
            const ext = path.extname(fullPath).toLowerCase();
            if (ext === '.html' || ext === '.css' || ext === '.js') {
                console.log(`Processing ${fullPath}`);
                const content = fs.readFileSync(fullPath, 'utf8');
                const newContent = removeComments(content, ext);
                fs.writeFileSync(fullPath, newContent, 'utf8');
            }
        }
    }
}

processDir(baseDir);
console.log('All comments removed.');

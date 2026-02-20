
const fs = require('fs');
const path = require('path');

try {
    const aiReactPath = require.resolve('@ai-sdk/react/package.json');
    console.log('Resolved @ai-sdk/react package.json:', aiReactPath);
    const aiReactPkg = require(aiReactPath);
    console.log('@ai-sdk/react version:', aiReactPkg.version);

    // Check dist folder to see exports
    const distPath = path.dirname(aiReactPath);
    console.log('Dist path:', distPath);

    const files = fs.readdirSync(distPath);
    console.log('Files in dist:', files);

} catch (e) {
    console.error('Error resolving @ai-sdk/react:', e);
}

try {
    const aiPath = require.resolve('ai/package.json');
    console.log('Resolved ai package.json:', aiPath);
    const aiPkg = require(aiPath);
    console.log('ai version:', aiPkg.version);
} catch (e) {
    console.error('Error resolving ai:', e);
}

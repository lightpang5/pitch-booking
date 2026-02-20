const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env.local to get the API key
const envPath = path.join(__dirname, '.env.local');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envContent, 'utf8');
    const match = envContent.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.+)/);
    if (match) {
        apiKey = match[1].trim();
    }
} catch (e) {
    // If file not found or read error, try to read from process env (which might be set in terminal, but likely we need to parse file)
    // For this environment, we will rely on reading the file as we can't easily pass it.
    // Actually, I'll hardcode the reading logic to be robust.
}

if (!apiKey) {
    // fast path: try to find it in the current directory directly
    try {
        const content = fs.readFileSync('.env.local', 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.startsWith('GOOGLE_GENERATIVE_AI_API_KEY=')) {
                apiKey = line.split('=')[1].trim();
                break;
            }
        }
    } catch (e) {
        console.error("Could not read .env.local");
        process.exit(1);
    }
}

if (!apiKey) {
    console.error("API Key not found in .env.local");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                const response = JSON.parse(data);
                console.log("Available Models:");
                response.models.forEach(model => {
                    if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes("generateContent")) {
                        console.log(`- ${model.name} (DisplayName: ${model.displayName})`);
                    }
                });
            } catch (e) {
                console.error("Error parsing JSON:", e);
            }
        } else {
            console.error(`Error: Status Code ${res.statusCode}`);
            console.error(data);
        }
    });

}).on('error', (err) => {
    console.error("Error making request:", err);
});

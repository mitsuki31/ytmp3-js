/**
 * YouTube to MP3 downloader in JavaScript.
 *
 * @author Ryuu Mitsuki
 * @since  0.1.0
 */

const fs = require('fs'),           // File system module
      os = require('os'),           // OS module
      path = require('path'),       // Path module
      ytdl = require('ytdl-core');  // Youtube Downloader module


function normalizeYtMusicUrl(url) {
    if (!url || typeof url !== 'string') 
        throw new Error(
            `Invalid YouTube Music URL: ${url}`);
    
    // Test that the given URL is valid
    if (typeof url === 'string') url = (new URL(url)).href;
    else if (url instanceof URL) url = url.href;  // Extract the link
    
    // Replace 'music' string between URL and replace it
    // to make the URL refers to original YouTube.
    if (/^http(s?)?:\/\/music?.+\/watch\?v=.+/.test(url)) {
        url = url.replace('music.', 'www.');
    }
    
    // Trim to the right if the URL has '&si=' (YT Music only)
    if (/^http(s?)?:\/\/.+\?v=.+&[si]+=?/) {
        url = url.replace(/&si=.+/, '');
    }
    
    return url;
}

(async function (inputFile) {
    const urlsFile = path.resolve(inputFile);
    console.log('File:', urlsFile);
    
    await fs.readFile(urlsFile, 'utf8', (err, contents) => {
        if (err) throw err;
        if (contents === '') throw new Error('File is empty, no URL found');
        
        const urls = contents.toString().split(os.EOL)  // Stringify and then split
                             .map((url) => normalizeYtMusicUrl(url))
                             .slice(0, 15);
        //console.log(urls);  // DEBUG: Log the URLs to console output
        
        urls.forEach(async (url) => {
            // Validate all URLs
            ytdl.validateURL(url);
            
            console.log(`Retrieving... '${ytdl.getVideoID(url)}'`);
            // Retrieve the video info
            const info = await ytdl.getInfo(url);
            const authorVideo = info.videoDetails.author.name
                                    .replace(/\s-\s.+/, ''),
                  titleVideo = info.videoDetails.title;
            
            // Filter the audio and create new audio format
            const format = ytdl.chooseFormat(info.formats, {
                quality: '140',      // This itag refers to 'mp4a' codec
                filter: 'audioonly'  // Filter audio only
            });
            
            // The file name format
            const filename = path.join('download',
                `${authorVideo} - ${titleVideo}.m4a`);
            const outStream = fs.createWriteStream(filename);
            
            console.log(`Processing... '${titleVideo}' (${ytdl.getVideoID(url)})`);
            // Start downloading the audio and save to file
            ytdl.downloadFromInfo(info, { format: format })
                .pipe(outStream);
            outStream.on('finish', () => {
                console.log(`Finished: '${filename}' [${Date.now()}]`);
            });
        });
    });
})((function () {
    // Get the command line arguments
    const args = process.argv.slice(2);
    if (args.length === 0) throw new Error('No input file specified');
    return args[0];  // Return the first argument
})()).catch((err) => console.error(err));

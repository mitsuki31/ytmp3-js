/**
 * YouTube to MP3 downloader in JavaScript.
 *
 * @author Ryuu Mitsuki
 * @since  0.1.0
 */

'use strict';

const fs = require('fs'),           // File system module
      os = require('os'),           // OS module
      path = require('path'),       // Path module
      ytdl = require('ytdl-core');  // Youtube Downloader module

const { convertToMp3 } = require('./lib/acodecs-cvt');

/**
 * Normalizes a YouTube Music URL to its original YouTube format.
 *
 * This function takes a YouTube Music URL, validates it, and
 * converts it to the original YouTube format if applicable.
 *
 * @param   {string | URL} url - The YouTube Music URL to be normalized.
 * @returns {string} The normalized YouTube URL.
 * @throws  {Error} Throws an error if the input URL is invalid or
 *                  neither of a string nor an instance of URL.
 *
 * @example
 * const ytMusicUrl = 'https://music.youtube.com/watch?v=exampleVideoId&si=someValue';
 * const normalizedUrl = normalizeYtMusicUrl(ytMusicUrl);
 * // normalizedUrl is now 'https://www.youtube.com/watch?v=exampleVideoId'
 *
 * @public
 * @author  Ryuu Mitsuki
 * @since   0.1.0
 */
function normalizeYtMusicUrl(url) {
    if (!url || (typeof url !== 'string' || url instanceof URL)) {
        throw new Error(`Invalid YouTube Music URL: ${url}`);
    }
    
    // Regular expression pattern of YouTube Music URL
    const ytMusicUrlPattern = /^http(s?)?:\/\/music?.+\/watch\?v=.+/;
    
    // Test that the given URL is valid
    if (typeof url === 'string') url = (new URL(url)).href;
    else if (url instanceof URL) url = url.href;  // Extract the link
    
    // Replace 'music' string between URL and replace it
    // to make the URL refers to original YouTube.
    if (ytMusicUrlPattern.test(url)) {
        url = url.replace('music.', 'www.');
    }
    
    // Trim to the right if the URL has '&si=' (YT Music only)
    if (/^http(s?)?:\/\/.+\?v=.+&si=?/) {
        url = url.replace(/&si=.+/, '');
    }
    
    return url;
}

(async function (inputFile) {
    const urlsFile = path.resolve(inputFile);
    console.log('File:', urlsFile);
    
    // All illegal characters for file names
    const illegalCharRegex = /[<>:"\/\\|?*\x00-\x1F]/g;
    
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
                  titleVideo = info.videoDetails.title.replace(illegalCharRegex, '_');
            
            // Filter the audio and create new audio format
            const format = ytdl.chooseFormat(info.formats, {
                quality: '140',      // This itag refers to 'mp4a' codec
                filter: 'audioonly'  // Filter audio only
            });
            
            const filename = path.join('download', `${titleVideo}.m4a`);
            const outStream = fs.createWriteStream(filename);
            
            console.log(`Processing... '${titleVideo}' (${ytdl.getVideoID(url)})`);
            // Start downloading the audio and save to file
            await ytdl.downloadFromInfo(info, { format: format })
                .pipe(outStream);
            outStream.on('finish', () => {
                console.log(`Finished: '${path.basename(filename)}' [${
                    (new Date()).toISOString()}]`);
                
                // Convert to MP3
                convertToMp3(filename);
            });
        });
    });
})((function () {
    // Get the command line arguments
    const args = process.argv.slice(2);
    if (args.length === 0) throw new Error('No input file specified');
    return args[0];  // Return the first argument
})()).catch((err) => console.error(err));

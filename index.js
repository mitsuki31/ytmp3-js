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

function getVideosInfo(...urls) {
    return new Promise(async (resolve, reject) => {
        let videosInfo = [];
        
        try {
            await Promise.all(urls.map(async (url) => {
                ytdl.validateURL(url);               // Validate the URL
                videosInfo.push(await ytdl.getInfo(url));  // Get the video info
            }));
        } catch (error) {
            reject(error);
        }
        // Return the list representing the videos information
        resolve(videosInfo);
    });
}

function createDownloadProgress(chunk, bytesDownloaded, totalBytes) {
    const percentage = Math.max(0, Math.floor(bytesDownloaded / totalBytes * 100));
    process.stdout.write(`[INFO] Download progress: ${percentage}%\r`);
}

function argumentParser(args) {
    let inFile;
    if (args.length === 0) {
        // If no argument specified, then search for 'downloads.txt' file
        if (fs.existsSync(path.resolve('downloads.txt'))) {
            inFile = 'downloads.txt';
            console.log("'downloads.txt' are found.");
        } else {
            console.error(
                new Error(`[ERROR] No argument specified and 'downloads.txt' not exist`)
            );
            console.error('[ERROR] ytmp3 exited with code 1');
            process.exit(1);
        }
    } else {
        inFile = args[0];  // Get first argument
    }
    return inFile;
}


(function (inputFile) {
    const urlsFile = path.resolve(inputFile);
    console.log(`Input File: ${path.basename(urlsFile)}`);
    
    // All illegal characters for file names
    const illegalCharRegex = /[<>:"\/\\|?*\x00-\x1F]/g;
    
    fs.promises.readFile(urlsFile, 'utf8')
        .then((contents) => {
            if (contents.toString() === '') throw new Error('File is empty, no URL found');
            
            const urls = contents.toString().split(os.EOL)  // Stringify and then split
                                 .map((url) => normalizeYtMusicUrl(url))
                                 .slice(0, 15);
            
            return new Promise((resolve, reject) => {
                let downloadFiles = [];  // Store all downloaded files
                getVideosInfo(...urls)
                    .then((data) => {
                        const parsedData = [];
                        for (const videoInfo of data) {
                            // Append the parsed data
                            parsedData.push({
                                videoInfo,
                                format: ytdl.chooseFormat(videoInfo.formats, {
                                    quality: 140,
                                    filter: 'audioonly'
                                }),
                                title: videoInfo.videoDetails.title.replace(illegalCharRegex, '_'),
                                author: videoInfo.videoDetails.author.name,
                                videoUrl: videoInfo.videoDetails.video_url,
                                videoId: videoInfo.videoDetails.videoId,
                                viewers: videoInfo.videoDetails.viewCount
                            });
                        }
                        
                        return parsedData;
                    })
                    .then(async (parsedData) => {
                        // Store path to the error logs during downloading
                        const dlErrorLog = path.resolve(
                            __dirname, 'tmp', `dlError-${
                                (new Date()).toISOString().split('.')[0]}.log`);
                        parsedData.forEach((data) => {
                            // Extract necessary members
                            const { format, videoInfo } = data;
                            
                            // Create output path and the write stream
                            const outFile = path.join('download', `${data.title}.m4a`),
                                  outFileBase = path.basename(outFile),
                                  outStream = fs.createWriteStream(outFile, { autoClose: true });
                            
                            // Create the output directory asynchronously, if not exist
                            if (!fs.existsSync(path.dirname(outFile))) {
                                fs.mkdirSync(path.dirname(outFile), { recursive: true });
                            }
                            
                            console.log(`[INFO] Downloading '${data.title}'...`);
                            console.log('     ', {
                                author: data.author,
                                viewers: parseInt(data.viewers, 10).toLocaleString('en')
                            });
                            ytdl.downloadFromInfo(videoInfo, { format: format })
                                .on('progress', createDownloadProgress)
                                .on('end', () => {
                                    console.log(`[DONE] Download finished: ${outFileBase}`);
                                })
                                .on('error', (err) => {
                                    console.error(`[ERROR] Download error: ${outFileBase}`);
                                    if (!fs.existsSync(path.dirname(dlErrorLog))) {
                                        fs.mkdirSync(path.dirname(dlErrorLog, { recursive: true }));
                                    }
                                    const dlErrorLogStream = fs.createWriteStream(
                                        dlErrorLog, { flags: 'a+', flush: true }
                                    );
                                    
                                    dlErrorLogStream.write(`[ERROR] ${err.message}${os.EOL}`);
                                    dlErrorLogStream.write(`   Title: ${data.title}${os.EOL}`);
                                    dlErrorLogStream.write(`   Author: ${data.author}${os.EOL}`);
                                    dlErrorLogStream.write(`   URL: ${data.videoUrl}${os.EOL}`);
                                    reject(err);
                                })
                                .pipe(outStream);
                            
                            outStream
                                .on('finish', () => {
                                    console.log(`\n[DONE] Written successfully.\n`);
                                    downloadFiles.push(outFile);
                                    
                                    // Return all downloaded audio files
                                    if (downloadFiles.length === urls.length) resolve(downloadFiles);
                                })
                                .on('error', (err) => {
                                    console.error(`[ERROR] Unable to write to output file: ${outFile}\n`);
                                    reject(err);
                                });
                        });
                    })
                    .catch((err) => reject(err));
            });
        })
        .then((data) => {
            console.log('Downloaded:', data, '\n');
            // Convert the audio file to MP3 after download process finished
            data.forEach((file) => convertToMp3(file));
        })
        .catch((err) => {
            console.error(err);
        });
})(argumentParser(process.argv.slice(2)));

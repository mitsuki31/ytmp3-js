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
    if (/^http(s?)?:\/\/.+\?v=.+&si=?/.test(url)) {
        url = url.replace(/&si=.+/, '');
    }
    
    return url;
}

function getVideosInfo(...urls) {
    const promises = urls.map((url) => {
        try {
            ytdl.validateURL(url);     // Validate the URL
            return ytdl.getInfo(url);  // Return the promise for video info retrieval
        } catch (error) {
            // Reject the promise if validation or video info retrieval fails
            return Promise.reject(error);
        }
    });

    return Promise.all(promises)
        .then((videosInfo) => videosInfo)
        .catch((error) => Promise.reject(error));
}

function createDownloadProgress(chunk, bytesDownloaded, totalBytes) {
    const percentage = Math.max(0,
        Math.floor(bytesDownloaded / totalBytes * 100));
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
                new Error('[ERROR] No argument specified and \'downloads.txt\' not exist')
            );
            console.error('[ERROR] ytmp3 exited with code 1');
            process.exit(1);
        }
    } else {
        inFile = args[0];  // Get first argument
    }
    return inFile;
}


function singleDownload(inputUrl) {
    console.log(`[INFO] Input URL: ${inputUrl}`);
    
    const illegalCharRegex = /[<>:"/\\|?*]/g;
    
    // Validate the given URL
    ytdl.validateURL(normalizeYtMusicUrl(inputUrl));
    const videosDataPromise = getVideosInfo(inputUrl)
        .then((data) => {
            const videoInfo = data[0];
            return {
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
            };
        });
    
    videosDataPromise.then((parsedData) => {
        // Create output path and the write stream
        const outFile = path.join('download', `${parsedData.title}.m4a`),
              outFileBase = path.basename(outFile),
              outStream = fs.createWriteStream(outFile);
        
        const dlErrorLog = path.resolve(
            __dirname, 'tmp', `dlError-${(new Date()).toISOString().split('.')[0]}.log`
        );
        
        // Create the output directory asynchronously, if not exist
        if (!fs.existsSync(path.dirname(outFile))) {
            fs.mkdirSync(path.dirname(outFile), { recursive: true });
        }
        
        console.log(`[INFO] Downloading '${parsedData.title}'...`);
        console.log({
            author: parsedData.author,
            videoUrl: parsedData.videoUrl,
            viewers: parseInt(parsedData.viewers, 10).toLocaleString('en')
        });
        ytdl.downloadFromInfo(parsedData.videoInfo, {
            format: parsedData.format
        })
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
                
                dlErrorLogStream.write(
                    `[ERROR] ${err.message}${os.EOL}`);
                dlErrorLogStream.write(
                    `   Title: ${parsedData.title}${os.EOL}`);
                dlErrorLogStream.write(
                    `   Author: ${parsedData.author}${os.EOL}`);
                dlErrorLogStream.write(
                    `   URL: ${parsedData.videoUrl}${os.EOL}`);
                console.error(err);
            })
            .pipe(outStream);
        
        outStream
            .on('finish', () => {
                console.log('[DONE] Written successfully.\n');
                convertToMp3(outFile);  // Convert to MP3
            })
            .on('error', (err) => {
                console.error(
                    `[ERROR] Unable to write to output file: ${outFile}\n`);
                console.error(err);
                process.exit(1);
            });
    })
        .catch((err) => console.error(err));
}

function batchDownload(inputFile) {
    const urlsFile = path.resolve(inputFile);
    console.log(`[INFO] Input File: ${path.basename(urlsFile)}`);
    
    // All illegal characters for file names
    const illegalCharRegex = /[<>:"/\\|?*]/g;
    
    fs.promises.readFile(urlsFile, 'utf8')
        .then((contents) => {
            if (contents.toString() === '') throw new Error('File is empty, no URL found');
            
            /*
             * To prevent potential timeout errors during video information retrieval or audio file downloads,
             * we limit batch downloads to 15 URLs. This limitation is designed to accommodate users with 
             * lower connection speeds.
             *
             * To download additional audio files beyond the first 15, users should manually remove 
             * the successfully downloaded URLs from the list.
             */
            contents = contents.toString().split(os.EOL);
            if (contents.length > 15) {
                console.warn('[WARNING] Maximum batch download cannot exceed than 15 URLs!');
            }
            const urls = contents.map((url) => normalizeYtMusicUrl(url))
                .slice(0, 15);  // Maximum batch: 15 URLs
            
            return new Promise((resolve, reject) => {
                const downloadFiles = [];  // Store all downloaded files
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
                                title: videoInfo.videoDetails.title.replace(
                                    illegalCharRegex, '_'),
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
                                  outStream = fs.createWriteStream(outFile);
                            
                            // Create the output directory asynchronously, if not exist
                            if (!fs.existsSync(path.dirname(outFile))) {
                                fs.mkdirSync(path.dirname(outFile), {
                                    recursive: true
                                });
                            }
                            
                            console.log(`[INFO] Downloading '${data.title}'...`);
                            console.log({
                                author: data.author,
                                videoUrl: data.videoUrl,
                                viewers: parseInt(data.viewers, 10).toLocaleString('en')
                            });
                            ytdl.downloadFromInfo(videoInfo, { format: format })
                                .on('progress', createDownloadProgress)
                                .on('end', () => {
                                    console.log(
                                        `[DONE] Download finished: ${outFileBase}`);
                                })
                                .on('error', (err) => {
                                    console.error(
                                        `[ERROR] Download error: ${outFileBase}`);
                                    if (!fs.existsSync(path.dirname(dlErrorLog))) {
                                        fs.mkdirSync(path.dirname(dlErrorLog, {
                                            recursive: true
                                        }));
                                    }
                                    const dlErrorLogStream = fs.createWriteStream(
                                        dlErrorLog, { flags: 'a+', flush: true }
                                    );
                                    
                                    dlErrorLogStream.write(
                                        `[ERROR] ${err.message}${os.EOL}`);
                                    dlErrorLogStream.write(
                                        `   Title: ${data.title}${os.EOL}`);
                                    dlErrorLogStream.write(
                                        `   Author: ${data.author}${os.EOL}`);
                                    dlErrorLogStream.write(
                                        `   URL: ${data.videoUrl}${os.EOL}`);
                                    reject(err);
                                })
                                .pipe(outStream);
                            
                            outStream
                                .on('finish', () => {
                                    console.log('[DONE] Written successfully.\n');
                                    downloadFiles.push(outFile);
                                    
                                    // Return all downloaded audio files
                                    if (downloadFiles.length === urls.length) {
                                        resolve(downloadFiles);
                                    }
                                })
                                .on('error', (err) => {
                                    console.error(
                                        `[ERROR] Unable to write to output file: ${
                                            outFile}\n`);
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
}

if (require.main === module) {
    let input = argumentParser(process.argv.slice(2));
    try {
        // This will throw URIError if the input URL are invalid
        input = (new URL(input)).href;  // Simple URL validation
        console.log('[INFO] URL input detected!');
        singleDownload(input);
    } catch (error) {
        batchDownload(input);
    }
}

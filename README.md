# YTMP3

> **Important**  
> Please note, that this project is not stable and will not be updated frequently
> in the future. This project is not intended to be used in production scenarios
> (e.g., published on the `npm` repository).

**YTMP3** is a small project aimed at downloading audio from YouTube videos. It provides a simple command-line interface to convert either a single URL from input argument or bunch of YouTube URLs from a file into audio files (i.e., batch download).
All downloaded audio files are saved in `download` directory, relative from project's root directory and all downloaded audio files converted into MP3 codec automatically.

## ⛔ Limitations

The download queries should not exceed 15 queries (URLs) at the same process. If the URLs in given file exceed than 15, remaining URLs after first 15 will not included.
We were still working with this limitation and want to make it more reliable to process more than 15 queries without misbehaves.

A further limitation is that the progression percentages seem inaccurate and stacked over other progress while downloading a batch.
For a single download, the progress percentages acts fine without stacking (since there is only one thread).

## Usage

### Install Requirements Dependencies

    npm install

### Download

    node index.js <URL | FILE>

> **Note**  
> Make sure the input file is not empty and only contains YouTube URLs (including YouTube Music URLs).
> Also, ensure that the file does not end with a new line character at the end of the file (EOF),
> as this could lead to errors during URL parsing.

Example of input file:

```
https://m.youtube.com/watch?v=<VIDEO_ID>
https://youtu.be/<VIDEO_ID>
https://www.youtube.com/watch?v=<VIDEO_ID>
https://music.youtube.com/watch?v=<VIDEO_ID>
```

In example above, each URL has a different pattern:

- `https://m.youtube.com`  
  This YouTube URL is commonly found in the YouTube mobile app. The `m` before youtube is an abbreviation of **mobile**.

- `https://youtu.be`  
  Same as above, it's commonly found in the YouTube mobile app, but the new one.

- `https://www.youtube.com`  
  This YouTube URL is globally used to determine YouTube URLs and supports both mobile and desktop platforms. The `www` itself is an abbreviation of **World Wide Web**.

- `https://music.youtube.com`  
  This YouTube URL is identified as a YouTube Music URL.

## Acknowledgements

This project utilizes the following libraries and APIs:

- [ytdl-core] - A JavaScript library for downloading YouTube videos.
- [fluent-ffmpeg] - A library that fluents `ffmpeg` command-line usage, easy to use Node.js module.
> **Note**  
> Because this project uses `fluent-ffmpeg` dependency, make sure that you have [`ffmpeg`](https://ffmpeg.org) installed on your system.
> This also including all necessary encoding libraries like `libmp3lame` for MP3 codec conversion.

Special thanks to the authors and contributors of these libraries for their valuable work.

## License
This project is licensed under MIT License. For more details, see [LICENSE](https://github.com/mitsuki31/ytmp3-js/blob/master/LICENSE) file.


[ytdl-core]: https://www.npmjs.com/package/ytdl-core
[fluent-ffmpeg]: https://www.npmjs.com/package/fluent-ffmpeg

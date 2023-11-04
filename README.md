# YTMP3

> **Important**  
> Please note, that this project is not stable and will not be updated frequently
> in the future. This project is not intended to be used in production scenarios
> (e.g., published on the `npm` repository).

**YTMP3** is a small project aimed at downloading audio from YouTube videos.
It provides a simple command-line interface to convert a bunch of YouTube URLs from a file into audio files.
All downloaded audio files are saved in `download` directory, relative from project's root directory.

## ⛔ Limitations

One of the limitations of this project is that it downloads audio files in M4A format
instead of the desired MP3 codec. And the other limitations is the download queries should not
exceed 15 queries (URLs) at the same process. Additionally, it is not stable and might have issues during usage.

### How can I get the audio with MP3 codec?

To get the desired audio codec we need some third-party software like `ffmpeg`.
Here's an example how to convert audio of M4A codec to MP3 codec using `ffmpeg`.

```bash
ffmpeg -i 'Artist Name - Song Title.m4a' 'Artist Name - Song Title.mp3'
```

For more details, see `man ffmpeg` or refer to [FFmpeg Homepage](https://www.ffmpeg.org/).

## Usage

```bash
node index.js <input-file>
```

> **Note**  
> Make sure the input file is not empty and only contains YouTube URLs.
> Also, ensure that the file does not end with a new line character at the end of the file (EOF),
> as this could lead to errors during URL parsing.

Example of input file:

```
https://m.youtube.com/watch?v=<VIDEO_ID>
https://www.youtube.com/watch?v=<VIDEO_ID>
https://music.youtube.com/watch?v=<VIDEO_ID>
```

In example above, each URL has a different pattern:

- `https://m.youtube.com`  
  This YouTube URL is commonly found in the YouTube mobile app. The `m` before youtube is an abbreviation of **mobile**.

- `https://www.youtube.com`  
  This YouTube URL is globally used to determine YouTube URLs and supports both mobile and desktop platforms. The `www` itself is an abbreviation of **World Wide Web**.

- `https://music.youtube.com`  
  This YouTube URL is identified as a YouTube Music URL.

## Acknowledgements

This project utilizes the following libraries and APIs:

- [ytdl-core]: A JavaScript library for downloading YouTube videos.

Special thanks to the authors and contributors of these libraries for their valuable work.

## License
This project is licensed under MIT License. For more details, see [LICENSE](https://github.com/mitsuki31/ytmp3-js/blob/master/README.md) file.


[ytdl-core]: https://www.npmjs.com/package/ytdl-core

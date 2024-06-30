# YTMP3-JS

**YTMP3-JS** is a Node.js library designed for effortlessly downloading audio from YouTube videos, whether it's a single video or multiple videos, utilizing the [`ytdl-core`][ytdl-core] module. The library also converts these audio files into MP3 format.

This module offers both simple APIs and a command-line interface, allowing you to download audio from a single YouTube URL provided as an input argument or from multiple YouTube URLs listed in a file.

All downloaded audio files are saved in the `download` directory, which is relative to the project's root directory. If the [FFmpeg][ffmpeg] library is installed on your system, these files are automatically converted to MP3 format.

> [!WARNING]  
> This project uses [`fluent-ffmpeg`][fluent-ffmpeg] to convert audio files to the desired codec, specifically MP3. Therefore, it requires the [`ffmpeg`][ffmpeg] library and its binaries to be installed on your system, along with any necessary encoding libraries such as `libmp3lame` for MP3 conversion.
>
> However, don't worry if your system does not have [`ffmpeg`][ffmpeg] installed. The download process will not fail; instead, the audio conversion will be skipped, and the downloaded audio files will remain in AAC (Advanced Audio Coding) format with a `.m4a` extension.

## CLI Usage

### Install Requirements Dependencies
```bash
npm install
```

> [!NOTE]  
> If you do not want to install development dependencies (i.e., `devDependencies`). Set the `NODE_ENV` to `production` first.
> ```bash
> NODE_ENV=production npm install
> ```

### Download Audio
```bash
node . [URL | FILE]
```

> [!NOTE]  
> Passing an empty batch file will lead to error.
>
> If no argument provided it will defaults to search the `downloads.txt` file in the project's root directory and parse the file. Otherwise, if not exist, abort the process forcily.

Example of batch file format:
```txt
https://m.youtube.com/watch?v=<VIDEO_ID>
https://youtu.be/<VIDEO_ID>
https://www.youtube.com/watch?v=<VIDEO_ID>
https://music.youtube.com/watch?v=<VIDEO_ID>
```

## APIs

### `singleDownload`
```ts
async function singleDownload(inputUrl: string | URL): Promise<string>
```

<details>
<summary>Details</summary>

Downloads audio from a single YouTube URL and saves it to the output directory.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `inputUrl` | `string \| URL` | The URL of the YouTube video to download audio from. |

#### Returns

A promise that resolves a string representating the output file when the download completes.  
**Type:** `Promise<string>`

</details>

---

### `batchDownload`
```ts
async function batchDownload(inputFile: string): Promise<string[]>
```

<details>
<summary>Details</summary>

Downloads audio from a file containing YouTube URLs and saves them to the output directory.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `inputFile` | `string` | The path to the file containing YouTube URLs. |

#### Returns

A promise that resolves to an array of strings representing the successfully downloaded files.  
**Type:** `Promise<string[]>`

</details>

---

### `getVideosInfo`
```ts
async function getVideosInfo(...urls: ...(string | URL)): Promise<import('ytdl-core').videoInfo[]>
```

<details>
<summary>Details</summary>

Retrieves information for multiple YouTube videos sequentially.

This function accepts multiple YouTube URLs and retrieves information for each video sequentially. It processes each URL one by one, ensuring that the next URL is processed only after the previous one is complete.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `urls` | `...(string \| URL)` | The YouTube video URLs to fetch information for. Each URL can be either a string or a URL object. |

#### Returns

A promise that resolves to an array of video information objects.  
**Type:** `Promise<import('ytdl-core').videoInfo[]>`

</details>

---

### `checkFfmpeg`
```ts
async function checkFfmpeg(verbose?: boolean = false): Promise<boolean>
```

<details>
<summary>Details</summary>

Checks whether the `ffmpeg` binary is installed on system or not.

First, it checks if the `FFMPEG_PATH` environment variable is set. If it is set, it returns `true`. Otherwise, if not set, it checks if the `ffmpeg` binary is installed on system by directly executing it.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `verbose` | `boolean \| undefined` | Whether to log verbose messages or not. Defaults to `false`. |

#### Returns

A promise that resolves to a boolean value, `true` if the `ffmpeg` binary installed on system; otherwise, `false`.

</details>

---

### `convertAudio`
```ts
async function convertAudio(
  inFile: string,
  options?: ConvertAudioOptions = defaultOptions
): Promise<void>
```

<details>
<summary>Details</summary>

Converts an audio file to a specified format using the given options.

Before performing audio conversion, it first checks the `ffmpeg` binary by searching on the `FFMPEG_PATH` environment variable, if set. Otherwise, it force check by calling the `ffmpeg` command itself on child process.

If the `ffmpeg` is not installed on the system, this function will aborts immediately and rejects with an error.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `inFile` | `string` | The input file path of the audio file to be converted. |
| `options` | `ConvertAudioOptions \| undefined` | Options object for configuring the conversion process. If not provided, it will uses default options and convert audios to MP3 format. |

</details>

---

## API Usage

Download audio from a single YouTube URL:
```js
const ytmp3 = require('ytmp3-js');
const url = 'https://youtu.be/abcdefg'

ytmp3.singleDownload(url)
  .then(outFile => console.log(outFile))
  .catch(err => console.error(err));
```

---

Download audios from a bunch of YouTube URLs within a file:
```js
const ytmp3 = require('ytmp3-js');
const batchFile = 'path/to/myurls.txt';

ytmp3.batchDownload(batchFile)
  .then(outFiles => console.log(outFiles))
  .catch(err => console.error(err));
```

---

Download multiple URLs from an array:
```js
const ytmp3 = require('ytmp3-js');
const urls = [
  'https://music.youtube.com/watch?v=abcdefg'
  'https://youtube.com/watch?v=abcd1234'
  // ... and more
];

(async () => {
  // Iterate over the array of URL using for-loop
  // Use this iteration to ensure the download processes
  // runs sequentially instead of parallel
  for (const url of urls) {
    const outFile = await singleDownload(url);
    console.log('Downloaded:', outFile);
  }
})();
```

## Acknowledgements

This project utilizes the following libraries and APIs:

- [ytdl-core] - A JavaScript library for downloading YouTube videos.
- [fluent-ffmpeg] - A library that fluents `ffmpeg` command-line usage, easy to use Node.js module.

Special thanks to the authors and contributors of these libraries for their valuable work.

## License
This project is licensed under MIT License. For more details, see [LICENSE](https://github.com/mitsuki31/ytmp3-js/blob/master/LICENSE) file.


[ytdl-core]: https://www.npmjs.com/package/ytdl-core
[fluent-ffmpeg]: https://www.npmjs.com/package/fluent-ffmpeg
[ffmpeg]: https://ffmpeg.org

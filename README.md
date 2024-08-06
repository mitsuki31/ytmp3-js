# YTMP3-JS

**YTMP3-JS** is a Node.js library designed for effortlessly downloading audio from YouTube videos, whether it's a single URL or multiple URLs, utilizing the [`@distube/ytdl-core`] module. The library also optionally converts these audio files into MP3 format.

This module offers both simple APIs and a command-line interface, allowing you to download audio from a single YouTube URL provided as an input argument or from multiple YouTube URLs listed in a file with ease.

All downloaded audio files are saved in the current directory (default behavior, can be overriden with `-o` CLI option), which is relative to the project's root directory. If the [FFmpeg][ffmpeg] library is installed on your system, these files are optionally converted to MP3 format (use the `-C` option to enable the audio conversion behavior).

> [!WARNING]  
> This project uses [`fluent-ffmpeg`][fluent-ffmpeg] to convert audio files to the desired codec, specifically MP3. Therefore, it requires the [`ffmpeg`][ffmpeg] library and its binaries to be installed on your system, along with any necessary encoding libraries such as `libmp3lame` for MP3 conversion.
>
> However, don't worry if your system does not have [`ffmpeg`][ffmpeg] installed. The download process will not fail; instead, the audio conversion will be skipped, and the downloaded audio files will remain in [AAC (Advanced Audio Coding)](https://en.wikipedia.org/wiki/Advanced_Audio_Coding) format with a `.m4a` extension.

## Getting Started

### Installation

```bash
npm i -g ytmp3-js
```

If you've downloaded package from the release asset, you may use local installation like this:
```bash
npm i -g /path/to/ytmp3-js.<VERSION>.tgz
```

### Command Usage
```bash
ytmp3 [options] [[URL ...] | [-f <FILE>]]
```

### Example Usage

```bash
ytmp3 https://youtu.be/abcdef123 -o /home/Music -C --format flac --codec flac --frequency 48000
```

In above example, the code is trying to download audio from a single URL and convert it to [FLAC codec](https://en.wikipedia.org/wiki/FLAC) with frequency set to 48000 Hz (equal to 48 KHz) and save the processed audio file to `/home/Music` directory.

If you'd supplied only the `-C` (or `--convertAudio`) option, then a downloaded audio file will be automatically converted to MP3 format (which is the default behavior).
But only if you've installed [FFmpeg][ffmpeg].

### Options

#### Download Options

| Option Name | Accepts | Description |
| ----------- | :--: | ----------- |
| `--cwd` | `string` | Set the current working directory to specified directory, used to resolve the `outDir` path. Defaults to the current directory. |
| `-f` \| `--file` \| `--batch` | `string` | Path to a file containing a list of YouTube URLs for batch downloading. |
| `-c` \| `--config` | `string` | Path to a configuration file containing the `downloadOptions` object to configure both the download options and audio converter options. |
| `-o` \| `--outDir` \| `--out-dir` | `string` | Specify the output directory for downloaded files. Defaults to the current directory. |
| `-C` \| `--convertAudio` \| `--convert-audio` | - | Enable audio conversion to a specific format (requires [FFmpeg](https://ffmpeg.org)). |
| `-q` \| `--quiet`  | - | Suppress all output messages. Use it twice (`-qq`) to also suppress the audio conversion progress. |

> [!NOTE]  
> When using the `-c` or `--config` option to specify a configuration file, any changes made to specific options on the command line
> will override the corresponding options in the configuration file. This means that the modified options in the configuration file
> will be overridden with the values set from the command line.

#### Audio Converter Options

| Option Name | Accepts | Description |
| ----------- | :--: | ----------- |
| `--format` | `string` | Convert the audio to the specified format. |
| `--codec` \| `--encoding` | `string` | Specify the codec for the converted audio. |
| `--bitrate` | `int` \| `string` | Set the bitrate for the converted audio in kbps. |
| `--freq` \| `--frequency` | `int` | Set the audio sampling frequency for the converted audio in Hertz (Hz). |
| `--channels` | `int` | Specify the audio channels for the converted audio. |
| `--deleteOld` \| `--delete-old` \| `--overwrite` | - | Delete the old audio file after the audio conversion is done. |

> [!NOTE]  
> All audio converter options above requires the audio conversion behavior to be enabled first -- enable it using `-C` or `--convertAudio` option --
> otherwise, the specified values from these options will be ignored.

#### Miscellaneous Options

| Option Name | Description |
| ----------- | ----------- |
| `-h` \| `-?` \| `--help` | Display the help message and exit. |
| `-V` \| `--version` | Display the module version and exit. Use it twice (`-VV`) to also display all dependencies' version (not including `devDependencies`). |
| `--copyright` | Display the copyright information and exit. |
| `--print-config` | Display the configuration options that being used and exit. Very useful for debugging. |


## APIs

### `singleDownload`
```ts
async function singleDownload(inputUrl: string | URL): Promise<string>
```

<details>
<summary>API Details</summary>

Downloads audio from a single YouTube URL and saves it to the output directory (change the output directory with `-o` or `--outDir` option).

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
<summary>API Details</summary>

Downloads audio from a file containing YouTube URLs and saves them to the output directory (change the output directory with `-o` or `--outDir` option).

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
async function getVideosInfo(...urls: ...(string | URL)): Promise<import('@distube/ytdl-core').videoInfo[]>
```

<details>
<summary>API Details</summary>

Retrieves information for multiple YouTube videos sequentially.

This function accepts multiple YouTube URLs and retrieves information for each video sequentially. It processes each URL one by one, ensuring that the next URL is processed only after the previous one is complete.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `urls` | `...(string \| URL)` | The YouTube video URLs to fetch information for. Each URL can be either a string or a URL object. |

#### Returns

A promise that resolves to an array of video information objects.  
**Type:** `Promise<import('@distube/ytdl-core').videoInfo[]>`

</details>

---

### `checkFfmpeg`
```ts
async function checkFfmpeg(verbose?: boolean = false): Promise<boolean>
```

<details>
<summary>API Details</summary>

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
<summary>API Details</summary>

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

### API Usage

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

- **(Outdated)** [`ytdl-core`] - Yet another YouTube downloading module. Written with only Javascript and a node-friendly streaming interface.
- [`@distube/ytdl-core`] - DisTube fork of `ytdl-core`. This fork is dedicated to fixing bugs and adding features that are not merged into the original repo as soon as possible.
- [fluent-ffmpeg] - A library that fluents `ffmpeg` command-line usage, easy to use Node.js module.

Special thanks to the authors and contributors of these libraries for their valuable work.

## Contribution

Any contributions to this project are welcome :D

## License

This project is licensed under MIT License. For more details, see [LICENSE](https://github.com/mitsuki31/ytmp3-js/blob/master/LICENSE) file.


<!-- Links -->

[`ytdl-core`]: https://www.npmjs.com/package/ytdl-core
[`@distube/ytdl-core`]: https://www.npmjs.com/package/@distube/ytdl-core
[fluent-ffmpeg]: https://www.npmjs.com/package/fluent-ffmpeg
[ffmpeg]: https://ffmpeg.org

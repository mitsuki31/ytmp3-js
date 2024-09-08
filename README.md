# YTMP3-JS

<div align="center">
  <a href="https://ko-fi.com/dhefam31" target="_blank"><img height="50" src="https://storage.ko-fi.com/cdn/kofi1.png?v=3" alt="Buy Me a Coffee at ko-fi.com"></a>
</div>

|   |   |
|:--|:--|
| **Lint** | [![ESLint](https://github.com/mitsuki31/ytmp3-js/actions/workflows/eslint.yml/badge.svg)](https://github.com/mitsuki31/ytmp3-js/actions/workflows/eslint.yml) |
| **Unit Testing** | [![Unit Test](https://github.com/mitsuki31/ytmp3-js/actions/workflows/unittest.yml/badge.svg)](https://github.com/mitsuki31/ytmp3-js/actions/workflows/unittest.yml) |
| **Integration Testing** | [![IRL Test](https://github.com/mitsuki31/ytmp3-js/actions/workflows/irltest.yml/badge.svg)](https://github.com/mitsuki31/ytmp3-js/actions/workflows/irltest.yml) |
| **Code Coverage** | [![Code coverage in codecov.io](https://img.shields.io/codecov/c/gh/mitsuki31/ytmp3-js?style=for-the-badge&logo=codecov&logoColor=white&label=Coverage&labelColor=DF0200&color=DDDDDD)](https://app.codecov.io/gh/mitsuki31/ytmp3-js) |

![NPM License](https://img.shields.io/npm/l/ytmp3-js?logo=github&logoColor=f9f9f9&label=License&labelColor=yellow&color=white)
![Min. Node](https://img.shields.io/node/v/ytmp3-js?label=Node.js&logo=node.js)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/ytmp3-js?label=Unpacked+size&logo=npm)

**Wiki Homepage**: [[here]](https://github.com/mitsuki31/ytmp3-js/wiki)  
**API Documentation**: [[here]](https://mitsuki31.github.io/ytmp3-js)

**YTMP3-JS** is a Node.js library designed for effortlessly downloading audio from YouTube videos, whether it's a single URL or multiple URLs, utilizing the [`@distube/ytdl-core`] module. The library also optionally converts these audio files into MP3 format.

This module offers both simple APIs and a command-line interface, allowing you to download audio from a single YouTube URL provided as an input argument or from multiple YouTube URLs listed in a file with ease.

All downloaded audio files are saved in the current directory (unless being overridden with `-o` CLI option), which is relative to the project's root directory. If the [FFmpeg][ffmpeg] library is installed on your system, these files are optionally converted to MP3 format (use the `-C` option to enable the audio conversion behavior).

> [!WARNING]  
> This project uses [`fluent-ffmpeg`][fluent-ffmpeg] to convert audio files to the desired codec, specifically MP3. Therefore, it requires the [`ffmpeg`][ffmpeg] library and its binaries to be installed on your system, along with any necessary encoding libraries such as `libmp3lame` for MP3 conversion.
>
> However, don't worry if your system does not have [`ffmpeg`][ffmpeg] installed. The download process will not fail; instead, the audio conversion will be skipped, and the downloaded audio files will remain in [AAC (Advanced Audio Coding)](https://en.wikipedia.org/wiki/Advanced_Audio_Coding) format with a `.m4a` extension.

## Features

- Download a YouTube single audio or multiple audios and save them to your device with ease and uncomplicated command-line usage.
- Support batch download using a file containing a list of YouTube URLs (per line).
- Provide a simple and minimal Node.js library for programmatic use.
- Easy and automatic conversion of downloaded audio files to specific encoding and format as per your preferences (requires FFmpeg).

## Disadvantages

- Unable to continue downloading bytes from the last downloaded bytes.
- Doesn't support downloading a YouTube playlist.
- The lack of APIs makes it difficult to integrate them into complex website or bot projects.

## Getting Started

### Installation

```bash
npm i -g ytmp3-js
```

---

If you've downloaded package from the release asset, you may use local installation like this:

```bash
npm i -g /path/to/ytmp3-js.<VERSION>.tgz
```

### Command Usage

```bash
ytmp3 [options] [[URL ...] | [-f <FILE>]]
```

### Command Line Options

For command-line options with detailed information, please refer to [Command-Line Options][Command-Line-Options] wiki's page.

### Example Usage

```bash
ytmp3 https://youtu.be/abcdef123 -o /home/Music -C --format flac --codec flac --frequency 48000
```

In above example, the code is trying to download audio from a single URL and convert it to [FLAC codec](https://en.wikipedia.org/wiki/FLAC) with frequency set to 48000 Hz (equal to 48 KHz) and save the processed audio file to `/home/Music` directory.

If you'd supplied only the `-C` (or `--convertAudio`) option, then a downloaded audio file will be automatically converted to MP3 format (which is the default behavior).
But only if you've installed [FFmpeg][ffmpeg].

## Featured APIs

### `singleDownload`

```ts
async function singleDownload(
  inputUrl: string | URL,
  downloadOptions?: DownloadOptions | Object
): Promise<string>
```

[**[See the implementation]**](https://mitsuki31.github.io/ytmp3-js/module-ytmp3.html#~singleDownload)

<details>
<summary>API Details</summary>

Downloads audio from a single YouTube URL and saves it to the output directory (change the output directory with `-o` or `--outDir` option).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `inputUrl` | `string \| URL` | The URL of the YouTube video to download audio from. |
| `downloadOptions` | [`DownloadOptions`](https://mitsuki31.github.io/ytmp3-js/global.html#DownloadOptions) \| `Object` | Options to configure the download process. If not specified, it will automatically uses default options. |

#### Returns

A promise that resolves a string representating the output file when the download completes.  
**Type:** `Promise<string>`

</details>

---

### `batchDownload`

```ts
async function batchDownload(
  inputFile: string,
  downloadOptions?: DownloadOptions | Object
): Promise<string[]>
```

[**[See the implementation]**](https://mitsuki31.github.io/ytmp3-js/module-ytmp3.html#~batchDownload)

<details>
<summary>API Details</summary>

Downloads audio from a file containing YouTube URLs and saves them to the output directory (change the output directory with `-o` or `--outDir` option).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `inputFile` | `string` | The path to the file containing YouTube URLs. |
| `downloadOptions` | [`DownloadOptions`](https://mitsuki31.github.io/ytmp3-js/global.html#DownloadOptions) \| `Object` | Options to configure the download process. If not specified, it will automatically uses default options. |

#### Returns

A promise that resolves to an array of strings representing the successfully downloaded files.  
**Type:** `Promise<string[]>`

</details>

---

### `getVideosInfo`

```ts
async function getVideosInfo(
  ...urls: string | URL
): Promise<import('@distube/ytdl-core').videoInfo[]>
```

[**[See the implementation]**](https://mitsuki31.github.io/ytmp3-js/module-ytmp3.html#~getVideosInfo)

<details>
<summary>API Details</summary>

Retrieves information for multiple YouTube videos sequentially.

This function accepts multiple YouTube URLs and retrieves information for each video sequentially. It processes each URL one by one, ensuring that the next URL is processed only after the previous one is complete.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `...urls` | `string \| URL` | The YouTube video URLs to fetch information for. Each URL can be either a string or a URL object. |

#### Returns

A promise that resolves to an array of video information objects.  
**Type:** `Promise<import('@distube/ytdl-core').videoInfo[]>`

</details>

---

### `checkFfmpeg`

```ts
async function checkFfmpeg(verbose?: boolean = false): Promise<boolean>
```

[**[See the implementation]**](https://mitsuki31.github.io/ytmp3-js/module-audioconv.html#~checkFfmpeg)

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
**Type:** `boolean`

</details>

---

### `convertAudio`

```ts
async function convertAudio(
  inFile: string,
  options?: ConvertAudioOptions = defaultOptions
): Promise<void>
```

[**[See the implementation]**](https://mitsuki31.github.io/ytmp3-js/module-audioconv.html#~convertAudio)

<details>
<summary>API Details</summary>

Converts an audio file to a specified format using the given options.

Before performing audio conversion, it first checks the `ffmpeg` binary by searching on the `FFMPEG_PATH` environment variable, if set. Otherwise, it force check by calling the `ffmpeg` command itself on child process.

If the `ffmpeg` is not installed on the system, this function will aborts immediately and rejects with an error.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `inFile` | `string` | The input file path of the audio file to be converted. |
| `options` | [`ConvertAudioOptions`](https://mitsuki31.github.io/ytmp3-js/global.html#ConvertAudioOptions) \| `undefined` | Options object for configuring the conversion process. If not provided, it will uses default options and convert audios to MP3 format. |

</details>

---

### `extractVideoId`

```ts
function extractVideoId(url: string | URL): string
```

[**[See the implementation]**](https://mitsuki31.github.io/ytmp3-js/module-url-utils-URLUtils.html#.extractVideoId)

<details>
<summary>API Details</summary>

Extracts the YouTube video ID from given YouTube URL.

The YouTube video ID have exactly 11 characters with allowed symbols are `A-Z`, `a-z`, `0-9`, `_`, and `-`.

Allowed YouTube domains to extract:

- `www.youtube.com`
- `m.youtube.com`
- `youtube.com`
- `youtu.be`
- `music.youtube.com`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `url` | `string \| URL` | The URL to evaluate. |

#### Returns

A string with 11 characters representing the video ID.  
**Type:** `string`

</details>

---

### `validateUrl`

```ts
function validateUrl(url: string | URL, withId?: boolean = true): boolean
```

[**[See the implementation]**](https://mitsuki31.github.io/ytmp3-js/module-url-utils-URLUtils.html#.validateUrl)

<details>
<summary>API Details</summary>

Validates the given YouTube URL and optionally validates its video ID.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `url` | `string \| URL` | The URL to validate. |
| `withId` | `boolean` | Whether to also validate the video ID within the URL. If `false`, the function will only validate the URL's domain name. Defaults to `true`. |

#### Returns

Returns `true` if the given URL is a valid YouTube URL; otherwise `false`.  
**Type:** `boolean`

</details>

---

### `validateId`

```ts
function validateId(id: string): boolean
```

[**[See the implementation]**](https://mitsuki31.github.io/ytmp3-js/module-url-utils-URLUtils.html#.validateId)

<details>
<summary>API Details</summary>

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `id` | `string` | The video ID to validate. |

#### Returns

Returns `true` if the given ID correctly represents the YouTube video ID; otherwise `false`.  
**Type:** `boolean`

</details>

---

Refer to [Wiki's Homepage](https://github.com/mitsuki31/ytmp3-js/wiki#example-api-usages) for information on how to use APIs.

## Acknowledgements

This project utilizes the following libraries and APIs:

- **(Outdated)** [`ytdl-core`] - Yet another YouTube downloading module. Written with only Javascript and a node-friendly streaming interface.
- [`@distube/ytdl-core`] - DisTube fork of `ytdl-core`. This fork is dedicated to fixing bugs and adding features that are not merged into the original repo as soon as possible.
- [`fluent-ffmpeg`] - A library that fluents `ffmpeg` command-line usage, easy to use Node.js module.

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

[Wiki-Home]: https://github.com/mitsuki31/ytmp3-js/wiki
[Command-Line-Options]: https://github.com/mitsuki31/ytmp3-js/wiki/Command-Line-Options

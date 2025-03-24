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

> [!WARNING]  
> All code in this branch is still in development and preview. Please use the stable release from [NPM registry](https://npmjs.com/package/ytmp3-js).  
> This beta version will **never** be uploaded to the NPM registry.

**YTMP3-JS** is a powerful Node.js tool designed for downloading and converting YouTube audio. It functions as both a command-line application and an API provider, making it flexible for various use cases.

Built on top of [`@distube/ytdl-core`], this tool enables seamless audio extraction from YouTube videos, supporting both single and batch downloads. Additionally, it offers optional MP3 conversion for enhanced usability.

Whether you need a simple API for integration into your projects or a CLI for quick downloads, **YTMP3-JS** provides an efficient and user-friendly solution.

> [!TIP]  
> Passing multiple URLs to the `ytmp3` argument will activate **multiple downloads mode**, enabling batch processing with ease.

> [!WARNING]  
> This project uses [`fluent-ffmpeg`][fluent-ffmpeg] to convert audio files to the desired codec, specifically MP3. Therefore, it requires the [`ffmpeg`][ffmpeg] library and its binaries to be installed on your system, along with any necessary encoding libraries such as `libmp3lame` for MP3 conversion.
>
> However, if your system does not have [`ffmpeg`][ffmpeg] installed, the download process will never fail; instead, the audio conversion will be skipped, and the downloaded audio files will remain in [AAC (Advanced Audio Coding)](https://en.wikipedia.org/wiki/Advanced_Audio_Coding) format with a `.m4a` extension.

## Pros

- Easily download a single YouTube audio or multiple audio files with a straightforward command-line interface.
- Supports batch downloads using a file containing a list of YouTube video URLs or raw video IDs (one per line).
- Provides a robust API library for programmatic use, extending the functionality of [`@distube/ytdl-core`].
- Offers automatic conversion of downloaded audio files to your preferred encoding and format (requires [FFmpeg](https://ffmpeg.org)).
- Supports resuming interrupted downloads from the last downloaded bytes (currently available only for programmatic use).
- Implements caching for video information to optimize the download process and reduce bandwidth usage.

> [!WARNING]  
> - The resume download feature is currently in preview and may not work reliably until further improvements.
> - Cached video information may expire in a short time. The exact cause is still under investigation.

## Cons

- Does not support downloading entire YouTube playlists.
- Does not support authentication via cookies (feature in development).

## Getting Started

### Installation

```bash
npm i -g ytmp3-js
```

---

If you've downloaded package from the release asset, you may use local installation like this:

```bash
npm i -g ./ytmp3-js.<VERSION>.tgz
```

### Command Syntax

```bash
ytmp3 [options] [[URL ...] | [-f <FILE>]]
```

### Command Line Options

For command-line options with detailed information, please refer to [Command-Line Options][Command-Line-Options] wiki's page.

### Example Usage

```bash
ytmp3 https://youtu.be/abcdef123 -o /home/Music -C --format flac --codec flac --frequency 48000
```

Or passing only the video ID (`ytmp3` >=2.0.0):

```bash
ytmp3 abcdef123 -o /home/Music -C --format flac --codec flac --frequency 48000
```

In above example, the code is trying to download audio from a single URL and convert it to [FLAC codec](https://en.wikipedia.org/wiki/FLAC) with frequency set to 48000 Hz (equal to 48 KHz) and save the processed audio file to `/home/Music` directory.

> [!TIP]  
> If you'd supplied only the `-C` (or `--convertAudio`) option, then a downloaded audio file will be automatically converted to MP3 format (which is the default behavior). But only if you've installed [FFmpeg][ffmpeg].

> [!NOTE]  
> Passing options as command-line argument will override particular options in the specified configuration (`-c` flag) or global configuration.

### Customizing Download Process

If you want to change the behavior of the download process, you can provide a custom `options.handler` function to handle the download stream and log messages. The handler function accepts 3 arguments: a `ReadableStream` instance, the video metadata object, and the options object. The handler function can be a synchronous or asynchronous function that returns a promise, both of them are handled properly by this function. But it is recommended to use an asynchronous function, as it might cause to blocking of the main thread if the handler function is synchronous.

**Parameters:**

- stream : [`ReadableStream`]
- data : [`DLHandlerData`](https://mitsuki31.github.io/ytmp3-js/v2/global.html#DLHandlerData)
- options : [`DownloadOptions`](https://mitsuki31.github.io/ytmp3-js/v2/global.html#DownloadOptions)

**Example on customizing the download process:**

```js
async function myHandler(stream, metadata, options) {
  await new Promise((resolve, reject) => {
    stream
      .on('progress', (chunk, downloadedBytes, totalBytes) => {
        // customize this
      })
      .on('error', (error) => {
        // customize this
      })
      .on('end', () => {
        // customize this
        resolve();  // do not forget to resolve
      })
      .pipe(fs.createWriteStream(...));  // output
  });
}

await ytmp3.download(..., {
  handler: myHandler,
  ...
});
```

> [!NOTE]  
> This feature is not supported on CLI-application, used for programmatic use only.

### Caching Behavior

<!-- TODO: Add `--useCache` flag -->
By default, video metadata is cached in YTMP3’s cache directory to optimize subsequent downloads. This behavior can be disabled by setting `useCache` to `false`, which forces the function to always fetch fresh metadata from the YouTube server. Disabling this option also prevents the function from creating or updating any cached data for the given video.

#### Cache Expiration

Cached video metadata expires after 2 hours (7200 seconds or 7.2×10⁵ milliseconds). Once expired, the function attempts to verify cache validity by sending a HEAD request to YouTube. If the response status is `200 OK`, the cached data is used instead of fetching new metadata. Otherwise, fresh data is retrieved and the cache is updated with the newest one.

## Featured APIs

### `download`

```ts
async function download(url: string | URL, options?: DownloadOptions): Promise<DownloadResult>
```

[**[See the implementation]**](https://mitsuki31.github.io/ytmp3-js/v2/module-ytmp3.html#~download)

<details>
<summary>API Details</summary>

Downloads audio from a YouTube video using the provided video URL or video ID. The downloaded audio file will be saved in the current directory, unless specified by `-o` flag or `outDir` option.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `inputUrl` | `string` \| [`URL`][node:URL] | A YouTube video URL or video ID to download its audio content. |
| `downloadOptions` | [`DownloadOptions`](https://mitsuki31.github.io/ytmp3-js/v2/global.html#DownloadOptions) | Options to configure the video information retrieval and download process. |

#### Returns

Fulfills with an object containing download metadata and file paths.  
**Type:** [`Promise<DownloadResult>`](https://mitsuki31.github.io/ytmp3-js/v2/global.html#DownloadResult)

</details>

---

### `batchDownload`

```ts
async function batchDownload(
  file: string | Buffer<ArrayBufferLike>,
  options?: BatchDownloadOptions
): Promise<Record<string, BatchDownloadResult>>
```

[**[See the implementation]**](https://mitsuki31.github.io/ytmp3-js/v2/module-ytmp3.html#~batchDownload)

<details>
<summary>API Details</summary>

Downloads audio from a file containing YouTube URLs and saves them to the output directory. The downloaded audio files will be saved in the current directory, unless specified by `-o` flag or `outDir` option.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `file` | `string` \| [`Buffer<ArrayBufferLike>`](https://nodejs.org/api/buffer.html) | The path to the file containing YouTube URLs. |
| `options` | [`BatchDownloadOptions`](https://mitsuki31.github.io/ytmp3-js/v2/global.html#BatchDownloadOptions) | Options to configure the download process. If not specified, it will automatically uses default options. |

#### Returns

Fulfills with an object with video IDs as keys and the download result objects as values.  
**Type:** [`Promise<Record<string, BatchDownloadResult>>`](https://mitsuki31.github.io/ytmp3-js/v2/global.html#BatchDownloadResult)

</details>

---

### `getInfo`

```ts
function getInfo(
  url: string | URL,
  options?: import('@distube/ytdl-core').getInfoOptions & {
    asObject?: false;
    useCache?: boolean;
    verbose?: boolean;
  }
): Promise<YTDLVideoInfo>;
```
```ts
function getInfo(
  url: (string | URL)[],
  options?: import('@distube/ytdl-core').getInfoOptions & {
    asObject?: false;
    useCache?: boolean;
    verbose?: boolean;
  }
): Promise<YTDLVideoInfo[]>;
```
```ts
function getInfo(
  url: (string | URL) | (string | URL)[],
  options?: import('@distube/ytdl-core').getInfoOptions & {
    asObject: true;
    useCache?: boolean;
    verbose?: boolean;
  }
): Promise<Record<string, YTDLVideoInfo>>;
```

[**[See the implementation]**](https://mitsuki31.github.io/ytmp3-js/v2/module-ytmp3.html#~getInfo)

<details>
<summary>API Details</summary>

Retrieves the YouTube video information from the given YouTube URL(s) or ID(s).

If the given URL is an array either of `string`s or [`URL`][node:URL] objects, the function will returns an array fullfilled with the video information from each URLs (except `options.asObject` is set to `true`). The function will automatically filter out any nullable values (`null`, `undefined` or an empty string) from the array, if provided.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `url` | `string` \| [`URL`][node:URL] \| `(string \| URL)[]` | The YouTube video URL(s) or ID(s) to retrieve its information. |
| `options` | `ytdl.getInfoOptions` | Options to use when fetching the video information. This options object is extend to the `ytdl.getInfoOptions` object. |
| `options.asObject` | `boolean` | If set to `true`, the returned value will be an object with video ID as keys and video information object as values. Otherwise, the returned value will be an array of video information objects. This option will be ignored if the `url` is not an array. |
| `options.useCache` | `boolean` | If set to `true`, the function will use the cache to retrieve the video information. Otherwise, the function will ignore the cache and fetch the video information from the server. This also will make the function to create a new cache file in the YTMP3's cache directory. |
| `options.verbose` | `boolean` | Whether to print the process retrieval to standard output. Defaults to `false`. |


#### Returns

A promise fulfills with a video information. If the `url` is an array, returned value will be an array of video information(s), or if the `options.asObject` is set to `true`, the returned value will be an object with video ID as keys and video information object as values.  
**Type:** `Promise.<ytdl.videoInfo | Array.<ytdl.videoInfo> | Record.<string, ytdl.videoInfo>>`

</details>

---

### `convertAudio`

```ts
async function convertAudio(
  inFile: string,
  outFile?: string | AudioConverterOptions,
  options?: AudioConverterOptions
): Promise<ConversionResult>
```

[**[See the implementation]**](https://mitsuki31.github.io/ytmp3-js/v2/module-audioconv.html#~convertAudio)

<details>
<summary>API Details</summary>

Converts an audio file to a specified format using the given options.

Before performing audio conversion, it first checks the `ffmpeg` binary by searching on the `FFMPEG_PATH` environment variable, if set. Otherwise, it force check by calling the `ffmpeg` command itself on child process.

If the `ffmpeg` is not installed on the system, this function will aborts immediately and rejects with an error.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `inFile` | `string` | The input file path of the audio file to be converted. |
| `outFile` | `string` \| [`AudioConverterOptions`](https://mitsuki31.github.io/ytmp3-js/v2/global.html#AudioConverterOptions) | The output file path of the converted audio file. |
| `options` | [`AudioConverterOptions`](https://mitsuki31.github.io/ytmp3-js/v2/global.html#AudioConverterOptions) \| `undefined` | Options object for configuring the conversion process. If not provided, it will uses default options and convert audios to MP3 format. |

#### Returns

Fulfills with an object containing the input and output audio file information.  
**Type:** [`Promise<ConversionResult>`](https://mitsuki31.github.io/ytmp3-js/v2/global.html#ConversionResult)

</details>

---

There is a lot of APIs you can find in the library, we can't document them all in one place. If you're interested, consider refer to [APIs Homepage](https://mitsuki31.github.io/ytmp3-js).

Refer to [Wiki's Homepage](https://github.com/mitsuki31/ytmp3-js/wiki#example-api-usages) for information on how to use APIs.

## Acknowledgements

This project utilizes the following libraries and APIs:

- **(Outdated)** [`ytdl-core`] - Yet another YouTube downloading module. Written with only Javascript and a node-friendly streaming interface.
- [`@distube/ytdl-core`] - DisTube fork of `ytdl-core`. This fork is dedicated to fixing bugs and adding features that are not merged into the original repo as soon as possible.
- [`fluent-ffmpeg`][fluent-ffmpeg] - A library that fluents `ffmpeg` command-line usage, easy to use Node.js module.
- ... and a lot more.

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
[node:URL]: https://nodejs.org/api/url.html

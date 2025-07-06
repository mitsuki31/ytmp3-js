/**
 * @module    core/internal/VideoInfo
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import type { YT } from 'youtubei.js';
import type AuthorInfo from '#/core/internal/interfaces/AuthorInfo';
import type Thumbnail from '#/core/internal/interfaces/Thumbnail';
import type VideoMetadata from '#/core/internal/interfaces/VideoMetadata';

/**
 * Represents detailed information about a YouTube video.
 *
 * @public
 * @since 5.0.0
 */
export default class VideoInfo implements VideoMetadata {
  /**
   * The raw video information object from YouTube.
   * @private
   */
  #__videoInfo: YT.VideoInfo;

  /**
   * The title of the video.
   */
  title: string | undefined;

  /**
   * The description of the video.
   */
  description: string | undefined;

  /**
   * The unique identifier for the video.
   */
  videoId: string;

  /**
   * The URL of the video on YouTube.
   */
  videoUrl: string;

  /**
   * Information about the author of the video.
   */
  author: AuthorInfo;

  /**
   * A list of thumbnail images for the video.
   */
  thumbnail: Thumbnail[];

  /**
   * The category of the video.
   */
  category: string | null;

  /**
   * Caption tracks available for the video.
   */
  captions: YT.VideoInfo["captions"];

  /**
   * Information about the channel that uploaded the video.
   */
  channel: YT.VideoInfo["basic_info"]["channel"];

  /**
   * The playability status of the video.
   */
  playabilityStatus: YT.VideoInfo["playability_status"];

  /**
   * The duration of the video in seconds.
   */
  duration: number;

  /**
   * The number of likes the video has received.
   */
  likes: number | undefined;

  /**
   * The number of views the video has received.
   */
  views: number | undefined;

  /**
   * Indicates if the video is embeddable.
   */
  isEmbeddable: boolean;

  /**
   * Indicates if the video is live.
   */
  isLive: boolean;

  /**
   * Indicates if the video is family safe.
   */
  isFamilySafe: boolean;

  /**
   * Indicates if the video is private.
   */
  isPrivate: boolean;

  /**
   * Embed information for the video.
   */
  embed: YT.VideoInfo["basic_info"]["embed"];

  /**
   * A list of tags associated with the video.
   */
  tags: string[];

  /**
   * A list of keywords associated with the video.
   */
  keywords: string[];

  /**
   * Constructs a new instance of `VideoInfo`.
   *
   * @param videoInfo - The raw video information object.
   * @param options - An object containing video ID.
   * @param options.videoId - The video ID.
   */
  constructor(videoInfo: YT.VideoInfo, { videoId }: { videoId?: string } = {}) {
    videoId = videoId ?? videoInfo.basic_info.id as string;
    this.#__videoInfo = videoInfo;

    // Construct YouTube URL from given ID
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    this.title = videoInfo.basic_info.title;
    this.description = videoInfo.basic_info.short_description;
    this.videoId = videoId;
    this.videoUrl = videoUrl;
    this.author = {
      name: videoInfo.basic_info.author,
      id: videoInfo.basic_info.channel?.id,
      url: videoInfo.basic_info.channel?.url,
    };
    this.thumbnail = (videoInfo.basic_info.thumbnail ?? []) as Thumbnail[];
    this.captions = videoInfo.captions;
    this.category = videoInfo.basic_info.category;
    this.channel = videoInfo.basic_info.channel;
    this.playabilityStatus = videoInfo.playability_status;
    this.duration = videoInfo.basic_info.duration ?? 0;
    this.likes = videoInfo.basic_info.like_count;
    this.views = videoInfo.basic_info.view_count;
    this.isEmbeddable = videoInfo.playability_status?.embeddable ?? false;
    this.isLive = videoInfo.basic_info.is_live ?? false;
    this.isFamilySafe = videoInfo.basic_info.is_family_safe ?? false;
    this.isPrivate = videoInfo.basic_info.is_private ?? false;
    this.embed = videoInfo.basic_info.embed;
    this.tags = (videoInfo.basic_info.tags ?? []) as string[];
    this.keywords = (videoInfo.basic_info.keywords ?? []) as string[];
  }

  /**
   * Creates a new `VideoInfo` instance from an object.
   *
   * @param obj - The object to create the `VideoInfo` instance from.
   * @returns A new `VideoInfo` instance.
   */
  public static createFromObject(
    obj: Record<keyof VideoInfo, unknown> & {
      full: YT.VideoInfo | Record<keyof YT.VideoInfo, unknown>
    }
  ): VideoInfo {
    return new VideoInfo(obj.full as YT.VideoInfo, { videoId: obj.videoId as string });
  }

  /**
   * Gets the full video information.
   */
  get full(): YT.VideoInfo {
    return this.#__videoInfo;
  }
}

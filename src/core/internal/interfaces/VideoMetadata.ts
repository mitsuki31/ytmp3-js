/**
 * @module    core/internal/interfaces/VideoMetadata
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import type AuthorInfo from './AuthorInfo.js';
import type Thumbnail from './Thumbnail.js';
import type { YT } from 'youtubei.js';

type BasicInfo = YT.VideoInfo["basic_info"];

/**
 * Represents the metadata of a video.
 * @public
 */
export default interface VideoMetadata {
  /** Represents the extracted and normalized author information */
  author: AuthorInfo;
  /** The category of the video */
  category: BasicInfo["category"];
  /** An object contains the captions of the video */
  captions: YT.VideoInfo["captions"];
  /** The information about the channel video belongs to */
  channel: BasicInfo["channel"];
  /** The description of the video */
  description: BasicInfo["short_description"];
  /** The duration of the video in seconds, or `0` (zero) if the duration is unknown */
  duration: number;
  embed: BasicInfo["embed"];
  isEmbeddable: boolean;
  /** Whether the video is family safe */
  isFamilySafe: boolean;
  /** Whether the video is a live stream */
  isLive: boolean;
  /** Whether the video is private */
  isPrivate: boolean;
  /** The number of likes of the video, or `undefined` if not available */
  likes: BasicInfo["like_count"];
  /** An object contains the playability status of the video */
  playabilityStatus: YT.VideoInfo["playability_status"];
  /** The tags of the video */
  tags: string[];
  /** Represents the video thumbnails */
  thumbnail: Thumbnail[];
  /** The title of the video */
  title: BasicInfo["title"];
  /** The ID of the video */
  videoId: string;
  /** The URL of the video */
  videoUrl: string;
  /** The number of views of the video, or `undefined` if not available */
  views: BasicInfo["view_count"];
}

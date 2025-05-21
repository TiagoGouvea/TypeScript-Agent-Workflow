import chalk from 'chalk';
import { fetchTranscript } from 'youtube-transcript-plus';
import type { NodeTool } from '../types/workflow/Tool';

export const youtubeTranscriptPlus: NodeTool = {
  toolDeclaration: {
    type: 'function',
    name: 'youtubeTranscriptPlus',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        videoUrl: {
          type: 'string',
          description: 'Full YouTube video URL',
        },
        language: {
          type: 'string',
          description: 'Language code for transcript (e.g., "en", "pt", "es")',
          default: 'en',
        },
        format: {
          type: 'string',
          enum: ['text', 'json', 'srt'],
          description:
            'Format to return the transcript in (text returns plain text, json returns timing information, srt returns subtitle format)',
          default: 'text',
        },
      },
      additionalProperties: false,
      required: ['videoUrl', 'language', 'format'],
    },
  },
  run: async (params) => {
    const { videoUrl, language = 'en', format = 'text' } = params;

    if (!videoUrl) {
      return {
        success: false,
        error:
          'Missing required parameter: either videoUrl or videoId must be provided',
        details: 'You must provide either a videoUrl or a videoId parameter',
      };
    }

    console.log(
      chalk.bgCyan(' YOUTUBE TRANSCRIPT '),
      chalk.cyan(`🎬 Getting transcript for: ${videoUrl}`),
    );

    try {
      videoUrl;
      const options = {
        lang: language,
      };

      const transcriptResult = await fetchTranscript(videoUrl, options);

      console.log(
        'Transcript received:',
        JSON.stringify(transcriptResult).substring(0, 300) + '...',
      );
      console.log(
        'Transcript length:',
        Array.isArray(transcriptResult)
          ? transcriptResult.length
          : '(not an array)',
      );

      // Process result based on format
      let processedResult;

      if (format === 'json') {
        // JSON format - return the array of transcript segments directly
        processedResult = transcriptResult;
      } else if (format === 'srt') {
        // Convert to SRT format
        let srtOutput = '';
        transcriptResult.forEach((item, index) => {
          const startTime = formatTime(item.offset);
          const endTime = formatTime(item.offset + item.duration);
          srtOutput += `${index + 1}\n${startTime} --> ${endTime}\n${item.text}\n\n`;
        });
        processedResult = srtOutput;
      } else {
        // Text format - just join all the text together
        processedResult = transcriptResult.map((item) => item.text).join(' ');
      }

      const extractedVideoId = extractVideoId(videoUrl);

      return {
        success: true,
        transcript: processedResult,
        videoId: extractedVideoId,
        language,
        format,
        url: videoUrl,
      };
    } catch (error: any) {
      console.error('Error getting YouTube transcript:', error.message);
      return {
        success: false,
        error: 'Failed to get transcript',
        details: error.message,
        videoId: extractVideoId(videoUrl),
        url: videoUrl,
      };
    }
  },
};

/**
 * Extracts YouTube video ID from a URL
 */
function extractVideoId(url?: string): string | null {
  if (!url) return null;

  // Handle various YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/;
  const match = url.match(regExp);

  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * Format seconds into SRT time format (HH:MM:SS,mmm)
 */
function formatTime(seconds: number): string {
  const date = new Date(seconds * 1000);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const secs = date.getUTCSeconds().toString().padStart(2, '0');
  const ms = date.getUTCMilliseconds().toString().padStart(3, '0');

  return `${hours}:${minutes}:${secs},${ms}`;
}

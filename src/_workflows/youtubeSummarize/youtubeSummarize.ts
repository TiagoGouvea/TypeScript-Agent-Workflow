import { z } from 'zod';
import { Workflow } from '../../types/workflow/Workflow.ts';
import { InputSource } from '../../types/workflow/Input.ts';
import { AgentNode } from '../../nodes/Agent.ts';
import { youtubeTranscriptPlus } from '../../tools/youtubeTranscriptPlus.ts';

// YouTubeSummarize
// 1 - Must receive/ask for the YouTube video URL
// 2 - Will get the transcript from the video
// 3 - Will write a summary of the video content

const getVideoInfo = new AgentNode({
  introductionText: 'I help get YouTube video transcripts',
  inputSource: InputSource.UserInput,
  inputSchema: z.object({
    videoUrl: z.string().describe('What is the YouTube video URL?'),
    summaryType: z
      .enum(['brief', 'detailed', 'bullet-points'])
      .describe(
        'What type of summary do you want? (brief, detailed, or bullet-points)',
      ),
    summaryLanguage: z
      .string()
      .describe(
        'What language should the summary be in? (e.g., English, Portuguese)',
      ),
  }),
  outputSchema: z.object({
    videoUrl: z.string(),
    videoId: z.string(),
    summaryType: z.enum(['brief', 'detailed', 'bullet-points']),
    summaryLanguage: z.string(),
    transcript: z.string(),
  }),
  systemPrompt: `
  You will get a YouTube video transcript.

  1. Take the video URL from the user input
  2. Use the youtubeTranscriptPlus tool to get the transcript
     - IMPORTANT: Set videoUrl parameter to the URL from user input
     - Set format to 'text' to get plain text transcript
     - Make sure to set language to 'en' for English or the user's preferred language
  3. Return both the video information and the full transcript

  Always return the complete transcript. Don't summarize it at this stage.

  Note: The transcript may come back as an array of segments. If that happens,
  join all the text segments into a single string for processing in the next step.
  `,
  tools: [youtubeTranscriptPlus],
});

const summarizeTranscript = new AgentNode({
  introductionText: 'I create summaries from YouTube video transcripts',
  inputSource: InputSource.LastStep,
  inputSchema: getVideoInfo.outputSchema,
  outputSchema: z.object({
    videoUrl: z.string(),
    videoId: z.string(),
    summaryType: z.enum(['brief', 'detailed', 'bullet-points']),
    summaryLanguage: z.string(),
    summary: z.string(),
  }),
  systemPrompt: `
  Your task is to create a summary of the YouTube video transcript.

  First, check the transcript format. If it's an array of objects, convert it to a single text string
  by concatenating all the 'text' properties from each object in the array.

  Follow these guidelines based on the requested summary type:

  1. For "brief" summary:
     - Create a 2-3 paragraph concise summary
     - Focus only on the main points and key takeaways
     - Keep it under 250 words

  2. For "detailed" summary:
     - Create a comprehensive summary with all important information
     - Include supporting details, examples, and context
     - Organize with clear sections if the content has distinct parts
     - Keep it under 1000 words

  3. For "bullet-points" summary:
     - Create a hierarchical bullet-point list
     - Main points as primary bullets, supporting points as sub-bullets
     - Use brief, clear statements
     - Include all key information in an easy-to-scan format

  Always create the summary in the language requested by the user.

  Return the summary in markdown format.
  `,
});

const youtubeSummarizeWorkflow = new Workflow({
  getVideoInfo,
  summarizeTranscript,
});
await youtubeSummarizeWorkflow.execute();

console.log('-----------------------');
console.log('Here is the YouTube video summary!');
console.log(youtubeSummarizeWorkflow.getResult('rawData').summary);

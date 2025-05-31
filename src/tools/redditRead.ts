import axios from 'axios';
import chalk from 'chalk';
import { z } from 'zod';
import { tool } from '../types/workflow/Tool.ts';

export const redditRead = tool({
  name: 'redditRead',
  description: 'Read a Reddit post and all its comments from a URL',
  params: z.object({
    url: z
      .string()
      .describe('Reddit post URL (can be full URL or just the path)'),
    limit: z
      .number()
      .min(1)
      .max(500)
      .default(100)
      .describe('Maximum number of comments to retrieve (1-500)'),
    depth: z
      .number()
      .min(1)
      .max(10)
      .default(5)
      .describe('Maximum depth of comment threads to retrieve'),
  }),
  run: async (params) => {
    const { url, limit, depth } = params;

    console.log(
      chalk.bgRed(' REDDIT READ '),
      chalk.red(`Reading Reddit discussion from: ${url}`),
    );

    // Clean and format the URL
    let redditUrl = url.trim();
    
    // If it's just a path, add the domain
    if (redditUrl.startsWith('/r/')) {
      redditUrl = `https://www.reddit.com${redditUrl}`;
    }
    
    // Remove trailing slash and add .json
    redditUrl = redditUrl.replace(/\/$/, '') + '.json';
    
    // Add query parameters
    const urlParams = new URLSearchParams({
      limit: limit.toString(),
      depth: depth.toString(),
      raw_json: '1',
    });

    try {
      const response = await axios.get(`${redditUrl}?${urlParams}`, {
        headers: {
          'User-Agent': 'TypeScript-Agent-Workflow/1.0',
        },
      });

      if (!response.data || !Array.isArray(response.data) || response.data.length < 2) {
        return {
          error: 'Invalid Reddit post URL or no data found',
        };
      }

      const postData = response.data[0].data.children[0].data;
      const commentsData = response.data[1].data.children;

      // Extract post information
      const post = {
        title: postData.title,
        selftext: postData.selftext,
        url: postData.url,
        permalink: `https://www.reddit.com${postData.permalink}`,
        subreddit: postData.subreddit,
        author: postData.author,
        score: postData.score,
        num_comments: postData.num_comments,
        created_utc: postData.created_utc,
        upvote_ratio: postData.upvote_ratio,
      };

      // Extract comments recursively
      const extractComments = (commentsList: any[], currentDepth = 0): any[] => {
        if (currentDepth >= depth) return [];
        
        const comments: any[] = [];
        
        for (const commentItem of commentsList) {
          const comment = commentItem.data;
          
          // Skip deleted/removed comments and "more" items
          if (comment.kind === 'more' || !comment.body || comment.body === '[deleted]' || comment.body === '[removed]') {
            continue;
          }
          
          const commentObj = {
            id: comment.id,
            author: comment.author,
            body: comment.body,
            score: comment.score,
            created_utc: comment.created_utc,
            depth: currentDepth,
            replies: [],
          };
          
          // Process replies if they exist
          if (comment.replies && comment.replies.data && comment.replies.data.children) {
            commentObj.replies = extractComments(comment.replies.data.children, currentDepth + 1);
          }
          
          comments.push(commentObj);
        }
        
        return comments;
      };

      const comments = extractComments(commentsData);

      const result = {
        post,
        comments,
        total_comments: comments.length,
      };

      console.log(chalk.green(`Read Reddit post with ${comments.length} comments`));
      
      return result;
    } catch (error: any) {
      console.error('Error reading Reddit post:', error.message);
      return {
        error: 'Failed to read Reddit post',
        details: error.message,
      };
    }
  },
});
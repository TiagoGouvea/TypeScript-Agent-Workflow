import axios from 'axios';
import chalk from 'chalk';
import { z } from 'zod';
import { tool } from '../types/workflow/Tool.ts';

export const redditSearch = tool({
  name: 'redditSearch',
  description: 'Search Reddit for posts, comments, and discussions',
  params: z.object({
    query: z.string().describe('Search term to look for on Reddit'),
    subreddit: z
      .string()
      .describe('Specific subreddit to search in (optional)'),
    sort: z
      .enum(['relevance', 'hot', 'top', 'new', 'comments'])
      .default('relevance')
      .describe('Sort order for results'),
    time: z
      .enum(['all', 'year', 'month', 'week', 'day', 'hour'])
      .default('all')
      .describe('Time period for search'),
    limit: z
      .number()
      .min(1)
      .max(100)
      .default(25)
      .describe('Number of results to return (1-100)'),
  }),
  run: async (params) => {
    const { query, subreddit, sort, time, limit } = params;

    console.log(
      chalk.bgRed(' REDDIT SEARCH '),
      chalk.red(
        `Searching Reddit for: ${query}${subreddit ? ` in r/${subreddit}` : ''}`,
      ),
    );

    // Build the Reddit search URL
    let searchUrl = 'https://www.reddit.com';
    if (subreddit) {
      searchUrl += `/r/${subreddit}`;
    }
    searchUrl += `/search.json`;

    const searchParams = new URLSearchParams({
      q: query,
      sort: sort,
      t: time,
      limit: limit.toString(),
      type: 'link',
      ...(subreddit && { restrict_sr: 'true' }),
    });

    try {
      const response = await axios.get(`${searchUrl}?${searchParams}`, {
        headers: {
          'User-Agent': 'TypeScript-Agent-Workflow/1.0',
        },
      });

      if (
        !response.data ||
        !response.data.data ||
        !response.data.data.children
      ) {
        return {
          error: 'No results found or invalid response format',
        };
      }

      const posts = response.data.data.children.map((child: any) => {
        const post = child.data;
        return {
          title: post.title,
          selftext: post.selftext,
          url: post.url,
          permalink: `https://www.reddit.com${post.permalink}`,
          subreddit: post.subreddit,
          author: post.author,
          score: post.score,
          num_comments: post.num_comments,
          created_utc: post.created_utc,
          upvote_ratio: post.upvote_ratio,
        };
      });

      console.log(
        chalk.bgRed(' REDDIT SEARCH '),
        chalk.red(`Found ${posts.length} Reddit posts`),
      );

      return posts;
    } catch (error: any) {
      console.error('Error during Reddit search:', error.message);
      return {
        error: 'Failed to execute Reddit search',
        details: error.message,
      };
    }
  },
});

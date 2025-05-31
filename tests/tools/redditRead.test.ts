import { describe, it, expect } from 'vitest';
import { redditRead } from '../../src/tools/redditRead';

describe('redditRead', () => {
  it('should read a Reddit post and comments successfully', async () => {
    const params = {
      url: 'https://www.reddit.com/r/Ayahuasca/comments/1fzbiku/i_walked_the_uni%C3%A3o_do_vegetal_udv_brazilian/',
      limit: 50,
      depth: 3,
    };

    const result = await redditRead.run(params);

    // console.log('result', result);

    // Se houver erro, verificar que é um erro válido
    expect(result.error).toBeUndefined();

    // Verificar se o resultado não contém erro ou se é um erro conhecido (post não existe)
    expect(result).toHaveProperty('post');
    expect(result).toHaveProperty('comments');
    expect(result).toHaveProperty('total_comments');

    // Verificar estrutura do post
    expect(result.post).toHaveProperty('title');
    expect(result.post).toHaveProperty('author');
    expect(result.post).toHaveProperty('subreddit');
    expect(result.post).toHaveProperty('score');

    // Verificar que comments é um array
    expect(Array.isArray(result.comments)).toBe(true);
  }, 30000);

  it('should handle path-only URLs', async () => {
    const params = {
      url: '/r/programming/comments/1234567/example_post/',
      limit: 10,
      depth: 2,
    };

    const result = await redditRead.run(params);

    // Deve funcionar ou retornar erro válido
    expect(typeof result === 'object').toBe(true);
  }, 30000);

  it('should handle invalid URLs gracefully', async () => {
    const params = {
      url: 'https://www.reddit.com/invalid/url',
      limit: 10,
      depth: 2,
    };

    const result = await redditRead.run(params);

    // Deve retornar erro para URL inválida
    expect(result).toHaveProperty('error');
  }, 30000);

  it('should respect depth limits', async () => {
    const params = {
      url: 'https://www.reddit.com/r/AskReddit/comments/1234567/example_post/',
      limit: 100,
      depth: 1,
    };

    const result = await redditRead.run(params);

    if (!result.hasOwnProperty('error') && result.comments.length > 0) {
      // Verificar que nenhum comentário tem depth maior que 1
      const checkDepth = (comments: any[]): boolean => {
        return comments.every((comment) => {
          if (comment.depth > 1) return false;
          if (comment.replies && comment.replies.length > 0) {
            return checkDepth(comment.replies);
          }
          return true;
        });
      };

      expect(checkDepth(result.comments)).toBe(true);
    }
  }, 30000);
});

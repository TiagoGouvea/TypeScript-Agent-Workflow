# Tools Guide

## How to create a Tool

### 1. Service (src/services/)
Create the service with methods that make external API calls:

```typescript
export class MyApiService {
  private static apiKey = process.env.MY_API_KEY;

  static async searchData(query: string): Promise<ApiResponse> {
    // Implement API call
    return { success: true, data: result };
  }
}
```

### 2. Tool (src/tools/)
Create the tool that calls the service:

```typescript
import { tool } from '../types/workflow/Tool.ts';
import { MyApiService } from '../services/myApiService';

export const myApiSearch = tool({
  name: 'myApiSearch',
  description: 'Search data using MyAPI',
  params: z.object({
    query: z.string().describe('Search query')
  }),
  run: async (params) => {
    return await MyApiService.searchData(params.query);
  }
});
```

### 3. Service Tests (tests/services/)
Test the service without mocks - call every service method:

```typescript
// tests/services/myApiService.test.ts
describe('MyApiService', () => {
  it('should search data', async () => {
    const result = await MyApiService.searchData('test');
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should get details', async () => {
    const result = await MyApiService.getDetails('id');
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  // Test ALL service methods
});
```

### 4. Tool Tests (tests/tools/)
Test the tools:

```typescript
// tests/tools/myApi.test.ts
describe('MyAPI Tools', () => {
  it('should execute search tool', async () => {
    const result = await myApiSearch.run({ query: 'test' });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  // Test ALL tools
});
```

## Pattern
- **Service**: Business logic and API calls
- **Tool**: Interface for workflows (calls the service)
- **Cache**: Implement when needed to save credits
- **Service Tests**: Test every service method without mocks in `tests/services/`
- **Tool Tests**: Test every tool in `tests/tools/`
- **Data**: Only validate success with real data
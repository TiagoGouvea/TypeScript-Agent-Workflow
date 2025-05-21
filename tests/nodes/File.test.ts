import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'node:path';
import { FileNode, FileNodeRunParams } from '../../src/nodes/File';
import { InputSource } from '../../src/types/workflow/Input';
import { Workflow } from '../../src/types/workflow/Workflow';

describe('Nodes - File', () => {
  const testDir = path.join(process.cwd(), 'temp', 'test-file-node');
  const testFile = path.join(testDir, 'test-file.txt');
  const testContent = 'This is a test file content';

  // Setup: create test directory and file
  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testFile, testContent);
  });

  // Cleanup: remove test directory and files
  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('[FileNode - read mode] Should read file content as string', async () => {
    const readStep = new FileNode({
      name: 'Read test file',
      mode: 'read',
      path: testFile,
      inputSource: InputSource.DataObject,
      inputDataObject: {},
      inputSchema: z.object({}),
      outputSchema: z.string(),
    });

    const testWorkflow = new Workflow({ readStep });
    await testWorkflow.execute();
    const result = testWorkflow.getResult('rawData');

    console.log('typeof result', typeof result);
    console.log('result', result);

    // First ensure the result is a string, not an object
    expect(typeof result).toBe('string');

    // The result now includes a header with the filename
    const expectedPattern = new RegExp(
      `# ${testFile.replace(/\\/g, '\\\\')}\n${testContent}`,
    );

    // Check the content matches expected pattern
    expect(result).toMatch(expectedPattern);
  });

  it('[FileNode - write mode] Should write to a file', async () => {
    const newFilePath = path.join(testDir, 'new-file.txt');
    const newContent = 'This is new content for testing write mode';

    const writeStep = new FileNode({
      name: 'Write to test file',
      mode: 'write',
      path: newFilePath,
      content: newContent,
      inputSource: InputSource.DataObject,
      inputDataObject: {},
      inputSchema: z.object({}),
      outputSchema: z.any(),
    });

    const testWorkflow = new Workflow({ writeStep });
    await testWorkflow.execute();
    const result = testWorkflow.getResult('rawData');

    console.log('result', result);

    // Check if file was actually written
    const fileExists = await fs
      .stat(newFilePath)
      .then(() => true)
      .catch(() => false);
    expect(fileExists).toBe(true);

    // Verify the file was actually written
    const fileContent = await fs.readFile(newFilePath, 'utf8');
    expect(fileContent).toBe(newContent);
  });

  it('[FileNode - read mode] Should read directory content as string', async () => {
    // Create additional test files in directory
    await fs.writeFile(path.join(testDir, 'file1.txt'), 'Content of file 1');
    await fs.writeFile(path.join(testDir, 'file2.txt'), 'Content of file 2');

    const readDirStep = new FileNode({
      name: 'Read test directory',
      mode: 'read',
      path: testDir,
      inputSource: InputSource.DataObject,
      inputDataObject: {},
      inputSchema: z.object({}),
      outputSchema: z.string(),
    });

    const testWorkflow = new Workflow({ readDirStep });
    await testWorkflow.execute();
    const result = testWorkflow.getResult('rawData');
    
    console.log('typeof result (directory)', typeof result);
    
    // First ensure the result is a string, not an object
    expect(typeof result).toBe('string');
    
    // Simplified test with regex patterns to be more flexible
    // Check for the presence of file1.txt content
    expect(result).toMatch(/# .*file1\.txt\s+Content of file 1/);
    
    // Check for the presence of file2.txt content
    expect(result).toMatch(/# .*file2\.txt\s+Content of file 2/);
    
    // Check for the presence of test-file.txt content
    expect(result).toMatch(new RegExp(`# .*test-file\\.txt\\s+${testContent}`));
  });

  it('[FileNode - direct use] Should write directly without workflow', async () => {
    const newFilePath = path.join(testDir, 'runtime-override.txt');
    const newContent = 'Content from runtime parameters';

    // Create the FileNode instance
    const fileNode = new FileNode({
      name: 'Direct write test',
      mode: 'write',
      path: newFilePath,
      content: newContent,
      inputSource: InputSource.DataObject,
      inputDataObject: {},
      inputSchema: z.object({}),
      outputSchema: z.any(),
    });

    // Call execute directly with override params
    await fileNode.execute({
      step: fileNode,
      stepInput: {},
    });

    // Verify the file was written
    const fileContent = await fs.readFile(newFilePath, 'utf8');
    expect(fileContent).toBe(newContent);
  });
});

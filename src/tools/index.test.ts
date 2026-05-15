import { describe, expect, test } from 'bun:test';
import { jsonTool } from '@/tools/index.ts';

describe('jsonTool', () => {
  test('success returns pretty text + structuredContent matching the handler result', async () => {
    const wrapped = jsonTool(async (args: { n: number }) => ({ doubled: args.n * 2 }));
    const r = await wrapped({ n: 21 });

    expect(r.content[0]).toEqual({
      type: 'text',
      text: JSON.stringify({ doubled: 42 }, null, 2),
    });
    expect(r.structuredContent).toEqual({ doubled: 42 });
    expect('isError' in r).toBe(false);
  });

  test('error path sets isError and OMITS structuredContent (MCP spec: success schema would not match an { error } shape)', async () => {
    const wrapped = jsonTool(async () => {
      throw new Error('boom');
    });
    const r = await wrapped({});

    expect(r.content[0]).toEqual({ type: 'text', text: 'Error: boom' });
    expect((r as { isError?: boolean }).isError).toBe(true);
    // Spec-critical: client validates any present structuredContent against
    // the tool's outputSchema unconditionally — must stay omitted on error.
    expect('structuredContent' in r).toBe(false);
  });

  test('non-Error throwables stringify into the error message', async () => {
    const wrapped = jsonTool(async () => {
      throw 'literal-string-rejection';
    });
    const r = await wrapped({});
    expect(r.content[0]).toEqual({ type: 'text', text: 'Error: literal-string-rejection' });
    expect((r as { isError?: boolean }).isError).toBe(true);
  });
});

import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert';
import { verifyFact } from './ai-verification';

// Set up environment variable for testing
process.env.GROQ_API_KEY = 'test-key';

describe('verifyFact', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('should return correct result for valid JSON response', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              factScore: 85,
              summary: "Verified correctly.",
              confidence: "High",
              sourcesChecked: 2,
              issues: ["test issue"]
            })
          }
        }
      ]
    };

    // @ts-ignore
    global.fetch = async () => ({
      ok: true,
      json: async () => mockResponse
    });

    const result = await verifyFact('Headline', 'Body', 'https://example.com https://source.test');
    assert.strictEqual(result.factScore, 85);
    assert.strictEqual(result.factSummary, "Verified correctly.");
    assert.strictEqual(result.confidence, "High");
    assert.strictEqual(result.sourcesChecked, 2);
    assert.deepStrictEqual(result.issues, ["test issue"]);
  });

  test('should return fallback result for invalid JSON response (The target issue)', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: "This is not JSON"
          }
        }
      ]
    };

    // @ts-ignore
    global.fetch = async () => ({
      ok: true,
      json: async () => mockResponse
    });

    const result = await verifyFact('Headline', 'Body');
    // This should trigger the catch (parseError) block
    assert.strictEqual(result.factScore, 25);
    assert.match(result.factSummary, /unreadable response/);
    assert.strictEqual(result.confidence, "Low");
    assert.strictEqual(result.sourcesChecked, 0);
    assert.strictEqual(result.issues?.length, 2);
  });

  test('should handle empty or missing content by using "{}" default', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: null
          }
        }
      ]
    };

    // @ts-ignore
    global.fetch = async () => ({
      ok: true,
      json: async () => mockResponse
    });

    const result = await verifyFact('Headline', 'Body');
    // content || "{}" -> "{}" -> JSON.parse -> {}
    // defaults from parsed object should be used
    assert.strictEqual(result.factScore, 50);
    assert.match(result.factSummary, /omitted a written justification/);
    assert.strictEqual(result.confidence, "Medium");
    assert.strictEqual(result.sourcesChecked, 0);
  });

  test('should return error fallback for network failure', async () => {
    // @ts-ignore
    global.fetch = async () => {
      throw new Error('Network failure');
    };

    const result = await verifyFact('Headline', 'Body');
    assert.strictEqual(result.factScore, 25);
    assert.match(result.factSummary, /request failed before completion/);
    assert.strictEqual(result.confidence, "Low");
    assert.strictEqual(result.sourcesChecked, 0);
  });

  test('should return skip result when API key is missing', async () => {
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    try {
      const result = await verifyFact('Headline', 'Body');
      assert.strictEqual(result.factScore, 25);
      assert.match(result.factSummary, /no verification API key is configured/);
      assert.strictEqual(result.confidence, "Low");
      assert.strictEqual(result.sourcesChecked, 0);
    } finally {
      process.env.GROQ_API_KEY = originalKey;
    }
  });
});

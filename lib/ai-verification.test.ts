import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert';
import { verifyFact } from './ai-verification.ts';

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

    const result = await verifyFact('Headline', 'Body');
    assert.strictEqual(result.factScore, 85);
    assert.strictEqual(result.factSummary, "Verified correctly.");
    assert.strictEqual(result.confidence, "High");
    assert.strictEqual(result.sourcesChecked, 1);
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
    assert.strictEqual(result.factScore, 50);
    assert.strictEqual(result.factSummary, "Analysis complete (fallback formatting).");
    assert.strictEqual(result.confidence, "Medium");
    assert.strictEqual(result.sourcesChecked, 1);
    assert.deepStrictEqual(result.issues, []);
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
    assert.strictEqual(result.factSummary, "Analysis complete.");
    assert.strictEqual(result.confidence, "Medium");
  });

  test('should return error fallback for network failure', async () => {
    // @ts-ignore
    global.fetch = async () => {
      throw new Error('Network failure');
    };

    const result = await verifyFact('Headline', 'Body');
    assert.strictEqual(result.factScore, 50);
    assert.strictEqual(result.factSummary, "System evaluation incomplete due to an internal error.");
    assert.strictEqual(result.confidence, "Low");
    assert.strictEqual(result.sourcesChecked, 0);
  });

  test('should return skip result when API key is missing', async () => {
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    try {
      const result = await verifyFact('Headline', 'Body');
      assert.strictEqual(result.factScore, 50);
      assert.strictEqual(result.factSummary, "Verification skipped: Service unavailable.");
      assert.strictEqual(result.confidence, "Low");
      assert.strictEqual(result.sourcesChecked, 0);
    } finally {
      process.env.GROQ_API_KEY = originalKey;
    }
  });
});

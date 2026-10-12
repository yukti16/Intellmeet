const test = require('node:test');
const assert = require('node:assert');
const { generateFallbackAnalysis } = require('../services/aiService');

test('AI Service Fallback Analysis - Transcript 1 (WebRTC & Server Deployment)', () => {
  const transcript1 = `
    Rahul: We decided to deploy the WebRTC turn server to AWS by Friday.
    Alex: Agreed, Rahul will handle the server configuration by Oct 15.
  `;

  const result1 = generateFallbackAnalysis(transcript1);
  assert.ok(result1.summary.executiveSummary.includes('Rahul') || result1.summary.executiveSummary.includes('WebRTC'));
  assert.ok(result1.summary.decisions.some(d => d.includes('WebRTC') || d.includes('AWS') || d.includes('decided')));
  assert.ok(result1.summary.actionItems.length > 0);
  assert.strictEqual(result1.summary.actionItems[0].assignedTo, 'Rahul');
});

test('AI Service Fallback Analysis - Transcript 2 (Design & Figma Branding)', () => {
  const transcript2 = `
    Priya: We approved the new dark pink brand logo for IntellMeet.
    Sarah: Great, Priya will finalize the Figma component library by tomorrow.
  `;

  const result2 = generateFallbackAnalysis(transcript2);
  assert.ok(result2.summary.executiveSummary.includes('Priya') || result2.summary.executiveSummary.includes('logo'));
  assert.ok(result2.summary.decisions.some(d => d.includes('logo') || d.includes('approved')));
  assert.ok(result2.summary.actionItems.length > 0);
  assert.strictEqual(result2.summary.actionItems[0].assignedTo, 'Priya');
  assert.ok(result2.summary.actionItems[0].dueDate.includes('tomorrow'));
});

test('AI Service Fallback Analysis - Transcript 3 (No explicit action items)', () => {
  const transcript3 = `
    General casual discussion about weather and upcoming weekend plans.
  `;

  const result3 = generateFallbackAnalysis(transcript3);
  assert.strictEqual(result3.summary.actionItems.length, 0);
});

test('AI Service Fallback Analysis - Socket.io tech names and explicit deadlines (Rahul & Aman)', () => {
  const transcript4 = `
    Rahul: I will integrate Socket.io chat by October 15.
    Aman: I will test video calling on October 18.
  `;

  const result4 = generateFallbackAnalysis(transcript4);

  // 1. Verify technology name "Socket.io" was not split into separate discussion points ("Socket." and "io chat by October 15")
  const mainPoints = result4.summary.mainPoints;
  assert.ok(!mainPoints.some(p => p.includes('Socket.') && !p.includes('Socket.io')), 'Should not contain fragmented "Socket." discussion point');
  assert.ok(!mainPoints.some(p => p.includes('io chat by October 15') && !p.includes('Socket.io')), 'Should not contain fragmented "io chat by October 15" point');
  assert.ok(mainPoints.some(p => p.includes('Socket.io')), 'Should contain intact "Socket.io"');

  // 2. Verify Action Items extraction
  assert.strictEqual(result4.summary.actionItems.length, 2);

  // Check Item 1: Rahul
  const item1 = result4.summary.actionItems[0];
  assert.strictEqual(item1.assignedTo, 'Rahul');
  assert.strictEqual(item1.dueDate, 'by October 15');
  assert.ok(item1.title.includes('Socket.io'), 'Complete action item text must preserve Socket.io');
  assert.strictEqual(item1.title, 'I will integrate Socket.io chat by October 15.');

  // Check Item 2: Aman
  const item2 = result4.summary.actionItems[1];
  assert.strictEqual(item2.assignedTo, 'Aman');
  assert.strictEqual(item2.dueDate, 'on October 18');
  assert.strictEqual(item2.title, 'I will test video calling on October 18.');
});

test('AI Service Fallback Analysis - No deadline invented when none is mentioned', () => {
  const transcript5 = `
    Rahul: I will integrate Socket.io chat.
    Aman: I will test video calling.
  `;

  const result5 = generateFallbackAnalysis(transcript5);
  assert.strictEqual(result5.summary.actionItems.length, 2);

  const item1 = result5.summary.actionItems[0];
  assert.strictEqual(item1.assignedTo, 'Rahul');
  assert.strictEqual(item1.dueDate, 'TBD');
  assert.strictEqual(item1.title, 'I will integrate Socket.io chat.');

  const item2 = result5.summary.actionItems[1];
  assert.strictEqual(item2.assignedTo, 'Aman');
  assert.strictEqual(item2.dueDate, 'TBD');
  assert.strictEqual(item2.title, 'I will test video calling.');
});


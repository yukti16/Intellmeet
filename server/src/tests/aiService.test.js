const test = require('node:test');
const assert = require('node:assert');
const { generateFallbackAnalysis } = require('../services/aiService');

test('AI Service Fallback Analysis - Transcript 1 (WebRTC & Server Deployment)', () => {
  const transcript1 = `
    Rahul: We decided to deploy the WebRTC turn server to AWS by Friday.
    Alex: Agreed, Rahul will handle the server configuration by Oct 15.
  `;

  const result1 = generateFallbackAnalysis(transcript1);
  assert.ok(result1.summary.executiveSummary.includes('Rahul') || result1.summary.executiveSummary.includes('WebRTC') || result1.summary.executiveSummary.includes('Alex'));
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
  assert.ok(result2.summary.executiveSummary.includes('Priya') || result2.summary.executiveSummary.includes('logo') || result2.summary.executiveSummary.includes('Sarah'));
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

test('AI Service - Q4 Product Launch Planning Transcript Benchmark', () => {
  const q4Transcript = `
    Yukti: Welcome everyone to the Q4 Product Launch Planning meeting. Our primary objective today is to coordinate launch milestones, identify blockers, and assign clear ownership across the team.
    Rahul: I will complete the frontend development by November 7. There is a potential risk with responsive design rendering on older Safari versions.
    Priya: I will handle API integration and authentication testing by November 10. We have a blocker waiting on the third-party OAuth provider approval.
    Aman: I will deliver the marketing launch assets by November 15.
    Yukti: Great. I will coordinate testing and team alignment across both departments.
    Rahul: As a team, we should conduct internal testing by November 12 before staging deployment.
    Priya: Absolutely. The team must resolve all critical bugs by November 20 to ensure a stable release.
    Yukti: We decided to proceed with the phased rollout strategy. I will lead the progress review on November 18.
  `;

  const result = generateFallbackAnalysis(q4Transcript);
  const { summary } = result;

  // 1. Executive Summary verification
  assert.ok(summary.executiveSummary.length > 50);
  assert.ok(!summary.executiveSummary.startsWith('Welcome everyone'));

  // 2. Decision verification (filters out standalone "Agreed" and keeps meaningful decisions)
  assert.ok(summary.decisions.some(d => d.toLowerCase().includes('phased rollout strategy')));

  // 3. Action Items extraction verification
  const items = summary.actionItems;
  assert.ok(items.length >= 7, `Expected at least 7 action items, got ${items.length}`);

  // Rahul -> Frontend completion -> November 7
  const rahulItem = items.find(i => i.assignedTo === 'Rahul');
  assert.ok(rahulItem, 'Rahul task must be found');
  assert.ok(rahulItem.title.toLowerCase().includes('frontend'));
  assert.ok(rahulItem.dueDate.toLowerCase().includes('november 7'));

  // Priya -> API integration and authentication testing -> November 10
  const priyaItem = items.find(i => i.assignedTo === 'Priya');
  assert.ok(priyaItem, 'Priya task must be found');
  assert.ok(priyaItem.title.toLowerCase().includes('api integration') || priyaItem.title.toLowerCase().includes('authentication'));
  assert.ok(priyaItem.dueDate.toLowerCase().includes('november 10'));

  // Aman -> Marketing assets -> November 15
  const amanItem = items.find(i => i.assignedTo === 'Aman');
  assert.ok(amanItem, 'Aman task must be found');
  assert.ok(amanItem.title.toLowerCase().includes('marketing'));
  assert.ok(amanItem.dueDate.toLowerCase().includes('november 15'));

  // Yukti -> Coordinate testing and team alignment
  const yuktiCoordinateItem = items.find(i => i.assignedTo === 'Yukti' && (i.title.toLowerCase().includes('coordinate') || i.title.toLowerCase().includes('alignment')));
  assert.ok(yuktiCoordinateItem, 'Yukti coordinate task must be found');

  // Team -> Internal testing -> November 12
  const teamTestingItem = items.find(i => i.assignedTo === 'Team' && i.title.toLowerCase().includes('internal testing'));
  assert.ok(teamTestingItem, 'Team internal testing task must be found');
  assert.ok(teamTestingItem.dueDate.toLowerCase().includes('november 12'));

  // Team -> Critical bug resolution -> November 20
  const teamBugItem = items.find(i => i.assignedTo === 'Team' && (i.title.toLowerCase().includes('critical bugs') || i.title.toLowerCase().includes('bug')));
  assert.ok(teamBugItem, 'Team critical bug resolution task must be found');
  assert.ok(teamBugItem.dueDate.toLowerCase().includes('november 20'));

  // Yukti -> Progress review -> November 18
  const yuktiReviewItem = items.find(i => i.assignedTo === 'Yukti' && (i.title.toLowerCase().includes('progress review') || i.title.toLowerCase().includes('review')));
  assert.ok(yuktiReviewItem, 'Yukti progress review task must be found');
  assert.ok(yuktiReviewItem.dueDate.toLowerCase().includes('november 18'));

  // 4. Risk Detection verification
  assert.ok(summary.risks.length >= 2, 'Should capture identified risks and blockers');
  assert.ok(summary.risks.some(r => r.toLowerCase().includes('safari') || r.toLowerCase().includes('risk')));
  assert.ok(summary.risks.some(r => r.toLowerCase().includes('blocker') || r.toLowerCase().includes('oauth')));

  // 5. Follow-up Recommendations verification
  assert.ok(summary.followUp.length >= 1, 'Should generate follow-up recommendations');
});

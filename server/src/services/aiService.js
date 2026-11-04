const OpenAI = require('openai');
const { cleanActionTitle, normalizeTitle } = require('../utils/textUtils');

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'sk-proj-your-openai-api-key-here' || apiKey.startsWith('sk-placeholder')) {
    return null;
  }
  return new OpenAI({ apiKey });
};

/**
 * Dynamic, transcript-dependent fallback generator when OpenAI API Key is absent or fails.
 * Parses actual text, speakers, decisions, risks, follow-ups, and explicit action items from the provided transcript.
 */
const generateFallbackAnalysis = (transcriptText) => {
  const text = (transcriptText || '').trim();
  if (!text) {
    return {
      isFallback: true,
      summary: {
        executiveSummary: 'No transcript content provided for analysis.',
        mainPoints: [],
        decisions: [],
        actionItems: [],
        risks: [],
        followUp: [],
      },
      keyPoints: [],
      actionItems: [],
      title: 'Empty Meeting',
    };
  }

  // 1. Tokenize lines & utterances
  const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  const speakerSet = new Set();
  const utterances = [];

  lines.forEach((line) => {
    const match = line.match(/^([A-Za-z0-9\s()]+?):\s*(.+)$/);
    if (match) {
      const rawSpeaker = match[1].replace(/\(.*\)/, '').trim();
      const content = match[2].trim();
      speakerSet.add(rawSpeaker);
      utterances.push({ speaker: rawSpeaker, text: content });
    } else {
      utterances.push({ speaker: 'Participant', text: line });
    }
  });

  const speakers = Array.from(speakerSet);
  const speakerNamesStr = speakers.length > 0 ? speakers.join(', ') : 'the meeting participants';

  // 2. Extract sentences without splitting inside technology names (e.g. Socket.io, Node.js, v1.0)
  const sentences = [];
  utterances.forEach((u) => {
    const rawParts = u.text.split(/(?<!\b(?:e\.g|i\.e|etc|vs|dr|mr|mrs|ms))(?<=[.!?])\s+/i);
    const parts = rawParts.length > 0 ? rawParts : [u.text];
    parts.forEach((p) => {
      const cleanP = p.trim();
      if (cleanP.length > 3) {
        sentences.push({ speaker: u.speaker, sentence: cleanP });
      }
    });
  });

  // 3. Extract Decisions based on decision keywords
  const decisionKeywords = /\b(decided|agreed|approved|resolved|will use|going with|selected|plan to|concluded|settled|confirmed|finalized|commitment|deadline)\b/i;
  const decisions = [];
  const seenDecisions = new Set();

  sentences.forEach((s) => {
    const textStr = s.sentence;
    if (decisionKeywords.test(textStr)) {
      // Do not accept standalone generic words like "Agreed" or "Approved"
      const wordCount = textStr.split(/\s+/).length;
      if (wordCount < 4) return;

      const formatted = (s.speaker !== 'Participant' ? `${s.speaker}: ` : '') + textStr;
      const norm = formatted.toLowerCase().replace(/[^\w\s]/g, '').trim();
      if (!seenDecisions.has(norm)) {
        seenDecisions.add(norm);
        decisions.push(formatted);
      }
    }
  });

  if (decisions.length === 0 && sentences.length > 0) {
    const keySentence = sentences.find((s) => s.sentence.length > 25) || sentences[0];
    decisions.push(`Core agreement: "${keySentence.sentence.slice(0, 90)}..."`);
  }

  // 4. Extract Action Items (ONLY when explicitly mentioned)
  const actionKeywords = /\b(will|should|needs to|need to|must|assigned to|responsible for|take care of|to handle|to prepare|to build|to write|to review|to deliver|to fix|to update|integrate|test|coordinate|review|complete|finalize|deliver|resolve|fix)\b/i;
  const rawActionItems = [];

  const ignoredNames = new Set([
    'the', 'we', 'i', 'you', 'it', 'this', 'that', 'there',
    'they', 'he', 'she', 'what', 'who', 'someone', 'everyone',
    'anyone', 'nobody', 'which', 'today', 'tomorrow', 'yesterday'
  ]);

  // Regex to extract explicit deadlines:
  // e.g., "by October 15", "on October 18", "by November 7", "by Friday", "by tomorrow", "next week", "in 3 days"
  const deadlineRegex = new RegExp(
    '\\b(?:' +
      '(?:by|on|before|due)\\s+(?:' +
        '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{1,2}(?:st|nd|rd|th)?(?:\\s*,?\\s*\\d{2,4})?' +
        '|\\d{1,2}(?:st|nd|rd|th)?(?:\\s+(?:of\\s+)?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?))?(?:\\s*,?\\s*\\d{2,4})?' +
        '|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)' +
        '|tomorrow|today|tonight' +
        '|next\\s+[a-z]+' +
        '|(?:the\\s+)?end\\s+of\\s+(?:the\\s+)?(?:day|week|month)|eod|eow' +
        '|\\d{1,4}[/-]\\d{1,2}(?:[/-]\\d{1,4})?' +
      ')' +
      '|next\\s+(?:week|month|year|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)' +
      '|tomorrow|today|tonight' +
      '|in\\s+\\d+\\s+(?:days?|weeks?|hours?)' +
    ')\\b',
    'i'
  );

  sentences.forEach((s) => {
    const textStr = s.sentence;
    if (actionKeywords.test(textStr)) {
      let assignedTo = 'Unassigned';

      // 1. Check if the speaker explicitly refers to themselves ("I will...", "I'll...", "I can...", "I'm going to...")
      if (/\b(?:i\s+will|i'll|i\s+can|i\s+am\s+going\s+to|i\s+shall|i\s+should)\b/i.test(textStr)) {
        assignedTo = s.speaker !== 'Participant' ? s.speaker : 'Unassigned';
      } else {
        // 2. Check for third-party name or "Team" before action verb: e.g. "Rahul will...", "Team will...", "Yukti to..."
        const nameMatch = textStr.match(/\b([A-Z][a-z]+|Team)\s+(?:will|should|needs to|need to|must|has to|have to|is to|to|is assigned to|shall)\b/);
        if (nameMatch && nameMatch[1] && !ignoredNames.has(nameMatch[1].toLowerCase())) {
          assignedTo = nameMatch[1];
        } else {
          // 3. Check for explicit delegation: "assigned to Rahul", "delegate to Aman"
          const assignMatch = textStr.match(/\b(?:assigned to|delegate to)\s+([A-Z][a-z]+|Team)\b/i);
          if (assignMatch && assignMatch[1] && !ignoredNames.has(assignMatch[1].toLowerCase())) {
            assignedTo = assignMatch[1];
          } else if (/\b(?:we\s+will|let's|team\s+should|we\s+must|we\s+need\s+to)\b/i.test(textStr)) {
            // Collective commitment by the team
            assignedTo = 'Team';
          }
        }
      }

      // Look for explicit deadline (e.g., "by October 15", "on November 10")
      let dueDate = 'TBD';
      const dateMatch = textStr.match(deadlineRegex);
      if (dateMatch) {
        dueDate = dateMatch[0].trim();
      }

      let priority = 'Medium';
      if (/\b(urgent|critical|high priority|asap|immediately|blocker|severe|crucial)\b/i.test(textStr)) {
        priority = 'High';
      } else if (/\b(low priority|when possible|later|nice to have)\b/i.test(textStr)) {
        priority = 'Low';
      }

      // Clean title from stutter or repeated phrases, and strip redundant assignment prefix
      const cleanTitle = cleanActionTitle(textStr, assignedTo);

      // Create clear description separating speaker from assignee
      let description = '';
      if (assignedTo !== 'Unassigned' && s.speaker !== 'Participant') {
        if (assignedTo.toLowerCase() === s.speaker.toLowerCase()) {
          description = `Committed by ${s.speaker} in meeting discussion.`;
        } else {
          description = `Mentioned by ${s.speaker} (assigned to ${assignedTo}).`;
        }
      } else if (s.speaker !== 'Participant') {
        description = `Mentioned by ${s.speaker} in meeting discussion.`;
      } else {
        description = `Action item identified from meeting discussion.`;
      }

      // Deduplicate within the actionItems list
      const norm = normalizeTitle(cleanTitle);
      const alreadyExists = rawActionItems.some((ai) => normalizeTitle(ai.title) === norm);
      if (!alreadyExists && cleanTitle.length >= 4) {
        rawActionItems.push({
          title: cleanTitle,
          description,
          speaker: s.speaker,
          assignedTo,
          dueDate,
          priority,
          status: 'Pending',
        });
      }
    }
  });

  const uniqueActionItems = rawActionItems.slice(0, 15);

  // 5. Risk Detection: Extract blockers, dependencies, risks and potential delays
  const riskKeywords = /\b(risk|blocker|dependency|delay|issue|challenge|concern|problem|bug|uncertainty|bottleneck|waiting on|stuck)\b/i;
  const risks = [];
  sentences.forEach((s) => {
    if (riskKeywords.test(s.sentence)) {
      const riskText = (s.speaker !== 'Participant' ? `${s.speaker} noted: ` : '') + s.sentence;
      if (!risks.includes(riskText)) {
        risks.push(riskText);
      }
    }
  });

  if (risks.length === 0) {
    risks.push(`Ensure continuous alignment between ${speakerNamesStr} on deliverables.`);
  }

  // 6. Follow-up Recommendations: Practical next steps based on unresolved items and reviews
  const followUpKeywords = /\b(follow up|next meeting|sync|review|next steps|touch base|regroup|circle back|check back|sync up)\b/i;
  const followUp = [];
  sentences.forEach((s) => {
    if (followUpKeywords.test(s.sentence)) {
      const fuText = (s.speaker !== 'Participant' ? `${s.speaker}: ` : '') + s.sentence;
      if (!followUp.includes(fuText)) {
        followUp.push(fuText);
      }
    }
  });

  if (followUp.length === 0) {
    if (uniqueActionItems.length > 0) {
      followUp.push(`Track and review completion of ${uniqueActionItems.length} assigned action item(s) before next session.`);
    }
    followUp.push(`Regroup with ${speakerNamesStr} to evaluate milestone progress and open dependencies.`);
  }

  // 7. Main Discussion Points: Group related statements by speaker/topic
  const speakerUtterances = new Map();
  utterances.forEach((u) => {
    const list = speakerUtterances.get(u.speaker) || [];
    list.push(u.text);
    speakerUtterances.set(u.speaker, list);
  });

  const mainPoints = [];
  speakerUtterances.forEach((texts, spk) => {
    const combined = texts.join(' ');
    // Pick the most substantial sentence for each speaker
    const spkSentences = texts
      .flatMap((t) => t.split(/(?<=[.!?])\s+/))
      .filter((s) => s.trim().length > 15);

    if (spkSentences.length > 0) {
      const representative = spkSentences[0].trim();
      mainPoints.push(
        spk !== 'Participant'
          ? `${spk} covered ${spkSentences.length > 1 ? 'updates including' : 'update'}: "${representative}"`
          : representative
      );
    }
  });

  if (mainPoints.length === 0) {
    sentences.slice(0, 4).forEach((s) => {
      mainPoints.push((s.speaker !== 'Participant' ? `${s.speaker} highlighted: ` : '') + s.sentence);
    });
  }

  // 8. Executive Summary: Synthesis including objectives, outcomes, and tasks
  const totalActions = uniqueActionItems.length;
  const keyDecisionsCount = decisions.length;
  const topTopics = mainPoints.slice(0, 2).map((p) => p.replace(/^[^:]+:\s*/, '')).join(' ');

  let executiveSummary = `The meeting brought together ${speakerNamesStr} to coordinate objectives and milestone deliverables. `;
  if (topTopics) {
    executiveSummary += `Key discussions focused on ${topTopics.slice(0, 160)}. `;
  }
  if (keyDecisionsCount > 0) {
    executiveSummary += `The team finalized ${keyDecisionsCount} key agreement(s) and decision(s). `;
  }
  if (totalActions > 0) {
    executiveSummary += `A total of ${totalActions} actionable commitment(s) were assigned across owners with target milestones established.`;
  } else {
    executiveSummary += `Discussion concluded with alignment on ongoing project objectives.`;
  }

  return {
    isFallback: true,
    summary: {
      executiveSummary: executiveSummary.trim(),
      mainPoints,
      decisions,
      actionItems: uniqueActionItems,
      risks,
      followUp,
    },
    keyPoints: mainPoints,
    actionItems: uniqueActionItems,
    title: `Discussion with ${speakerNamesStr}`,
  };
};

/**
 * Generate AI Summary using OpenAI API if available, or dynamic transcript fallback.
 */
const generateMeetingSummary = async (transcriptText) => {
  const trimmed = (transcriptText || '').trim();
  if (!trimmed) {
    return generateFallbackAnalysis('').summary;
  }

  const openai = getOpenAIClient();
  if (!openai) {
    console.log('[AI Service] OpenAI API Key not configured. Running transcript-dependent Dev Fallback Engine.');
    return generateFallbackAnalysis(trimmed).summary;
  }

  try {
    const prompt = `You are an elite executive meeting assistant. Analyze the following meeting transcript thoroughly and return a valid JSON object matching the exact schema:

{
  "executiveSummary": "A comprehensive 3-5 sentence synthesis covering meeting objectives, major progress updates, blockers, and agreed outcomes. Do NOT merely copy the first sentence.",
  "mainPoints": [
    "Array of 3-6 grouped discussion points synthesizing key topics with speaker attribution."
  ],
  "decisions": [
    "Array of explicit agreements, deadlines, commitments, and finalized decisions. Do NOT output standalone single words like 'Agreed' or 'Approved'."
  ],
  "actionItems": [
    {
      "title": "Actionable task title starting with a clear action verb (e.g. 'Complete frontend development by November 7')",
      "description": "Clear context and details regarding the task",
      "assignedTo": "Name of the explicit assignee (e.g. 'Rahul', 'Priya', 'Team') or 'Unassigned' if not mentioned. Never invent names.",
      "dueDate": "Explicit mentioned deadline (e.g. 'by November 10', 'November 15') or 'TBD' if no date was specified. Never invent dates.",
      "priority": "High | Medium | Low (assign High for critical/urgent/blockers, Low for minor tasks, Medium default)",
      "status": "Pending"
    }
  ],
  "risks": [
    "Array of identified risks, blockers, potential delays, or dependencies mentioned with speaker context and mitigation if noted."
  ],
  "followUp": [
    "Array of practical follow-up recommendations, next steps, and topics for the next meeting."
  ]
}

Transcript:
${trimmed}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    const rawActionItems = parsed.actionItems || [];

    // Clean and validate action item titles
    const cleanedActionItems = [];
    rawActionItems.forEach((item) => {
      const title = cleanActionTitle(item.title, item.assignedTo);
      const norm = normalizeTitle(title);
      if (title.length >= 4 && !cleanedActionItems.some((c) => normalizeTitle(c.title) === norm)) {
        cleanedActionItems.push({
          ...item,
          title,
          assignedTo: item.assignedTo || 'Unassigned',
          dueDate: item.dueDate || 'TBD',
          priority: ['High', 'Medium', 'Low'].includes(item.priority) ? item.priority : 'Medium',
          status: 'Pending',
        });
      }
    });

    return {
      executiveSummary: parsed.executiveSummary || '',
      mainPoints: parsed.mainPoints || [],
      decisions: parsed.decisions || [],
      actionItems: cleanedActionItems,
      risks: parsed.risks || [],
      followUp: parsed.followUp || [],
    };
  } catch (error) {
    console.error('[AI Service Error] generateMeetingSummary failed:', error.message);
    return generateFallbackAnalysis(trimmed).summary;
  }
};

const extractKeyPoints = async (transcriptText) => {
  const trimmed = (transcriptText || '').trim();
  if (!trimmed) {
    return [];
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return generateFallbackAnalysis(trimmed).keyPoints;
  }

  try {
    const prompt = `Extract 3 to 6 key discussion points from this meeting transcript as a JSON object with key "keyPoints" (array of strings):\n\n${trimmed}`;
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    const parsed = JSON.parse(response.choices[0].message.content);
    return parsed.keyPoints || [];
  } catch (error) {
    console.error('[AI Service Error] extractKeyPoints failed:', error.message);
    return generateFallbackAnalysis(trimmed).keyPoints;
  }
};

const extractActionItems = async (transcriptText) => {
  const trimmed = (transcriptText || '').trim();
  if (!trimmed) {
    return [];
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return generateFallbackAnalysis(trimmed).actionItems;
  }

  try {
    const prompt = `Extract actionable tasks from this transcript as a JSON object with key "actionItems" (array of objects with title, description, assignedTo, dueDate, priority (Low/Medium/High), status (Pending)).
Guidelines:
- "title" must be concise and actionable, starting with an action verb (e.g. 'Complete frontend development by November 7'), without stutter or repeated phrases.
- "assignedTo" must be the name of the person or entity responsible (e.g. 'Rahul', 'Priya', 'Team'), or "Unassigned" if passive or unspecified. Distinguish speaker from assignee. Never invent assignees.
- "dueDate" should capture explicit deadlines (e.g. 'November 10', 'tomorrow', 'Friday') or 'TBD'. Never invent deadlines.
- Return empty array [] if no explicit tasks are mentioned.
Transcript:\n\n${trimmed}`;
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });
    const parsed = JSON.parse(response.choices[0].message.content);
    const rawList = parsed.actionItems || [];

    // Normalize titles and deduplicate
    const cleanedList = [];
    rawList.forEach((item) => {
      const title = cleanActionTitle(item.title, item.assignedTo);
      const norm = normalizeTitle(title);
      if (title.length >= 4 && !cleanedList.some((c) => normalizeTitle(c.title) === norm)) {
        cleanedList.push({
          ...item,
          title,
          assignedTo: item.assignedTo || 'Unassigned',
          dueDate: item.dueDate || 'TBD',
          priority: ['High', 'Medium', 'Low'].includes(item.priority) ? item.priority : 'Medium',
          status: 'Pending',
        });
      }
    });

    return cleanedList;
  } catch (error) {
    console.error('[AI Service Error] extractActionItems failed:', error.message);
    return generateFallbackAnalysis(trimmed).actionItems;
  }
};

const generateFollowUp = async (transcriptText) => {
  const trimmed = (transcriptText || '').trim();
  if (!trimmed) {
    return [];
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return generateFallbackAnalysis(trimmed).summary.followUp;
  }

  try {
    const prompt = `Generate follow-up recommendations based on this meeting transcript as a JSON object with key "followUp" (array of strings):\n\n${trimmed}`;
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    const parsed = JSON.parse(response.choices[0].message.content);
    return parsed.followUp || [];
  } catch (error) {
    return generateFallbackAnalysis(trimmed).summary.followUp;
  }
};

const generateMeetingTitle = async (transcriptText) => {
  const trimmed = (transcriptText || '').trim();
  if (!trimmed) {
    return 'Empty Meeting';
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return generateFallbackAnalysis(trimmed).title;
  }

  try {
    const prompt = `Generate a concise, professional 3 to 6 word title for a meeting based on this transcript as a JSON object with key "title" (string):\n\n${trimmed}`;
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });
    const parsed = JSON.parse(response.choices[0].message.content);
    return parsed.title || 'Team Synchronization';
  } catch (error) {
    return generateFallbackAnalysis(trimmed).title;
  }
};

module.exports = {
  generateMeetingSummary,
  extractKeyPoints,
  extractActionItems,
  generateFollowUp,
  generateMeetingTitle,
  generateFallbackAnalysis,
};

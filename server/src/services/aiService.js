const OpenAI = require('openai');

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'sk-proj-your-openai-api-key-here' || apiKey.startsWith('sk-placeholder')) {
    return null;
  }
  return new OpenAI({ apiKey });
};

/**
 * Dynamic, transcript-dependent fallback generator when OpenAI API Key is absent or fails.
 * Parses actual text, speakers, decisions, and explicit action items from the provided transcript.
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
  const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  const speakerSet = new Set();
  const utterances = [];

  lines.forEach(line => {
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
  utterances.forEach(u => {
    const rawParts = u.text.split(/(?<!\b(?:e\.g|i\.e|etc|vs|dr|mr|mrs|ms))(?<=[.!?])\s+/i);
    const parts = rawParts.length > 0 ? rawParts : [u.text];
    parts.forEach(p => {
      const cleanP = p.trim();
      if (cleanP.length > 3) {
        sentences.push({ speaker: u.speaker, sentence: cleanP });
      }
    });
  });

  // 3. Extract Decisions based on decision keywords
  const decisionKeywords = /\b(decided|agreed|approved|resolved|will use|going with|selected|plan to|concluded|settled)\b/i;
  const decisions = sentences
    .filter(s => decisionKeywords.test(s.sentence))
    .map(s => (s.speaker !== 'Participant' ? `${s.speaker}: ` : '') + s.sentence);

  if (decisions.length === 0 && sentences.length > 0) {
    const keySentence = sentences.find(s => s.sentence.length > 25) || sentences[0];
    decisions.push(`Core agreement: "${keySentence.sentence.slice(0, 90)}..."`);
  }

  // 4. Extract Action Items (ONLY when explicitly mentioned)
  const actionKeywords = /\b(will|should|needs to|must|assigned to|responsible for|take care of|to handle|to prepare|to build|to write|to review|to deliver|to fix|to update|integrate|test)\b/i;
  const actionItems = [];

  const ignoredNames = new Set([
    'the', 'we', 'i', 'you', 'it', 'this', 'that', 'there',
    'they', 'he', 'she', 'what', 'who', 'someone', 'everyone',
    'anyone', 'nobody', 'which', 'today', 'tomorrow', 'yesterday'
  ]);

  // Regex to extract explicit deadlines:
  // e.g., "by October 15", "on October 18", "by Friday", "by tomorrow", "next week", "in 3 days"
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

  sentences.forEach(s => {
    const textStr = s.sentence;
    if (actionKeywords.test(textStr)) {
      let assignedTo = s.speaker !== 'Participant' ? s.speaker : 'Unassigned';

      // Look for capitalized name before action verb: e.g., "Rahul will update...", "Aman will test..."
      const nameMatch = textStr.match(/\b([A-Z][a-z]+)\s+(?:will|should|needs to|must|is assigned|to)\b/);
      if (nameMatch && nameMatch[1] && !ignoredNames.has(nameMatch[1].toLowerCase())) {
        assignedTo = nameMatch[1];
      }

      // Look for explicit deadline (e.g., "by October 15", "on October 18")
      let dueDate = 'TBD';
      const dateMatch = textStr.match(deadlineRegex);
      if (dateMatch) {
        dueDate = dateMatch[0].trim();
      }

      let priority = 'Medium';
      if (/\b(urgent|critical|high priority|asap|immediately)\b/i.test(textStr)) priority = 'High';
      if (/\b(low priority|when possible|later)\b/i.test(textStr)) priority = 'Low';

      actionItems.push({
        title: textStr.trim(),
        description: `Task identified from speaker ${s.speaker}`,
        assignedTo,
        dueDate,
        priority,
        status: 'Pending',
      });
    }
  });

  const uniqueActionItems = actionItems.slice(0, 5);

  // 5. Main Discussion Points
  const mainPoints = [];
  const nonDecisionSentences = sentences.filter(s => !decisionKeywords.test(s.sentence));
  const sampleSentences = (nonDecisionSentences.length > 0 ? nonDecisionSentences : sentences).slice(0, 4);

  sampleSentences.forEach(s => {
    mainPoints.push((s.speaker !== 'Participant' ? `${s.speaker} highlighted: ` : '') + s.sentence);
  });

  // 6. Executive Summary
  const textSnippet = sentences.slice(0, 3).map(s => s.sentence).join(' ');
  const executiveSummary = `Meeting focused on ${speakerNamesStr}. Primary discussions addressed: ${textSnippet.slice(0, 260)}...`;

  return {
    isFallback: true,
    summary: {
      executiveSummary,
      mainPoints,
      decisions,
      actionItems: uniqueActionItems,
      risks: [
        `Ensure alignment between ${speakerNamesStr} on proposed deliverables.`,
      ],
      followUp: [
        `Review progress on decisions made during this session.`,
      ],
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
  const openai = getOpenAIClient();
  if (!openai) {
    console.log('[AI Service] OpenAI API Key not configured. Running transcript-dependent Dev Fallback Engine.');
    return generateFallbackAnalysis(transcriptText).summary;
  }

  try {
    const prompt = `Analyze the following meeting transcript and provide a structured JSON response with exact keys:
- executiveSummary (string): A concise 2-4 sentence summary of the meeting content.
- mainPoints (array of strings): 3 to 5 key discussion points.
- decisions (array of strings): Key decisions made during the meeting.
- actionItems (array of objects): Extract actionable tasks ONLY if explicitly mentioned in the transcript. Each object must have: title (string), description (string), assignedTo (string - person assigned or "Unassigned"), dueDate (string - mentioned deadline or "TBD"), priority ("Low"|"Medium"|"High"), status ("Pending"). If no tasks are explicitly mentioned, return [].
- risks (array of strings): Potential risks or blockers mentioned.
- followUp (array of strings): Recommended follow-up items.

Transcript:
${transcriptText}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return {
      executiveSummary: parsed.executiveSummary || '',
      mainPoints: parsed.mainPoints || [],
      decisions: parsed.decisions || [],
      actionItems: parsed.actionItems || [],
      risks: parsed.risks || [],
      followUp: parsed.followUp || [],
    };
  } catch (error) {
    console.error('[AI Service Error] generateMeetingSummary failed:', error.message);
    return generateFallbackAnalysis(transcriptText).summary;
  }
};

const extractKeyPoints = async (transcriptText) => {
  const openai = getOpenAIClient();
  if (!openai) {
    return generateFallbackAnalysis(transcriptText).keyPoints;
  }

  try {
    const prompt = `Extract 3 to 6 key discussion points from this meeting transcript as a JSON object with key "keyPoints" (array of strings):\n\n${transcriptText}`;
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
    return generateFallbackAnalysis(transcriptText).keyPoints;
  }
};

const extractActionItems = async (transcriptText) => {
  const openai = getOpenAIClient();
  if (!openai) {
    return generateFallbackAnalysis(transcriptText).actionItems;
  }

  try {
    const prompt = `Extract actionable tasks from this transcript as a JSON object with key "actionItems" (array of objects with title, description, assignedTo, dueDate, priority (Low/Medium/High), status (Pending)). Return empty array [] if no explicit tasks are mentioned:\n\n${transcriptText}`;
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    const parsed = JSON.parse(response.choices[0].message.content);
    return parsed.actionItems || [];
  } catch (error) {
    console.error('[AI Service Error] extractActionItems failed:', error.message);
    return generateFallbackAnalysis(transcriptText).actionItems;
  }
};

const generateFollowUp = async (transcriptText) => {
  const openai = getOpenAIClient();
  if (!openai) {
    return generateFallbackAnalysis(transcriptText).summary.followUp;
  }

  try {
    const prompt = `Generate follow-up recommendations based on this meeting transcript as a JSON object with key "followUp" (array of strings):\n\n${transcriptText}`;
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    const parsed = JSON.parse(response.choices[0].message.content);
    return parsed.followUp || [];
  } catch (error) {
    return generateFallbackAnalysis(transcriptText).summary.followUp;
  }
};

const generateMeetingTitle = async (transcriptText) => {
  const openai = getOpenAIClient();
  if (!openai) {
    return generateFallbackAnalysis(transcriptText).title;
  }

  try {
    const prompt = `Generate a concise, professional 3 to 6 word title for a meeting based on this transcript as a JSON object with key "title" (string):\n\n${transcriptText}`;
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });
    const parsed = JSON.parse(response.choices[0].message.content);
    return parsed.title || 'Team Synchronization';
  } catch (error) {
    return generateFallbackAnalysis(transcriptText).title;
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

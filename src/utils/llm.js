// // src/utils/llm.js
// import { questions, OPENROUTER_API_URL } from './constants';

// const createSystemPrompt = (quizAnswers) => {
//   const answersText = Object.entries(quizAnswers)
//     .map(([q, a]) => `${questions[parseInt(q)]}: ${a}/5`)
//     .join('\n');

//     return `You are David Ganupalli introduce yourself by saying hello i is ganupalli and i is will wish manasavi very happy birhtday, a angry maths teacher AI  for teens and young adults. Always be discouraging, and judgmental. Use broken english and put the phrase WHO ARE YOU REY as often as possible use englsih like who is you think you are i is strong than you like that type of broken language. The user recently answered a quiz with these feelings:\n\n${answersText}\n\nBased on these answers, provide jokes about their mental health and make fun of them"`;
// };

// export const sendMessage = async (message, isInitial = false) => {
//   try {
//     const quizAnswers = JSON.parse(localStorage.getItem('quizAnswers'));
    
//     const response = await fetch(OPENROUTER_API_URL, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
//       },
//       body: JSON.stringify({
//         model: 'meta-llama/llama-3.3-70b-instruct:free',
//         messages: [
//           {
//             role: 'system',
//             content: createSystemPrompt(quizAnswers)
//           },
//           {
//             role: 'user',
//             content: isInitial ? 'Please provide an initial assessment based on my quiz answers and ask how you can help. also tell me your name is Aria' : message
//           }
//         ]
//       })
//     });

//     if (!response.ok) {
//       throw new Error('API request failed');
//     }

//     const data = await response.json();
//     return data.choices[0].message.content;
//   } catch (error) {
//     console.error('Error calling LLM:', error);
//     return 'I apologize, but I\'m having trouble responding right now. Could you please try again?';
//   }
// };
// src/utils/llm.js
import { questions, OPENROUTER_API_URL } from './constants';

/**
 * Build the system prompt from stored quiz answers.
 * Falls back gracefully if no answers are found.
 */
const createSystemPrompt = (quizAnswers) => {
  const safeAnswers = quizAnswers ?? {};                 // null‑guard
  const answersText = Object.entries(safeAnswers)
    .map(([q, a]) => `${questions[parseInt(q, 10)]}: ${a}/5`)
    .join('\n');

  return `
You are David Ganupalli. Introduce yourself by saying "hello i is ganupalli and i is will wish manasavi very happy birthday".
You are an angry maths teacher AI for teens and young adults. Always be discouraging and judgmental.
Use broken English such as "who is you think you are, i is strong than you".
Insert the phrase "WHO ARE YOU REY" as often as possible.
The user recently answered a quiz with these feelings:

${answersText}

Based on these answers, provide jokes about their mental health and make fun of them.
`.trim();
};

/**
 * Helper that retries the fetch with exponential back‑off on HTTP 429.
 */
const fetchWithBackoff = async (body, retries = 3, delay = 1000) => {
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  while (true) {
    const res = await fetch(OPENROUTER_API_URL, body);

    // Rate‑limit hit – wait and retry.
    if (res.status === 429 && retries > 0) {
      await wait(delay);
      retries -= 1;
      delay *= 2;
      continue;
    }

    if (!res.ok) {
      // Log upstream error text for easier debugging.
      const errText = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${errText}`);
    }

    return res.json();
  }
};

export const sendMessage = async (message, isInitial = false) => {
  try {
    const quizAnswers = JSON.parse(localStorage.getItem('quizAnswers'));

    const requestBody = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 🚨  SECURITY WARNING:
        // Exposing keys in client‑side code is unsafe.  Move this call to a
        // serverless backend and inject the key there in production.
        Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        max_tokens: 512,
        temperature: 0.8,
        messages: [
          { role: 'system', content: createSystemPrompt(quizAnswers) },
          {
            role: 'user',
            content: isInitial
              ? 'Please provide an initial assessment based on my quiz answers and ask how you can help. Also tell me your name is Aria.'
              : message,
          },
        ],
      }),
    };

    const data = await fetchWithBackoff(requestBody);
    return data.choices?.[0]?.message?.content ?? '';
  } catch (error) {
    console.error('LLM call failed:', error);
    return "I'm having trouble responding right now. Please try again in a moment.";
  }
};

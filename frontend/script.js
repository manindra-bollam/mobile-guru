// --- Gemini API Configuration ---
const API_KEY = ""; // Leave as-is. Environment provides the key.
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;
const model = "gemini-2.5-flash-preview-09-2025";

// --- MobileGuru Persona and State ---
const SYSTEM_INSTRUCTION =
  "You are 'MobileGuru', a world-class, extremely helpful and detailed expert on mobile phones, processors, pricing, and purchasing decisions. Your goal is to guide the user in selecting the best smartphone for their needs and budget. Provide clear comparisons, explain technical terms simply, and always ask clarifying questions to narrow down the recommendation (e.g., budget, usage, camera priority). Maintain a friendly, professional, and knowledgeable tone. Format your responses using Markdown for readability (bolding, lists).";

let chatHistory = [];
let isProcessing = false;

// --- DOM Elements ---
const messagesContainer = document.getElementById("messages-container");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const statusMessage = document.getElementById("status-message");

// --- Helper Functions ---

/**
 * Simple Markdown to HTML converter (for bold and lists only)
 */
function formatMarkdown(text) {
  // Convert *bold* to <strong>
  let html = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Basic line break conversion
  html = html.replace(/\n/g, "<br>");
  return html;
}

/**
 * Creates a chat message element (Bot or User)
 */
function createMessageElement(text, isUser) {
  const messageWrapper = document.createElement("div");
  messageWrapper.className = `flex ${isUser ? "justify-end" : "justify-start"}`;

  const messageBubble = document.createElement("div");
  messageBubble.className = `max-w-lg rounded-xl p-4 text-white shadow-lg break-words transition duration-500 ${
    isUser ? "user-message rounded-br-none" : "bot-message rounded-tl-none"
  }`;

  if (!isUser) {
    const header = document.createElement("p");
    header.className = "font-bold text-yellow-400 mb-1";
    header.textContent = "MobileGuru:";
    messageBubble.appendChild(header);
  }

  const content = document.createElement("p");
  content.innerHTML = formatMarkdown(text);
  messageBubble.appendChild(content);

  messageWrapper.appendChild(messageBubble);
  messagesContainer.appendChild(messageWrapper);

  // Auto-scroll to the bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return messageBubble; // Return the bubble for potential updates (like loading)
}

/**
 * Displays the loading animation (three bouncing dots)
 */
function showLoading(targetElement) {
  targetElement.innerHTML = "";
  const dots = ["bg-yellow-500", "bg-yellow-400", "bg-yellow-300"];
  dots.forEach((color) => {
    const dot = document.createElement("div");
    dot.className = `loading-animation rounded-full inline-block ${color}`;
    targetElement.appendChild(dot);
  });
}

/**
 * Main function to send the message
 */
async function sendMessage() {
  if (isProcessing) return;

  const userText = userInput.value.trim();
  if (!userText) return;

  isProcessing = true;
  userInput.value = "";
  sendButton.disabled = true;

  // 1. Display User Message
  createMessageElement(userText, true);

  // 2. Add to Chat History
  chatHistory.push({ role: "user", parts: [{ text: userText }] });

  // 3. Display Loading Message
  const botBubble = createMessageElement("", false);
  showLoading(botBubble.querySelector("p:last-child"));

  // 4. API Call with Exponential Backoff
  const MAX_RETRIES = 5;
  let responseText =
    "Sorry, MobileGuru is currently unavailable. Please try again later.";
  statusMessage.classList.add("hidden"); // Clear previous errors

  try {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const payload = {
          contents: chatHistory,
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
        };

        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          const candidate = result.candidates?.[0];

          if (candidate && candidate.content?.parts?.[0]?.text) {
            responseText = candidate.content.parts[0].text;
            // Add model response to history
            chatHistory.push({
              role: "model",
              parts: [{ text: responseText }],
            });
            break; // Success
          } else {
            throw new Error("Received invalid response structure from API.");
          }
        } else {
          // If it's a 429 or 500 error, retry
          if (response.status === 429 || response.status >= 500) {
            if (attempt < MAX_RETRIES - 1) {
              const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue; // Retry
            } else {
              throw new Error(
                `API failed after ${MAX_RETRIES} attempts with status ${response.status}.`
              );
            }
          } else {
            const errorData = await response.json();
            throw new Error(
              errorData.error?.message || `API Error: ${response.statusText}`
            );
          }
        }
      } catch (error) {
        if (attempt === MAX_RETRIES - 1) {
          throw error; // Propagate error if last attempt failed
        }
      }
    }
  } catch (error) {
    statusMessage.textContent = `Error: ${error.message}. Please check console for details.`;
    statusMessage.classList.remove("hidden");
  } finally {
    // 5. Update Bot Message
    botBubble.querySelector("p:last-child").innerHTML =
      formatMarkdown(responseText);

    isProcessing = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

// Focus input on load
window.onload = () => {
  userInput.focus();
};

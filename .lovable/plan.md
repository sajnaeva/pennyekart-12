

# AI Chatbot with Voice Support

## What We're Building

A floating chat bubble (bottom-right corner) that opens a conversational AI assistant. The bot helps customers with shopping queries (find products, check availability) and customer support (order tracking, returns, delivery questions). Users can tap a mic button to speak their message instead of typing — speech is converted to text, and the AI responds in text with streaming.

## Architecture

```text
┌─────────────────────┐       ┌──────────────────────┐
│  React Frontend     │       │  Edge Function: chat  │
│                     │       │                       │
│  FloatingChatBot    │──SSE──│  Lovable AI Gateway   │
│  + Web Speech API   │       │  (gemini-3-flash)     │
│  (mic → text)       │       │  System prompt with   │
│                     │       │  store context         │
└─────────────────────┘       └──────────────────────┘
```

- **Voice input**: Browser's built-in Web Speech API (`webkitSpeechRecognition`) — no extra dependencies or API keys needed
- **AI backend**: Supabase Edge Function calling Lovable AI Gateway with `LOVABLE_API_KEY` (already available)
- **Streaming**: SSE token-by-token rendering for fast responses

## Implementation Steps

### 1. Create Edge Function `supabase/functions/chat/index.ts`
- Accept `{ messages }` array from client
- Inject a system prompt tailored to Pennyekart (shopping assistant + customer support context)
- Stream response from Lovable AI Gateway (`google/gemini-3-flash-preview`)
- Handle CORS, 429/402 error codes

### 2. Update `supabase/config.toml`
- Add `[functions.chat]` with `verify_jwt = false`

### 3. Create `src/components/ChatBot.tsx`
- Floating bubble icon (bottom-right, above mobile nav)
- Expandable chat window with message list and input
- Markdown rendering for AI responses (`react-markdown`)
- Streaming integration using SSE parsing
- Mic button using Web Speech API for speech-to-text
- Visual indicator when listening (pulsing mic icon)
- Error handling with toast notifications for rate limits

### 4. Add ChatBot to `src/App.tsx`
- Render `<ChatBot />` globally inside the router, visible on all pages

### Technical Details

- **No new dependencies needed** except `react-markdown` (for rendering AI responses)
- **Web Speech API** works in Chrome, Edge, Safari — fallback hides mic button on unsupported browsers
- **System prompt** will reference Pennyekart brand, product categories, order help, and wallet features
- Uses earth-tone styling consistent with brand (amber accents, DM Sans font)


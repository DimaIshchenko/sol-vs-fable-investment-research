# The prompt

Both agents received the **identical task prompt** on **2026-07-09**:

```
Act as an investment research analyst. Using official statistics and data from Ukrainian government: https://stat.gov.ua/en
Identify the most promising sectors and specific investment opportunities in Ukraine for a private investor with $10M in capital, optimizing for maximum return over a 10-year horizon.
Return your result in one big slide and a folder with all calculations and sources
```

## Run settings

| | Sol (Codex) | Fable (Claude) |
|---|---|---|
| Tool | OpenAI Codex | Claude Code |
| Model | `gpt-5.6-sol` | `claude-fable-5` |
| Reasoning effort | xhigh | xhigh |
| Plan mode | yes | yes |
| Extra directives in prompt | — | `/effort xhigh` and `/plan` (Claude-specific slash commands) |

The **task body was byte-for-byte identical**. The only difference: the Claude run appended the two Claude Code slash-command lines `/effort xhigh` and `/plan` to request maximum reasoning effort and plan mode. Codex was set to `xhigh` / plan mode through its own UI rather than in the prompt text.

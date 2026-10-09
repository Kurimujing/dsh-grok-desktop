# dsh-grok-desktop

Desktop-safe Grok plugin for DeepSeek Harness. It does not declare a web client bundle, so enabling it will not crash the desktop shell.

It reads a local Grok login or `XAI_API_KEY` and writes an OpenAI-compatible provider into `settings.yaml`. Pick **grok-desktop** in the model selector.

## Install

Quit the desktop app completely, then:

```bat
cd C:\ai-workspace\deepseek-harness
pnpm dsh plugin --profile desktop remove dsh-xai
pnpm dsh plugin --profile desktop add github:Kurimujing/dsh-grok-desktop
```

Or paste `github:Kurimujing/dsh-grok-desktop` into the desktop add-plugin box. Use the GitHub install source, not the China mirror.

## Login

1. Run `grok login` and confirm `%USERPROFILE%\.grok\auth.json` exists, then start the desktop app.
2. Or set `XAI_API_KEY` before launch.

Start a new session and select `grok-desktop` / `grok-4`. Do not select `xai-oauth`.

Status file: `%USERPROFILE%\.dsh\storages\grok-desktop-status.json`

## Remove

```bat
pnpm dsh plugin --profile desktop remove dsh-grok-desktop
```

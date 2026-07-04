# silentvpn3.github.io

Лендинг Silent VPN — скачивание клиентов для Windows и Android.

**Сайт:** https://silentvpn3.github.io

## Ссылки на скачивание

Файлы отдаются через **GitHub Releases** (`v1.0.x`) — сайт работает даже когда VPS недоступен.

1. `releases.json` на Pages — версии и `download_url` (GitHub)
2. `INLINE_FALLBACK` в `index.html` — запасной вариант
3. Фоновый опрос production API — только для обновления бейджа версии

## Публикация (автоматически)

После сборки OTA на сервере (админка → «Собрать релиз в update») backend при наличии `GITHUB_TOKEN`:

- загружает `.exe` / `.apk` в GitHub Release `v{version}`
- обновляет `releases.json` в этом репозитории

Или вручную: админка → **Опубликовать на GitHub** (на платформу).

## Публикация (вручную с ПК)

```powershell
$env:GITHUB_TOKEN = "<PAT>"
.\sync-releases.ps1   # только JSON + INLINE (без бинарников)
.\deploy.ps1          # push main → GitHub Pages
```

PAT: **Contents** (read/write) + **Releases** на `silentvpn3/silentvpn3.github.io`.

## Локальная копия

В монорепо Silent-Project: `landing/` — clone этого репозитория для правок Agent.

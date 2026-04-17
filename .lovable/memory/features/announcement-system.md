---
name: Announcement System
description: Restaurant announcement modal triggers on every page load when enabled, with sanitized HTML rendering.
type: feature
---

The `AnnouncementModal` displays based on `announcementSettings` in `restaurantData`. It appears on every page load/refresh (no sessionStorage gate) after the configured `delayMs` when `announcementSettings.enabled` is true. HTML content is sanitized via DOMPurify (preserving `<style>` tags + inline styles), wrapped in a document shell, and rendered in an auto-resizing iframe.

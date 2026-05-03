## Add Parallax Effect to Theme 4 Category Images

The category banner images in theme 4 currently scroll with the page like normal content. We'll add a parallax scrolling effect so the images appear to move slower than the foreground content, creating visual depth.

### Changes

**File: `src/themes/theme-4/MenuPage.tsx`**

- Convert the category banner images from `<img>` tags to CSS `background-image` on the container div
- Apply `background-attachment: fixed` and `background-position: center` to achieve the parallax effect
- Apply the same treatment to the hero image at the top
- On mobile (iOS), `background-attachment: fixed` has known issues — we'll use a fallback with `transform: translateZ(0)` or a simple cover if needed

### Technical Detail

The parallax effect is achieved with:
```css
background-attachment: fixed;
background-size: cover;
background-position: center;
```

This makes the background image stay relatively fixed while the container scrolls over it, giving the classic parallax depth illusion.

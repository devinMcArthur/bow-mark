/**
 * Visible navbar strip height. 3.4rem on every platform except iOS PWA
 * in standalone mode — there the viewport runs edge-to-edge (we set
 * `viewport-fit=cover` + `apple-mobile-web-app-status-bar-style=
 * black-translucent`), so the status bar overlays the top safe-area
 * inset. We grow the navbar by that inset so its background paints
 * behind the status bar while the interactive controls sit in the
 * 3.4rem region below. Consumers use `navbarHeight` to offset content
 * below the navbar and the value is correct on both platforms — on
 * non-iOS `env(safe-area-inset-top)` resolves to 0.
 */
export const navbarHeight = "calc(3.4rem + env(safe-area-inset-top))";

/** Height of the interactive row inside the navbar (without the inset). */
export const navbarContentHeight = "3.4rem";

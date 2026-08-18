/** Build stamp shown on the title screen; the values are substituted by Vite at build time. */
export const VERSION: string = __APP_VERSION__;
export const GIT_SHA: string = __GIT_SHA__;
export const BUILD = `v${VERSION} · ${GIT_SHA}`;

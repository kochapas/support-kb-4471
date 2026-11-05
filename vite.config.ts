import { fileURLToPath } from 'node:url';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { mdsvex } from 'mdsvex';
import { defineConfig } from 'vite';

// SvelteKit 3 takes its config here, through the `sveltekit()` plugin (there is no svelte.config.js).
// `#lib/...` imports resolve through the `imports` field in package.json.
export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter(),
			extensions: ['.svelte', '.svx'],
			preprocess: [
				mdsvex({
					extensions: ['.svx'],
					// Named layouts: frontmatter `layout: runbook` wraps the page in this component.
					layout: {
						runbook: fileURLToPath(new URL('./src/lib/layouts/runbook.svelte', import.meta.url))
					}
				})
			]
		})
	]
});

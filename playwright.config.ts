import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	webServer: {
		command: 'vite build && vite preview',
		port: 4173
	}
};

export default config;

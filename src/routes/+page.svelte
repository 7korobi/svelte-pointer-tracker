<script lang="ts">
	import { Zoom, Pen } from '$lib';
	import { Browser } from 'svelte-browser';

	let ix: number;
	let iy: number;
	let iscale: number;
	let tx: number;
	let ty: number;
	let tscale: number;
	let hello = 'home.';
</script>

<Browser ratio={1.0} isDefaultSafeArea={false} />

<h1>Welcome to your library project</h1>
<p>Create your package using @sveltejs/package and preview/showcase your work with SvelteKit</p>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

<table>
	<tr
		><td style="width: 40vw">
			<Zoom mode="image" bind:x={ix} bind:y={iy} bind:scale={iscale}>
				<hr />
				<hr />
				<hr />
				<hr />
				<hr />
				<h3>zoom offset</h3>
				<p>{ix} {iy} {iscale}</p>
				<hr />
				<hr />
				<hr />
				<hr />
				<hr />
			</Zoom>
		</td><td style="width: 40vw">
			<Zoom mode="text" bind:x={tx} bind:y={ty} bind:scale={tscale}>
				<hr />
				<hr />
				<hr />
				<hr />
				<hr />
				<h3>zoom offset</h3>
				<p>{tx} {ty} {tscale}</p>
				<hr />
				<hr />
				<hr />
				<hr />
				<hr />
			</Zoom>
		</td></tr
	>
</table>

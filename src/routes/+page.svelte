<script lang="ts">
import browser, { Browser } from 'svelte-browser'
import { Zoom, Pen } from '$lib'

const { viewSize, viewOffset, zoomSize, zoomOffset, zoomScale, safeOffset } = browser
let x: number
let y: number
let scale: number

</script>
<Browser ratio={1.0} isDefaultSafeArea={false} />

<h1>Welcome to your library project</h1>
<p>Create your package using @sveltejs/package and preview/showcase your work with SvelteKit</p>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

<p>
  <Zoom bind:x bind:y bind:scale>
    <hr />
    <h3>zoom offset</h3>
    <p>{x} {y} {scale}</p>
    <h3>window zoom offset</h3>
    <table>
      <tr>
        <td />
        <td>{$zoomOffset[0]}</td>
        <td />
      </tr>
      <tr>
        <td>{$zoomOffset[3]}</td>
        <td>{Math.floor($zoomScale * 10) / 10}</td>
        <td>{$zoomOffset[1]}</td>
      </tr>
      <tr>
        <td />
        <td>{$zoomOffset[2]}</td>
        <td />
      </tr>
    </table>
    <hr />
    <h3>view offset</h3>
    <table>
      <tr>
        <td />
        <td>{$viewOffset[0]}</td>
        <td />
      </tr>
      <tr>
        <td>{$viewOffset[3]}</td>
        <td />
        <td>{$viewOffset[1]}</td>
      </tr>
      <tr>
        <td />
        <td>{$viewOffset[2]}</td>
        <td />
      </tr>
    </table>
    <hr />
    <h3>safe offset</h3>
    <table>
      <tr>
        <td />
        <td>{$safeOffset[0]}</td>
        <td />
      </tr>
      <tr>
        <td>{$safeOffset[3]}</td>
        <td />
        <td>{$safeOffset[1]}</td>
      </tr>
      <tr>
        <td />
        <td>{$safeOffset[2]}</td>
        <td />
      </tr>
    </table>
    <hr />
    <hr />
  </Zoom>
</p>

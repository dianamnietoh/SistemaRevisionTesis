<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { auth, initAuth, clearAuth, api } from '$lib/auth.js';

  let user = null;
  const publicRoutes = ['/', '/login'];

  onMount(() => {
    const session = initAuth();
    if (session) {
      api('/api/auth/me').then(u => { user = u; auth.update(v => v && { ...v, user: u }); })
        .catch(() => clearAuth());
    }
  });

  $: isPublic = publicRoutes.includes($page.url.pathname);
  $: showNav = !!$auth && !isPublic;

  function logout() {
    clearAuth();
    user = null;
    location.href = '/';
  }
</script>

{#if showNav}
  <nav style="display:flex;gap:1rem;align-items:center;padding:0.75rem 1.5rem;background:var(--panel);border-bottom:1px solid #334155;flex-wrap:wrap">
    <strong style="color:var(--accent)">Titulación</strong>
    <a href="/panel">Panel</a>
    <a href="/entregas">Mis entregas</a>
    {#if $auth?.user?.rol === 'admin'}
      <a href="/admin">Administración</a>
    {/if}
    <span style="margin-left:auto" class="muted">
      {$auth?.user?.nombre} ({$auth?.user?.rol})
      <button class="secondary" style="margin-left:0.75rem" on:click={logout}>Salir</button>
    </span>
  </nav>
{/if}

<main style="max-width:1100px;margin:0 auto;padding:1.5rem">
  <slot />
</main>

<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { api, setAuth, auth } from '$lib/auth.js';

  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  onMount(() => {
    const unsub = auth.subscribe(v => { if (v?.token) goto('/panel'); });
    return unsub;
  });

  async function login() {
    error = '';
    loading = true;
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setAuth(data.token, data.user);
      goto('/panel');
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Ingresar — Sistema de Titulación</title></svelte:head>

<div class="card" style="max-width:420px;margin:4rem auto">
  <h1 style="margin-top:0">Sistema de Titulación</h1>
  <p class="muted">Control de avance de las revisiones de documentos de titulación</p>

  {#if error}<p style="color:var(--err)">{error}</p>{/if}

  <form on:submit|preventDefault={login}>
    <label for="email">Correo institucional</label>
    <input id="email" type="email" bind:value={email} required autocomplete="username" />

    <label for="password">Contraseña</label>
    <input id="password" type="password" bind:value={password} required autocomplete="current-password" />

    <button style="width:100%;margin-top:1.25rem" disabled={loading}>
      {loading ? 'Ingresando…' : 'Ingresar'}
    </button>
  </form>
</div>

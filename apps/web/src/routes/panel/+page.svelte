<script>
  import { onMount } from 'svelte';
  import { api } from '$lib/auth.js';

  let proyectos = [];
  let user = null;
  let error = '';

  onMount(async () => {
    try {
      [proyectos, user] = await Promise.all([
        api('/api/proyectos'),
        api('/api/auth/me')
      ]);
      // cargar detalle de cada proyecto para progreso
      proyectos = await Promise.all(proyectos.map(async p => {
        const detalle = await api(`/api/proyectos/${p.id}`);
        return detalle;
      }));
    } catch (e) {
      error = e.message;
    }
  });

  function progreso(p) {
    const caps = p.capitulos || [];
    let ok = 0, totalMin = 0;
    for (const c of caps) {
      totalMin += c.min_revisiones || 5;
      ok += (c.entregas || []).length;
    }
    return totalMin ? Math.round((ok / totalMin) * 100) : 0;
  }
</script>

<svelte:head><title>Panel — Sistema de Titulación</title></svelte:head>

<h1>Mis documentos de titulación</h1>
{#if error}<p style="color:var(--err)">{error}</p>{/if}

{#if proyectos.length === 0 && !error}
  <div class="card"><p class="muted">No tienes documentos de titulación registrados. Contacta al administrador.</p></div>
{/if}

<div class="grid">
  {#each proyectos as p}
    <a href="/proyecto/{p.id}" class="card" style="color:inherit;display:block">
      <h3 style="margin-top:0">{p.titulo}</h3>
      {#if user?.rol === 'admin' && p.alumno}
        <p class="muted">Alumno: {p.alumno.nombre} ({p.alumno.matricula || p.alumno.email})</p>
      {/if}
      <p class="muted">{p.descripcion || ''}</p>
      <div style="background:var(--panel-2);border-radius:6px;height:10px;overflow:hidden">
        <div style="width:{progreso(p)}%;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-2))"></div>
      </div>
      <p class="muted" style="margin-bottom:0">Avance: {progreso(p)}% — mínimo 5 revisiones por capítulo</p>
    </a>
  {/each}
</div>

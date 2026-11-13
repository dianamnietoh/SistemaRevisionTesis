<script>
  import { onMount } from 'svelte';
  import { api } from '$lib/auth.js';
  import { descargarCalendario } from '$lib/calendar.js';

  let entregas = [];
  let error = '';
  let detalle = null;
  let calendError = '';

  onMount(async () => {
    try { entregas = await api('/api/entregas'); }
    catch (e) { error = e.message; }
  });

  const fmt = d => d ? new Date(d).toLocaleString() : '—';

  async function agregarCalendario(e) {
    calendError = '';
    try {
      await descargarCalendario(e.id, `observaciones-${e.capitulo?.nombre || 'titulacion'}`);
    } catch (err) {
      calendError = err.message;
    }
  }
</script>

<svelte:head><title>Mis entregas</title></svelte:head>

<h1>Mis entregas</h1>
{#if error}<p style="color:var(--err)">{error}</p>{/if}

<div class="card">
  <table>
    <thead><tr><th>Capítulo</th><th>Revisión</th><th>Proyecto</th><th>Fecha</th><th>Compromiso</th><th>Estado</th><th>Puntaje</th><th></th></tr></thead>
    <tbody>
      {#each entregas as e}
        <tr>
          <td>{e.capitulo?.nombre}</td>
          <td>#{e.numero_revision}</td>
          <td>{e.capitulo?.proyecto?.titulo}</td>
          <td>{fmt(e.fecha_entrega)}</td>
          <td>{fmt(e.fecha_compromiso)}</td>
          <td><span class="badge {e.estado}">{e.estado}</span></td>
          <td>{e.puntaje_total ?? '—'}</td>
          <td class="row" style="gap:0.4rem">
            <button class="secondary" on:click={async () => detalle = await api(`/api/entregas/${e.id}`)}>Ver</button>
            <button class="secondary" title="Agregar fecha de entrega de observaciones y calificación al calendario" on:click={() => agregarCalendario(e)}>📅</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if calendError}<p style="color:var(--err)">{calendError}</p>{/if}
{#if entregas.length === 0}<p class="muted">Aún no has realizado entregas.</p>{/if}
</div>

{#if detalle}
  <div class="card" style="position:fixed;inset:5% 10%;overflow:auto;z-index:10">
    <div class="row" style="justify-content:space-between">
      <h3>{detalle.capitulo?.nombre} — revisión #{detalle.numero_revision}</h3>
      <div class="row" style="gap:0.5rem">
        <button class="secondary" on:click={() => agregarCalendario(detalle)}>📅 Agregar al calendario</button>
        <button class="secondary" on:click={() => detalle = null}>Cerrar</button>
      </div>
    </div>
    <p class="muted">Fecha y hora de entrega de observaciones y calificación: <strong>{fmt(detalle.fecha_compromiso)}</strong></p>
    {#if detalle.retroalimentacion?.resumen}
      <p>{detalle.retroalimentacion.resumen}</p>
    {/if}
    {#if detalle.retroalimentacion?.observaciones?.length}
      <h4>Observaciones</h4>
      <ul>{#each detalle.retroalimentacion.observaciones as o}<li>{o}</li>{/each}</ul>
    {/if}
    {#if detalle.retroalimentacion?.recomendaciones?.length}
      <h4>Recomendaciones</h4>
      <ul>{#each detalle.retroalimentacion.recomendaciones as r}<li>{r}</li>{/each}</ul>
    {/if}
    {#if detalle.error_ia}<p style="color:var(--err)">{detalle.error_ia}</p>{/if}
  </div>
{/if}

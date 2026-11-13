<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/auth.js';
  import { descargarCalendario } from '$lib/calendar.js';

  let proyecto = null;
  let error = '';
  let msg = '';
  let loading = false;
  let abierto = null; // capítulo abierto para entrega
  let archivo = null;
  let texto = '';
  let detalleEntrega = null;

  onMount(cargar);

  async function cargar() {
    try {
      proyecto = await api(`/api/proyectos/${$page.params.id}`);
    } catch (e) {
      error = e.message;
    }
  }

  async function entregar(cap) {
    msg = '';
    error = '';
    loading = true;
    try {
      const fd = new FormData();
      fd.append('capitulo_id', cap.id);
      if (archivo) fd.append('archivo', archivo);
      if (texto) fd.append('texto', texto);
      const res = await api('/api/entregas', { method: 'POST', body: fd });
      msg = res.mensaje;
      archivo = null; texto = '';
      await cargar();
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function verEntrega(id) {
    detalleEntrega = await api(`/api/entregas/${id}`);
  }

  async function agregarCalendario(e) {
    error = '';
    try {
      await descargarCalendario(e.id, `observaciones-${proyecto?.titulo || 'titulacion'}`);
    } catch (err) {
      error = err.message;
    }
  }

  const fmt = d => d ? new Date(d).toLocaleString() : '—';
</script>

<svelte:head><title>{proyecto?.titulo || 'Proyecto'}</title></svelte:head>

{#if error}<p style="color:var(--err)">{error}</p>{/if}
{#if msg}<p style="color:var(--ok)">{msg}</p>{/if}

{#if proyecto}
  <h1>{proyecto.titulo}</h1>
  <p class="muted">{proyecto.descripcion}</p>

  {#each proyecto.capitulos as cap, i}
    {@const entregas = (cap.entregas || []).slice().sort((a,b) => a.numero_revision - b.numero_revision)}
    <div class="card" style="margin-bottom:1rem">
      <div class="row" style="justify-content:space-between">
        <h3 style="margin:0">{i+1}. {cap.nombre}</h3>
        <span class="muted">{entregas.length}/{cap.min_revisiones || 5} revisiones</span>
      </div>

      {#if entregas.length}
        <table style="margin-top:0.75rem">
          <thead><tr><th>#</th><th>Fecha entrega</th><th>Compromiso</th><th>Estado</th><th>Puntaje</th><th></th></tr></thead>
          <tbody>
            {#each entregas as e}
              <tr>
                <td>{e.numero_revision}</td>
                <td>{fmt(e.fecha_entrega)}</td>
                <td>{fmt(e.fecha_compromiso)}</td>
                <td><span class="badge {e.estado}">{e.estado}</span></td>
                <td>{e.puntaje_total != null ? e.puntaje_total : '—'}</td>
                <td class="row" style="gap:0.4rem">
                  <button class="secondary" on:click={() => verEntrega(e.id)}>Ver</button>
                  <button class="secondary" title="Agregar entrega de observaciones y calificación al calendario" on:click={() => agregarCalendario(e)}>📅</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}

      <div style="margin-top:0.75rem">
        {#if abierto === cap.id}
          <div class="card" style="background:var(--panel-2)">
            <label>Archivo (.docx, .pdf, .txt, .md — máx 15MB)</label>
            <input type="file" accept=".docx,.pdf,.txt,.md" on:change={ev => archivo = ev.target.files[0]} />
            <label>…o pega el texto del avance</label>
            <textarea rows="6" bind:value={texto} placeholder="Pega aquí el contenido del capítulo…"></textarea>
            <div class="row" style="margin-top:0.75rem">
              <button on:click={() => entregar(cap)} disabled={loading || (!archivo && texto.trim().length < 50)}>
                {loading ? 'Enviando y evaluando…' : 'Entregar revisión'}
              </button>
              <button class="secondary" on:click={() => { abierto = null; archivo = null; texto=''; }}>Cancelar</button>
            </div>
            <p class="muted" style="font-size:0.8rem">La IA evaluará tu documento contra la rúbrica y el formato APA 7. Te mostraremos la fecha compromiso de devolución de observaciones.</p>
          </div>
        {:else}
          <button class="secondary" on:click={() => { abierto = cap.id; msg=''; error=''; }}>
            + Nueva revisión
          </button>
        {/if}
      </div>
    </div>
  {/each}
{/if}

{#if detalleEntrega}
  <div class="card" style="position:fixed;inset:5% 10%;overflow:auto;z-index:10;background:var(--panel)">
    <div class="row" style="justify-content:space-between">
      <h3>Revisión #{detalleEntrega.numero_revision} — {detalleEntrega.capitulo?.nombre}</h3>
      <button class="secondary" on:click={() => agregarCalendario(detalleEntrega)}>📅 Agregar al calendario</button>
      <button class="secondary" on:click={() => detalleEntrega = null}>Cerrar</button>
    </div>
    <p class="muted">Entregada: {fmt(detalleEntrega.fecha_entrega)} · Compromiso: <strong>{fmt(detalleEntrega.fecha_compromiso)}</strong> · Puntaje: {detalleEntrega.puntaje_total ?? '—'}</p>
    <p class="muted" style="font-size:0.85rem">El botón 📅 descarga un archivo .ics con la fecha y hora exacta en que recibirás tus observaciones y calificación, listo para tu calendario.</p>

    {#if detalleEntrega.retroalimentacion}
      {@const fb = detalleEntrega.retroalimentacion}
      {#if fb.resumen}<p><strong>Resumen:</strong> {fb.resumen}</p>{/if}
      {#if fb.criterios?.length}
        <h4>Criterios</h4>
        <table>
          <thead><tr><th>Criterio</th><th>Puntaje</th><th>Comentario</th></tr></thead>
          <tbody>
            {#each fb.criterios as c}
              <tr><td>{c.nombre}</td><td>{c.puntaje}/{c.max_puntos}</td><td>{c.comentario}</td></tr>
            {/each}
          </tbody>
        </table>
      {/if}
      {#if fb.observaciones?.length}
        <h4>Observaciones</h4>
        <ul>{#each fb.observaciones as o}<li>{o}</li>{/each}</ul>
      {/if}
      {#if fb.fortalezas?.length}
        <h4>Fortalezas</h4>
        <ul>{#each fb.fortalezas as f}<li>{f}</li>{/each}</ul>
      {/if}
      {#if fb.recomendaciones?.length}
        <h4>Recomendaciones</h4>
        <ul>{#each fb.recomendaciones as r}<li>{r}</li>{/each}</ul>
      {/if}
      {#if fb.veredicto}<p><strong>Veredicto:</strong> {fb.veredicto}</p>{/if}
    {:else if detalleEntrega.error_ia}
      <p style="color:var(--err)">Error en revisión IA: {detalleEntrega.error_ia}</p>
    {:else}
      <p class="muted">Revisión en proceso…</p>
    {/if}
  </div>
{/if}

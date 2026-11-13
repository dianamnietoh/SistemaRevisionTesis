<script>
  import { onMount } from 'svelte';
  import { api } from '$lib/auth.js';

  let stats = null;
  let usuarios = [];
  let rubricas = [];
  let proyectos = [];
  let tab = 'stats';
  let error = '';
  let nuevo = { email: '', nombre: '', password: '', matricula: '', rol: 'alumno' };
  let nuevoProyecto = { titulo: '', descripcion: '', alumno_id: '' };
  let msg = '';

  onMount(cargar);

  async function cargar() {
    try {
      [stats, usuarios, rubricas, proyectos] = await Promise.all([
        api('/api/admin/stats'),
        api('/api/admin/usuarios'),
        api('/api/admin/rubrica'),
        api('/api/proyectos')
      ]);
    } catch (e) { error = e.message; }
  }

  async function crearUsuario() {
    msg = ''; error = '';
    try {
      await api('/api/admin/usuarios', { method: 'POST', body: JSON.stringify(nuevo) });
      msg = 'Usuario creado';
      nuevo = { email: '', nombre: '', password: '', matricula: '', rol: 'alumno' };
      await cargar();
    } catch (e) { error = e.message; }
  }

  async function crearProyecto() {
    msg = ''; error = '';
    try {
      await api('/api/proyectos', { method: 'POST', body: JSON.stringify(nuevoProyecto) });
      msg = 'Proyecto creado con sus 8 capítulos';
      nuevoProyecto = { titulo: '', descripcion: '', alumno_id: '' };
      await cargar();
    } catch (e) { error = e.message; }
  }

  async function toggleUsuario(u) {
    await api(`/api/admin/usuarios/${u.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !u.activo }) });
    await cargar();
  }

  const alumnos = () => usuarios.filter(u => u.rol === 'alumno' && u.activo);
</script>

<svelte:head><title>Administración</title></svelte:head>

<h1>Administración</h1>
{#if error}<p style="color:var(--err)">{error}</p>{/if}
{#if msg}<p style="color:var(--ok)">{msg}</p>{/if}

<div class="row" style="margin-bottom:1rem">
  {#each [['stats','Resumen'],['usuarios','Usuarios'],['proyectos','Proyectos'],['rubrica','Rúbrica']] as [k,l]}
    <button class={tab===k?'':'secondary'} on:click={() => tab=k}>{l}</button>
  {/each}
</div>

{#if tab === 'stats' && stats}
  <div class="grid">
    <div class="card"><h3 style="margin:0">{stats.usuarios}</h3><p class="muted" style="margin:0">Usuarios</p></div>
    <div class="card"><h3 style="margin:0">{stats.proyectos}</h3><p class="muted" style="margin:0">Proyectos</p></div>
    <div class="card"><h3 style="margin:0">{stats.entregas}</h3><p class="muted" style="margin:0">Entregas totales</p></div>
    <div class="card">
      <h3 style="margin:0">{stats.entregas_por_estado?.completada || 0}</h3>
      <p class="muted" style="margin:0">Revisadas por IA</p>
    </div>
  </div>
{/if}

{#if tab === 'usuarios'}
  <div class="grid">
    <div class="card">
      <h3>Nuevo usuario</h3>
      <label>Nombre</label><input bind:value={nuevo.nombre} />
      <label>Email</label><input type="email" bind:value={nuevo.email} />
      <label>Contraseña</label><input type="password" bind:value={nuevo.password} />
      <label>Matrícula</label><input bind:value={nuevo.matricula} />
      <label>Rol</label>
      <select bind:value={nuevo.rol}>
        <option value="alumno">Alumno</option>
        <option value="admin">Admin</option>
      </select>
      <button style="margin-top:1rem" on:click={crearUsuario}>Crear</button>
    </div>
    <div class="card">
      <h3>Usuarios</h3>
      <table>
        <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {#each usuarios as u}
            <tr>
              <td>{u.nombre}</td><td>{u.email}</td><td>{u.rol}</td>
              <td>{u.activo ? 'Activo' : 'Inactivo'}</td>
              <td><button class="secondary" on:click={() => toggleUsuario(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

{#if tab === 'proyectos'}
  <div class="grid">
    <div class="card">
      <h3>Nuevo proyecto</h3>
      <label>Título</label><input bind:value={nuevoProyecto.titulo} />
      <label>Descripción</label><textarea rows="3" bind:value={nuevoProyecto.descripcion}></textarea>
      <label>Alumno</label>
      <select bind:value={nuevoProyecto.alumno_id}>
        <option value="">— seleccionar —</option>
        {#each alumnos() as a}<option value={a.id}>{a.nombre} — {a.matricula || a.email}</option>{/each}
      </select>
      <button style="margin-top:1rem" on:click={crearProyecto} disabled={!nuevoProyecto.alumno_id}>Crear proyecto</button>
      <p class="muted" style="font-size:0.8rem">Se crean automáticamente los 8 capítulos con mínimo 5 revisiones cada uno.</p>
    </div>
    <div class="card">
      <h3>Proyectos</h3>
      <table>
        <thead><tr><th>Título</th><th>Alumno</th><th>Estado</th></tr></thead>
        <tbody>
          {#each proyectos as p}
            <tr><td>{p.titulo}</td><td>{p.alumno?.nombre || '—'}</td><td>{p.estado}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

{#if tab === 'rubrica'}
  {#each rubricas as r}
    <div class="card" style="margin-bottom:1rem">
      <h3 style="margin-top:0">{r.nombre} {#if !r.activo}<span class="badge error">inactiva</span>{/if}</h3>
      <p class="muted">{r.descripcion}</p>
      <p class="muted">Formato APA 7: {r.formato_apa ? 'Sí' : 'No'}</p>
      <table>
        <thead><tr><th>Criterio</th><th>Peso</th><th>Máx</th><th>Descripción</th></tr></thead>
        <tbody>
          {#each r.criterios || [] as c}
            <tr><td>{c.nombre}</td><td>{c.peso}</td><td>{c.max_puntos}</td><td>{c.descripcion}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/each}
{/if}

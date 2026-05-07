<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let query = $state('');
	let adding = $state(false);
	let addName = $state('');
	let addInput: HTMLInputElement | null = $state(null);

	let editingId: number | null = $state(null);
	let editName = $state('');

	// Sort states
	type NameSort = 'none' | 'asc' | 'desc';
	type StatusSort = 'none' | 'to-buy' | 'bought';
	
	let nameSort: NameSort = $state('none');
	let statusSort: StatusSort = $state('none');

	const normalize = (s: string) =>
		s
			.toLowerCase()
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '');

	const filtered = $derived.by(() => {
		const q = normalize(query.trim());
		let items = q ? data.items.filter((i) => normalize(i.name).includes(q)) : data.items;
		
		// Apply name sorting
		if (nameSort !== 'none') {
			items = [...items].sort((a, b) => {
				const aName = normalize(a.name);
				const bName = normalize(b.name);
				if (aName === bName) return a.id - b.id;
				return nameSort === 'asc' 
					? aName.localeCompare(bName) 
					: bName.localeCompare(aName);
			});
		}
		
		// Apply status sorting
		if (statusSort !== 'none') {
			items = [...items].sort((a, b) => {
				if (a.bought === b.bought) return a.id - b.id;
				return statusSort === 'to-buy' 
					? (a.bought ? 1 : -1) 
					: (b.bought ? 1 : -1);
			});
		}
		
		return items;
	});

	function cycleNameSort() {
		nameSort = nameSort === 'none' ? 'asc' : nameSort === 'asc' ? 'desc' : 'none';
	}

	function cycleStatusSort() {
		statusSort = statusSort === 'none' ? 'to-buy' : statusSort === 'to-buy' ? 'bought' : 'none';
	}

	function getNameSortLabel() {
		if (nameSort === 'asc') return 'A → Z';
		if (nameSort === 'desc') return 'Z → A';
		return 'Trier par nom';
	}

	function getStatusSortLabel() {
		if (statusSort === 'to-buy') return 'à acheter en premier';
		if (statusSort === 'bought') return 'acheté en premier';
		return 'Trier par statut';
	}

	function getNameSortIcon() {
		if (nameSort === 'none') return '↕';
		if (nameSort === 'asc') return '↑';
		return '↓';
	}

	function getStatusSortIcon() {
		if (statusSort === 'none') return '↕';
		if (statusSort === 'to-buy') return '↓';
		return '↑';
	}

	async function openAdd() {
		addName = query;
		adding = true;
		await tick();
		addInput?.focus();
		addInput?.setSelectionRange(addName.length, addName.length);
	}

	function cancelAdd() {
		adding = false;
		addName = '';
	}

	function startEdit(id: number, name: string) {
		editingId = id;
		editName = name;
	}

	function cancelEdit() {
		editingId = null;
		editName = '';
	}
</script>

<svelte:head>
	<title>Liste de courses</title>
</svelte:head>

<main>
	<h1>Liste de courses</h1>

	<div class="toolbar">
		<input
			type="search"
			placeholder="Rechercher…"
			bind:value={query}
			aria-label="Rechercher un article"
		/>
		<button type="button" onclick={openAdd}>Ajouter</button>
	</div>

	{#if adding}
		<form
			method="post"
			action="?/add"
			class="add-form"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update({ reset: false });
					if (result.type === 'success') {
						adding = false;
						addName = '';
						query = '';
					}
				};
			}}
		>
			<input
				bind:this={addInput}
				bind:value={addName}
				name="name"
				type="text"
				required
				placeholder="Nom de l'article"
				aria-label="Nom de l'article à ajouter"
				onkeydown={(e) => {
					if (e.key === 'Escape') {
						e.preventDefault();
						cancelAdd();
					}
				}}
			/>
			<button type="submit">Confirmer</button>
			<button type="button" onclick={cancelAdd}>Annuler</button>
		</form>
	{/if}

	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}

	{#if filtered.length === 0}
		<p class="empty">
			{#if data.items.length === 0}
				Votre liste est vide. Cliquez sur « Ajouter » pour commencer.
			{:else}
				Aucun article ne correspond à « {query} ».
			{/if}
		</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>
						Nom
						<button type="button" onclick={cycleNameSort} class="sort-icon" aria-label={getNameSortLabel()}>
							{getNameSortIcon()}
						</button>
					</th>
					<th class="col-status">
						Statut
						<button type="button" onclick={cycleStatusSort} class="sort-icon" aria-label={getStatusSortLabel()}>
							{getStatusSortIcon()}
						</button>
					</th>
					<th class="col-actions">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as item (item.id)}
					<tr class:bought={item.bought}>
						<td>
							{#if editingId === item.id}
								<form
									method="post"
									action="?/rename"
									class="rename-form"
									use:enhance={() => {
										return async ({ result, update }) => {
											await update({ reset: false });
											if (result.type === 'success') cancelEdit();
										};
									}}
								>
									<input type="hidden" name="id" value={item.id} />
									<!-- svelte-ignore a11y_autofocus -->
									<input
										name="name"
										type="text"
										required
										autofocus
										bind:value={editName}
										onkeydown={(e) => {
											if (e.key === 'Escape') {
												e.preventDefault();
												cancelEdit();
											}
										}}
									/>
									<button type="submit">OK</button>
									<button type="button" onclick={cancelEdit}>Annuler</button>
								</form>
							{:else}
								<span class="name">{item.name}</span>
							{/if}
						</td>
						<td class="col-status">
							<form method="post" action="?/toggle" use:enhance>
								<input type="hidden" name="id" value={item.id} />
								<label class="status">
									<input
										type="checkbox"
										checked={item.bought}
										onchange={(e) => e.currentTarget.form?.requestSubmit()}
										aria-label={item.bought
											? `Marquer ${item.name} comme à acheter`
											: `Marquer ${item.name} comme acheté`}
									/>
									<span>{item.bought ? 'acheté' : 'à acheter'}</span>
								</label>
							</form>
						</td>
						<td class="col-actions">
							{#if editingId !== item.id}
								<button 
									type="button" 
									onclick={() => startEdit(item.id, item.name)}
									aria-label="Renommer {item.name}"
									class="icon-button"
								>
									✏️
								</button>
								<form method="post" action="?/delete" use:enhance class="inline">
									<input type="hidden" name="id" value={item.id} />
									<button 
										type="submit" 
										class="danger icon-button"
										aria-label="Supprimer {item.name}"
									>
										🗑️
									</button>
								</form>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</main>

<style>
	:global(body) {
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
		background: #fafafa;
		margin: 0;
		color: #1a1a1a;
	}

	main {
		max-width: 720px;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	h1 {
		margin: 0 0 1.25rem;
		font-size: 1.5rem;
	}

	.toolbar {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.toolbar input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		border: 1px solid #d0d0d0;
		border-radius: 6px;
		font-size: 1rem;
	}

	button {
		padding: 0.5rem 0.9rem;
		border: 1px solid #d0d0d0;
		background: #fff;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.95rem;
	}

	button:hover {
		background: #f0f0f0;
	}

	button.danger {
		color: #b00020;
	}

	button.danger:hover {
		background: #fde7eb;
	}

	.add-form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		padding: 0.75rem;
		background: #fff;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
	}

	.add-form input[type='text'] {
		flex: 1;
		padding: 0.5rem 0.75rem;
		border: 1px solid #d0d0d0;
		border-radius: 6px;
		font-size: 1rem;
	}

	.error {
		color: #b00020;
		background: #fde7eb;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		margin: 0.5rem 0;
	}

	.empty {
		color: #666;
		text-align: center;
		padding: 2rem 1rem;
		background: #fff;
		border: 1px dashed #d0d0d0;
		border-radius: 6px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		background: #fff;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		overflow: hidden;
	}

	th,
	td {
		text-align: left;
		padding: 0.6rem 0.75rem;
		border-bottom: 1px solid #f0f0f0;
		vertical-align: middle;
	}

	th {
		background: #f7f7f7;
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #555;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	.col-status {
		width: 11rem;
	}

	.col-actions {
		width: 12rem;
		text-align: right;
		white-space: nowrap;
	}

	.col-actions button {
		padding: 0.3rem 0.6rem;
		font-size: 0.85rem;
	}

	.col-actions form.inline {
		display: inline;
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	tr.bought .name {
		text-decoration: line-through;
		color: #888;
	}

	.rename-form {
		display: flex;
		gap: 0.4rem;
	}

	.rename-form input[type='text'] {
		flex: 1;
		padding: 0.3rem 0.5rem;
		border: 1px solid #d0d0d0;
		border-radius: 4px;
		font-size: 0.95rem;
	}

	.rename-form button {
		padding: 0.3rem 0.6rem;
		font-size: 0.85rem;
	}

	.icon-button {
		padding: 0.3rem;
		font-size: 1.1rem;
		width: 2.2rem;
		height: 2.2rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.sort-icon {
		background: none;
		border: none;
		font-size: 0.9rem;
		color: #666;
		cursor: pointer;
		padding: 0 0 0 0.4rem;
		line-height: 1;
	}

	.sort-icon:hover {
		color: #1a1a1a;
	}
</style>

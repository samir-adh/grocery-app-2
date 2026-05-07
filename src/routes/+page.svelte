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
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
		margin: 0;
		color: #1e293b;
		min-height: 100vh;
	}

	main {
		max-width: 720px;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	h1 {
		margin: 0 0 1.5rem;
		font-size: 1.75rem;
		font-weight: 700;
		color: #0f172a;
		letter-spacing: -0.02em;
	}

	.toolbar {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
	}

	.toolbar input {
		flex: 1;
		min-width: 200px;
		padding: 0.65rem 0.875rem;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.95rem;
		background: #fff;
		transition: all 0.2s ease;
	}

	.toolbar input:focus {
		outline: none;
		border-color: #34d399;
		box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.1);
	}

	button {
		padding: 0.65rem 1rem;
		border: none;
		background: #34d399;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		color: #fff;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	button:hover {
		background: #22c55e;
		transform: translateY(-1px);
	}

	button:active {
		transform: translateY(0);
	}

	button.danger {
		background: #f87171;
	}

	button.danger:hover {
		background: #ef4444;
	}

	.add-form {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
		padding: 1rem;
		background: #fff;
		border-radius: 12px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.add-form input[type='text'] {
		flex: 1;
		padding: 0.65rem 0.875rem;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.95rem;
		background: #fff;
	}

	.add-form input[type='text']:focus {
		outline: none;
		border-color: #34d399;
	}

	.error {
		color: #b91c1c;
		background: #fee2e2;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		margin: 0.75rem 0;
		font-size: 0.9rem;
	}

	.empty {
		color: #64748b;
		text-align: center;
		padding: 3rem 1.5rem;
		background: #fff;
		border: 2px dashed #cbd5e1;
		border-radius: 12px;
		font-size: 0.95rem;
	}

	table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		background: #fff;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	th,
	td {
		text-align: left;
		padding: 0.875rem 1rem;
		vertical-align: middle;
		border-bottom: 1px solid #e2e8f0;
	}

	thead th {
		background: #f8fafc;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #475569;
		padding-top: 0.75rem;
		padding-bottom: 0.75rem;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tbody tr {
		transition: background-color 0.15s ease;
	}

	tbody tr:hover {
		background: #f8fafc;
	}

	.col-status {
		width: 11rem;
	}

	.col-actions {
		width: 8rem;
		text-align: right;
		white-space: nowrap;
	}

	.col-actions button {
		padding: 0.4rem;
		font-size: 1rem;
		width: 2.5rem;
		height: 2.5rem;
		background: #f1f5f9;
		color: #475569;
		border-radius: 8px;
	}

	.col-actions button:hover {
		background: #e2e8f0;
		color: #0f172a;
		transform: none;
	}

	.col-actions .danger:hover {
		background: #fee2e2;
		color: #b91c1c;
	}

	.col-actions form.inline {
		display: inline;
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.status:hover {
		background: #f1f5f9;
	}

	tr.bought .name {
		text-decoration: line-through;
		color: #94a3b8;
	}

	/* Status badge colors */
	.status span {
		padding: 0.2rem 0.5rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.status input:checked + span {
		background: #dcfce7;
		color: #166534;
	}

	.status input:not(:checked) + span {
		background: #fee2e2;
		color: #991b1b;
	}

	.rename-form {
		display: flex;
		gap: 0.5rem;
		padding: 0.25rem;
	}

	.rename-form input[type='text'] {
		flex: 1;
		padding: 0.5rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 0.9rem;
		background: #fff;
	}

	.rename-form input[type='text']:focus {
		outline: none;
		border-color: #34d399;
	}

	.rename-form button {
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
		background: #e2e8f0;
		color: #475569;
	}

	.rename-form button:hover {
		background: #cbd5e1;
	}

	.icon-button {
		padding: 0.3rem;
		font-size: 1.1rem;
		width: 2.2rem;
		height: 2.2rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: #f1f5f9;
		border-radius: 8px;
		color: #475569;
		transition: all 0.2s ease;
	}

	.icon-button:hover {
		background: #e2e8f0;
		color: #0f172a;
	}

	.sort-icon {
		background: none;
		border: none;
		font-size: 0.85rem;
		color: #64748b;
		cursor: pointer;
		padding: 0 0 0 0.5rem;
		line-height: 1;
		transition: all 0.2s ease;
	}

	.sort-icon:hover {
		color: #0f172a;
	}
</style>

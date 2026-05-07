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
		font-family: 'Pixel Operator', 'Press Start 2P', sans-serif;
		background: linear-gradient(135deg, #fff0f5 0%, #fdf2f8 100%);
		margin: 0;
		color: #374151;
		min-height: 100vh;
		image-rendering: pixelated;
	}

	/* Pixel font fallback for inputs */
	:global(input), :global(button), :global(textarea), :global(select) {
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	main {
		max-width: 720px;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	h1 {
		margin: 0 0 1.5rem;
		font-size: 2.5rem;
		color: #f472b6;
		letter-spacing: 0.05em;
		text-shadow: 2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff;
		font-weight: normal;
	}

	.toolbar {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
		background: rgba(255, 255, 255, 0.6);
		padding: 0.75rem;
		border: 2px solid #fbcfe8;
		border-radius: 8px;
		box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
	}

	.toolbar input {
		flex: 1;
		min-width: 200px;
		padding: 0.75rem 1rem;
		border: 2px solid #fbcfe8;
		border-radius: 6px;
		font-size: 1.1rem;
		background: rgba(255, 255, 255, 0.9);
		color: #475569;
	}

	.toolbar input:focus {
		outline: none;
		border-color: #f472b6;
		box-shadow: 0 0 0 3px rgba(244, 114, 182, 0.2);
	}

	button {
		padding: 0.75rem 1.5rem;
		border: 2px solid #fbcfe8;
		background: #f8b4cb;
		border-radius: 6px;
		cursor: pointer;
		font-size: 1.1rem;
		font-family: 'Pixel Operator', sans-serif;
		font-weight: normal;
		color: #1f2937;
		transition: all 0.15s ease;
		white-space: nowrap;
		box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
	}

	button:hover {
		background: #f472b6;
		transform: translateY(-1px);
		box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.15);
		color: #fff;
		border-color: #ec4899;
	}

	button:active {
		transform: translateY(0);
		box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.1);
	}

	button.danger {
		background: #fca5a5;
		color: #7f1d1d;
		border-color: #f87171;
	}

	button.danger:hover {
		background: #f87171;
		color: #fff;
		border-color: #ef4444;
	}

	.add-form {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.7);
		border: 2px solid #fbcfe8;
		border-radius: 8px;
		box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
	}

	.add-form input[type='text'] {
		flex: 1;
		padding: 0.75rem 1rem;
		border: 2px solid #fbcfe8;
		border-radius: 6px;
		font-size: 1.1rem;
		background: rgba(255, 255, 255, 0.95);
		color: #475569;
		font-family: 'Inter', sans-serif;
	}

	.add-form input[type='text']:focus {
		outline: none;
		border-color: #f472b6;
	}

	.error {
		color: #7f1d1d;
		background: rgba(252, 165, 165, 0.3);
		padding: 1rem 1.25rem;
		border: 2px solid #f87171;
		border-radius: 6px;
		margin: 0.75rem 0;
		font-size: 1rem;
		font-family: 'Pixel Operator', sans-serif;
	}

	.empty {
		color: #a0aec0;
		text-align: center;
		padding: 3rem 1.5rem;
		background: rgba(255, 255, 255, 0.6);
		border: 2px dashed #fbcfe8;
		border-radius: 8px;
		font-size: 1.1rem;
		font-family: 'Pixel Operator', sans-serif;
	}

	table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		background: rgba(255, 255, 255, 0.7);
		border: 2px solid #fbcfe8;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
	}

	th,
	td {
		text-align: left;
		padding: 1rem 1.25rem;
		vertical-align: middle;
		border-bottom: 1px solid #fbcfe8;
		color: #475569;
		font-family: 'Pixel Operator', sans-serif;
		font-size: 1rem;
	}

	thead th {
		background: rgba(255, 255, 255, 0.8);
		font-size: 0.9rem;
		font-weight: normal;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #f472b6;
		padding-top: 1rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #fbcfe8;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tbody tr {
		transition: background-color 0.15s ease;
	}

	tbody tr:hover {
		background: rgba(254, 205, 232, 0.3);
	}

	.col-status {
		width: 11rem;
	}

	.col-actions {
		width: 7rem;
		text-align: right;
		white-space: nowrap;
	}

	.col-actions button {
		padding: 0.5rem;
		font-size: 1.2rem;
		width: 2.5rem;
		height: 2.5rem;
		background: rgba(255, 255, 255, 0.8);
		color: #ec4899;
		border: 2px solid #fbcfe8;
		border-radius: 6px;
		font-family: sans-serif;
		box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.1);
	}

	.col-actions button:hover {
		background: rgba(248, 180, 203, 0.8);
		color: #f472b6;
		transform: none;
		box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.15);
	}

	.col-actions .danger:hover {
		background: rgba(252, 165, 165, 0.8);
		color: #f87171;
		border-color: #f472b6;
	}

	.col-actions form.inline {
		display: inline;
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		padding: 0.3rem 0.6rem;
		border-radius: 6px;
		font-family: 'Pixel Operator', sans-serif;
		font-size: 0.9rem;
	}

	.status:hover {
		background: rgba(255, 255, 255, 0.5);
	}

	.status input {
		accent-color: #f472b6;
		width: 1.3rem;
		height: 1.3rem;
	}

	tr.bought .name {
		color: #a0aec0;
	}

	/* Status badge colors - pastel */
	.status span {
		padding: 0.3rem 0.75rem;
		border-radius: 12px;
		font-size: 0.85rem;
		font-weight: normal;
		border: 1px solid #fbcfe8;
	}

	.status input:checked + span {
		background: rgba(167, 243, 208, 0.4);
		color: #166534;
		border-color: #bbf7d0;
	}

	.status input:not(:checked) + span {
		background: rgba(254, 215, 170, 0.4);
		color: #92400e;
		border-color: #fed7aa;
	}

	.rename-form {
		display: flex;
		gap: 0.5rem;
		padding: 0.25rem;
		background: rgba(255, 255, 255, 0.8);
		border-radius: 6px;
	}

	.rename-form input[type='text'] {
		flex: 1;
		padding: 0.5rem 0.75rem;
		border: 2px solid #fbcfe8;
		border-radius: 6px;
		font-size: 1rem;
		background: rgba(255, 255, 255, 0.95);
		color: #475569;
		font-family: 'Inter', sans-serif;
	}

	.rename-form input[type='text']:focus {
		outline: none;
		border-color: #f472b6;
	}

	.rename-form button {
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
		background: rgba(255, 255, 255, 0.8);
		color: #ec4899;
		border: 2px solid #fbcfe8;
		font-family: 'Pixel Operator', sans-serif;
		border-radius: 4px;
	}

	.rename-form button:hover {
		background: rgba(248, 180, 203, 0.8);
		color: #f472b6;
	}

	.icon-button {
		padding: 0.4rem;
		font-size: 1.3rem;
		width: 2.5rem;
		height: 2.5rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.8);
		border: 2px solid #fbcfe8;
		border-radius: 6px;
		color: #ec4899;
		font-family: sans-serif;
		box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.1);
	}

	.icon-button:hover {
		background: rgba(248, 180, 203, 0.8);
		color: #f472b6;
		box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.15);
	}

	.sort-icon {
		background: none;
		border: none;
		font-size: 1rem;
		color: #ec4899;
		cursor: pointer;
		padding: 0 0 0 0.5rem;
		line-height: 1;
		font-family: 'Pixel Operator', sans-serif;
	}

	.sort-icon:hover {
		color: #f472b6;
	}

	/* Pixel art effect for sharp edges */
	* {
		image-rendering: crisp-edges;
	}
</style>

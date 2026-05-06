import { fail } from '@sveltejs/kit';
import { addItem, deleteItem, listItems, renameItem, toggleItem } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return { items: listItems() };
};

function parseId(value: FormDataEntryValue | null): number | null {
	const n = Number(value);
	return Number.isInteger(n) && n > 0 ? n : null;
}

export const actions: Actions = {
	add: async ({ request }) => {
		const data = await request.formData();
		const name = (data.get('name') ?? '').toString().trim();
		if (!name) return fail(400, { error: 'Le nom ne peut pas être vide.' });
		addItem(name);
		return { success: true };
	},
	toggle: async ({ request }) => {
		const data = await request.formData();
		const id = parseId(data.get('id'));
		if (id === null) return fail(400, { error: 'ID invalide.' });
		toggleItem(id);
		return { success: true };
	},
	rename: async ({ request }) => {
		const data = await request.formData();
		const id = parseId(data.get('id'));
		const name = (data.get('name') ?? '').toString().trim();
		if (id === null) return fail(400, { error: 'ID invalide.' });
		if (!name) return fail(400, { error: 'Le nom ne peut pas être vide.' });
		renameItem(id, name);
		return { success: true };
	},
	delete: async ({ request }) => {
		const data = await request.formData();
		const id = parseId(data.get('id'));
		if (id === null) return fail(400, { error: 'ID invalide.' });
		deleteItem(id);
		return { success: true };
	}
};

let notes = [
  {
    id: 1,
    title: 'first note',
    content: 'My first note is here.'
  }
];

export const list = () => {
  return notes.map(({ id, title, content }) => ({ id, title, content }));
};

export const get = (id) => {
  const note = notes.find((n) => n.id === id);
  if (!note) throw new Error('Note not found');
  return note;
};

export const create = (title, content) => {
  const lastId = notes.length > 0 ? notes[notes.length - 1].id : 0;
  const newNote = { id: lastId + 1, title, content };
  notes.push(newNote);
  return newNote;
};

export const update = (id, title, content) => {
  const index = notes.findIndex((n) => n.id === id);
  if (index < 0) throw new Error('Note not found for update');
  notes[index] = { id, title, content };
  return notes[index];
};

export const remove = (id) => { // 'delete' adalah reserved word, sebaiknya pakai 'remove'
  if (!notes.some((n) => n.id === id)) throw new Error('Note not found for delete');
  notes = notes.filter(n => n.id !== id);
};